#!/usr/bin/env bash
# Smoke-tests the Motivator Game: starts servers, hits key API routes,
# takes Chrome headless screenshots, then stops everything.
# Usage: bash .claude/skills/run-motivator-game/smoke.sh [--keep]
#   --keep  leave servers running after the script finishes

set -euo pipefail
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
TMP="${TMPDIR:-/tmp}/motivator-smoke-$$"
KEEP=0
[[ "${1:-}" == "--keep" ]] && KEEP=1

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHROME_FLAGS="--headless=new --no-sandbox --window-size=1280,900"

mkdir -p "$TMP"
echo "▶ smoke dir: $TMP"

# ── Servers ────────────────────────────────────────────────────────────────────

pkill -f "tsx.*server/index" 2>/dev/null || true
pkill -f "vite"              2>/dev/null || true
sleep 1

cd "$REPO"
node --experimental-sqlite --import tsx/esm server/index.ts \
  > "$TMP/server.log" 2>&1 &
SERVER_PID=$!

npm run dev -- --port 3000 \
  > "$TMP/vite.log" 2>&1 &
VITE_PID=$!

cleanup() {
  if [[ $KEEP -eq 0 ]]; then
    kill "$SERVER_PID" "$VITE_PID" 2>/dev/null || true
    echo "▶ servers stopped"
  else
    echo "▶ servers still running (--keep): API=:8080  UI=:3000"
  fi
}
trap cleanup EXIT

echo -n "▶ waiting for API..."
for i in $(seq 1 20); do
  curl -sf http://localhost:8080/api/health > /dev/null 2>&1 && break
  sleep 1; echo -n "."
done
echo " ready"

echo -n "▶ waiting for Vite..."
for i in $(seq 1 20); do
  curl -sf http://localhost:3000 > /dev/null 2>&1 && break
  sleep 1; echo -n "."
done
echo " ready"

# ── API smoke tests ────────────────────────────────────────────────────────────

echo "▶ API: health"
curl -sf http://localhost:8080/api/health | grep -q '"ok":true'
echo "  ✓ health"

echo "▶ API: admin login"
TOKEN=$(curl -sf -X POST http://localhost:8080/api/auth/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "  ✓ token acquired"

echo "▶ API: list companies"
COMPANIES=$(curl -sf http://localhost:8080/api/admin/companies \
  -H "x-session-token: $TOKEN")
COUNT=$(echo "$COMPANIES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  ✓ $COUNT companies"

echo "▶ API: resolve company code"
FIRST_CODE=$(echo "$COMPANIES" | python3 -c \
  "import sys,json; cs=json.load(sys.stdin); print(cs[0]['accessCode']) if cs else print('')")
if [[ -n "$FIRST_CODE" ]]; then
  RESOLVE=$(curl -sf "http://localhost:8080/api/companies/resolve?code=$FIRST_CODE")
  echo "$RESOLVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"  ✓ resolved: {d['name']} (depts: {len(d['departments'])})\")"
fi

echo "▶ API: list reports"
REPORTS=$(curl -sf http://localhost:8080/api/reports \
  -H "x-session-token: $TOKEN")
RCOUNT=$(echo "$REPORTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "  ✓ $RCOUNT reports"

# ── Screenshots ────────────────────────────────────────────────────────────────

echo "▶ screenshot: welcome (role select)"
"$CHROME" $CHROME_FLAGS \
  --screenshot="$TMP/01-welcome.png" \
  "http://localhost:3000" 2>/dev/null
echo "  ✓ $TMP/01-welcome.png"

echo "▶ screenshot: welcome with company code pre-filled"
if [[ -n "$FIRST_CODE" ]]; then
  "$CHROME" $CHROME_FLAGS \
    --screenshot="$TMP/02-with-code.png" \
    "http://localhost:3000/?code=$FIRST_CODE" 2>/dev/null
  echo "  ✓ $TMP/02-with-code.png"
fi

echo ""
echo "✅ all checks passed"
echo "   screenshots in: $TMP/"
ls "$TMP/"*.png 2>/dev/null | sed 's/^/   /'
