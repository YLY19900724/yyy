#!/bin/bash
# 改用 80 端口（HTTP 标准端口，不被运营商封锁）
set -e

echo "[1/6] 修改 app.js 端口为 80 ..."
cd /opt/project-review/server
sudo sed -i "s/const PORT = process.env.PORT || 3000;/const PORT = process.env.PORT || 80;/" app.js
echo "当前 PORT 配置："
grep "const PORT" app.js

echo ""
echo "[2/6] 停止旧服务 ..."
pm2 delete project-review 2>/dev/null || true
sleep 1

echo ""
echo "[3/6] 给 node 设置绑定低位端口能力 ..."
NODE_PATH=$(which node)
echo "Node 路径: $NODE_PATH"
sudo setcap 'cap_net_bind_service=+ep' $NODE_PATH
echo "已设置 setcap"

echo ""
echo "[4/6] 启动服务（80端口） ..."
cd /opt/project-review/server
pm2 start app.js --name project-review
pm2 save
sleep 2
pm2 status

echo ""
echo "[5/6] 测试本机访问 ..."
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}
" http://127.0.0.1:80

echo ""
echo "[6/6] 检查监听端口 ..."
ss -tlnp | grep -E ':(80|3000) '

echo ""
echo "==================================="
echo "  修复完成！"
echo "  访问地址：http://119.29.221.81"
echo "  （无需端口号，直接访问即可）"
echo "==================================="
