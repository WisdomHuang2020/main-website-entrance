#!/usr/bin/env bash
# 部署站群留言板（feedback-api）—— 后端 + 5 个站的 nginx 反代
# ============================================================================
#   bash deploy/deploy.sh              # 全量部署（幂等，可重复跑）
#   bash deploy/deploy.sh --nginx-only # 只补 nginx 反代
#   bash deploy/deploy.sh --check      # 只做只读体检，不改任何东西
#
# 为什么脚本要做这么多断言：这套改动落在**生产机**上，同机还跑着 9 个网站。
# 一个缩进写错的 location 就能让某个站整站 502。因此：
#   ① 每个 vhost 改之前先备份到 /root/nginx-backup-<时间>/；
#   ② 改完先 `nginx -t`，不通过就**逐字节还原**所有 vhost 再退出；
#   ③ 通过才 reload（不是 restart —— 同机还有别的站）；
#   ④ 最后逐站断言 /api/health，任一站失败立刻显形。
# ============================================================================
set -euo pipefail

HOST_ALIAS="${HOST_ALIAS:-lh}"      # ~/.ssh/config 里的别名；无别名时用 LH_HOST 直连
LH_HOST="${LH_HOST:-43.142.148.37}"
LH_KEY="${LH_KEY:-$HOME/.ssh/deepseek_ops}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"   # → 仓库根（entrance/）

SSH="ssh -i $LH_KEY -o BatchMode=yes -o ConnectTimeout=15 root@$LH_HOST"
SCP="scp -i $LH_KEY -o BatchMode=yes"

MODE="${1:-full}"
BACKUP_DIR="/root/nginx-backup-$(date +%Y%m%d-%H%M%S)"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ── 站点清单（与 server/feedback-api/sites.mjs 必须一致）──────────────────
declare -A SITE_OF=(
  [llc]="llc.power-knowledge.tech"
  [interleavedpfc]="interleavedpfc.power-knowledge.tech"
  [ahb]="ahb.power-knowledge.tech"
  [optical]="optical.power-knowledge.tech"
  [web-training]="web-training.power-knowledge.tech"
)

say "⓪ 连通性与版本核对"
$SSH 'test -f /etc/nginx/nginx.conf' || die "无法连接 $LH_HOST 或 nginx 不存在"
NODE_V=$($SSH 'node -v' | tr -d '\r')
case "$NODE_V" in
  v22.*|v23.*|v24.*) echo "   node $NODE_V（node:sqlite 可用）" ;;
  *) die "服务器 Node 版本 $NODE_V 过低：本服务依赖 node:sqlite（需 ≥ 22.5）" ;;
esac
echo "   站点数 ${#SITE_OF[@]}；备份目录 $BACKUP_DIR"

if [ "$MODE" = "--check" ]; then
  say "只读体检"
  $SSH 'systemctl is-active feedback-api 2>/dev/null || echo "(未安装)"; \
        curl -s -m 3 http://127.0.0.1:8792/api/health || echo "  /api/health 无响应"'
  for sid in "${!SITE_OF[@]}"; do
    printf '   %-16s ' "$sid"
    $SSH "grep -c 'X-Site' /etc/nginx/sites-available/$sid 2>/dev/null || echo 0" | tr -d '\r'
  done
  exit 0
fi

# ── ① 部署后端 ──────────────────────────────────────────────────────────────
if [ "$MODE" != "--nginx-only" ]; then
  say "① 上传后端到 /opt/feedback-api"
  # uploads 必须与 data.db 同级同属主：附件由服务进程（www-data）直接写盘，
  # 目录不存在或属主不对会在第一次上传时抛 EACCES，而那时读者已经填完整篇描述。
  $SSH 'mkdir -p /opt/feedback-api /var/lib/feedback-api /var/lib/feedback-api/uploads'
  tar -C "$ROOT/server/feedback-api" -czf - index.mjs sites.mjs init-site.mjs feedback-api.service README.md \
    | $SSH "tar -xzf - -C /opt/feedback-api"
  $SSH 'chown -R www-data:www-data /opt/feedback-api /var/lib/feedback-api && chmod 750 /var/lib/feedback-api && chmod 750 /var/lib/feedback-api/uploads'
  echo "   已上传：$(ls "$ROOT/server/feedback-api" | tr '\n' ' ')"

  say "② 安装并启动 systemd 单元"
  # ⚠️ 必须 restart 而不是 enable --now：后者对**已在运行**的服务是空操作，
  # 表现为「脚本报成功、文件已更新、但进程还在跑旧代码」。
  # 2026-11-02 加附件功能时正是这样：服务启动于 19:36，新代码 19:56 落盘，
  # 接口却仍按旧逻辑返回，排查了一轮才发现进程从未重启。
  $SSH 'cp /opt/feedback-api/feedback-api.service /etc/systemd/system/ && \
        systemctl daemon-reload && systemctl enable feedback-api && \
        systemctl restart feedback-api'
  sleep 2
  $SSH 'systemctl is-active --quiet feedback-api' || {
    $SSH 'journalctl -u feedback-api -n 30 --no-pager' >&2
    die "feedback-api 未能启动"
  }
  HEALTH=$($SSH 'curl -s -m 3 http://127.0.0.1:8792/api/health' | tr -d '\r')
  echo "   /api/health → $HEALTH"
  echo "$HEALTH" | grep -q '"ok":true' || die "健康检查未返回 ok"
