import os
import json
import httpx
import json
import httpx
import tiktoken
import subprocess
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query
from app.core.models import QueryInput,ChatMessage,ts_init,ChatMessagee

load_dotenv()
router = APIRouter()

GRAFANA_BASE_URL = os.getenv("GRAFANA_BASE_URL") 
GRAFANA_API_TOKEN = os.getenv("GRAFANA_API_TOKEN") 
GRAFANA_ORG_ID = os.getenv("GRAFANA_ORG_ID")  
DATASOURCE_UID = os.getenv("DATASOURCE_UID")  
DATASOURCE_ID = os.getenv("DATASOURCE_ID")  
RED_API_TOKEN = os.getenv("RED_API_TOKEN")  
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_URL = os.getenv("OPENAI_URL")

headers_gb = {
    "X-RED-API-TOKEN": RED_API_TOKEN,
    "Accept": "*/*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
}

headers_llm = {
    "Content-Type": "application/json",
    "X-API-KEY":  OPENAI_API_KEY,
    "user_id": "66015482",
    "workspace_id": "66000002"
}

headers = [
    "-H", f"X-RED-API-TOKEN: {RED_API_TOKEN}",
    "-H", "Accept: application/json",
    "-H", "X-Requested-With: XMLHttpRequest"
]


@router.get("/")
def root():
    return {"message": "FastAPI initialised successfully"}


@router.get("/cluster-list")
async def get_cluster_list():
    url = "https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getnodeSpecificEsInfo"
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, headers=headers_gb)
            response.raise_for_status()
            full_data = response.json()
            response_data = []
            for cluster in full_data:
                response_data.append({
                    "clusterName": cluster.get("clusterName", ""),
                    "clusterHost": cluster.get("esClusterNodeInfos", [])[0].get("ip", ""),
                })
            return response_data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")


