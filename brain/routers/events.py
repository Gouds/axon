import asyncio
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

KEEPALIVE_SECONDS = 25


@router.websocket("/ws/events")
async def websocket_events(ws: WebSocket):
    await ws.accept()
    bus = ws.app.state.bus
    q = bus.add_queue()
    try:
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=KEEPALIVE_SECONDS)
                await ws.send_json(event)
            except asyncio.TimeoutError:
                # Keepalive ping so the connection doesn't idle-close
                await ws.send_json({"channel": "system.heartbeat", "data": {}, "ts": time.time()})
    except WebSocketDisconnect:
        pass
    finally:
        bus.remove_queue(q)
