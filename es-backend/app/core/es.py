from elasticsearch import Elasticsearch, exceptions
from dotenv import load_dotenv
import os

load_dotenv()

def get_es_client():
    try:
        es = Elasticsearch(
            os.getenv("ELASTIC_CLOUD_URL"),
            basic_auth=(
                os.getenv("ELASTIC_CLOUD_USERNAME"),
                os.getenv("ELASTIC_CLOUD_PASSWORD")
            )
        )
        if not es.ping():
            raise ValueError("Connection failed to Elasticsearch.")
        return es
    except exceptions.ElasticsearchException as e:
        raise RuntimeError(f"Elasticsearch error: {e}")
