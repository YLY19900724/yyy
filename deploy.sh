#!/bin/bash
# ============================================
# 上海电满家工商业项目管理平台 - 一键部署脚本
# 在腾讯云轻量服务器上运行此脚本
# ============================================

set -e

echo "=========================================="
echo "  上海电满家工商业项目管理平台 部署脚本"
echo "=========================================="

# 1. 安装 Node.js 20.x
echo ""
echo "[1/6] 安装 Node.js 20.x ..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 2. 安装 git 和 PM2
echo ""
echo "[2/6] 安装 git 和 PM2 ..."
sudo apt-get install -y git
sudo npm install -g pm2

# 3. 克隆项目
echo ""
echo "[3/6] 克隆项目代码 ..."
sudo rm -rf /opt/project-review
sudo git clone https://github.com/YLY19900724/yyy.git /opt/project-review
cd /opt/project-review

# 4. 安装依赖
echo ""
echo "[4/6] 安装项目依赖 ..."
cd /opt/project-review/server
npm install

# 5. 创建数据目录
echo ""
echo "[5/6] 初始化数据目录 ..."
mkdir -p data uploads

# 6. 启动服务
echo ""
echo "[6/6] 启动服务 ..."
sudo PORT=80 pm2 start app.js --name "pv-review" --update-env
sudo pm2 save
sudo pm2 startup systemd -u root --hp /root
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

echo ""
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
echo "请在浏览器访问: http://你的服务器公网IP"
echo ""
echo "常用命令:"
echo "  查看服务状态: sudo pm2 status"
echo "  查看日志:     sudo pm2 logs pv-review"
echo "  重启服务:     sudo pm2 restart pv-review"
echo "  停止服务:     sudo pm2 stop pv-review"
echo ""
