import asyncio
import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

SENSOR_URL = os.getenv("SENSOR_URL", "")
INGEST_URL = os.getenv("INGEST_URL", "http://100.127.215.84:8000/ingest")
SENSOR_ID = os.getenv("SENSOR_ID", "1")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))

logger = logging.getLogger(__name__)


def _build_payload(data: dict) -> dict:
    return {
        "sensor_values": [{
            "id":            SENSOR_ID,
            "temperature":   data.get("temp_bottom_c", 0.0),
            "sst":           data.get("temp_top_c", 0.0),
            "ph":            data.get("ph", 7.0),
            "turbidity":     data.get("turbidity_v", 0.0),
            "surface_light": data.get("light_lux", 0.0),
        }]
    }


async def poll_sensor():
    if not SENSOR_URL:
        logger.warning("SENSOR_URL not set — polling disabled")
        return

    async with httpx.AsyncClient() as client:
        while True:
            try:
                response = await client.get(SENSOR_URL, timeout=10)
                response.raise_for_status()
                payload = _build_payload(response.json())
                ingest_response = await client.post(INGEST_URL, json=payload, timeout=10)
                logger.info("Ingest response: %s", ingest_response.status_code)
            except Exception as e:
                logger.error("Polling error: %s", e)
            await asyncio.sleep(POLL_INTERVAL)
