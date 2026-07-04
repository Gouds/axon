# Axon — New Project Brief
> Hand this document to a new Claude session to start the platform build from scratch.

---

## Who I am & what I'm building

I'm Chris. I build R2-D2 and other droids as a hobby. I have an existing working project (`pi_brain`) that controls my R2-D2 via a Raspberry Pi (FastAPI backend, React/Vite frontend, I2C servos, GPIO, pygame audio, Arduino joystick bridge). That project works but grew organically and doesn't scale well.

I want to build a **new, separate platform** — a clean-slate project that anyone can use to configure, simulate, and deploy their own droid or robot. Think "Home Assistant for droids" or OctoPrint-style: load it up, pick your modules, configure them for your hardware, simulate before you wire anything up, then deploy. Inspired by ROS architecture but lightweight — no ROS dependency, single Raspberry Pi, simple to set up.

**This new project is a playground/test first.** I'm not migrating my existing droid to it yet. I'm building the architecture right, proving it works, then I'll decide when to move over.

---

## Deployment topology — this is critical

The platform runs as **one codebase in two distinct roles**. You select the role at startup via an env var or config flag. This is the insight: "same software, you tell it what it is and where the brain lives."

```
┌────────────────────────────────────┐      WiFi / LAN
│  CONTROLLER PI (handheld remote)   │ ──────────────────────────►
│                                    │                             │
│  role: controller                  │                             ▼
│  port 8001  (lightweight FastAPI)  │      ┌───────────────────────────────┐
│  ├─ health check                   │      │  BRAIN PI  (inside the droid)  │
│  ├─ Arduino config CRUD            │      │                               │
│  └─ Arduino flash (SSE stream)     │      │  role: brain                  │
│                                    │      │  port 8000  (full FastAPI)    │
│  serial bridge process             │      │  ├─ Device Registry           │
│  ├─ reads Arduino over USB serial  │      │  ├─ Event Bus                 │
│  ├─ POSTs joystick data to Brain   │      │  ├─ Rules Engine              │
│  └─ handles flash lock/release     │      │  ├─ Servo / Motor / Audio...  │
│                                    │      │  └─ WebSocket event stream    │
│  Chromium kiosk                    │      │                               │
│  └─ points at Brain's web UI       │      │  serves React frontend        │
│                                    │      └───────────────────────────────┘
│  Arduino (USB)                     │
│  └─ dual joysticks + buttons       │      (Also runs as DESKTOP / SIM MODE
│     + e-stop                       │       on dev machine — brain with all
└────────────────────────────────────┘       drivers forced to mock)
```

### The three roles

| Role | Who runs it | What it starts |
|---|---|---|
| `brain` | The droid's Pi | Full FastAPI app (port 8000), all device drivers (real or mock), frontend static files, WebSocket |
| `controller` | A separate handheld Pi | Lightweight FastAPI (port 8001) for Arduino flash only + serial bridge process + Chromium kiosk |
| `desktop` | Dev machine | Same as `brain` but `MOCK_HARDWARE=true` forced — pure simulation, no Pi required |

**Role is set by env var:** `PLATFORM_ROLE=brain` / `PLATFORM_ROLE=controller` / defaults to `desktop`.

### How they talk to each other

- Controller serial bridge POSTs to `{brain_url}/joystick/command` with the raw Arduino reading.
- Brain's `brain_url` is stored in the profile (each profile has a `brain_url` field, e.g. `http://192.168.4.44:8000`). Controller reads this from its local `.env` or is passed `--brain-url` on startup.
- Frontend (whether served by the Brain or running in dev) connects to the Brain's WebSocket for the live event stream. Profile's `brain_url` is what the frontend uses — you can manage multiple robots by switching profiles, each pointing to a different Brain.

### Flash coordination (already proven in existing project — replicate this)

