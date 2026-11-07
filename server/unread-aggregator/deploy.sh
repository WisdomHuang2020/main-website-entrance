#!/usr/bin/env bash
# 部署「站群未读留言聚合」—— 只读统计 + 入口站 nginx 端点
# ============================================================================
#   bash server/unread-aggregator/deploy.sh              # 全量部署（幂等）
#   bash server/unread-aggregator/deploy.sh --check      # 只读体检，不改任何东西
#
# 纪律（与 server/feedback-api/deploy.sh 同源）：
#   ① 同机跑着 9 个站，改 nginx 前先备份，改完 nginx -t，不过就逐字节还原；
#   ② reload 而非 restart；
#   ③ 只往 entrance 的 vhost 注入一个精确 location，不整份覆盖配置
#      —— 服务器上可能有仓库之外的本地改动，整份覆盖会把它冲掉；
#   ④ 上传走「本地打成文件 → scp → 远端从文件解包」，不用 tar | ssh 管道
#      （本项目实测过管道会让远端 tar 卡在等 stdin）。
# ============================================================================
set -euo pipefail

LH_HOST="${LH_HOST:-43.142.148.37}"
LH_KEY="${LH_KEY:-$HOME/.ssh/pfc_ci}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/server/unread-aggregator"
NGINX_CONF="/etc/nginx/sites-available/entrance"
BACKUP_DIR="/root/nginx-backup-unread-$(date +%Y%m%d-%H%M%S)"

SSH="ssh -i $LH_KEY -o BatchMode=yes -o ConnectTimeout=15 root@$LH_HOST"
SCP="scp -i $LH_KEY -o BatchMode=yes"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

MODE="${1:-full}"

say "⓪ 连通性与前置条件"
$SSH 'test -f /etc/nginx/nginx.conf' || die "无法连接 $LH_HOST 或 nginx 不存在"
NODE_V=$($SSH 'node -v' | tr -d '\r')
case "$NODE_V" in
  v22.*|v23.*|v24.*) echo "   node $NODE_V（node:sqlite 可用）" ;;
  *) die "服务器 Node 版本 $NODE_V 过低，需 ≥ 22.5" ;;
esac
$SSH 'for f in /var/lib/feedback-api/data.db /var/lib/widget-api/data.db; do \
        test -r "$f" || { echo "缺少或不可读：$f" >&2; exit 9; }; done' \
  || die "两个留言库必须已存在且可读（它们由 8792 / 8791 两个服务维护）"

if [ "$MODE" = "--check" ]; then
  say "只读体检"
  $SSH 'systemctl is-active unread-aggregator.timer 2>/dev/null || echo "(timer 未安装)"; \
        systemctl list-timers unread-aggregator.timer --no-pager 2>/dev/null | tail -2; \
        echo "--- 产物 ---"; cat /var/lib/entrance-unread/unread.json 2>/dev/null || echo "(无)"; \
        echo "--- nginx ---"; grep -n "location = /api/unread" '"$NGINX_CONF"' 2>/dev/null || echo "(未注入)"'
  exit 0
fi

# ── ① 上传代码（文件式，不用管道）────────────────────────────────────────
say "① 上传聚合器到 /opt/entrance-unread"
TGZ="$(mktemp -t entrance-unread-XXXXXX.tgz)"
# 本机 mktemp 返回 `C:/Users/.../Temp/xxx.tgz`：
#   · tar -f 见到 `C:` 会按 `host:path` 解析 → “Cannot connect to C:”（实测）；
#     故必须 --force-local。
#   · safe-delete 守卫拒绝带盘符的路径，故清理时换回 /c/... 形式。
TGZ_U="$(cygpath -u "$TGZ")"
trap 'rm -f "$TGZ_U"' EXIT
tar --force-local -C "$SRC" -czf "$TGZ" index.mjs unread-aggregator.service unread-aggregator.timer README.md
$SSH 'mkdir -p /opt/entrance-unread /var/lib/entrance-unread'
# 两个本地路径都显式转成 Windows 形式，再关掉 MSYS 的路径转换：
# 否则 `-i` 的密钥路径同样会被跳过转换，原生 OpenSSH 不认 `/c/Users/...`，
# 表现为「认证失败」而不是「文件找不到」，很容易误判成密钥没权限。
KEY_WIN="$(cygpath -w "$LH_KEY")"
TGZ_WIN="$(cygpath -w "$TGZ")"
MSYS_NO_PATHCONV=1 scp -i "$KEY_WIN" -o BatchMode=yes "$TGZ_WIN" "root@$LH_HOST:/tmp/entrance-unread.tgz" >/dev/null
$SSH 'tar xzf /tmp/entrance-unread.tgz -C /opt/entrance-unread && \
      rm -f /tmp/entrance-unread.tgz && \
      chown -R www-data:www-data /opt/entrance-unread /var/lib/entrance-unread && \
      chmod 755 /var/lib/entrance-unread'