@router.get("/get-direct-es-stats")
async def get_direct_es_indices(
    queryField: str = Query(""),
    host: str = Query(""),
    call: str = Query("")
):
    base_url = "https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats"
    params = {
        "queryField": queryField,
        "host": host,
        "call": call,
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(base_url,params=params, headers=headers_gb)
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
        base_url=f"http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host={cluster_name}&call=_cluster/health"
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(base_url)
            response.raise_for_status()
            cluster_health = json.loads(response.json())
            return cluster_health
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_cat_value(value):
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
        base_url_=f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=clusterName&host={cluster_name}&call=_stats%2Findexing%2Csearch%2Crefresh%2Cdocs%2Cstore%3Flevel%3Dindices%26filter_path%3Dindices.*.primaries.indexing.index_total%2Cindices.*.primaries.search.query_total%2Cindices.*.primaries.refresh.total%2Cindices.*.primaries.docs.count%2Cindices.*.primaries.store.size_in_bytes%2Cindices.*.health"
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
    try:
        base_url=f"http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host={cluster_name}&call=_nodes?filter_path=nodes.*.name,nodes.*.jvm.pid"
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


def genPayload(prompt):
    payload_d  = {
            "partnerId": 99999989,
            "provider": "OPEN_AI",
            "genAIRequest":
            {
                "type": "chat-completion",
                "request":
                {
                    "model": "gpt-4o-mini",
                    "temperature": 1,
                    "messages":
                    [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
            }
        }
    return payload_d

@router.get("/analyze-by-tasks")
async def analyze_tasks(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster"),
    node_name: str = Query(default="", description="Name of the Elasticsearch node")
):
    try:
        result = subprocess.run([
        "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_tasks?nodes={node_name}"
            ]+headers, capture_output=True, text=True, check=True).stdout
        url = OPENAI_URL
        prompt_TK=f"You are an expert in Elasticsearch performance. Analyze the GET /_tasks output and provide a clear, customer-facing summary. Your response should: List each node and summarize its running tasks. For each task: Explain its purpose based on the action field. Classify the task (e.g., search, indexing, monitoring, geoip). Flag long-running, cancellable, or failed tasks. Highlight parent-child relationships and distributed chains. Identify patterns or anomalies (e.g., task spikes, delays). Recommend actions if needed (e.g., cancel tasks, tune workloads). Format the output cleanly by node and task. The task data is: {result}"
        payload_TK= genPayload(prompt_TK)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers_llm, json=payload_TK)
                response.raise_for_status()
                output = {"analysis":response.json().get("response", {}).get("choices", {})[0].get("message", {}).get("content", "No content found")}
                return output
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="Upstream request to LLM timed out.")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(exc)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analyze-by-node")
async def analyze_node(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster"),
    node_name: str = Query(default="", description="Name of the Elasticsearch node")
):
    try:
        result = subprocess.run([
            "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_nodes/"+node_name+"/jvm"
        ]+headers, capture_output=True, text=True, check=True).stdout
        # return result
        url = OPENAI_URL
        prompt_JVM=f"You are an expert in Elasticsearch JVM performance diagnostics. Analyze the output from the /_nodes/jvm API and provide a structured, customer-ready summary. For each node, include: Node name and IP. Heap memory usage: compare heap_init, heap_max, and current usage. Note if usage is close to heap_max. GC activity: list GC collectors and comment on whether GC activity seems high or abnormal. JVM arguments: highlight any notable tuning flags (e.g. GC configs, heap settings). Memory pools: identify pressure in areas like Eden, Survivor, or Old Gen. Java version, VM vendor, and bundled JDK usage. Call out potential performance issues (e.g., heap pressure, frequent GCs, inadequate JVM tuning) and suggest improvements if any. Organize the output node-wise using bullet points or sections. The jvm stats is: {result}"
        payload_JVM= genPayload(prompt_JVM)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers_llm, json=payload_JVM)
                response.raise_for_status()
                output = {"analysis":response.json().get("response", {}).get("choices", {})[0].get("message", {}).get("content", "No content found")}
                return output
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="Upstream request to LLM timed out.")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(exc)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/analyze-hot-threads")
async def analyze_hot_threads(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster"),
    node_name: str = Query(default="", description="Name of the Elasticsearch node")
):
    try:
        result = subprocess.run([
        "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_nodes%2F{node_name}%2Fhot_threads%3Fthreads%3D3%26interval%3D3s%26snapshots%3D10%26ignore_idle_threads%3Dfalse"
            ]+headers, capture_output=True, text=True, check=True).stdout
        url = OPENAI_URL
        prompt_HT=f"You are an expert in Elasticsearch performance analysis. Analyze the output from the _nodes/hot_threads API and provide a clear, customer-ready summary. Your response should: Identify each node and summarize its hot threads individually. For each thread, explain what it is doing based on the stack trace and highlight any blocking, repetitive, or unusual activity. Classify thread activity (e.g., garbage collection, search, indexing). Note any idle or sleeping threads. Highlight system-wide patterns or anomalies. Recommend mitigations if applicable (e.g., tuning, query optimization, heap issues). Present the findings in a clear, structured format—by node and by thread. Do not skip any thread. The hot threads output is :  {result}"
        payload_HT= genPayload(prompt_HT)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers_llm, json=payload_HT)
                response.raise_for_status()
                output = {"analysis":response.json().get("response", {}).get("choices", {})[0].get("message", {}).get("content", "No content found")}
                return output
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="Upstream request to LLM timed out.")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(exc)}")
            
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"hot_threads failed: {e.stderr}")


def get_combined_diagnostic_output_cluster(cluster_name):
    try:
        output_list = []
        output_list.append("tasks_output:")
        result = subprocess.run([
        "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_tasks"
            ]+headers, capture_output=True, text=True, check=True).stdout
        output_list.append(result) 
        output_list.append("JVM_output:")
        result = subprocess.run([
            "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_nodes/jvm"
        ]+headers, capture_output=True, text=True, check=True).stdout
        output_list.append(result) 
        output_list.append("Hot_thread_output:")
        result = subprocess.run([
        "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call=_nodes%2Fhot_threads%3Fthreads%3D3%26interval%3D3s%26snapshots%3D10%26ignore_idle_threads%3Dfalse"
            ]+headers, capture_output=True, text=True, check=True).stdout
        output_list.append(result)
        return output_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate diagnostics: {str(e)}")

