from __future__ import annotations

from brain.plugins._base import DevicePlugin

try:
    import RPi.GPIO as GPIO
    _HAS_GPIO = True
except ImportError:
    _HAS_GPIO = False


class RealPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._pwm_pin   = config["pwm_pin"]
        self._in1_pin   = config["in1_pin"]
        self._in2_pin   = config["in2_pin"]
        self._frequency = config.get("frequency", 1000)
        self._max_speed = min(100, max(1, int(config.get("max_speed", 100))))
        self._pwm       = None
        self._speed     = 0
        self._direction = "stopped"

    async def startup(self):
        if not _HAS_GPIO:
            raise RuntimeError("RPi.GPIO not available — use mock mode")
        GPIO.setmode(GPIO.BCM)
        for pin in (self._pwm_pin, self._in1_pin, self._in2_pin):
            GPIO.setup(pin, GPIO.OUT)
        GPIO.output(self._in1_pin, GPIO.LOW)
        GPIO.output(self._in2_pin, GPIO.LOW)
        self._pwm = GPIO.PWM(self._pwm_pin, self._frequency)
        self._pwm.start(0)

    async def shutdown(self):
        if self._pwm:
            self._pwm.ChangeDutyCycle(0)
            self._pwm.stop()
        if _HAS_GPIO:
            GPIO.cleanup([self._pwm_pin, self._in1_pin, self._in2_pin])

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "spin":
            raw   = max(-100, min(100, int(action.get("speed", 0))))
            speed = int(raw * self._max_speed / 100)
            self._apply(speed)
            await self._emit(self.get_state())
        elif atype == "stop":
            self._apply(0)
            await self._emit(self.get_state())

    def _apply(self, speed: int):
        if speed > 0:
            GPIO.output(self._in1_pin, GPIO.HIGH)
            GPIO.output(self._in2_pin, GPIO.LOW)
            self._direction = "positive"
        elif speed < 0:
            GPIO.output(self._in1_pin, GPIO.LOW)
            GPIO.output(self._in2_pin, GPIO.HIGH)
            self._direction = "negative"
        else:
            GPIO.output(self._in1_pin, GPIO.LOW)
            GPIO.output(self._in2_pin, GPIO.LOW)
            self._direction = "stopped"
        self._pwm.ChangeDutyCycle(abs(speed))
        self._speed = abs(speed)

    def get_state(self) -> dict:
        return {"speed": self._speed, "direction": self._direction, "mock": False}