When the user hits "Flash Arduino" via the web UI:
1. Controller's `server.py` writes `/tmp/droid_flash.lock` — signals the serial bridge to close its port.
2. Serial bridge detects the lock file, closes `serial.Serial`, writes `/tmp/droid_flash_ready.lock`.
3. `server.py` waits up to 15s for the ready file, then runs `arduino-cli compile --upload`.
4. On finish (success or error), both lock files are deleted — serial bridge reopens the port automatically.

This is a real working protocol from the existing project. Keep it.

---

## The platform vision

A user opens the web UI and:
1. **Picks device modules** — "I have a servo controller, two DC motors, an audio system, a lights panel"
2. **Configures each instance** — fills in a generated form (which GPIO pins, which I2C address, what open/close angles are) — no code required
3. **Simulates** — sees a live dashboard of all devices with animated widgets, can drive them — zero hardware connected
4. **Builds logic** — creates rules in a WHEN / IF / THEN UI (e.g. "when joystick button B2 pressed → play random audio AND spin dome")
5. **Deploys** — exact same profile JSON runs on the real Brain Pi; only the drivers swap from mock to real

---

## Architecture (ROS-inspired, not ROS-dependent)

### Layers

```
Web GUI (React/Vite)  ← served by Brain, or Vite dev server locally
  ↕  REST + WebSocket / SSE
Core API — Brain role (FastAPI port 8000)
  ├─ Profile Manager     ← "launch file" — which devices exist, with what config
  ├─ Device Registry     ← reads profile, instantiates plugin drivers or mocks
  ├─ Event Bus           ← in-process asyncio pub/sub (≈ ROS topics)
  └─ Rules Engine        ← {trigger, condition, action} JSON records
  ↕
Device Plugins           ← one folder per device type
  ├─ manifest.json       ← config schema, capability list, sim widget name
  ├─ driver.py           ← real hardware (I2C, GPIO, serial, pygame…)
  ├─ mock.py             ← simulated version (prints / fakes state)
  └─ (frontend widget)   ← React component for the simulation page

Lightweight API — Controller role (FastAPI port 8001)
  ├─ GET/PUT /admin/arduino/config   ← Arduino pin/tuning config
  └─ GET /admin/arduino/flash        ← SSE stream of arduino-cli output

Serial Bridge — Controller role (separate process)
  ├─ reads Arduino USB serial: "LX LY LT RX RY RT BTN ESTOP\n"
  ├─ POSTs to Brain: POST {brain_url}/joystick/command
  └─ handles FLASH_LOCK / FLASH_READY protocol
```

### ROS vocabulary mapping (use these terms consistently)
| ROS concept | Our equivalent |
|---|---|
| Launch file | Profile JSON |
| Node | Device plugin instance |
| Topic (pub/sub) | Event Bus channel |
| Service (req/res) | REST endpoint |
| Parameter server | Profile config |
| rqt / rviz | Web GUI simulation page |
| Package | Device plugin folder |
| roslaunch --screen | PLATFORM_ROLE=controller start.sh |

### The key invariant to protect
**Profile JSON must be the ONLY artifact that differs between simulate mode and deploy mode.** Same config shape, same rules — only the driver implementation swaps (mock vs real). Never let simulation require a different config structure than deployment.

---

## Arduino joystick protocol (working, replicate exactly)

Arduino sends over USB serial at configurable baud (default 9600):
```
"LX LY LT RX RY RT BTN ESTOP\n"
```
- `LX/LY/LT/RX/RY/RT` — analog axes, 0–1023 (deadzone applied ON the Arduino side)
- `BTN` — bitmask: bit0=Button1, bit1=Button2, bit2=Button3
- `ESTOP` — 0 or 1 (hardware e-stop switch, normally-closed)
- Only sends when a value changes beyond `CHANGE_THRESHOLD` OR after `KEEPALIVE_MS` of silence

The Arduino sketch is **auto-generated** from a template (`arduino.ino.template`) with `{{PIN_LX}}` style placeholders substituted from the stored config. User edits pins/tuning in the web UI → config saved → sketch regenerated → flash button uploads it. Template lives in `arduino/` alongside the generated `.ino`.

