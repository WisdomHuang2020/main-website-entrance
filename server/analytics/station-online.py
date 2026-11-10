#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""汇总本机各站会话鉴权服务的实时在线数，输出单行 JSON。

部署位置：香港站 47.82.96.119 的 /usr/local/bin/station-online.py

给统计服务器（43.142.148.37）的 station-online-pull.timer 每 60 秒拉一次，
最终供 power-knowledge.tech/admin 各站行尾的「● N 在线」使用。

为什么改用会话心跳、不再靠访问日志：
    nginx 日志只记录**页面请求**。页面开着不动就不会再产生文档请求，
    日志推算出来的「在线」在门户里恒为 0 —— 看板那一行干脆不渲染，
    于是「明明我自己就打开在这里」却看不到人数。
    会话服务的在线数来自前端每 60 秒一次的心跳，才是「现在几个人开着页面」。

口径：online = 最近 PRESENCE_MINUTES 分钟内有心跳的会话数；max = 本站上限。
取不到数时给 online=null 而不是 0 —— 把「服务挂了」显示成「0 人在线」
会掩盖故障，统计服务看到 null 会退回日志推算。
"""

import json
import time
import urllib.request

# 站点 id → 本机鉴权服务端口。id 必须与统计服务的 sites.json / 日志文件名前缀一致。
PORTS = (
    ("io", 8091),        # /opt/io-auth/io_auth.py
    ("magnetics", 8092),  # /opt/wd-auth/auth_server.py（wd-auth-magnetics）
    ("spice", 8093),      # 同上（wd-auth-spice）
    ("skills", 8094),     # 同上（wd-auth-skills）
)

TIMEOUT = 2.5


def probe(port):
    rec = {"online": None, "max": None}
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/health" % port, timeout=TIMEOUT) as r:
            d = json.loads(r.read().decode("utf-8"))
        if d.get("ok"):
            rec["online"] = int(d.get("online", 0))
            rec["max"] = int(d.get("max", 0))
        else:
            rec["error"] = "health not ok"
    except Exception as e:  # noqa: BLE001 —— 单个服务异常不该拖垮整份快照
        rec["error"] = ("%s: %s" % (type(e).__name__, e))[:100]
    return rec


def main():
    sites = {site: probe(port) for site, port in PORTS}
    out = {"at": int(time.time()), "host": "47.82.96.119", "sites": sites}
    print(json.dumps(out, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
