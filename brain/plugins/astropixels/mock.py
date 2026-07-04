from __future__ import annotations

from brain.plugins._base import DevicePlugin


def _build_logic(target, effect, colour, speed, duration) -> str:
    full = f"{target}{str(int(effect)).zfill(2)}{int(colour)}{int(speed)}{str(min(int(duration), 99)).zfill(2)}"
    return f"LE{full.lstrip('0') or '0'}"


def _build_holo(target, sequence, colour, duration) -> str:
    cmd = f"HP{target}0{str(int(sequence)).zfill(2)}{int(colour)}"
    if int(duration) > 0:
        cmd += f"|{str(min(int(duration), 99)).zfill(2)}"
    return cmd


class MockPlugin(DevicePlugin):
    def __init__(self, device_id, config, event_bus):
        super().__init__(device_id, config, event_bus)
        self._last_command: str | None = None

    async def handle_action(self, action: dict):
        atype = action.get("type")
        if atype == "logic":
            cmd = _build_logic(
                str(action.get("target", "0")),
                action.get("effect", 0),
                action.get("colour", 0),
                action.get("speed", 0),
                action.get("duration", 0),
            )
        elif atype == "holo":
            cmd = _build_holo(
                str(action.get("target", "A")),
                action.get("sequence", 1),
                action.get("colour", 0),
                action.get("duration", 0),
            )
        elif atype == "command":
            cmd = str(action.get("cmd", ""))
        else:
            cmd = None

        if cmd:
            self._last_command = cmd
            print(f"[{self.device_id}] MOCK AstroPixels → {cmd}")

        await self._emit(self.get_state())

    def get_state(self) -> dict:
        return {"last_command": self._last_command, "mock": True}
