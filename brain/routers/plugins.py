import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
_PLUGINS_DIR = Path(__file__).parent.parent / "plugins"


@router.get("/plugins")
async def list_plugins():
    result = []
    for d in sorted(_PLUGINS_DIR.iterdir()):
        if d.is_dir() and not d.name.startswith("_"):
            manifest = d / "manifest.json"
            if manifest.exists():
                result.append(json.loads(manifest.read_text()))
    return result


@router.get("/plugins/{plugin_type}/manifest")
async def get_manifest(plugin_type: str):
    path = _PLUGINS_DIR / plugin_type / "manifest.json"
    if not path.exists():
        raise HTTPException(404, f"Plugin '{plugin_type}' not found")
    return json.loads(path.read_text())
