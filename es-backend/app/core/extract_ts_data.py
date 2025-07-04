from fastapi import Query, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
from influxdb_client import InfluxDBClient # type: ignore
from influxdb_client.client.write_api import SYNCHRONOUS # type: ignore
from datetime import datetime
import os


# Set InfluxDB parameters (these should ideally be loaded from environment variables)
INFLUX_URL = os.getenv("INFLUX_URL", "http://localhost:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN", "your-token")
INFLUX_ORG = os.getenv("INFLUX_ORG", "your-org")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "your-bucket")

client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
query_api = client.query_api()

class TimeRange(BaseModel):
    start: str  # e.g., "2024-06-12T00:00:00Z"
    end: str    # e.g., "2024-06-12T23:59:00Z"


def extract_metrics(index: str, time_range: TimeRange):
    try:
        query = f'''
        from(bucket: "{INFLUX_BUCKET}")
            |> range(start: {time_range.start}, stop: {time_range.end})
            |> filter(fn: (r) => r["index"] == "{index}")
        '''

        tables = query_api.query(org=INFLUX_ORG, query=query)

        result = {
            "indices": {
                index: {}
            }
        }

        for table in tables:
            for record in table.records:
                measurement = record.get_measurement()
                field = record.get_field()
                value = record.get_value()

                if measurement not in result["indices"][index]:
                    result["indices"][index][measurement] = {}

                result["indices"][index][measurement][field] = value

                # Include timestamp once (optional)
                if "timestamp" not in result:
                    result["timestamp"] = record.get_time().isoformat()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract metrics: {str(e)}")
