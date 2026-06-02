#!/usr/bin/env bash
# Stop debug log collector for a project.
set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
PID_FILE="${PROJECT_ROOT}/.claude/debug-server.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "no debug-server pid file at ${PID_FILE}"
  exit 0
fi

pid="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).pid)" "${PID_FILE}" 2>/dev/null || true)"
if [[ -z "${pid}" ]]; then
  rm -f "${PID_FILE}"
  exit 0
fi

if kill -0 "${pid}" 2>/dev/null; then
  kill "${pid}" 2>/dev/null || true
  sleep 0.2
fi
rm -f "${PID_FILE}"
echo "stopped debug-server (pid=${pid})"
