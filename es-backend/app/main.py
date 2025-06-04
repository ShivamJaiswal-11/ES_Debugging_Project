from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="ES Debugger API")

app.include_router(router)
