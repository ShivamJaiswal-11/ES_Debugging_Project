# type: ignore

from elasticsearch import Elasticsearch, exceptions
from dotenv import load_dotenv
import os

load_dotenv()

def init_es_client(url, username, password):
    try:
        print(f"Connecting to Elasticsearch at {url} with user {username}...")
        es = Elasticsearch(
            url,
            basic_auth=(
                username,
                password
            )
        )
        if not es.ping():
            raise ValueError("Connection failed to Elasticsearch.")
        print("Connected to Elasticsearch successfully.")
        return es
    except exceptions.ElasticsearchException as e:
        raise RuntimeError(f"Elasticsearch error: {e}")
