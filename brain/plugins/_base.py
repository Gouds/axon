from __future__ import annotations

from abc import ABC, abstractmethod

from brain.core.event_bus import EventBus


class DevicePlugin(ABC):
    def __init__(self, device_id: str, config: dict, event_bus: EventBus):
        self.device_id = device_id
        self.config = config
        self._bus = event_bus

    async def startup(self):
        """Initialise hardware. Override in subclasses that need it."""

    async def shutdown(self):
        """Release hardware. Override in subclasses that need it."""

    @abstractmethod
    async def handle_action(self, action: dict):
        """Receive an action: {type, ...params}"""

    @abstractmethod
    def get_state(self) -> dict:
        """Return current device state snapshot."""

    async def _emit(self, data: dict):
        await self._bus.publish(f"{self.device_id}.state", data)
