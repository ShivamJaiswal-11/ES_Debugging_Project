# from fastapi import APIRouter

# router = APIRouter()

# @router.get("/health")
# def health_check():
#     return {"status": "OK"}

from fastapi import APIRouter, HTTPException, Query
from app.core.es import get_es_client
from elasticsearch import exceptions

router = APIRouter()
es = get_es_client()

@router.get("/")
def root():
    return {"message": "FastAPI connected to Elasticsearch"}

@router.get("/cluster/health")
def cluster_health():
    try:
        return es.cluster.health()
    except exceptions.ElasticsearchException as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cluster/stats")
def cluster_stats():
    try:
        return es.cluster.stats()
    except exceptions.ElasticsearchException as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/indices")
def list_indices():
    try:
        indices = es.indices.get("*")
        return list(indices.keys())
    except exceptions.ElasticsearchException as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top-indices")
def top_indices(n: int = 3):
    try:
        result = es.cat.indices(format="json", h=["index", "docs.count"])
        sorted_result = sorted(result, key=lambda x: int(x["docs.count"]), reverse=True)
        return sorted_result[:n]
    except exceptions.ElasticsearchException as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    except exceptions.ElasticsearchException as e:
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
    except exceptions.ElasticsearchException as e:
        raise HTTPException(status_code=500, detail=str(e))