Serial bridge translates: `"512 512 512 512 512 512 0 0"` → `POST {brain_url}/joystick/command` with body `{"lx":512,"ly":512,...,"btn":0,"estop":0}`.

Brain's rules engine receives joystick events via the event bus (`joystick.axis`, `joystick.button`, `joystick.estop`) — Controller never talks directly to servos/motors; it only sends raw input to the Brain.

---

## Device plugin contract

Every device type must present 4 faces:

```
plugins/
└── dc_motor/
    ├── manifest.json     # config schema + capabilities
    ├── driver.py         # real hardware
    ├── mock.py           # mock driver
    └── __init__.py       # exports DevicePlugin implementation
```

### manifest.json shape (draft)
```json
{
  "type": "dc_motor",
  "label": "DC Motor (H-bridge)",
  "version": "1.0",
  "roles": ["brain"],
  "config_schema": [
    { "key": "name",      "label": "Instance name", "type": "string" },
    { "key": "pwm_pin",   "label": "PWM pin (BCM)", "type": "gpio_pin" },
    { "key": "in1_pin",   "label": "IN1 pin (BCM)", "type": "gpio_pin" },
    { "key": "in2_pin",   "label": "IN2 pin (BCM)", "type": "gpio_pin" },
    { "key": "frequency", "label": "PWM freq (Hz)", "type": "int", "default": 1000 }
  ],
  "capabilities": ["spin", "stop"],
  "sim_widget": "MotorBar"
}
```

Note the `roles` field — `["brain"]` means this plugin only instantiates in brain mode. The `joystick` plugin manifest has `"roles": ["controller"]` — it only runs on the Controller, and it outputs to the event bus rather than driving hardware directly.

### DevicePlugin base class (Python)
```python
class DevicePlugin:
    def __init__(self, config: dict, event_bus: EventBus): ...
    async def startup(self): ...
    async def shutdown(self): ...
    async def handle_action(self, action: dict): ...   # called by Rules Engine
    def get_state(self) -> dict: ...                   # called by Simulation page
```

---

## Composite devices (critical concept)

When two or more physical actuators create ONE meaningful motion, model them as a **composite device** — not two separate primitives the user has to choreograph.

**Example: Holoprojector pan-tilt head**
- Physically: 2 servos (pan axis + tilt axis)
- User-facing: "where is it pointing?" — a 2D direction, not two independent angles
- Composite device type `pan_tilt_head`:
  - Config references two servo *instance IDs* (already in registry — not raw pins)
  - Exposes `look_at(pan_deg, tilt_deg)` — the only place that knows the axis-to-servo mapping
  - Simulation widget: a 2D crosshair pad (dot shows pointing direction), NOT two separate gauges
  - Rules action: `holoprojector → look toward (direction)` — not "move servo A to X AND move servo B to Y"

This pattern repeats for: legs (hip + knee joints), grippers, gimbal cameras, any multi-DOF linkage. Build composite as a first-class concept from day one.

A working interactive demo of the composite widget vs two separate raw gauges already exists — see the UI concept mockup below.

---

## Profile JSON shape (draft)

