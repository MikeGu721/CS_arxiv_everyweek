#!/bin/bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
INTERVAL_SECONDS=${INTERVAL_SECONDS:-43200}
LOG_PREFIX="[auto_crawling]"
SCRIPT_ARGS=("$@")

log() {
  printf '%s %s %s\n' "${LOG_PREFIX}" "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

while true; do
  log "开始执行周期性爬取"
  if [ ${#SCRIPT_ARGS[@]} -gt 0 ]; then
    RUN_CMD=("${ROOT_DIR}/start_crawling.sh" "${SCRIPT_ARGS[@]}")
  else
    RUN_CMD=("${ROOT_DIR}/start_crawling.sh")
  fi
  if "${RUN_CMD[@]}"; then
    log "本轮爬取完成"
  else
    log "本轮爬取失败"
  fi
  log "休眠 ${INTERVAL_SECONDS} 秒后再次执行"
  sleep "${INTERVAL_SECONDS}"
done
