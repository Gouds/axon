from brain.plugins._base import DevicePlugin


class MockPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._speed = 0
        self._direction = "stopped"

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "spin":
            speed = max(-100, min(100, int(action.get("speed", 0))))
            self._speed = abs(speed)
            self._direction = "forward" if speed > 0 else "reverse" if speed < 0 else "stopped"
            print(f"[{self.device_id}] MOTOR {self._direction} {self._speed}%")
            await self._emit({"speed": self._speed, "direction": self._direction, "mock": True})
        elif atype == "stop":
            self._speed = 0
            self._direction = "stopped"
            print(f"[{self.device_id}] MOTOR stop")
            await self._emit({"speed": 0, "direction": "stopped", "mock": True})

    def get_state(self) -> dict:
        return {"speed": self._speed, "direction": self._direction, "mock": True}
