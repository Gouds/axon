from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse

router = APIRouter()
PROFILES_DIR = Path("profiles")


def _safe_profile_dir(profile_id: str) -> Path:
    if not re.match(r"^[a-zA-Z0-9_-]+$", profile_id):
        raise HTTPException(400, "Invalid profile id")
    return PROFILES_DIR / profile_id


def _asset_dir(profile_id: str) -> Path:
    return _safe_profile_dir(profile_id) / "audio"


def _index_path(profile_id: str) -> Path:
    return _safe_profile_dir(profile_id) / "audio_index.json"


def _hash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


# ── Profile-scoped asset management ───────────────────────────────────────────

@router.get("/profiles/{profile_id}/assets")
async def list_assets(profile_id: str):
    d = _asset_dir(profile_id)
    files = []
    if d.exists():
        files = [
            {"name": f.name, "size": f.stat().st_size, "hash": _hash(f)}
            for f in sorted(d.iterdir()) if f.is_file()
        ]
    return {"files": files}


@router.post("/profiles/{profile_id}/assets")
async def upload_asset(profile_id: str, file: UploadFile = File(...)):
    d = _asset_dir(profile_id)
    d.mkdir(parents=True, exist_ok=True)
    dest = d / Path(file.filename).name
    dest.write_bytes(await file.read())
    return {"ok": True, "filename": dest.name}


@router.get("/profiles/{profile_id}/assets/{filename}")
async def get_asset(profile_id: str, filename: str):
    path = _asset_dir(profile_id) / Path(filename).name
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path)


@router.delete("/profiles/{profile_id}/assets/{filename}")
async def delete_asset(profile_id: str, filename: str):
    path = _asset_dir(profile_id) / Path(filename).name
    if path.exists():
        path.unlink()
    return {"ok": True}


@router.get("/profiles/{profile_id}/audio/index")
async def get_audio_index(profile_id: str):
    path = _index_path(profile_id)
    if not path.exists():
        return {}
    return json.loads(path.read_text())


@router.put("/profiles/{profile_id}/audio/index")
async def update_audio_index(profile_id: str, index: dict):
    path = _index_path(profile_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index, indent=2, sort_keys=True))
    return {"ok": True}


# ── Legacy upload endpoint (brain-side, kept for backward compat) ─────────────

@router.post("/assets/upload")
async def legacy_upload(request: Request, file: UploadFile = File(...)):
    profile_id = request.app.state.registry.profile_id or "default"
    base = Path(f"/tmp/axon_brain/{profile_id}")
    if file.filename == "audio_index.json":
        dest = base / "audio_index.json"
    else:
        dest = base / "audio" / Path(file.filename).name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(await file.read())
    return {"ok": True, "filename": dest.name}


@router.get("/assets/manifest")
async def asset_manifest(request: Request):
    """Per-profile manifest for fleet diff."""
    profile_id = request.app.state.registry.profile_id or "default"
    d = _asset_dir(profile_id)
    files = []
    if d.exists():
        files = [
            {"name": f.name, "hash": _hash(f), "size": f.stat().st_size}
            for f in sorted(d.iterdir()) if f.is_file()
        ]
    idx = _index_path(profile_id)
    if idx.exists():
        files.append({"name": "audio_index.json", "hash": _hash(idx), "size": idx.stat().st_size})
    return {"files": files}
