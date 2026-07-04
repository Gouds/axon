from __future__ import annotations

import json
import random
from pathlib import Path

from brain.plugins._base import DevicePlugin


class MockPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._playing: str | None = None
        self._volume = int(config.get("volume", 70))

    def _base_dir(self) -> Path:
        profile_id = self.config.get("_profile_id", "")
        # Brain-side pushed assets take priority
        pushed = Path(f"/tmp/axon_brain/{profile_id}")
        if pushed.exists():
            return pushed
        return Path(f"profiles/{profile_id}") if profile_id else Path(".")

    def _audio_dir(self) -> Path:
        return self._base_dir() / "audio"

    def _load_index(self) -> dict:
        idx = self._base_dir() / "audio_index.json"
        if idx.exists():
            try:
                return json.loads(idx.read_text())
            except Exception:
                pass
        return {}

    def _pick_random(self, category: str = "") -> str | None:
        d = self._audio_dir()
        if not d.exists():
            return None
        exts = {".mp3", ".wav", ".ogg", ".flac"}
        all_files = [f for f in d.iterdir() if f.suffix.lower() in exts]

        if category:
            index = self._load_index()
            if index:
                categorized = [
                    d / name for name, meta in index.items()
                    if meta.get("category") == category and (d / name).exists()
                ]
                if categorized:
                    all_files = categorized
            else:
                # pi_brain-style prefix fallback
                all_files = [f for f in all_files if f.name.startswith(category)]

        return random.choice(all_files).name if all_files else None

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "play":
            self._playing = action.get("file")
            print(f"[{self.device_id}] AUDIO play {self._playing}")
            await self._emit({"playing": self._playing, "volume": self._volume, "mock": True})
        elif atype == "random":
            chosen = self._pick_random(action.get("category") or action.get("prefix", ""))
            if chosen:
                self._playing = chosen
                print(f"[{self.device_id}] AUDIO random → {chosen}")
                await self._emit({"playing": self._playing, "volume": self._volume, "mock": True})
        elif atype == "stop":
            self._playing = None
            print(f"[{self.device_id}] AUDIO stop")
            await self._emit({"playing": None, "volume": self._volume, "mock": True})
        elif atype == "volume":
            self._volume = max(0, min(100, int(action.get("level", self._volume))))
            print(f"[{self.device_id}] AUDIO volume {self._volume}%")

    def get_state(self) -> dict:
        return {"playing": self._playing, "volume": self._volume, "mock": True}
