from __future__ import annotations

import importlib
import os

from brain.core.event_bus import EventBus
from brain.plugins._base import DevicePlugin


class DeviceRegistry:
    def __init__(self, event_bus: EventBus):
        self._bus = event_bus
        self._devices: dict[str, DevicePlugin] = {}
        self._profile_id: str | None = None

    @property
    def profile_id(self) -> str | None:
        return self._profile_id

    async def load_profile(self, profile: dict):
        await self.shutdown()
        self._profile_id = profile.get("id")
        mock = os.getenv("MOCK_HARDWARE", "true").lower() == "true"

        # Two-pass load: primitives before composites (composites may reference others)
        devices = profile.get("devices", [])
        composites = []
        primitives = []
        for d in devices:
            mod = _load_module(d["plugin"])
            if getattr(mod, "IS_COMPOSITE", False):
                composites.append(d)
            else:
                primitives.append(d)

        for device_cfg in primitives + composites:
            await self._instantiate(device_cfg, mock)

        await self._bus.publish("system.profile_loaded", {"profile_id": self._profile_id})

    async def _instantiate(self, device_cfg: dict, mock: bool):
        device_id = device_cfg["id"]
        plugin_type = device_cfg["plugin"]
        config = dict(device_cfg.get("config", {}))
        config["_profile_id"] = self._profile_id  # inject so plugins can find profile assets

        try:
            mod = _load_module(plugin_type)
            cls = mod.MockPlugin if mock else mod.RealPlugin
            plugin: DevicePlugin = cls(device_id=device_id, config=config, event_bus=self._bus)
            # Composite plugins may need the registry itself to resolve referenced devices
            if hasattr(plugin, "set_registry"):
                plugin.set_registry(self)
            await plugin.startup()
            self._devices[device_id] = plugin
            print(f"[registry] {device_id} ({plugin_type}, {'mock' if mock else 'real'})")
        except Exception as e:
            print(f"[registry] ERROR loading {device_id}: {e}")

    async def dispatch(self, device_id: str, action_type: str, params: dict):
        device = self._devices.get(device_id)
        if device is None:
            raise KeyError(f"Device '{device_id}' not in registry")
        await device.handle_action({"type": action_type, **params})

    async def shutdown(self):
        for device_id, device in list(self._devices.items()):
            try:
                await device.shutdown()
            except Exception as e:
                print(f"[registry] shutdown error for {device_id}: {e}")
        self._devices.clear()

    def get(self, device_id: str) -> DevicePlugin | None:
        return self._devices.get(device_id)

    def list_devices(self) -> list[dict]:
        return [
            {
                "id": did,
                "plugin": type(d).__module__.split(".")[-2],
                "state": d.get_state(),
            }
            for did, d in self._devices.items()
        ]


def _load_module(plugin_type: str):
    return importlib.import_module(f"brain.plugins.{plugin_type}")