fi

# ── ③ 注入 nginx 反代（幂等）───────────────────────────────────────────────
say "③ 为 5 个站注入 location ^~ /api/"

# 注入器用 Python：需要"找到 www.<domain> 所在的 server 块、在其 location / 之前插入"，
# awk/sed 对这种嵌套结构不可靠。脚本经 base64 传输，避免多层引号转义出错。
read -r -d '' PATCHER <<'PY' || true
import base64, os, pathlib, re, shutil, subprocess, sys

SSH_BACKUP = os.environ['BACKUP_DIR']
SITES = {
    'llc':            'llc.power-knowledge.tech',
    'interleavedpfc': 'interleavedpfc.power-knowledge.tech',
    'ahb':            'ahb.power-knowledge.tech',
    'optical':        'optical.power-knowledge.tech',
    'web-training':   'web-training.power-knowledge.tech',
}

def api_block(sid):
    return f"""    # ── 留言板 API（2026-11-02 新增）──────────────────────────────
    # 站点身份由本行注入，后端不解析 Host：客户端自带的 X-Site 会被这里覆盖。
    # 用 ^~ 是为了抢在 web-training 那几条正则 location 之前（正则按顺序匹配）。
    # proxy_pass 结尾不带斜杠：带斜杠会吞掉 /api/ 前缀。
    location ^~ /api/ {{
        proxy_pass http://127.0.0.1:8792;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Site            {sid};
        proxy_read_timeout 30s;
        client_max_body_size 32k;
    }}

"""

os.makedirs(SSH_BACKUP, exist_ok=True)
changed, skipped, missing = [], [], []

for sid, domain in SITES.items():
    path = pathlib.Path(f'/etc/nginx/sites-available/{sid}')
    if not path.exists():
        missing.append(sid); continue
    s = path.read_text()

    if 'X-Site' in s:
        skipped.append(sid); continue

    anchor = f'server_name www.{domain};'
    idx = s.find(anchor)
    if idx < 0:
        # 有的 vhost 把 www 写在 server_name 列表里或顺序不同，退一步找裸名
        idx = s.find(f'server_name {domain}')
    if idx < 0:
        missing.append(sid + '(找不到 server_name)'); continue

    block_start = s.rfind('server {', 0, idx)
    if block_start < 0:
        missing.append(sid + '(找不到 server {)'); continue

    # 该 server 块内的 location / （第一个）
    m = re.search(r'\n[ \t]*location\s+/\s*\{', s[block_start:])
    if not m:
        missing.append(sid + '(找不到 location /)'); continue
    insert_at = block_start + m.start() + 1

    shutil.copy2(path, pathlib.Path(SSH_BACKUP) / sid)
    new = s[:insert_at] + api_block(sid) + s[insert_at:]
    path.write_text(new)
    changed.append(sid)

print('PATCHED:', ' '.join(changed) or '(none)')
print('SKIPPED:', ' '.join(skipped) or '(none)')
if missing:
    print('MISSING:', ' '.join(missing))
    sys.exit(3)
PY
B64=$(printf '%s' "$PATCHER" | base64 -w0)

set +e
$SSH "BACKUP_DIR='$BACKUP_DIR' bash -lc 'echo $B64 | base64 -d > /tmp/patch-nginx.py && mkdir -p $BACKUP_DIR && python3 /tmp/patch-nginx.py'"
PATCH_RC=$?
set -e
[ $PATCH_RC -eq 0 ] || { $SSH 'cat /tmp/patch-nginx.py >/dev/null'; die "nginx 注入失败（rc=$PATCH_RC），未改动线上"; }

# ── ④ 语法检查，不通过则还原 ────────────────────────────────────────────────
say "④ nginx -t"
set +e
$SSH 'nginx -t' 2>&1 | sed 's/^/   /'
T_RC=${PIPESTATUS[0]}
set -e
if [ "$T_RC" != "0" ]; then
  echo "   ✗ 语法检查失败，正在还原备份 $BACKUP_DIR"
  $SSH "for f in $BACKUP_DIR/*; do cp -f \"\$f\" /etc/nginx/sites-available/\$(basename \"\$f\"); done; nginx -t" >&2
  die "已还原全部 vhost，线上未变更"
fi
$SSH 'systemctl reload nginx'
echo "   已 reload（不是 restart —— 同机还有别的站）"

# ── ⑤ 逐站验证 ──────────────────────────────────────────────────────────────
say "⑤ 逐站断言 /api/health 的站点归属"
FAIL=0
for sid in "${!SITE_OF[@]}"; do
  OUT=$($SSH "curl -s -m 5 -H 'X-Site: $sid' http://127.0.0.1:8792/api/health" | tr -d '\r')
  if echo "$OUT" | grep -q '"ok":true'; then
    printf '   \033[32m✓\033[0m %-16s %s\n' "$sid" "$OUT"
  else
    printf '   \033[31m✗\033[0m %-16s %s\n' "$sid" "$OUT"; FAIL=1
  fi
done
[ $FAIL -eq 0 ] || die "有站点健康检查失败"

say "完成"
cat <<'TIP'
   下一步（必做，否则后台进不去）：
     每站在服务器上生成一次性令牌，再在浏览器里设密码：
       sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --list
       sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --site llc
   令牌 60 分钟有效、用一次即焚；密码不要贴进聊天记录。
TIP