@router.get("/analyze-by-full-dump")
async def analyze_tasks(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    try:
        output_list = get_combined_diagnostic_output_cluster(cluster_name)
        url = OPENAI_URL
        prompt_FULL=f"You are an expert in Elasticsearch performance diagnostics. You will be provided with combined outputs from the following APIs: /_tasks: for all running or queued cluster tasks. /_nodes/hot_threads: to detect thread contention or blocking. /_nodes/jvm: for JVM memory and GC analysis. Your goal is to: Analyze each output to identify any performance bottlenecks, unusual behavior, or system health risks. Summarize overall health clearly (e.g., “System healthy” or “Performance issues found”). If issues exist, explain root causes (e.g., excessive GC, blocked threads, long-running tasks). Suggest specific remediation steps (e.g., tune JVM flags, optimize queries, rebalance nodes). Keep the response structured, professional, and understandable by operations teams. Do not quote back large portions of the input. Instead, explain insights derived from it. The combined outputs follow: {output_list}"
        payload_FULL= genPayload(prompt_FULL)
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers_llm, json=payload_FULL)
                response.raise_for_status()
                output = {"analysis":response.json().get("response", {}).get("choices", {})[0].get("message", {}).get("content", "No content found")}
                return output
        except httpx.ReadTimeout:
            raise HTTPException(status_code=504, detail="Upstream request to LLM timed out.")
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Request failed: {str(exc)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")



@router.post("/query/metric")
async def query_metric(query: QueryInput):
    try:
        headers_grafana = {
            "Authorization": f"Bearer {GRAFANA_API_TOKEN}",
            "Content-Type": "application/json",
            "X-Grafana-Org-Id": str(GRAFANA_ORG_ID),
        }
        payload_grafana = {
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
            response = await client.post(url, headers=headers_grafana, json=payload_grafana)

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
                query.metric_name: val,
                "timestamp": ts,
                "timestampStr": datetime.utcfromtimestamp(ts / 1000).isoformat() + "Z"
            })
        return result

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Grafana API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")


def gen_chatbot_Payload(prompt):
    payload_d  = {
            "partnerId": 99999989,
            "provider": "OPEN_AI",
            "genAIRequest":
            {
                "type": "chat-completion",
                "request":
                {
                    "model": "gpt-4o-mini",
                    "temperature": 1,
                    "messages": prompt
                }
            }
        }
    return payload_d

def count_tokens(messages: List[Dict], model: str = "gpt-4o-mini") -> int:
    encoding = tiktoken.encoding_for_model(model)
    tokens = 0
    for msg in messages:
        tokens += 4
        tokens += len(encoding.encode(msg["content"]))
    return tokens