```json
{
  "id": "r2d2",
  "label": "R2-D2",
  "brain_url": "http://192.168.4.44:8000",
  "colors": { "--btn-primary": "#2563eb" },
  "features": ["home", "dome", "body", "audio", "scripts", "lights", "control"],
  "devices": [
    {
      "id": "dome-servo",
      "plugin": "servo",
      "config": { "name": "Dome Tilt", "bus": "bus1", "channel": 0,
                  "open_angle": 160, "close_angle": 20, "default_angle": 90, "speed": 80 }
    },
    {
      "id": "left-leg",
      "plugin": "dc_motor",
      "config": { "name": "Left Leg", "pwm_pin": 4, "in1_pin": 17, "in2_pin": 18, "frequency": 1000 }
    },
    {
      "id": "holo-pan",   "plugin": "servo",
      "config": { "name": "Holo Pan", "bus": "bus1", "channel": 4, "default_angle": 90 }
    },
    {
      "id": "holo-tilt",  "plugin": "servo",
      "config": { "name": "Holo Tilt", "bus": "bus1", "channel": 5, "default_angle": 90 }
    },
    {
      "id": "holo-front",
      "plugin": "pan_tilt_head",
      "config": { "name": "Front Holoprojector", "pan_servo_id": "holo-pan", "tilt_servo_id": "holo-tilt" }
    }
  ],
  "rules": [
    {
      "id": "patrol",
      "label": "Patrol mode",
      "enabled": true,
      "trigger": { "type": "joystick_button", "button": "b2" },
      "condition": { "type": "always" },
      "actions": [{ "type": "script_run", "name": "patrol_loop" }]
    }
  ]
}
```

---

## Event bus design

In-process asyncio — no external broker needed for single-Pi deployment.

```python
# Channel naming: <device_id>.<event_type>
"dome-servo.state"       # { angle: 95, mock: true }
"left-leg.state"         # { speed: 70, direction: "forward", mock: false }
"joystick.button"        # { button: "b2", pressed: true }
"joystick.axis"          # { lx: 612, ly: 512, rx: 512, ry: 512, lt: 512, rt: 512 }
"joystick.estop"         # { engaged: true }
"rules.triggered"        # { rule_id: "patrol", action_type: "script_run" }
"system.estop"           # {}
```

WebSocket at `/ws/events` streams the event bus to the frontend — one connection shared across all widgets via React context. This is what drives the live simulation page AND the event log.

---

## Project structure (recommended)

```
axon/
├── pyproject.toml               # replaces requirements.txt — [pi] + [controller] extras
├── .env.example                 # PLATFORM_ROLE, BRAIN_URL, MOCK_HARDWARE
├── start_brain.sh               # convenience: PLATFORM_ROLE=brain uvicorn app:app ...
├── start_controller.sh          # convenience: PLATFORM_ROLE=controller uvicorn + python serial_bridge.py
├── app.py                       # FastAPI thin shell — routes only, NO business logic
├── core/
│   ├── event_bus.py             # asyncio pub/sub
│   ├── device_registry.py       # loads profile → instantiates plugins for current role
│   ├── profile_manager.py       # load/save/switch profiles
│   └── rules_engine.py          # evaluate + dispatch rules
├── controller/
│   ├── server.py                # lightweight FastAPI :8001 (Arduino flash + health)
│   ├── serial_bridge.py         # reads Arduino serial → publishes joystick events / POSTs to brain
│   └── flash_coordinator.py     # FLASH_LOCK / FLASH_READY protocol
├── arduino/
│   ├── arduino.ino.template     # {{PIN_LX}} etc placeholders
│   └── arduino.ino              # generated — never edit by hand
├── plugins/
│   ├── _base.py                 # DevicePlugin ABC
│   ├── servo/
│   │   ├── manifest.json        # roles: ["brain"]
│   │   ├── driver.py
│   │   └── mock.py
│   ├── dc_motor/
│   │   ├── manifest.json        # roles: ["brain"]
│   │   ├── driver.py
│   │   └── mock.py
│   ├── pan_tilt_head/           # composite — references two servo instances
│   │   ├── manifest.json        # roles: ["brain"]
│   │   ├── driver.py            # wraps two servo DevicePlugin instances
│   │   └── mock.py
│   ├── audio/
│   │   ├── manifest.json        # roles: ["brain"]
│   │   ├── driver.py            # pygame
│   │   └── mock.py
│   ├── lights/
│   │   ├── manifest.json        # roles: ["brain"] — AstroPixels I2C
│   │   ├── driver.py            # smbus2
│   │   └── mock.py
│   └── joystick/
│       └── manifest.json        # roles: ["controller"] — not a hardware driver, bridge only
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── context/
│       │   ├── EventBusContext.jsx   # single WebSocket → all widgets subscribe here
│       │   └── ProfileContext.jsx
│       ├── pages/
│       │   ├── BuildDroid.jsx        # module picker
│       │   ├── Configure.jsx         # manifest-driven config forms
│       │   ├── Simulate.jsx          # live device cards + event log
│       │   └── Rules.jsx             # WHEN/IF/THEN rule builder
│       ├── widgets/                  # one component per device type
│       │   ├── ServoGauge.jsx
│       │   ├── MotorBar.jsx
│       │   └── CrosshairPad.jsx      # composite pan-tilt widget
│       └── api/client.js
├── profiles/
│   └── r2d2/
│       ├── profile.json
│       ├── audio/
│       └── scripts/
└── tests/
    ├── test_event_bus.py
    ├── test_device_registry.py
    └── test_rules_engine.py
```

