# type: ignore
import time
from fastapi.responses import JSONResponse
from fastapi import APIRouter, HTTPException, Query, Request
from app.core.es import get_es_client
import subprocess
import os
import httpx
from pydantic import BaseModel #,HttpUrl
# import asyncio
from groq import Groq
from agno.agent import Agent
from agno.models.groq import Groq


# from elasticsearch import exceptions 
# import elasticsearch
from elasticsearch import Elasticsearch
# from elasticsearch.exceptions import TransportError, NotFoundError, RequestError


router = APIRouter()
# es = get_es_client()
# es = Elasticsearch("http://localhost:9200")  # Adjust host as needed

es_client =  Elasticsearch("http://localhost:9200")  

# class LocalClusterConfig(BaseModel):
#     type: str  # should be 'local'
#     url: HttpUrl

class ClusterConfig(BaseModel):
    type: str  # should be 'cloud'
    url: str
    username: str
    password: str

class PIDRequest(BaseModel):
    pid: int

class NodeNameRequest(BaseModel):
    node_name: str

# ClusterConfig = LocalClusterConfig | CloudClusterConfig

@router.post("/init-client")
async def init_elasticsearch_client(config: ClusterConfig):
    global es_client

    try:
        if config.type == 'cloud' or config.type == 'local':
            es_client = Elasticsearch(
                config.url,
                basic_auth=(config.username, config.password)
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid cluster type")

        # Test the connection
        if not es_client.ping():
            raise HTTPException(status_code=500, detail="Failed to connect to Elasticsearch cluster")

        return {"message": "Elasticsearch client initialized successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_es_client():
    if not es_client:
        raise RuntimeError("Elasticsearch client is not initialized. Call /init-client first.")
    return es_client

USE_OLLAMA = False
USE_GROQ = True
# USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() == "true"
# USE_GROQ = os.getenv("USE_GROQ", "false").lower() == "true"
# OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
# OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY)


@router.get("/")
def root():
    return {"message": "FastAPI connected to Elasticsearch"}

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
    """
    Returns information about a specific index: name, document count, size, health, etc.
    Example request body:
    {
        "index": "your_index_name"
    }
    """
    es = get_es_client()
    if es is None:
        raise HTTPException(status_code=400, detail="Elasticsearch client is not initialized.")

    index_name = payload.get("index")
    if not index_name:
        raise HTTPException(status_code=422, detail="Index name is required.")

    try:
        # Get basic stats
        stats = es.indices.stats(index=index_name)
        doc_count = stats["_all"]["primaries"]["docs"]["count"]
        size_in_bytes = stats["_all"]["primaries"]["store"]["size_in_bytes"]

        # Get index health
        cluster_health = es.cluster.health(index=index_name)
        health_status = cluster_health["status"]

        return {
            "index_name": index_name,
            "doc_count": doc_count,
            "size_in_bytes": size_in_bytes,
            "health_status": health_status
        }

    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Index '{index_name}' not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @router.get("/top-indices")
# def top_indices(n: int = 3):
#     try:
#         result = es_client.cat.indices(format="json", h=["index", "docs.count"])
#         sorted_result = sorted(result, key=lambda x: int(x["docs.count"]), reverse=True)
#         return sorted_result[:n]
#     except Exception as e:   
#         raise HTTPException(status_code=500, detail=str(e))



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

@router.get("/index/search")
def search_index(index: str = Query(...), q: str = Query(...)):
    try:
        body = {
            "query": {
                "match": {
                    "name": q
                }
            }
        }
        result = es_client.search(index=index, body=body)
        return [hit["_source"] for hit in result["hits"]["hits"]]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/index/document")
def index_document(index: str = Query(...), id: int = Query(...), name: str = Query(...), price: float = Query(...)):
    try:
        doc = {
            "name": name,
            "price": price
        }
        res = es_client.index(index=index, id=id, document=doc)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


async def query_llm(prompt: str) -> str:
    if USE_OLLAMA:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False}
            )
            resp.raise_for_status()
            return resp.json().get("response", "").strip()

    elif USE_GROQ:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "deepseek-r1-distill-llama-70b",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.6,
                    "max_tokens": 1024,
                    "top_p": 0.95,
                    "stream": False
                },
                timeout=30
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    else:
        import openai
        openai.api_key = OPENAI_API_KEY
        chat_resp = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        return chat_resp["choices"][0]["message"]["content"]


