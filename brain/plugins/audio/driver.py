from __future__ import annotations

import json
import random
import subprocess
from pathlib import Path

from brain.plugins._base import DevicePlugin

try:
    import pygame
    _HAS_PYGAME = True
except ImportError:
    _HAS_PYGAME = False


class RealPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._playing: str | None = None
        self._volume = int(config.get("volume", 70))

    def _base_dir(self) -> Path:
        profile_id = self.config.get("_profile_id", "")
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
                all_files = [f for f in all_files if f.name.startswith(category)]

        return random.choice(all_files).name if all_files else None

    async def startup(self):
        if not _HAS_PYGAME:
            raise RuntimeError("pygame not available — use mock mode")
        pygame.mixer.init()
        pygame.mixer.music.set_volume(self._volume / 100)
        self._set_system_volume(self._volume)

    async def shutdown(self):
        if _HAS_PYGAME:
            pygame.mixer.quit()

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "play":
            self._play(action.get("file"))
            await self._emit({"playing": self._playing, "volume": self._volume, "mock": False})
        elif atype == "random":
            chosen = self._pick_random(action.get("category") or action.get("prefix", ""))
            if chosen:
                self._play(chosen)
                await self._emit({"playing": self._playing, "volume": self._volume, "mock": False})
        elif atype == "stop":
            pygame.mixer.music.stop()
            self._playing = None
            await self._emit({"playing": None, "volume": self._volume, "mock": False})
        elif atype == "volume":
            self._volume = max(0, min(100, int(action.get("level", self._volume))))
            pygame.mixer.music.set_volume(self._volume / 100)
            self._set_system_volume(self._volume)
            await self._emit({"playing": self._playing, "volume": self._volume, "mock": False})

    def _set_system_volume(self, vol: int):
        # Try common ALSA and PulseAudio controls in order
        cmds = [
            ["amixer", "-q", "sset", "Master", f"{vol}%"],
            ["amixer", "-q", "sset", "PCM", f"{vol}%"],
            ["pactl", "set-sink-volume", "@DEFAULT_SINK@", f"{vol}%"],
        ]
        for cmd in cmds:
            try:
                r = subprocess.run(cmd, capture_output=True, timeout=2)
                if r.returncode == 0:
                    break
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass

    def _play(self, filename: str | None):
        if not filename:
            return
        path = self._audio_dir() / filename
        if path.exists():
            pygame.mixer.music.load(str(path))
            pygame.mixer.music.play()
            self._playing = filename

    def get_state(self) -> dict:
        return {"playing": self._playing, "volume": self._volume, "mock": False}
