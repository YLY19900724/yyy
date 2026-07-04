#!/bin/bash
# 修复监听地址 + 重启服务
set -e

echo "[1/4] 修改 app.js 让服务监听所有网卡 ..."
cd /opt/project-review/server

# 把 app.listen(PORT, ...) 改成 app.listen(PORT, '0.0.0.0', ...)
if ! grep -q "0.0.0.0" app.js; then
    sudo sed -i "s/app.listen(PORT,/app.listen(PORT, '0.0.0.0',/" app.js
    echo "已修改 app.js"
else
    echo "app.js 已经是监听所有网卡"
fi

# 确认修改
echo "当前 listen 行："
grep "app.listen" app.js

echo ""
echo "[2/4] 重启服务 ..."
pm2 restart project-review
sleep 2
pm2 status

echo ""
echo "[3/4] 测试本机访问 ..."
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}
" http://127.0.0.1:3000

echo ""
echo "[4/4] 检查监听地址 ..."
ss -tlnp | grep 3000

echo ""
echo "==================================="
echo "  修复完成！"
echo "  请刷新浏览器访问 http://119.29.221.81:3000"
echo "==================================="
