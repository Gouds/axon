from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/scripts", tags=["scripts"])


def _runner(request: Request):
    return request.app.state.runner


@router.get("")
async def list_scripts(request: Request):
    return _runner(request).list_scripts()


@router.get("/{script_id}")
async def get_script(script_id: str, request: Request):
    script = _runner(request).get_script(script_id)
    if script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return script


@router.post("")
async def create_script(script: dict, request: Request):
    script.pop("id", None)  # let runner generate the id
    return _runner(request).save_script(script)


@router.put("/{script_id}")
async def update_script(script_id: str, script: dict, request: Request):
    script["id"] = script_id
    return _runner(request).save_script(script)


@router.delete("/{script_id}")
async def delete_script(script_id: str, request: Request):
    _runner(request).delete_script(script_id)
    return {"ok": True}


@router.post("/{script_id}/run")
async def run_script(script_id: str, request: Request):
    try:
        await _runner(request).run(script_id)
        return {"ok": True}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{script_id}/stop")
async def stop_script(script_id: str, request: Request):
    await _runner(request).stop(script_id)
    return {"ok": True}
