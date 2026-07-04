import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
PROFILES_DIR = Path("profiles")


def _safe_profile_dir(profile_id: str) -> Path:
    if not re.match(r"^[a-zA-Z0-9_-]+$", profile_id):
        raise HTTPException(400, "Invalid profile id")
    return PROFILES_DIR / profile_id


@router.get("")
async def list_profiles():
    if not PROFILES_DIR.exists():
        return []
    result = []
    for d in sorted(PROFILES_DIR.iterdir()):
        pfile = d / "profile.json"
        if pfile.exists():
            p = json.loads(pfile.read_text())
            result.append({
                "id": p["id"],
                "label": p["label"],
                "brain_url": p.get("brain_url", ""),
            })
    return result


@router.get("/{profile_id}")
async def get_profile(profile_id: str):
    path = _safe_profile_dir(profile_id) / "profile.json"
    if not path.exists():
        raise HTTPException(404, "Profile not found")
    return json.loads(path.read_text())


@router.put("/{profile_id}")
async def update_profile(profile_id: str, data: dict):
    path = _safe_profile_dir(profile_id) / "profile.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))
    return {"ok": True}
