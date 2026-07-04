from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
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


def _local_manifest(profile_id: str) -> list[dict]:
    """All files the controller has for this profile: audio files + index."""
    result = []
    d = _asset_dir(profile_id)
    if d.exists():
        result.extend([
            {"name": f.name, "hash": _hash(f), "size": f.stat().st_size}
            for f in sorted(d.iterdir()) if f.is_file()
        ])
    idx = _index_path(profile_id)
    if idx.exists():
        result.append({"name": "audio_index.json", "hash": _hash(idx), "size": idx.stat().st_size})
    return result


def _brain_url(profile_id: str) -> str:
    pfile = _safe_profile_dir(profile_id) / "profile.json"
    if not pfile.exists():
        raise HTTPException(404, "Profile not found")
    return json.loads(pfile.read_text()).get("brain_url", "http://localhost:8000")


# ── Audio file management ──────────────────────────────────────────────────────

@router.get("/{profile_id}/assets")
async def list_assets(profile_id: str):
    return {"files": _local_manifest(profile_id)}


@router.post("/{profile_id}/assets")
async def upload_asset(profile_id: str, file: UploadFile = File(...)):
    d = _asset_dir(profile_id)
    d.mkdir(parents=True, exist_ok=True)
    dest = d / Path(file.filename).name
    dest.write_bytes(await file.read())
    return {"ok": True, "filename": dest.name}


@router.get("/{profile_id}/assets/{filename}")
async def get_asset(profile_id: str, filename: str):
    path = _asset_dir(profile_id) / Path(filename).name
    if not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path)


@router.delete("/{profile_id}/assets/{filename}")
async def delete_asset(profile_id: str, filename: str):
    dest = _asset_dir(profile_id) / Path(filename).name
    if dest.exists():
        dest.unlink()
    return {"ok": True}


# ── Audio index (category metadata) ───────────────────────────────────────────

@router.get("/{profile_id}/audio/index")
async def get_audio_index(profile_id: str):
    path = _index_path(profile_id)
    if not path.exists():
        return {}
    return json.loads(path.read_text())


@router.put("/{profile_id}/audio/index")
async def update_audio_index(profile_id: str, index: dict):
    path = _index_path(profile_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(index, indent=2, sort_keys=True))
    return {"ok": True}


# ── Sync: diff + push ──────────────────────────────────────────────────────────

@router.post("/{profile_id}/assets/diff")
async def asset_diff(profile_id: str):
    brain_url = _brain_url(profile_id)
    local = {f["name"]: f for f in _local_manifest(profile_id)}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{brain_url}/assets/manifest", timeout=5)
            resp.raise_for_status()
            brain = {f["name"]: f for f in resp.json()["files"]}
        except Exception:
            raise HTTPException(503, "Cannot reach brain")

    to_push = [
        name for name, info in local.items()
        if name not in brain or brain[name]["hash"] != info["hash"]
    ]
    return {"to_push": to_push, "count": len(to_push)}


@router.post("/{profile_id}/assets/push")
async def push_assets(profile_id: str):
    diff = await asset_diff(profile_id)
    to_push = diff["to_push"]
    if not to_push:
        return {"pushed": [], "count": 0}

    brain_url = _brain_url(profile_id)
    audio_dir = _asset_dir(profile_id)
    profile_dir = _safe_profile_dir(profile_id)
    pushed = []

    async with httpx.AsyncClient() as client:
        for name in to_push:
            path = profile_dir / "audio_index.json" if name == "audio_index.json" else audio_dir / name
            if path.exists():
                await client.post(
                    f"{brain_url}/assets/upload",
                    files={"file": (name, path.read_bytes())},
                    timeout=60,
                )
                pushed.append(name)

    return {"pushed": pushed, "count": len(pushed)}
