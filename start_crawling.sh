#!/bin/bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PYTHON_BIN=${PYTHON_BIN:-python3}
SCRIPT_ARGS=("$@")
GIT_BRANCH=${GIT_BRANCH:-main}
GIT_AUTO_PUSH=${GIT_AUTO_PUSH:-true}
GIT_PATHS=${GIT_PATHS:-"csv_file xls_file data"}

cd "${ROOT_DIR}" || exit 1

log() {
  printf '[start_crawling] %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

run_update() {
  if [ ${#SCRIPT_ARGS[@]} -gt 0 ]; then
    ${PYTHON_BIN} src/update_arxiv.py "${SCRIPT_ARGS[@]}"
  else
    ${PYTHON_BIN} src/update_arxiv.py
  fi
}

log "开始执行爬取任务"
if run_update; then
  log "爬取任务完成"
  log "生成前端数据"
  ${PYTHON_BIN} src/build_frontend_data.py || log "生成前端数据失败"

  if [[ "${GIT_AUTO_PUSH}" == "true" ]]; then
    if git status --porcelain -- ${GIT_PATHS} | grep -q "."; then
      log "检测到变更，准备提交"
      # shellcheck disable=SC2086
      git add ${GIT_PATHS}
      if git commit -m "update" >/dev/null 2>&1; then
        if git push origin "${GIT_BRANCH}"; then
          log "提交并推送完成"
        else
          log "git push 失败"
        fi
      else
        log "git commit 未生成新提交"
      fi
    else
      log "无变更需要提交"
    fi
  fi
  exit 0
fi

log "爬取任务失败"
exit 1
