from __future__ import annotations

from brain.plugins._base import DevicePlugin


def _build_logic(target: str, effect: int, colour: int, speed: int, duration: int) -> str:
    """LE<target><effect(2)><colour(1)><speed(1)><time(2)>"""
    full = f"{target}{str(int(effect)).zfill(2)}{int(colour)}{int(speed)}{str(min(int(duration), 99)).zfill(2)}"
    return f"LE{full.lstrip('0') or '0'}"


def _build_holo(target: str, sequence: int, colour: int, duration: int) -> str:
    """HP<target>0<seq(2)><colour>[|<duration(2)>]"""
    cmd = f"HP{target}0{str(int(sequence)).zfill(2)}{int(colour)}"
    if int(duration) > 0:
        cmd += f"|{str(min(int(duration), 99)).zfill(2)}"
    return cmd


class RealPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._bus_num = int(config.get("i2c_bus", 1))
        self._address = int(config.get("i2c_address", 10))
        self._bus = None
        self._last_command: str | None = None

    async def startup(self):
        import smbus2
        self._bus = smbus2.SMBus(self._bus_num)
        print(f"[{self.device_id}] AstroPixels on I2C bus {self._bus_num} addr 0x{self._address:02X}")

    async def shutdown(self):
        if self._bus:
            try:
                self._bus.close()
            except Exception:
                pass
            self._bus = None

    def _send(self, cmd: str):
        data = cmd.encode("ascii")
        self._bus.write_i2c_block_data(self._address, data[0], list(data[1:]))
        self._last_command = cmd
        print(f"[{self.device_id}] → {cmd}")

    async def handle_action(self, action: dict):
        atype = action.get("type")
        try:
            if atype == "logic":
                cmd = _build_logic(
                    str(action.get("target", "0")),
                    action.get("effect", 0),
                    action.get("colour", 0),
                    action.get("speed", 0),
                    action.get("duration", 0),
                )
                self._send(cmd)
            elif atype == "holo":
                cmd = _build_holo(
                    str(action.get("target", "A")),
                    action.get("sequence", 1),
                    action.get("colour", 0),
                    action.get("duration", 0),
                )
                self._send(cmd)
            elif atype == "command":
                self._send(str(action.get("cmd", "")))
        except Exception as e:
            print(f"[{self.device_id}] I2C error: {e}")
            self._bus = None  # reset — will error on next send rather than silently fail
        await self._emit(self.get_state())

    def get_state(self) -> dict:
        return {"last_command": self._last_command, "mock": False}
