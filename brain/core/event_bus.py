from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Awaitable, Callable

Callback = Callable[[str, dict], Awaitable[None]]


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[Callback]] = defaultdict(list)
        self._queues: list[asyncio.Queue] = []

    async def publish(self, channel: str, data: dict):
        event = {"channel": channel, "data": data}

        targets = list(self._subscribers.get(channel, []))
        targets += list(self._subscribers.get("*", []))
        if targets:
            await asyncio.gather(*[cb(channel, data) for cb in targets], return_exceptions=True)

        for q in self._queues:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass  # slow consumer — drop rather than block

    def subscribe(self, channel: str, callback: Callback):
        self._subscribers[channel].append(callback)

    def unsubscribe(self, channel: str, callback: Callback):
        subs = self._subscribers.get(channel, [])
        if callback in subs:
            subs.remove(callback)

    def add_queue(self, maxsize: int = 200) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        self._queues.append(q)
        return q

    def remove_queue(self, q: asyncio.Queue):
        if q in self._queues:
            self._queues.remove(q)