---

## pyproject.toml extras strategy

```toml
[project]
name = "axon-platform"
dependencies = ["fastapi", "uvicorn[standard]", "pydantic>=2"]

[project.optional-dependencies]
pi      = ["RPi.GPIO", "adafruit-circuitpython-servokit", "smbus2", "pygame"]
controller = ["pyserial", "requests"]
dev     = ["pytest", "pytest-asyncio", "httpx"]
```

- Dev machine: `pip install .[dev]` — pure mocks, no hardware libs needed
- Brain Pi: `pip install .[pi]`
- Controller Pi: `pip install .[controller]`

---

## Key best practices for this build

### Python
- **No monolithic `app.py`** — routes delegate immediately to `core/` modules; `app.py` is just FastAPI wiring
- **Type hints + Pydantic everywhere** — models for all API I/O AND for profile/manifest JSON (validate on load, not at surprise runtime)
- **No `shell=True` subprocess** — all subprocess calls use argument lists (`["arduino-cli", "compile", ...]`)
- **No raw `os.path.join` with user input** — use `pathlib.Path.resolve()` + assert result is still inside the expected base dir
- **Event bus, not HTTP loopback** — plugins never call `http://localhost:8000/...`; they emit events to the bus

### Project hygiene from day one
- `git init` immediately, `.gitignore` covers `__pycache__/`, `.env`, `venv/`, `*.pyc`, `.DS_Store`, `arduino/arduino.ino` (generated)
- `.env.example` committed, `.env` never committed
- `pytest` smoke tests for event bus and device registry before any hardware code

### Frontend
- `src/widgets/` — one React component per device type, filename matches the manifest's `sim_widget` field — simulation page resolves dynamically: `const Widget = widgets[manifest.sim_widget]`
- Config forms generated from `config_schema` — no hand-written form per device type
- Single WebSocket connection shared via `EventBusContext` — every widget subscribes to its own device channel

---

## First four things to build (in order)

### 1. Brain skeleton — event bus + device registry + one mock device
Prove the core plumbing before any hardware or UI:
- `EventBus` with `publish(channel, data)` and `subscribe(channel, callback)`
- `DevicePlugin` ABC
- `DeviceRegistry` that reads a profile JSON, instantiates the right plugin (driver vs mock based on `MOCK_HARDWARE` env), calls `startup()`
- One complete plugin: `dc_motor` with driver + mock + manifest
- `POST /action` → `{device_id, action_type, params}` → `registry.dispatch()` → event bus
- `GET /ws/events` WebSocket streaming the event bus

**Done when:** `curl -X POST /action -d '{"device_id":"left-leg","action_type":"spin","params":{"speed":70}}'` → mock prints "LEFT LEG MOTOR forward 70%" → WebSocket client receives `{"channel":"left-leg.state","data":{"speed":70,"direction":"forward","mock":true}}`.