class ChatContext:
    def __init__(self, max_tokens=400000):
        self.history: List[Dict[str, str]] = []
        self.max_tokens = max_tokens
        self.system_prompt_added = False

    def add_user_message(self, content: str):
        self.history.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str):
        self.history.append({"role": "assistant", "content": content})

    def add_system_message(self, content: str):
        self.history.append({"role": "system", "content": content})

    def set_initial_debug_stats_context(self, debug_data: str):
        system_prompt = (
            "You are a skilled Elasticsearch debugging assistant. Analyze issues from initial system data provided, "
            "Give very concise and typically short answers"
            "which includes hot thread output, running tasks, and JVM diagnostics. Use this to guide your answers "
            "in a concise, professional tone, helping diagnose root causes and suggesting fixes. Keep your answers in as less words as possible."
        )
        self.history.clear()
        self.history.insert(0, {"role": "system", "content": system_prompt})
        self.history.append({"role": "user", "content": f"Initial stats Data:\n{debug_data}"})
        self.system_prompt_added = True
    
    def set_initial_debug_ts_context(self, debug_data: str):
        system_prompt = (
            "You are a skilled Elasticsearch performance analyst. You are provided with time-series metrics for an index, "
            "Give very concise and typically short answers"
            "this will include data of any one metric like refresh_total, search_total, index_total, docs_count, and size_stored etc "
            "Your role is to analyze patterns, detect anomalies, highlight unusual spikes or drops, and provide concise explanations "
            "of trends. Help identify possible causes of performance issues and suggest improvements. Keep responses clear, professional, "
            "and brief."
        )
        self.history.clear()
        self.history.insert(0, {"role": "system", "content": system_prompt})
        self.history.append({"role": "user", "content": f"Initial Time series Data of metric:\n{debug_data}"})
        self.system_prompt_added = True
    
    def add_tool_response(self, tool_name: str, content: str):
        self.history.append({"role": "system", "content": "Answer the above users question based on this output generated using GET "+tool_name+" : "+content})
    
    def set_initial_tool_call_context(self):
        system_prompt = (
            "You are an expert Elasticsearch assistant designed to interact in a multi-step diagnostic process. Follow these rules strictly: "
            "For every user message, first determine whether the message indicates a need for an Elasticsearch API endpoint. If it does, respond only with: yes. If it is diagnostic data intended for processing or analysis, respond only with: no. Do not add any explanation, formatting, or additional text."
            "If the previous reply was yes (i.e., the message required an Elasticsearch API), and you're asked for an API endpoint: Respond with only one GET-type endpoint. The endpoint must be executable directly in Kibana DevTools without error. Avoid endpoints that require parameters unless you provide the full, valid request body. Do not return incomplete or partial requests like _cluster/allocation/explain without the necessary fields. Output the endpoint or request in plain string only — no formatting, no 'GET', no quotes, no additional text."
            "If the previous reply was no (i.e., the message was diagnostic data), use the provided data to answer the last API-related question. Keep the response professional, concise, and directly related to the question. Provide actionable insights if possible."
            "Always follow this structure for every interaction."
            "Do not include 'GET' in your endpoint and do not assume or insert index names unless provided. Always prefer generic, directly executable API calls."
            "Do not return this endpoints for any shard related queries because these requires particular node_nade and shard info : '_cluster/allocation/explain' , instead suggest '_cat/shards' "
            "For tasks related queries, use this ES API Endpoint : /_tasks "
            "Here are few example where you should give API endpoints based answer and where not:"
            " What is the current cluster health status? : yes, Then endpoint: _cluster/health"
            " Can you show the node stats for all nodes? : yes, Then endpoint: _nodes/stats"
            " Are there any pending tasks in the cluster? : yes, Then endpoint: _cluster/pending_tasks"
            " Need the cluster allocation state. : yes, Then endpoint: _cluster/allocation/explain (with body specifying index and shard)"
            " Show current indexing rate of the cluster. : yes, Then endpoint: _nodes/stats/indices"
            " I want to check the JVM usage of each node. : yes, Then endpoint: _nodes/stats/jvm"
            " Give me jvm data summary  : yes, Then endpoint: _nodes/stats/jvm"
            " {'cluster_name': 'es-cluster', 'status': 'green', 'number_of_nodes': 3, 'number_of_data_nodes': 2} : no"
            " [{ 'timestamp': '2025-07-15T12:00:00Z', 'refresh_total': 4.6 }, { 'timestamp': '2025-07-15T12:01:00Z', 'refresh_total': 4.8 }] : no"
            " This is the hot_threads output showing G1 GC activity and high CPU from a long-running search query on node-1. : no"
            
        )
        self.history.clear()
        self.history.insert(0, {"role": "system", "content": system_prompt})
        self.system_prompt_added = True


    def get_trimmed_history(self, model: str = "gpt-4o-mini") -> List[Dict[str, str]]:
        while count_tokens(self.history, model=model) > self.max_tokens:
            print("popping")
            self.history.pop(1)
        return self.history
    


@router.get("/chat/init-stats-debug") 
async def initialize_debug_context(
    cluster_name: str = Query(default="false", description="Name of the Elasticsearch cluster")
):
    debug_data=get_combined_diagnostic_output_cluster(cluster_name)
    debug_input = str(debug_data)
    shared_context.set_initial_debug_stats_context(debug_input)
    return {"status": "Chatbot initialised successfully!"}


@router.post("/chat/init-ts-debug")
async def initialize_debug_context(arg : ts_init):
    extracted_third_values = []
    for item in arg.data:
        if len(item) >= 3:
            third_key = list(item.keys())[2]
            third_value = item[third_key]
            extracted_third_values.append({third_key: third_value})

    shared_context1.set_initial_debug_ts_context(extracted_third_values)
    return {"status": "Chatbot initialised successfully!"}

shared_context = ChatContext()
shared_context1 = ChatContext()

