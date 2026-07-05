from __future__ import annotations

import asyncio

from brain.plugins._base import DevicePlugin

try:
    import busio
    import board
    from adafruit_servokit import ServoKit
    _HAS_SERVO = True
except ImportError:
    _HAS_SERVO = False

# Single shared I2C bus — all PCA9685 boards share pins 2/3, differ only by address
_i2c = None
_kit_cache: dict[int, "ServoKit"] = {}


def _get_kit(address: int) -> "ServoKit":
    global _i2c
    if _i2c is None:
        _i2c = busio.I2C(board.SCL, board.SDA)
    if address not in _kit_cache:
        _kit_cache[address] = ServoKit(channels=16, i2c=_i2c, address=address)
    return _kit_cache[address]


class RealPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        addr = config.get("bus_address", "0x40")
        self._address = int(addr, 16) if isinstance(addr, str) else addr
        self._channel = int(config["channel"])
        self._angle = float(config.get("default_angle", 90))
        self._kit = None

    async def startup(self):
        if not _HAS_SERVO:
            raise RuntimeError("adafruit_servokit not available — use mock mode")
        self._kit = _get_kit(self._address)
        self._kit.servo[self._channel].angle = self._angle

    async def shutdown(self):
        pass  # shared I2C bus — don't close

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
            self._kit.servo[self._channel].angle = target
            await self._emit({"angle": target, "mock": False})
            return

        step = max(0.5, (100 - speed) / 8)
        delay = 0.02

        while abs(self._angle - target) > 0.5:
            self._angle += step if self._angle < target else -step
            self._angle = max(min(self._angle, target if self._angle > target else 180), 0)
            self._kit.servo[self._channel].angle = self._angle
            await self._emit({"angle": round(self._angle, 1), "mock": False})
            await asyncio.sleep(delay)

        self._angle = target
        self._kit.servo[self._channel].angle = target
        await self._emit({"angle": target, "mock": False})

    def get_state(self) -> dict:
        return {"angle": self._angle, "mock": False}
