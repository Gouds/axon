import asyncio

from brain.plugins._base import DevicePlugin


class MockPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._angle = float(config.get("default_angle", 90))

    async def handle_action(self, action: dict):
        atype = action.get("type")
        speed = int(action.get("speed", self.config.get("speed", 100)))
        if atype in ("move", "set_angle"):
            await self._move_to(float(action.get("angle", self._angle)), speed)
        elif atype == "open":
            await self._move_to(float(self.config.get("open_angle", 160)), speed)
        elif atype == "close":
            await self._move_to(float(self.config.get("close_angle", 20)), speed)

    async def _move_to(self, target: float, speed: int):
        if speed >= 100:
            self._angle = target
            print(f"[{self.device_id}] SERVO → {target}°")
            await self._emit({"angle": self._angle, "mock": True})
            return

        # Interpolate angle over time — mirrors pi_brain's _move_with_speed()
        step = max(0.5, (100 - speed) / 8)
        delay = 0.02

        while abs(self._angle - target) > 0.5:
            self._angle += step if self._angle < target else -step
            self._angle = max(min(self._angle, target if self._angle > target else 180), 0)
            await self._emit({"angle": round(self._angle, 1), "mock": True})
            await asyncio.sleep(delay)

        self._angle = target
        await self._emit({"angle": self._angle, "mock": True})

    def get_state(self) -> dict:
        return {"angle": self._angle, "mock": True}
