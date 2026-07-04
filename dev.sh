#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

export PATH="/opt/homebrew/bin:$PATH"

# Install UI deps if needed
if [ ! -d "$ROOT/ui/node_modules" ]; then
  echo "Installing UI dependencies..."
  (cd "$ROOT/ui" && npm install)
fi

PROFILE="${PROFILE:-r2d2}"

# Brain — REST API + WebSocket events (auto-loads profile)
MOCK_HARDWARE=true PLATFORM_ROLE=brain PROFILE="$PROFILE" \
  python3 -m uvicorn brain.main:app --port 8000 --reload &
BRAIN_PID=$!

# UI dev server (proxies all API/WS calls to brain)
(cd "$ROOT/ui" && npm run dev) &
UI_PID=$!

echo ""
echo "  Brain API + UI:  http://localhost:8000  (API)"
echo "  Dev UI:          http://localhost:5173   (use this in browser)"
echo "  Profile:         $PROFILE"
echo ""
echo "Press Ctrl+C to stop all."

trap "kill $BRAIN_PID $UI_PID 2>/dev/null; exit 0" INT TERM
wait
