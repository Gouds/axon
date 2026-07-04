from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

from brain.core.event_bus import EventBus


class ScriptRunner:
    def __init__(self, registry, event_bus: EventBus):
        self._registry = registry
        self._bus      = event_bus
        self._scripts: dict[str, dict] = {}
        self._running: dict[str, asyncio.Task] = {}
        self._profile_id: str | None = None

    # ── Loading ───────────────────────────────────────────────

    def load_scripts(self, profile_id: str):
        self._profile_id = profile_id
        self._scripts = {}
        scripts_dir = Path(f"profiles/{profile_id}/scripts")
        if scripts_dir.exists():
            for f in sorted(scripts_dir.glob("*.json")):
                try:
                    script = json.loads(f.read_text())
                    self._scripts[script["id"]] = script
                    print(f"[scripts] loaded '{script.get('name', script['id'])}'")
                except Exception as e:
                    print(f"[scripts] error loading {f.name}: {e}")

    # ── CRUD ─────────────────────────────────────────────────

    def list_scripts(self) -> list[dict]:
        return [
            {**s, "running": self.is_running(s["id"])}
            for s in self._scripts.values()
        ]

    def get_script(self, script_id: str) -> dict | None:
        s = self._scripts.get(script_id)
        if s:
            return {**s, "running": self.is_running(script_id)}
        return None

    def save_script(self, script: dict) -> dict:
        if "id" not in script or not script["id"]:
            script["id"] = f"script-{int(time.time() * 1000)}"
        script.setdefault("name", "Untitled Script")
        script.setdefault("trigger", {"type": "manual"})
        script.setdefault("steps", [])
        self._scripts[script["id"]] = script
        if self._profile_id:
            d = Path(f"profiles/{self._profile_id}/scripts")
            d.mkdir(parents=True, exist_ok=True)
            (d / f"{script['id']}.json").write_text(json.dumps(script, indent=2))
        return script

    def delete_script(self, script_id: str):
        self._scripts.pop(script_id, None)
        if self._profile_id:
            p = Path(f"profiles/{self._profile_id}/scripts/{script_id}.json")
            p.unlink(missing_ok=True)

    # ── Execution ─────────────────────────────────────────────

    def is_running(self, script_id: str) -> bool:
        task = self._running.get(script_id)
        return task is not None and not task.done()

    async def run(self, script_id: str):
        script = self._scripts.get(script_id)
        if not script:
            raise KeyError(f"Script '{script_id}' not found")
        if self.is_running(script_id):
            return
        task = asyncio.create_task(self._execute(script))
        self._running[script_id] = task

    async def stop(self, script_id: str):
        task = self._running.get(script_id)
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def _execute(self, script: dict):
        sid = script["id"]
        await self._bus.publish(f"script.{sid}", {"id": sid, "status": "running"})
        try:
            for step in script.get("steps", []):
                await self._execute_step(step)
            await self._bus.publish(f"script.{sid}", {"id": sid, "status": "finished"})
        except asyncio.CancelledError:
            await self._bus.publish(f"script.{sid}", {"id": sid, "status": "stopped"})
        except Exception as e:
            print(f"[scripts] error in '{sid}': {e}")
            await self._bus.publish(f"script.{sid}", {"id": sid, "status": "error", "error": str(e)})

    async def _execute_step(self, step: dict):
        stype = step.get("type")
        if stype == "action":
            await self._registry.dispatch(
                step["device"],
                step["action"],
                step.get("params", {}),
            )
        elif stype == "wait":
            await asyncio.sleep(max(0, step.get("ms", 1000)) / 1000)
        elif stype == "run_script":
            other = self._scripts.get(step.get("script_id", ""))
            if other:
                await self._execute(other)

    # ── Startup triggers ──────────────────────────────────────

    async def run_startup_scripts(self):
        for script in self._scripts.values():
            if script.get("trigger", {}).get("type") == "startup":
                await self.run(script["id"])
