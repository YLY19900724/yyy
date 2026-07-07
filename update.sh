#!/bin/bash
# 更新脚本 - 拉取最新代码并重启服务
set -e

echo "[1/4] 下载最新 index.html ..."
cd /opt/project-review
sudo curl -fsSL -o index.html "https://raw.githubusercontent.com/YLY19900724/yyy/main/index.html"

echo "[2/4] 下载最新 app.js ..."
sudo curl -fsSL -o server/app.js "https://raw.githubusercontent.com/YLY19900724/yyy/main/server/app.js"

echo "[3/4] 重启服务 ..."
pm2 restart project-review
sleep 2
pm2 status

echo ""
echo "[4/4] 测试访问 ..."
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}
" http://127.0.0.1:80

echo ""
echo "==================================="
echo "  更新完成！"
echo "  访问地址：http://119.29.221.81"
echo "==================================="
