from fastapi import APIRouter, Request

router = APIRouter()


@router.post("")
async def push_config(profile: dict, request: Request):
    registry = request.app.state.registry
    await registry.load_profile(profile)
    return {
        "ok": True,
        "profile_id": profile.get("id"),
        "devices_loaded": len(profile.get("devices", [])),
    }


@router.get("")
async def get_config(request: Request):
    registry = request.app.state.registry
    return {
        "profile_id": registry.profile_id,
        "devices": registry.list_devices(),
    }
