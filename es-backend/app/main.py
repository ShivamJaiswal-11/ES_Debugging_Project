# type: ignore


from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="Elasticsearch Debugger",
    description="FastAPI service to monitor Elasticsearch clusters",
    version="1.0.0"
)

# Register routes
app.include_router(router)
