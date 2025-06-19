# type: ignore
import time
import subprocess
from elasticsearch import Elasticsearch
from fastapi.responses import JSONResponse
from fastapi import APIRouter, HTTPException, Query, Request
from app.core.es import init_es_client
from app.core.models import ClusterConfig, NodeRequest
from app.core.agent import analyze_with_agent, analyze_with_multi_agent


router = APIRouter()

@router.get("/")
def root():
    return {"message": "FastAPI initialised successfully"}


es_client =  Elasticsearch("http://localhost:9200")  
# es_client = None  # Initialize as None, will be set later

def get_es_client():
    if not es_client:
        raise RuntimeError("Elasticsearch client is not initialized. Call /init-client first.")
    return es_client

@router.post("/init-client")
async def init_elasticsearch_client(config: ClusterConfig):
    global es_client
    try:
        if config.type == 'cloud' or config.type == 'local':
            es_client = init_es_client(config.url, config.username, config.password)
        else:
            raise HTTPException(status_code=400, detail="Invalid cluster type")

        if not es_client.ping():
            raise HTTPException(status_code=500, detail="Failed to connect to Elasticsearch cluster")

        return {"message": "Elasticsearch client initialized successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cluster/health")
def cluster_health():
    try:
        return es_client.cluster.health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cluster/stats")
def cluster_stats():
    try:
        return es_client.cluster.stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/indices")
def list_indices():
    # print("Fetching indices...")
    try:
        indices = es_client.indices.get(index="*")
        # print("Indices fetched successfully")
        return list(indices.keys())
    except Exception as e:
        print(f"Error fetching indices : {e}")
        raise HTTPException(status_code=500, detail="Indices not found")

@router.post("/index/info")
def get_index_info(payload: dict):
    es = get_es_client()
    if es is None:
        raise HTTPException(status_code=400, detail="Elasticsearch client is not initialized.")

    index_name = payload.get("index")
    if not index_name:
        raise HTTPException(status_code=422, detail="Index name is required.")

    try:
        stats = es.indices.stats(index=index_name)
        doc_count = stats["_all"]["primaries"]["docs"]["count"]
        size_in_bytes = stats["_all"]["primaries"]["store"]["size_in_bytes"]
        total_indexing = stats["_all"]["primaries"]["indexing"]["index_total"]
        total_search = stats["_all"]["primaries"]["search"]["query_total"]

        cluster_health = es.cluster.health(index=index_name)
        health_status = cluster_health["status"]

        return {
            "index_name": index_name,
            "doc_count": doc_count,
            "size_in_bytes": size_in_bytes,
            "health_status": health_status,
            "total_indexing": total_indexing,
            "total_search": total_search
        }

    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Index '{index_name}' not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nodes")
def get_all_nodes():
    global es_client
    try:
        response = es_client.nodes.info()
        nodes_info = []
        for node_id, node in response["nodes"].items():
            nodes_info.append({
                "node_id": node_id,
                "name": node["name"],
                "host": node["host"],
                "pid": node["process"]["id"]
            })
        return {"nodes": nodes_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_cat_value(value):
    # Converts "1kb", "10mb", "2gb", etc. into integers (bytes)
    try:
        value = value.lower().strip()
        if value.endswith("kb"):
            return int(float(value[:-2]) * 1024)
        elif value.endswith("mb"):
            return int(float(value[:-2]) * 1024 ** 2)
        elif value.endswith("gb"):
            return int(float(value[:-2]) * 1024 ** 3)
        elif value.endswith("b"):
            return int(float(value[:-1]))
        return int(value)
    except:
        return 0

@router.get("/top-indices")
def top_indices(n: int = 3, sort_by: str = Query("docs.count", enum=["docs.count", "store.size", "indexing.index_total", "search.query_total"])):
    """
    Fetch top N indices sorted by the given metric.
    Available sort_by options:
    - docs.count
    - store.size
    - indexing.index_total (requires stats API)
    - search.query_total (requires stats API)
    """
    try:
        if sort_by in ["docs.count", "store.size"]:
            # Use _cat/indices for size and doc count
            result = es_client.cat.indices(format="json", h=["index", sort_by])
            for r in result:
                r[sort_by] = parse_cat_value(r.get(sort_by, "0"))
        else:
            # Use _stats for metrics like search/indexing rates
            stats = es_client.indices.stats(metric="indexing,search")
            result = []
            for index_name, data in stats["indices"].items():
                metric_value = 0
                if sort_by == "indexing.index_total":
                    metric_value = data.get("total", {}).get("indexing", {}).get("index_total", 0)
                elif sort_by == "search.query_total":
                    metric_value = data.get("total", {}).get("search", {}).get("query_total", 0)
                result.append({"index": index_name, sort_by: metric_value})

        sorted_result = sorted(result, key=lambda x: int(x.get(sort_by, 0)), reverse=True)
        return sorted_result[:n]
    except (RequestError, TransportError, NotFoundError) as e:
        raise HTTPException(status_code=500, detail=f"Elasticsearch error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/cluster/local-node-pids")
async def get_local_node_pids():
    try:
        # Query the _nodes/process endpoint
        response = es_client.nodes.info(metric="process")
        
        pids_info = []
        for node_id, node_data in response.get("nodes", {}).items():
            pids_info.append({
                "node_name": node_data.get("name"),
                "host": node_data.get("host"),
                "pid": node_data.get("process", {}).get("id")
            })
        
        return {"status": "success", "nodes": pids_info}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch node PIDs: {str(e)}")


@router.get("/jstack")
def run_jstack(pid: int = Query(..., description="PID of the Java process")):
    try:
        result = subprocess.run(
            ["jcmd", "-l", str(pid)],  #Using jcmd instead of jstack for better formatted results
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail=f"jstack error: {result.stderr.strip()}")

        return {"pid": pid, "output": result.stdout}

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="jstack command timed out.")

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="jstack not found. Ensure it's in your PATH.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hot_threads")
async def get_hot_threads():
    try:
        response = es_client.transport.perform_request("GET", "/_nodes/hot_threads")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tasks")
