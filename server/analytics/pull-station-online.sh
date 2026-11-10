#!/bin/bash
# 从香港站（47.82.96.119）拉各站会话服务的实时在线数
#
# 部署位置：本机 /usr/local/bin/pull-station-online.sh（root 执行）
# 触发方式：station-online-pull.timer，每 60 秒一次
#
# 为什么用「root 定时拉、www-data 只读文件」而不是让 analytics 自己 SSH：
#   entrance-analytics.service 以 www-data 运行且开了 NoNewPrivileges，
#   读不到 /root/.ssh 下的私钥。为了读一个数字就给一个公网 web 服务提权
#   （或者加 sudoers）都不划算，所以拆成「root 拉、写文件；服务只读」。
#
# 为什么 60 秒：门户的「在线」要求至少 3 分钟刷新一次。前端 30 秒轮询
#   /api/admin/online，服务端 15 秒缓存，快照 60 秒更新 —— 最坏 90 秒，仍达标。
set -euo pipefail

SRC_HOST="root@47.82.96.119"
KEY="/root/.ssh/ymgd-io.pem"
DEST_DIR="/var/lib/entrance-analytics"
DEST="$DEST_DIR/online.json"

mkdir -p "$DEST_DIR"

# 先写临时文件再 mv：读方永远看不到半个 JSON。
TMP="$(mktemp "$DEST_DIR/.online.XXXXXX")"

# 单次尝试别拖太久：timer 60 秒一次，卡住的连接必须自己死掉。
if timeout 20 ssh -o StrictHostKeyChecking=no -o BatchMode=yes \
     -o ConnectTimeout=10 -o ServerAliveInterval=5 -o ServerAliveCountMax=2 \
     -i "$KEY" "$SRC_HOST" /usr/local/bin/station-online.py >"$TMP" 2>/dev/null \
   && [ -s "$TMP" ] \
   && python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$TMP" 2>/dev/null; then
  chmod 644 "$TMP"
  chown www-data:www-data "$TMP"
  mv -f "$TMP" "$DEST"
else
  rm -f "$TMP"
  # 不删旧快照：analytics 自己会按 mtime/data.at 判过期，过期就退回日志推算。
  # 这里删掉反而会让它立刻失去任何会话数据。
  echo "[pull-station-online] 拉取失败，保留上一份快照" >&2
  exit 1
fi