### 2. `pan_tilt_head` composite plugin
Build second — forces you to define composite-wraps-primitive before you've over-built the solo path:
- Config references two servo device IDs (already in registry)
- `handle_action({"type": "look_at", "pan": -50, "tilt": 20})` → dispatches two servo `move` actions
- `CrosshairPad` React widget (SVG + JS already prototyped in the UI concept mockup — copy it)
- Event log should show one composite log line per `look_at`, NOT two raw servo lines

### 3. Controller role skeleton
- `controller/server.py` — Arduino flash SSE endpoint, Arduino config CRUD, health check (port 8001)
- `controller/serial_bridge.py` — opens serial port, reads Arduino lines, publishes `joystick.*` events to event bus AND POSTs to Brain's `/joystick/command`
- `controller/flash_coordinator.py` — `FLASH_LOCK` / `FLASH_READY` tmp file protocol (exact match to existing working implementation)
- `start_controller.sh` — starts server.py + serial_bridge.py + Chromium kiosk

**Done when:** Arduino plugged into Controller Pi → joystick moves → Brain's event log shows `joystick.axis` events.

### 4. Manifest-driven config form in the frontend
- `GET /plugins` → list of available plugin manifests
- `GET /plugins/{type}/manifest` → full manifest JSON
- `Configure.jsx` reads `config_schema`, renders a typed field per entry, saves to profile JSON
- Profile switch → `DeviceRegistry` tears down old devices, starts up new ones

---

## UI concept reference

**Interactive mockup:** `/Users/gouds/Documents/Dev/pi_brain/ui_concepts/index.html`
Open directly in browser — no server needed. Four screens: Build Your Droid (module picker), Configure Device (manifest-driven form with live motor preview), Simulation (animated servo gauges + composite holoprojector crosshair pad + motor slider + lights grid + live event log), Rules & Logic (WHEN/IF/THEN cards).

The composite demo on the Simulation screen is the most important thing to look at — clicking the composite Holoprojector card drives both raw Pan and Tilt servo gauges in sync, event log shows a single composite dispatch line. This is exactly the behaviour step 2 above should produce.

Colour palette (`--bg-primary: #0c0c0c`, `--accent: #ffffff`, `--btn-primary: #2563eb`, etc.) is the agreed visual style for the platform.

---

## Hardware context (R2-D2 specifics, for when you wire it up)

### Brain Pi hardware

| Device | Plugin type | Hardware | Config notes |
|---|---|---|---|
| Dome tilt servo | `servo` | PCA9685 via I2C (Adafruit ServoKit) | bus `bus1` addr `0x40`, channel 0 |
| Holo pan servo | `servo` | PCA9685 | bus `bus1`, channel 4 |
| Holo tilt servo | `servo` | PCA9685 | bus `bus1`, channel 5 |
| Front holoprojector | `pan_tilt_head` | composite (pan + tilt above) | references `holo-pan` + `holo-tilt` |
| Left leg motor | `dc_motor` | AQMH3615NS 15A H-bridge | PWM GPIO4 (BCM), IN1 GPIO17, IN2 GPIO18 |
| Right leg motor | `dc_motor` | AQMH3615NS 15A H-bridge | TBD GPIO pins |
| Logic display | `lights` | AstroPixels ESP32 | I2C bus 1 addr `0x0A`, smbus2 |
| Audio | `audio` | pygame on Pi's 3.5mm / HDMI audio | |

### Controller Pi hardware

| Device | Notes |
|---|---|
| Arduino (USB serial) | Nano, `arduino:avr:nano:cpu=atmega328old` FQBN, default port `/dev/ttyUSB0`, 9600 baud |
| Left joystick | 2-axis analog (LX=A0, LY=A1) + twist axis (LT=A2) |
| Right joystick | 2-axis analog (RX=A3, RY=A4) + twist axis (RT=A5) |
| Buttons | B1=pin2, B2=pin3, B3=pin4 (INPUT_PULLUP, active LOW) |
| E-stop | pin5 (INPUT_PULLUP, active LOW) |

---

*End of brief.*
