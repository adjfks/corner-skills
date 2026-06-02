#!/usr/bin/env bash
# Start debug log collector in background for the current project.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${1:-$(pwd)}"
PORT="${2:-${DEBUG_SERVER_PORT:-3847}}"

LOG_DIR="${PROJECT_ROOT}/.claude"
PID_FILE="${LOG_DIR}/debug-server.pid"
mkdir -p "${LOG_DIR}"

if [[ -f "${PID_FILE}" ]]; then
  existing_pid="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('${PID_FILE}','utf8')).pid)}catch{}" 2>/dev/null || true)"
  if [[ -n "${existing_pid}" ]] && kill -0 "${existing_pid}" 2>/dev/null; then
    echo "debug-server already running (pid=${existing_pid}, port=${PORT})"
    curl -sf "http://127.0.0.1:${PORT}/health" || true
    exit 0
  fi
fi

nohup node "${SCRIPT_DIR}/debug-server.js" "${PORT}" "${PROJECT_ROOT}" \
  > "${LOG_DIR}/debug-server.out" 2>&1 &
sleep 0.3
curl -sf "http://127.0.0.1:${PORT}/health" && echo ""
