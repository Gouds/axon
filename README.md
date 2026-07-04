# Axon

A modular robot control platform. The brain runs on a Raspberry Pi and exposes a web UI accessible from any device on the same network.

---

## Architecture

```
Pi (Brain)          ← runs FastAPI brain + serves built UI
Any browser         ← accesses http://<pi-ip>:8000
```

The brain handles hardware (GPIO, audio, servos) and serves the React UI from `ui/dist`. No separate web server needed.

---

## Installing on the Pi

### 1. Clone the repo

```bash
git clone https://github.com/Gouds/axon.git
cd axon
```

### 2. Create a Python virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

### 3. Install the brain and its dependencies

```bash
pip install -e .
pip install -e ".[pi]"
```

The `[pi]` extras include:
- `RPi.GPIO` — GPIO pin control
- `adafruit-circuitpython-servokit` — PCA9685 servo driver
- `pygame` — audio playback
- `smbus2` — I2C

---

## Running the Brain

Always activate the venv first:

```bash
source venv/bin/activate
```

### Foreground (see logs in terminal)

```bash
PROFILE=r2d2 MOCK_HARDWARE=false uvicorn brain.main:app --host 0.0.0.0 --port 8000
```

### Background (keeps running after you close the terminal)

```bash
PROFILE=r2d2 MOCK_HARDWARE=false nohup uvicorn brain.main:app --host 0.0.0.0 --port 8000 > axon.log 2>&1 &
```

Useful commands when running in background:

```bash
tail -f axon.log          # watch live logs
curl localhost:8000/status # check brain status
pkill -f uvicorn          # stop the brain
```

### Environment variables

| Variable | Values | Description |
|---|---|---|
| `PROFILE` | `r2d2` (or any profile id) | Auto-loads this profile on startup |
| `MOCK_HARDWARE` | `false` | Use real GPIO/hardware. Omit or set `true` for desktop simulation |

---

## Accessing the UI

Find the Pi's IP address:

```bash
hostname -I
```

Then open in any browser on the same network:

```
http://<pi-ip>:8000
```

---

## Updating

When new code is pushed from the Mac, pull it on the Pi and restart:

```bash
cd axon
git pull
source venv/bin/activate
pkill -f uvicorn
PROFILE=r2d2 MOCK_HARDWARE=false nohup uvicorn brain.main:app --host 0.0.0.0 --port 8000 > axon.log 2>&1 &
```

If Python dependencies changed (new packages in `pyproject.toml`):

```bash
pip install -e ".[pi]"
```

---

## Development (Mac)

Run the brain in mock mode and the Vite dev server together:

```bash
# Terminal 1 — brain
PROFILE=r2d2 MOCK_HARDWARE=true uvicorn brain.main:app --port 8000 --reload

# Terminal 2 — UI dev server (hot reload)
cd ui && npm run dev
```

UI available at `http://localhost:5173` (proxies API calls to port 8000).

To rebuild the production UI and commit it for the Pi:

```bash
cd ui && npm run build
cd ..
git add ui/dist
git commit -m "Rebuild UI"
git push
```
