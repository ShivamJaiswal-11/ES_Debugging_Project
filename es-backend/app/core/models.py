from pydantic import BaseModel 
from typing import List, Dict, Any

class QueryInput(BaseModel):
    from_time: str
    to_time: str
    expr: str
    metric_name:str

class ChatMessage(BaseModel):
    message: str
    metric:str

class ChatMessagee(BaseModel):
    message: str
    cluster_name:str

class DebugData(BaseModel):
    hot_threads: str
    tasks: str
    jvm: str

class ts_init(BaseModel):
    data: List[Dict[str, Any]]
