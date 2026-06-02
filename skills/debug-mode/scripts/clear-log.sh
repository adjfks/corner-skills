#!/usr/bin/env bash
# Clear .claude/debug.log (and optionally via HTTP if server is up).
set -euo pipefail

PROJECT_ROOT="${1:-$(pwd)}"
PORT="${2:-${DEBUG_SERVER_PORT:-3847}}"
LOG_FILE="${PROJECT_ROOT}/.claude/debug.log"

mkdir -p "${PROJECT_ROOT}/.claude"
: > "${LOG_FILE}"

if curl -sf -X POST "http://127.0.0.1:${PORT}/clear" >/dev/null 2>&1; then
  echo "cleared via API and local file: ${LOG_FILE}"
else
  echo "cleared local file: ${LOG_FILE}"
fi
