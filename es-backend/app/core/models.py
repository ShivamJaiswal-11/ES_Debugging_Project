from pydantic import BaseModel 

class ClusterConfig(BaseModel):
    type: str  # should be 'cloud'
    url: str
    username: str
    password: str

class NodeRequest(BaseModel):
    node_name: str
    cluster_name:str
