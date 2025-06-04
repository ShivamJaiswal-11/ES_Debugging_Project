# from fastapi import FastAPI
# from app.api.routes import router

# app = FastAPI(title="ES Debugger API")

# app.include_router(router)

# from elasticsearch import Elasticsearch
# from dotenv import load_dotenv
# import os

# # Load environment variables
# load_dotenv()

# es = Elasticsearch(
#     os.getenv("ELASTIC_CLOUD_URL"),
#     basic_auth=(os.getenv("ELASTIC_CLOUD_USERNAME"), os.getenv("ELASTIC_CLOUD_PASSWORD"))
# )

# # Test connection
# if es.ping():
#     print("✅ Connected to Elasticsearch")
# else:
#     print("❌ Could not connect")

from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="Elasticsearch Debugger",
    description="FastAPI service to monitor Elasticsearch clusters",
    version="1.0.0"
)

# Register routes
app.include_router(router)
