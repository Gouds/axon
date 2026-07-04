import os
import time

from fastapi import APIRouter, Request

router = APIRouter()
_START = time.time()


@router.get("/health")
async def health():
    return {
        "role": os.getenv("PLATFORM_ROLE", "desktop"),
        "version": "0.1.0",
        "uptime": round(time.time() - _START, 1),
        "mock": os.getenv("MOCK_HARDWARE", "true").lower() == "true",
    }


@router.get("/status")
async def status(request: Request):
    registry = request.app.state.registry
    return {
        "mock": os.getenv("MOCK_HARDWARE", "true").lower() == "true",
        "profile_id": registry.profile_id,
        "devices": registry.list_devices(),
    }
