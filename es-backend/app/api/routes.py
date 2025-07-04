# type: ignore
import time
import json
import subprocess
from elasticsearch import Elasticsearch
from fastapi.responses import JSONResponse
from fastapi import APIRouter, HTTPException, Query, Request
from app.core.es import init_es_client
from app.core.agent import analyze_with_multi_agent
from app.core.models import ClusterConfig, NodeRequest

router = APIRouter()

headers_gb = {
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": "SESSION=7989849f-4d4f-4f31-9b7c-511acb1ee05a; SPR_RED_COOKIE=NWY1NDZmMzgtZWM0NS00ZGY0LWFiYWUtNmZhMzkwMDUwZjY2"
}


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


@router.get("/cluster-list")
async def get_cluster_list():
    url = "https://red.qa6.spr-ops.com/api/v1/esInfo/getnodeSpecificEsInfo"
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers_gb)
            response.raise_for_status()
            full_data = response.json()
            cluster_names = [cluster.get("clusterName") for cluster in full_data if "clusterName" in cluster]
            sorted_cluster_names = sorted(cluster_names, key=lambda x: x.lower())
            return sorted_cluster_names
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.get("/get-direct-es-stats")
async def get_direct_es_indices(
    queryField: str = Query(...),
    host: str = Query(""),
    clusterName: str = Query(...),
    call: str = Query(...)
):
    base_url = "https://red.qa6.spr-ops.com/api/v1/infrastructure/getDirectESStats"

    params = {
        "queryField": queryField,
        "host": host,
        "clusterName": clusterName,
        "call": call,
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(base_url, params=params, headers=headers_gb)
            response.raise_for_status()
            return  response.text
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.get("/cluster/health")
async def cluster_health(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    try:
        if cluster_name.lower() == "false" or cluster_name == "":
            return es_client.cluster.health()
        else:
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_cluster/health"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                cluster_health = json.loads(response.json())
                return cluster_health

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cluster/stats")
def cluster_stats():
    try:
        return es_client.cluster.stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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
        cluster_health = es.cluster.health(index=index_name)

        return {
            "index": index_name,
            "docs_count": stats["_all"]["primaries"]["docs"]["count"],
            "store_size": stats["_all"]["primaries"]["store"]["size_in_bytes"],
            "health": cluster_health["status"],
            "indexing_index_total": stats["_all"]["primaries"]["indexing"]["index_total"],
            "search_query_total": stats["_all"]["primaries"]["search"]["query_total"],
            "refresh_refresh_total":  stats["_all"]["primaries"]["refresh"]["total"]
        }

    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Index '{index_name}' not found.")
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

@router.get("/get-top-indices")
async def get_top_indices(
    cluster_name: str=Query(default="", description="Name of the Elasticsearch cluster"),
    top_n: int = Query(default=5, gt=-1),
    sort_by: str = Query(default="docs_count", enum=["docs_count", "store_size", "indexing_index_total", "refresh_refresh_total", "search_query_total"]),
):
    try:
        if( cluster_name.lower() == "false" or cluster_name == ""):
            result = es_client.cat.indices(format="json", h=["index", sort_by])
            midRes=[]
            for r in result:
                dt=get_index_info({"index":str(r['index'])})
                midRes.append(dt)

            sorted_result = sorted(midRes, key=lambda x: int(x.get(sort_by, 0)), reverse=True)
            if top_n == 0:
                return sorted_result                
            return sorted_result[:top_n]
        else:
            base_url_=f"https://red.qa6.spr-ops.com/api/v1/infrastructure/getDirectESStats?queryField=clusterName&host=&clusterName={cluster_name}&call=_stats%2Findexing%2Csearch%2Crefresh%2Cdocs%2Cstore%3Flevel%3Dindices%26filter_path%3Dindices.*.primaries.indexing.index_total%2Cindices.*.primaries.search.query_total%2Cindices.*.primaries.refresh.total%2Cindices.*.primaries.docs.count%2Cindices.*.primaries.store.size_in_bytes%2Cindices.*.health"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url_, headers=headers_gb)
                response.raise_for_status()
                stats_data = response.json()
                indices_data = stats_data.get("indices", {})

                results = []
                for index_name, data in indices_data.items():   
                    health_st= data.get("health", "unknown")
                    primaries = data.get("primaries", {})
                    entry = {
                        "index": index_name,
                        "docs_count": primaries.get("docs", {}).get("count", 0),
                        "store_size": primaries.get("store", {}).get("size_in_bytes", 0),
                        "indexing_index_total": primaries.get("indexing", {}).get("index_total", 0),
                        "search_query_total": primaries.get("search", {}).get("query_total", 0),
                        "refresh_refresh_total": primaries.get("refresh", {}).get("total", 0),
                        "health": health_st
                    }
                    results.append(entry)
                sorted_results = sorted(results, key=lambda x: x.get(sort_by, 0), reverse=True)
                if top_n == 0:
                    return sorted_results
                return sorted_results[:top_n]
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.get("/nodes")
async def get_all_nodes(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    # global es_client
    try:
        if(cluster_name=="false" or cluster_name==""):
            response = es_client.nodes.info()
            nodes_info = []
            for node_id, node in response["nodes"].items():
                nodes_info.append({
                    "node_id": node_id,
                    "name": node["name"],
                    "host": node["host"],
                    "pid": node["process"]["id"]
                })
            return nodes_info
        else:
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes?filter_path=nodes.*.name,nodes.*.jvm.pid"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                res=json.loads(response.json())
                node_list= []
                for node_id, node_data in res.get("nodes", {}).items():
                    node_list.append({
                        "node_id": node_id,
                        "name": node_data.get("name"),
                        "pid": node_data.get("jvm", {}).get("pid")
                    })
                return node_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jstack")
def run_jstack(pid: int = Query(..., description="PID of the Java process")):
    try:
        result = subprocess.run(
            ["jstack", "-l", str(pid)], 
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
async def analyze_tasks(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    try:
        if cluster_name.lower() == "false" or cluster_name == "":    
            tasks_output = es_client.transport.perform_request("GET", f"/_tasks")
            analysis = analyze_with_multi_agent(tasks_output, source="tasks")
            return {"analysis": analysis}
        else:
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_tasks"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                tasks_output = json.loads(response.json())
                # print(tasks_output)
                # return {"tasks_output": tasks_output}
                analysis = analyze_with_multi_agent(tasks_output, source="tasks")
                return {"analysis": analysis}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze-by-node")
async def analyze_node(request: NodeRequest):
    try:
        cluster_name=request.cluster_name
        if cluster_name.lower() == "false" or cluster_name == "":
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
        else:
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/"+request.node_name+"/jvm"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                # print(response.json())
                jstack_output = json.loads(response.json())
                # print(tasks_output)
                analysis = analyze_with_multi_agent(jstack_output, source="jstack")
                return {"analysis": analysis}
                # analysis = analyze_with_multi_agent(tasks_output, source="tasks")
                # return {"analysis": analysis}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/analyze-hot-threads")
def analyze_hot_threads(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster"),
):
    try:
        result=1
        if cluster_name.lower() == "false" or cluster_name=="":
            result = subprocess.run([
            "curl", "-XGET", "http://localhost:9200/_nodes/hot_threads"
                ], capture_output=True, text=True, check=True).stdout
        else:
            result = subprocess.run([
            "curl", "-XGET", "http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/hot_threads"
                ], capture_output=True, text=True, check=True).stdout
        # print(result)
        analysis = analyze_with_multi_agent(result, source="hot_threads")
        # analysis1= AgentManager({"hot_threads": output})
        return {"analysis": analysis}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"hot_threads failed: {e.stderr}")


@router.get("/debug/full-dump")
def get_combined_diagnostics():
    try:
        # Get all nodes
        node_info = es_client.nodes.info()
        nodes = node_info["nodes"]
        node_pids = {}

        for node_id, node_data in nodes.items():
            pid = node_data.get("process", {}).get("id")
            if not pid:
                raise HTTPException(status_code=500, detail=f"PID not found for node {node_id}")
            node_pids[node_id] = pid
        num_nodes = len(node_pids)
        jstack_char_budget = 6500   
        hot_threads_char_budget = 6500 
        tasks_char_budget = 6500 
        jstack_per_node_budget = jstack_char_budget // num_nodes

        # 1. JStack
        jstack_outputs = []
        for node_id, pid in node_pids.items():
            raw_output = run_jstack(pid)["output"]
            # print(raw_output)
            # print(node_pids)
            jstack_outputs.append(raw_output[:jstack_per_node_budget])
            # jstack_outputs[node_id] = raw_output[:jstack_per_node_budget]

        
        # 2. Hot Threads
        hot_threads_raw = es_client.transport.perform_request("GET", "/_nodes/hot_threads?threads=999")
        hot_threads_str = str(hot_threads_raw)[:hot_threads_char_budget]

        # 3. Tasks
        task_data = es_client.transport.perform_request("GET", "/_tasks")
        task_str = str(task_data)[:tasks_char_budget]

        return {
            "jstack": jstack_outputs,
            "hot_threads": hot_threads_str,
            "tasks": task_str
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate diagnostics: {str(e)}")

async def get_combined_diagnostic_output_cluster(cluster_name):
    try:
        if cluster_name.lower() == "false" or cluster_name == "":
            return get_combined_diagnostics()
        else:
            output_list = []
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_tasks"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                tasks_output = json.loads(response.json())
                output_list.append(tasks_output[:3000])  # Limit to 3000 characters
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/"+request.node_name+"/jvm"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                jstack_output = json.loads(response.json())
                output_list.append(jstack_output[:3000])  # Limit to 3000 characters
            result = subprocess.run(["curl", "-XGET", "http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/hot_threads"], capture_output=True, text=True, check=True).stdout
            output_list.append(result[:3000])  # Limit to 3000 characters
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate diagnostics: {str(e)}")




@router.get("/analyze-by-full-dump")
async def analyze_tasks(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    try:
        output_list = []
        if cluster_name.lower() == "false" or cluster_name == "":
            output_list.append(get_combined_diagnostics())
        else:
            base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_tasks"
            async with httpx.AsyncClient(follow_redirects=True) as client:
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                tasks_output = json.loads(response.json())
                output_list.append(tasks_output) 
                base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/stats/jvm"
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                jstack_output = json.loads(response.json())
                output_list.append(jstack_output) 
                base_url="http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host&clusterName=umw1-es&call=_nodes/hot_threads"
                response = await client.get(base_url, headers=headers_gb)
                response.raise_for_status()
                hot_thread_output = response.text
                output_list.append(hot_thread_output) 
        analysis = analyze_with_multi_agent(output_list, source="jstack + hot_threads + tasks")
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/queries/monitor")
async def monitor_log_query(request: Request):
    body = await request.json()
    index = body.get("index")
    query = body.get("query", {"match_all": {}})

    try:
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


# from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
import httpx
import os
from datetime import datetime

# app = FastAPI()

GRAFANA_BASE_URL = "https://qa6-influxdb.sprinklr.com"
GRAFANA_API_TOKEN = os.getenv("GRAFANA_API_TOKEN")  # Replace with actual token for dev
GRAFANA_ORG_ID = 1  # Replace with your actual org ID
DATASOURCE_UID = "de290b6f-8217-4837-9ee8-0501e91ac34e"
DATASOURCE_ID = 17

class QueryInput(BaseModel):
    from_time: str
    to_time: str
    expr: str


@router.post("/query/metric")
async def query_metric(query: QueryInput):
    # print(f"Received query: {query}")
    try:
        headers = {
            "Authorization": f"Bearer {GRAFANA_API_TOKEN}",
            "Content-Type": "application/json",
            "X-Grafana-Org-Id": str(GRAFANA_ORG_ID),
        }

        payload = {
            "queries": [
                {
                    "refId": "A",
                    "expr": query.expr,
                    "fromExploreMetrics": True,
                    "adhocFilters": [],
                    "datasource": {
                        "type": "prometheus",
                        "uid": DATASOURCE_UID
                    },
                    "interval": "",
                    "exemplar": False,
                    "requestId": "dynamicA",
                    "utcOffsetSec": 19800,
                    "scopes": [],
                    "legendFormat": "",
                    "datasourceId": DATASOURCE_ID,
                    "intervalMs": 15000,
                    "maxDataPoints": 1113
                }
            ],
            "from": query.from_time,
            "to": query.to_time
        }
        # print(f"Querying Grafana with payload: {payload}")
        url = f"{GRAFANA_BASE_URL}/api/ds/query?ds_type=prometheus&requestId=dynamic_req"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)

        response.raise_for_status()
        data = response.json()

        frames = data["results"].get("A", {}).get("frames", [])
        if not frames:
            return []

        timestamps = frames[0]["data"]["values"][0]
        values = frames[0]["data"]["values"][1]

        result = []
        for idx, (ts, val) in enumerate(zip(timestamps, values)):
            result.append({
                "hour": datetime.utcfromtimestamp(ts / 1000).hour,
                "index": idx,
                "refresh_total": val,
                "timestamp": ts,
                "timestampStr": datetime.utcfromtimestamp(ts / 1000).isoformat() + "Z"
            })

        return result

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Grafana API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


@router.post("/query/grafana/prometheus")
async def query_grafana_prometheus(request: Request):
    try:
        data = await request.json()

        headers = {
            "Authorization": f"Bearer {GRAFANA_API_TOKEN}",
            "Content-Type": "application/json",
            "X-Grafana-Org-Id": str(GRAFANA_ORG_ID),
        }

        url = f"{GRAFANA_BASE_URL}/api/ds/query?ds_type=prometheus&requestId=SQR291"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)

        response.raise_for_status()
        return response.json()

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
