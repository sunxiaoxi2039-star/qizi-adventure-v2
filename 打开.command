#!/bin/bash
# 双击打开「棋子大冒险」展示版:在本目录起本地服务器,three 走本地 vendor(不吃 CDN),关掉此窗口或 Ctrl+C 即停。
cd "$(dirname "$0")" || exit 1
PORT=8790
while lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT+1)); done
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null; exit 0' INT TERM HUP EXIT
for i in $(seq 1 50); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.1; done
echo "棋子大冒险已开:http://localhost:$PORT/show.html"
echo "正式游戏:http://localhost:$PORT/world3d.html"
echo "关掉此窗口或按 Ctrl+C 停止。"
[ -z "$NO_OPEN" ] && open "http://localhost:$PORT/show.html"
wait $SERVER
