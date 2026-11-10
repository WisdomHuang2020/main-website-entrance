#!/bin/bash
# 从香港站（47.82.96.119）拉取各站 nginx 访问日志
#
# 三个实测决定：
#   ① 用 tar over ssh，不用 rsync —— rsync 在这条链路上会卡在 generator 阶段
#      并收到 SIGTERM（Broken pipe），换 tar 流一次就通；
#   ② 必须 gzip —— 该机带宽小，7.3 MB 原始日志传不完（实测超时 4 分钟），
#      日志文本压缩比约 10:1，压缩后 0.8 MB，几十秒完成；
#   ③ 只取 *.access.log*，不取全局 access.log（未匹配 Host 的兜底日志，不归属任何站）。
set -euo pipefail

SRC_HOST="root@47.82.96.119"
KEY="/root/.ssh/ymgd-io.pem"
DEST="/var/log/nginx-remote"

mkdir -p "$DEST"

ssh -o StrictHostKeyChecking=no -o BatchMode=yes -o ConnectTimeout=15 -i "$KEY" \
  "$SRC_HOST" 'cd /var/log/nginx && tar czf - *.access.log* 2>/dev/null' \
  | tar xzf - -C "$DEST"

# 本地保留 15 天（远端 logrotate 保留 14 天，多留一天缓冲）
find "$DEST" -type f -name '*.access.log.[0-9]*' -mtime +15 -delete 2>/dev/null || true
