from __future__ import annotations

from brain.plugins._base import DevicePlugin


class MockPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._max_speed = min(100, max(1, int(config.get("max_speed", 100))))
        self._speed     = 0
        self._direction = "stopped"

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "spin":
            raw   = max(-100, min(100, int(action.get("speed", 0))))
            speed = int(raw * self._max_speed / 100)
            self._speed     = abs(speed)
            self._direction = "positive" if speed > 0 else "negative" if speed < 0 else "stopped"
            print(f"[{self.device_id}] AQMH3615NS {self._direction} {self._speed}%")
            await self._emit(self.get_state())
        elif atype == "stop":
            self._speed     = 0
            self._direction = "stopped"
            print(f"[{self.device_id}] AQMH3615NS stop")
            await self._emit(self.get_state())

    def get_state(self) -> dict:
        return {"speed": self._speed, "direction": self._direction, "mock": True}
