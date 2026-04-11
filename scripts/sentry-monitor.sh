#!/bin/bash
# Sentry alert monitor — polls unresolved issues and outputs to stdout
# Usage: ./scripts/sentry-monitor.sh [interval_seconds]
# Claude Code can consume this output via Monitor tool or background task.

INTERVAL=${1:-300}  # Default: check every 5 minutes
ORG="yuan-qin"
PROJECTS=("uniboard-api" "uniboard-web")
API_BASE="https://de.sentry.io/api/0"

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "[ERROR] SENTRY_AUTH_TOKEN not set" >&2
  exit 1
fi

echo "[MONITOR] Sentry monitor started (interval: ${INTERVAL}s)"
echo "[MONITOR] Watching projects: ${PROJECTS[*]}"

while true; do
  for PROJECT in "${PROJECTS[@]}"; do
    RESPONSE=$(curl -s -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
      "${API_BASE}/projects/${ORG}/${PROJECT}/issues/?query=is:unresolved&sort=date&limit=5")

    COUNT=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)

    if [ "$COUNT" -gt 0 ]; then
      echo ""
      echo "=== [ALERT] ${PROJECT}: ${COUNT} unresolved issues ==="
      echo "$RESPONSE" | python3 -c "
import json, sys
issues = json.load(sys.stdin)
if isinstance(issues, list):
    for i in issues[:5]:
        title = i.get('title', 'Unknown')[:80]
        count = i.get('count', '?')
        level = i.get('level', '?')
        first = i.get('firstSeen', '?')[:19]
        last = i.get('lastSeen', '?')[:19]
        print(f'  [{level}] {title} (events: {count}, first: {first}, last: {last})')
" 2>/dev/null
    else
      echo "[OK] ${PROJECT}: no unresolved issues"
    fi
  done

  sleep "$INTERVAL"
done