echo "   已上传：index.mjs / units / README"

# ── ② 装 timer 并立刻跑一次 ───────────────────────────────────────────────
say "② 安装 systemd 单元并生成首份产物"
$SSH 'cp /opt/entrance-unread/unread-aggregator.service /etc/systemd/system/ && \
      cp /opt/entrance-unread/unread-aggregator.timer   /etc/systemd/system/ && \
      systemctl daemon-reload && \
      systemctl enable --now unread-aggregator.timer && \
      systemctl start unread-aggregator.service'
$SSH 'test -s /var/lib/entrance-unread/unread.json' || {
  $SSH 'journalctl -u unread-aggregator.service -n 30 --no-pager' >&2
  die "首轮聚合没有产出 JSON，已停止（不会继续改 nginx）"
}
$SSH 'chmod 644 /var/lib/entrance-unread/unread.json'
echo "   产物："
$SSH 'cat /var/lib/entrance-unread/unread.json' | sed 's/^/     /'

# ── ③ 往 entrance vhost 注入精确 location（幂等）─────────────────────────
say "③ 注入 location = /api/unread"

read -r -d '' PATCHER <<'PY' || true
import os, pathlib, shutil, sys

conf = pathlib.Path(os.environ['NGINX_CONF'])
backup = pathlib.Path(os.environ['BACKUP_DIR'])
s = conf.read_text()

if 'location = /api/unread' in s:
    print('SKIPPED: already present')
    sys.exit(0)

anchor = 'location = /api/version/web-training'
idx = s.find(anchor)
if idx < 0:
    print('MISSING: 找不到 version 端点锚点，拒绝盲改', file=sys.stderr)
    sys.exit(3)
line_end = s.find('\n', idx)
if line_end < 0:
    print('MISSING: 锚点行没有换行', file=sys.stderr)
    sys.exit(3)

block = """
    # ── 未读留言计数（2026-11-07 新增）──────────────────────────────
    # 产物由 unread-aggregator.service 每 60 秒只读统计两个留言库后写出。
    # 用 `=` 精确匹配：抢在 location / 的 try_files 之前，否则文件缺失时
    # 会回落成 index.html（200 + HTML），前端会把整页当 JSON 解析失败。
    # no-store：计数必须每次回源，绝不缓存。
    location = /api/unread {
        alias /var/lib/entrance-unread/unread.json;
        default_type application/json;
        add_header Cache-Control "no-store";
    }
"""

backup.mkdir(parents=True, exist_ok=True)
shutil.copy2(conf, backup / 'entrance')
conf.write_text(s[:line_end + 1] + block + s[line_end + 1:])
print('PATCHED: /api/unread injected')
PY
B64=$(printf '%s' "$PATCHER" | base64 -w0)

set +e
$SSH "NGINX_CONF='$NGINX_CONF' BACKUP_DIR='$BACKUP_DIR' bash -lc 'echo $B64 | base64 -d > /tmp/inject-unread.py && python3 /tmp/inject-unread.py'"
PATCH_RC=$?
set -e
[ $PATCH_RC -eq 0 ] || die "nginx 注入失败（rc=$PATCH_RC），线上未变更"

say "④ nginx -t 与 reload"
set +e
$SSH 'nginx -t' 2>&1 | sed 's/^/   /'
T_RC=${PIPESTATUS[0]}
set -e
if [ "$T_RC" != "0" ]; then
  echo "   ✗ 语法检查失败，还原备份 $BACKUP_DIR"
  $SSH "cp -f '$BACKUP_DIR/entrance' '$NGINX_CONF' && nginx -t" >&2
  die "已还原 entrance vhost，线上未变更"
fi
$SSH 'systemctl reload nginx'
echo "   已 reload（不是 restart）"

# ── ⑤ 公网验收 ────────────────────────────────────────────────────────────
say "⑤ 公网验收"
RESP=$($SSH "curl -s -m 8 -H 'Cache-Control: no-cache' https://power-knowledge.tech/api/unread" | tr -d '\r')
echo "   /api/unread → $RESP"
echo "$RESP" | grep -q '"total"' || die "公网端点没有返回聚合 JSON"
$SSH "curl -s -o /dev/null -w '   HTTP %{http_code} / content-type %{content_type}\\n' https://power-knowledge.tech/api/unread"

say "完成"
cat <<'TIP'
   验收清单（建议人工再核一遍）：
     · 有未读留言的站点卡片右上角应出现角标；为 0 的站不显示
     · 在某站后台把一条留言标为「已读」，最多 60 秒后角标数字应减少
     · GitHub Pages 兜底通道没有该端点，应静默不显示任何角标（不报错）
TIP