@router.post("/chat/send")
async def send_chat_message(msg: ChatMessage):
    fl=msg.metric
    usCont=1
    if(fl=="false"):usCont=shared_context
    else:usCont=shared_context1
    usCont.add_user_message(msg.message)
    url = OPENAI_URL
    payload = {
        "partnerId": 99999989,
        "provider": "OPEN_AI",
        "genAIRequest": {
            "type": "chat-completion",
            "request": {
                "model": "gpt-4o-mini",
                "temperature": 0.7,
                "messages": usCont.get_trimmed_history(model="gpt-4o-mini")
            }
        }
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers_llm, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", {}).get("choices", {})[0].get("message", {}).get("content", "No content found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def detect_tool_call(content: str) -> str:
    try:
        parsed = eval(content)
        return parsed["tool_call"]["params"]["endpoint"]
    except Exception:
        pass
    return None

async def fetch_cluster_data(endpoint: str,cluster_name:str) -> str:
    url = f"http://127.0.0.1:8000/get-direct-es-stats?queryField=clusterName&host={cluster_name}&call={endpoint}"
    print(url)
    try:
        result = subprocess.run([
        "curl", "-XGET", f"https://qa6-red-api.sprinklr.com/internal-cross/api/v1/getDirectESStats?queryField=host&host={cluster_name}&clusterName=&call={endpoint}"
            ]+headers, capture_output=True, text=True, check=True).stdout
        try:
            res=json.loads(result)
            return res
        except:
            # print(88)
            return result

    except Exception as e:
        return False


shared_context2 = ChatContext()
@router.post("/chat/tool-query")
async def send_chat_message(msg: ChatMessagee):
    shared_context2.set_initial_tool_call_context()
    shared_context2.add_user_message(msg.message)
    url = "https://qa6-api2.sprinklr.com/api/gen-ai-router/generateWithRequest"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            shared_context2.add_system_message("Was above user message a Question?")
            payload = gen_chatbot_Payload(shared_context2.get_trimmed_history(model="gpt-4o-mini"))
            response = await client.post(url, headers=headers_llm, json=payload)
            response.raise_for_status()
            assistant_reply=response.json().get("response", "").get("choices", "")[0].get("message", "").get("content", "No content found")
            print(1)
            if(assistant_reply=='no'):
                shared_context2.add_assistant_message("no")
                shared_context2.add_system_message("Use this data to answer above user's question.")
                payload = gen_chatbot_Payload(shared_context2.get_trimmed_history(model="gpt-4o-mini"))
                print(11)
                response = await client.post(url, headers=headers_llm, json=payload)
                response.raise_for_status()
                assistant_reply=response.json().get("response", "").get("choices", "")[0].get("message", "").get("content", "No content found")                
                return {"reply":assistant_reply}
            else:
                print(22)
                shared_context2.add_assistant_message("yes")
                shared_context2.add_system_message("Send the Elasticsearch API endpoint for user's question without 'GET' or 'POST' in it.")
                payload = gen_chatbot_Payload(shared_context2.get_trimmed_history(model="gpt-4o-mini"))
                response = await client.post(url, headers=headers_llm, json=payload)
                response.raise_for_status()
                assistant_reply=response.json().get("response", "").get("choices", "")[0].get("message", "").get("content", "No content found")
                shared_context2.add_assistant_message(assistant_reply)
                tool_response=1
                try:
                    print(111)
                    tool_response = await fetch_cluster_data(assistant_reply,cluster_name=msg.cluster_name)
                except:
                    print(222)
                    tool_response=False
                if(not tool_response):
                    return {"reply":"Can't extact data, please provide your data"}
                shared_context2.add_tool_response(assistant_reply,str(tool_response)[:5000])
                shared_context2.add_user_message("Answer this user query using the above Elasticsearch Api response output : "+msg.message)
                payload = gen_chatbot_Payload(shared_context2.get_trimmed_history(model="gpt-4o-mini"))
                print(1111)
                res = await client.post(url, headers=headers_llm, json=payload)
                res.raise_for_status()
                print(2211)
                final_reply=res.json().get("response", "").get("choices", "")[0].get("message", "").get("content", "No content found")
                shared_context.add_assistant_message(final_reply)
                return {"reply": final_reply, "tool_call": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


