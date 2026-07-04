import asyncio
import pytest
from brain.core.event_bus import EventBus


async def test_subscribe_and_publish():
    bus = EventBus()
    received = []

    async def handler(channel, data):
        received.append((channel, data))

    bus.subscribe("test.channel", handler)
    await bus.publish("test.channel", {"value": 42})

    assert received == [("test.channel", {"value": 42})]


async def test_wildcard_subscriber():
    bus = EventBus()
    channels = []

    async def handler(channel, data):
        channels.append(channel)

    bus.subscribe("*", handler)
    await bus.publish("device.state", {})
    await bus.publish("system.heartbeat", {})

    assert channels == ["device.state", "system.heartbeat"]


async def test_queue_receives_events():
    bus = EventBus()
    q = bus.add_queue()

    await bus.publish("test.event", {"x": 1})

    event = q.get_nowait()
    assert event["channel"] == "test.event"
    assert event["data"] == {"x": 1}

    bus.remove_queue(q)
    assert q not in bus._queues


async def test_unsubscribe_stops_delivery():
    bus = EventBus()
    received = []

    async def handler(channel, data):
        received.append(data)

    bus.subscribe("ch", handler)
    await bus.publish("ch", {"a": 1})
    bus.unsubscribe("ch", handler)
    await bus.publish("ch", {"a": 2})

    assert len(received) == 1


async def test_full_queue_does_not_block():
    bus = EventBus()
    q = bus.add_queue(maxsize=2)

    # Overfill — should not raise
    for i in range(5):
        await bus.publish("ch", {"i": i})

    assert q.qsize() == 2  # capped at maxsize, extras dropped
    bus.remove_queue(q)