@router.post("/analyze")
async def analyze_issues(request: Request):
    try:
        body = await request.json()
        jstack_output = body.get("jstack_output")
        logs = body.get("logs", "")
        heap_dump = body.get("heap_dump", "")

        if not jstack_output:
            raise HTTPException(status_code=400, detail="jstack_output is required")

        prompt = f"""
        You are a JVM diagnostics expert. Analyze the following JVM information:

        === JSTACK OUTPUT ===\n{jstack_output}\n
        === LOGS ===\n{logs}\n
        === HEAP DUMP (summary) ===\n{heap_dump}\n
        Identify performance issues, deadlocks, or memory issues and provide suggestions.
        """

        analysis = await query_llm(prompt)
        return {"analysis": analysis}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class PIDRequest(BaseModel):
    pid: int

def run_jstack(pid: int, count: int = 3, interval: int = 1) -> str:
    outputs = []
    for _ in range(count):
        try:
            result = subprocess.run(["jstack", str(pid)], capture_output=True, text=True, check=True)  #Using jcmd instead of jstack for better formatted results
            outputs.append(result.stdout)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"jstack failed: {e.stderr}")
        time.sleep(interval)
    return "\n\n---\n\n".join(outputs)

def analyze_with_groq(jstack_output: str) -> str:
    # Truncate to first 5000 tokens (~20000 characters is a rough approximation)
    truncated_output = jstack_output[:20000]

    prompt = f"""You are a Java performance engineer. Analyze the following jstack output and return a clean, concise summary (max 10 lines) of only these issues if found:
        1. Deadlocks
        2. High CPU-consuming threads
        3. Threads stuck in I/O or GC pauses
        4. Thread pool contention or bottlenecks

        Avoid internal thoughts or reasoning (e.g., <think> or explanations). Only output a structured summary under the heading "Performance Analysis Summary", using bullet points or numbered list. Do not repeat the jstack content or describe detection logic.


        Keep your summary concise in form of 4 points  (each in 1 lines), for above 4 problems.
        Your output should look like this:
        **Performance Analysis Summary:**

        1. No deadlocks detected.
        2. Thread "C2 CompilerThread0" using high CPU: 78409ms.
        3. No threads appear stuck in I/O or GC.
        4. Multiple Elasticsearch threads in TIMED_WAITING, suggesting possible thread pool contention.
{truncated_output}
"""

    try:
        chat_completion = groq_client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[
                {"role": "system", "content": "You are a Java performance engineer."},
                {"role": "user", "content": prompt}
            ]
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GROQ API call failed: {str(e)}")

@router.post("/auto-analyze")
def analyze_jstack(request: PIDRequest):
    jstack_output = run_jstack(request.pid)
    analysis = analyze_with_groq(jstack_output)
    return {"analysis": analysis}

class QueryRequest(BaseModel):
    index: str
    query: dict = {"match_all": {}}



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


# Store agent configuration
# groq_client = Groq(api_key="your-groq-api-key")

def create_analysis_agent():
    instructions = """
    You are an experienced Java performance engineer with deep expertise in analyzing Java thread dumps and Elasticsearch internals.

    Your job is to analyze the given diagnostic output (like jstack or hot_threads), and return a two-part response:

    1. **Performance Analysis Summary**: A concise 4-point summary focused on:
       - Deadlocks
       - High CPU-consuming threads
       - I/O or GC stalls
       - Thread pool contention

    2. **Detailed Explanation and Fixes**: Explanation of each issue, its significance, and actionable recommendations (including JVM or Elasticsearch tuning tips).

    Do not repeat raw logs. Use bullet points or short paragraphs. Language should be concise, professional, and easy to understand.
    """

    return Agent(
        model=Groq(
            id="deepseek-r1-distill-llama-70b",
            temperature=0.6,
            max_tokens=1024,
            top_p=0.95
        ),
        markdown=True,
        instructions=[instructions]
    )

analysis_agent = create_analysis_agent()

def analyze_with_agent(diagnostic_output: str, source: str = "jstack") -> str:
    truncated_output = diagnostic_output[:20000]
    try:
        response = analysis_agent.run("""
        Please analyze the following diagnostic output from {}:

        {}
        """.format(source.upper(), truncated_output)).content
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent analysis failed: {str(e)}")

