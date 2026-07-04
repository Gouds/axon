from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from brain.core.event_bus import EventBus
from brain.core.device_registry import DeviceRegistry
from brain.routers import health, config, assets, actions, events, plugins, profiles


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.bus = EventBus()
    app.state.registry = DeviceRegistry(app.state.bus)

    # Auto-load profile from PROFILE env var on startup
    profile_id = os.getenv("PROFILE")
    if profile_id:
        profile_path = Path("profiles") / profile_id / "profile.json"
        if profile_path.exists():
            profile_data = json.loads(profile_path.read_text())
            await app.state.registry.load_profile(profile_data)

    yield
    await app.state.registry.shutdown()


app = FastAPI(title="Axon Brain", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,    tags=["health"])
app.include_router(config.router,    prefix="/config",   tags=["config"])
app.include_router(assets.router,    tags=["assets"])
app.include_router(actions.router,   tags=["actions"])
app.include_router(events.router,    tags=["events"])
app.include_router(plugins.router,   tags=["plugins"])
app.include_router(profiles.router,  prefix="/profiles", tags=["profiles"])

# Serve built UI in production (ui/dist must exist)
_ui_dist = Path(__file__).parent.parent / "ui" / "dist"
if _ui_dist.exists():
    app.mount("/", StaticFiles(directory=str(_ui_dist), html=True), name="ui")
