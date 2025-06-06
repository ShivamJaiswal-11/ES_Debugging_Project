# type: ignore

from fastapi import APIRouter, HTTPException, Query
from app.core.es import get_es_client
import subprocess

# from elasticsearch import exceptions 
import elasticsearch
# from elasticsearch import Elasticsearch
# from elasticsearch.exceptions import TransportError, NotFoundError, RequestError


router = APIRouter()
es = get_es_client()
# es = Elasticsearch("http://localhost:9200")  # Adjust host as needed


@router.get("/")
def root():
    return {"message": "FastAPI connected to Elasticsearch"}

@router.get("/cluster/health")
def cluster_health():
    try:
        return es.cluster.health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cluster/stats")
def cluster_stats():
    try:
        return es.cluster.stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/indices")
def list_indices():
    # print("Fetching indices...")
    try:
        indices = es.indices.get(index="*")
        # print("Indices fetched successfully")
        return list(indices.keys())
    except Exception as e:
        print(f"Error fetching indices : {e}")
        raise HTTPException(status_code=500, detail="Indices not found")

# @router.get("/top-indices")
# def top_indices(n: int = 3):
#     try:
#         result = es.cat.indices(format="json", h=["index", "docs.count"])
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
            result = es.cat.indices(format="json", h=["index", sort_by])
            for r in result:
                r[sort_by] = parse_cat_value(r.get(sort_by, "0"))
        else:
            # Use _stats for metrics like search/indexing rates
            stats = es.indices.stats(metric="indexing,search")
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
        result = es.search(index=index, body=body)
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
        res = es.index(index=index, id=id, document=doc)
        return res
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
        response = es.transport.perform_request("GET", "/_nodes/hot_threads")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