class PIDRequest(BaseModel):
    pid: int

def run_jstack(pid: int, count: int = 3, interval: int = 1) -> str:
    outputs = []
    for _ in range(count):
        try:
            result = subprocess.run(["jstack", str(pid)], capture_output=True, text=True, check=True)
            outputs.append(result.stdout)
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"jstack failed: {e.stderr}")
        time.sleep(interval)
    return "\n\n---\n\n".join(outputs)


class NodeRequest(BaseModel):
    node_name: str

@router.post("/analyze-by-node")
def analyze_node(request: NodeRequest):
    es = Elasticsearch("http://localhost:9200")
    try:
        nodes_info = es.nodes.info()
        pid = None
        for node_id, node_data in nodes_info["nodes"].items():
            if node_data["name"] == request.node_name:
                pid = node_data["process"]["id"]
                break
        if pid is None:
            raise HTTPException(status_code=404, detail="Node not found or missing PID")
        jstack_output = run_jstack(pid)
        analysis = analyze_with_agent(jstack_output, source="jstack")
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
        analysis = analyze_with_agent(output, source="hot_threads")
        return {"analysis": analysis}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"hot_threads failed: {e.stderr}")


# def run_jstack(pid: int, count: int = 3, interval: int = 1) -> str:
#     outputs = []
#     for _ in range(count):
#         try:
#             result = subprocess.run(["jstack", str(pid)], capture_output=True, text=True, check=True)
#             outputs.append(result.stdout)
#         except subprocess.CalledProcessError as e:
#             raise HTTPException(status_code=500, detail=f"jstack failed: {e.stderr}")
#         time.sleep(interval)
#     return "\n\n---\n\n".join(outputs)

# def analyze_with_groq(jstack_output: str) -> str:
#     truncated_output = jstack_output[:20000]
#     prompt = f"""You are a Java performance engineer. Analyze the following jstack output and return a clean, concise summary (max 10 lines) of only these issues if found:
#         1. Deadlocks
#         2. High CPU-consuming threads
#         3. Threads stuck in I/O or GC pauses
#         4. Thread pool contention or bottlenecks

#         Avoid internal thoughts or reasoning (e.g., <think> or explanations). Only output a structured summary under the heading \"Performance Analysis Summary\", using bullet points or numbered list. Do not repeat the jstack content or describe detection logic.

#         Keep your summary concise in form of 4 points  (each in 1 lines), for above 4 problems.
#         Your output should look like this:
#         **Performance Analysis Summary:**

#         1. No deadlocks detected.
#         2. Thread \"C2 CompilerThread0\" using high CPU: 78409ms.
#         3. No threads appear stuck in I/O or GC.
#         4. Multiple Elasticsearch threads in TIMED_WAITING, suggesting possible thread pool contention.
# {truncated_output}
# """
#     try:
#         chat_completion = groq_client.chat.completions.create(
#             model="deepseek-r1-distill-llama-70b",
#             messages=[
#                 {"role": "system", "content": "You are a Java performance engineer."},
#                 {"role": "user", "content": prompt}
#             ]
#         )
#         return chat_completion.choices[0].message.content
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"GROQ API call failed: {str(e)}")

# @router.post("/analyze-by-node")
# def analyze_node_by_name(req: NodeNameRequest):
#     global es_client
#     try:
#         nodes_info = es_client.nodes.info()
#         for node_id, node in nodes_info["nodes"].items():
#             if node["name"] == req.node_name:
#                 pid = node["process"]["id"]
#                 jstack_output = run_jstack(pid)
#                 analysis = analyze_with_groq(jstack_output)
#                 return {"analysis": analysis}
#         raise HTTPException(status_code=404, detail="Node not found")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @router.post("/analyze-hot-threads")
# def analyze_hot_threads():
#     global es_client
#     try:
#         hot_threads_output = es_client.nodes.hot_threads()
#         analysis = analyze_with_groq(hot_threads_output)
#         return {"analysis": analysis}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))


@router.get("/queries/indices")
def list_indices():
    try:
        indices = es_client.indices.get_alias("*")
        return {"indices": list(indices.keys())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list indices: {e}")


@router.post("/queries/monitor")
async def monitor_query(request: Request):
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
