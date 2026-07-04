import os
import pytest
from brain.core.event_bus import EventBus
from brain.core.device_registry import DeviceRegistry

os.environ["MOCK_HARDWARE"] = "true"

_PROFILE = {
    "id": "test",
    "devices": [
        {
            "id": "left-leg",
            "plugin": "dc_motor",
            "config": {"name": "Left Leg", "pwm_pin": 4, "in1_pin": 17, "in2_pin": 18},
        },
        {
            "id": "dome-servo",
            "plugin": "servo",
            "config": {"name": "Dome Tilt", "channel": 0, "default_angle": 90},
        },
    ],
}


async def test_load_profile_creates_devices():
    bus = EventBus()
    registry = DeviceRegistry(bus)

    await registry.load_profile(_PROFILE)
    devices = registry.list_devices()

    assert len(devices) == 2
    ids = {d["id"] for d in devices}
    assert ids == {"left-leg", "dome-servo"}

    await registry.shutdown()


async def test_dispatch_spin_emits_state_event():
    bus = EventBus()
    registry = DeviceRegistry(bus)
    events = []

    async def capture(channel, data):
        events.append((channel, data))

    bus.subscribe("*", capture)
    await registry.load_profile(_PROFILE)
    await registry.dispatch("left-leg", "spin", {"speed": 70})

    state_events = [e for e in events if e[0] == "left-leg.state"]
    assert state_events, "no state event emitted"
    assert state_events[-1][1]["speed"] == 70
    assert state_events[-1][1]["direction"] == "forward"

    await registry.shutdown()


async def test_dispatch_unknown_device_raises():
    bus = EventBus()
    registry = DeviceRegistry(bus)

    with pytest.raises(KeyError, match="nonexistent"):
        await registry.dispatch("nonexistent", "spin", {})


async def test_reload_profile_replaces_devices():
    bus = EventBus()
    registry = DeviceRegistry(bus)

    await registry.load_profile(_PROFILE)
    assert len(registry.list_devices()) == 2

    # Load a different profile with one device
    await registry.load_profile({
        "id": "test2",
        "devices": [{"id": "motor-a", "plugin": "dc_motor", "config": {"pwm_pin": 4, "in1_pin": 17, "in2_pin": 18}}],
    })

    devices = registry.list_devices()
    assert len(devices) == 1
    assert devices[0]["id"] == "motor-a"

    await registry.shutdown()


async def test_servo_state_reflects_move():
    bus = EventBus()
    registry = DeviceRegistry(bus)

    await registry.load_profile(_PROFILE)
    await registry.dispatch("dome-servo", "move", {"angle": 45})

    state = registry.get("dome-servo").get_state()
    assert state["angle"] == 45.0

    await registry.shutdown()