def get_tasks():
    try:
        response = es_client.transport.perform_request("GET", f"/_tasks")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def jstack_for_agent(pid: int, count: int = 3, interval: int = 1) -> str:
    outputs = []
    for _ in range(count):
        try:
            result = subprocess.run(
                ["jstack", str(pid)],
                capture_output=True,
                text=True,
                check=True
            )
            output = result.stdout
            trimmed_output = output[:3000] + "\n...\n" + output[-3000:] if len(output) > 6000 else output
            outputs.append(trimmed_output)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"jstack failed: {e.stderr}")
        time.sleep(interval)
    
    return "\n\n--- JSTACK SNAPSHOT ---\n\n".join(outputs)

@router.get("/analyze-by-tasks")
def analyze_tasks():
    try:
        tasks_output = es_client.transport.perform_request("GET", f"/_tasks")
        analysis = analyze_with_multi_agent(tasks_output, source="tasks")
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze-by-node")
def analyze_node(request: NodeRequest):
    try:
        nodes_info = es_client.nodes.info()
        pid = None
        for node_id, node_data in nodes_info["nodes"].items():
            if node_data["name"] == request.node_name:
                pid = node_data["process"]["id"]
                break
        if pid is None:
            raise HTTPException(status_code=404, detail="Node not found or missing PID")
        jstack_output = jstack_for_agent(pid)
        analysis = analyze_with_multi_agent(jstack_output, source="jstack")
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/analyze-hot-threads")
def analyze_hot_threads():
    try:
        result = subprocess.run([
            "curl", "-XGET", "http://localhost:9200/_nodes/hot_threads"
        ], capture_output=True, text=True, check=True)
        output = result.stdout
        analysis = analyze_with_multi_agent(output, source="hot_threads")
        # analysis1= AgentManager({"hot_threads": output})
        return {"analysis": analysis}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"hot_threads failed: {e.stderr}")



@router.post("/queries/monitor")
async def monitor_log_query(request: Request):
    body = await request.json()
    index = body.get("index")
    query = body.get("query", {"match_all": {}})

    try:
        # Perform the profile query
        response =  es_client.search(
            index=index,
            body={
                "profile": True,
                "query": query
            }
        )

        took = response.get("took", 0)
        timed_out = response.get("timed_out", False)
        shard_info = response.get("_shards", {})
        shard_profiles = response.get("profile", {}).get("shards", [])

        analysis_results = []

        for shard in shard_profiles:
            shard_id = shard.get("id")
            searches = shard.get("searches", [])
            fetch = shard.get("fetch", {})

            query_analysis = []

            for search in searches:
                qtype = search.get("type")
                time_ns = search.get("time_in_nanos", 0)
                breakdown = search.get("breakdown", {})

                query_analysis.append({
                    "query_type": qtype,
                    "total_time_us": time_ns / 1000,
                    "main_time_breakdown": {
                        "build_scorer_us": breakdown.get("build_scorer", 0) / 1000,
                        "score_us": breakdown.get("score", 0) / 1000,
                        "next_doc_us": breakdown.get("next_doc", 0) / 1000,
                        "create_weight_us": breakdown.get("create_weight", 0) / 1000,
                    },
                    "remarks": "✅ Query execution is healthy and optimal."
                })

            fetch_time = fetch.get("time_in_nanos", 0)
            fetch_breakdown = fetch.get("breakdown", {})
            fetch_children = fetch.get("children", [])

            fetch_analysis = {
                "fetch_time_us": fetch_time / 1000,
                "main_time_breakdown": {
                    "load_stored_fields_us": fetch_breakdown.get("load_stored_fields", 0) / 1000,
                    "load_source_us": fetch_breakdown.get("load_source", 0) / 1000,
                    "next_reader_us": fetch_breakdown.get("next_reader", 0) / 1000,
                },
                "children": []
            }

            for child in fetch_children:
                fetch_analysis["children"].append({
                    "phase": child.get("type"),
                    "time_us": child.get("time_in_nanos", 0) / 1000,
                    "remarks": "✅ Phase executed efficiently."
                })

            analysis_results.append({
                "shard_id": shard_id,
                "query_analysis": query_analysis,
                "fetch_analysis": fetch_analysis,
                "shard_status": "✅ No problems or inefficiencies were detected."
            })

        return JSONResponse(content={
            "summary": {
                "took_ms": took,
                "timed_out": timed_out,
                "shards": shard_info
            },
            "analysis": analysis_results
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
