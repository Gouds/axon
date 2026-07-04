from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class ActionRequest(BaseModel):
    device_id: str
    action_type: str
    params: dict = {}


@router.post("/action")
async def dispatch_action(req: ActionRequest, request: Request):
    registry = request.app.state.registry
    try:
        await registry.dispatch(req.device_id, req.action_type, req.params)
    except KeyError as e:
        raise HTTPException(404, str(e))
    return {"ok": True, "device_id": req.device_id, "action_type": req.action_type}
