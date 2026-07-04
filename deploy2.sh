#!/bin/bash
# 部署脚本 v2 - 解决 git 协议不稳定问题
# 用 codeload 下载 zip 包，避免 git clone 失败

set -e

echo "[1/6] 检查 Node.js ..."
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

echo ""
echo "[2/6] 安装 PM2 ..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo "PM2 已安装"

echo ""
echo "[3/6] 下载项目代码（zip 方式）..."
sudo rm -rf /opt/project-review
sudo mkdir -p /opt/project-review
cd /opt/project-review

# 关键：使用 codeload 方式下载 zip 包，绕开 git 协议问题
# 重试 3 次
for i in 1 2 3; do
    echo "下载尝试 $i ..."
    if sudo curl -fsSL -o /tmp/repo.zip "https://codeload.github.com/YLY19900724/yyy/zip/refs/heads/main"; then
        echo "下载成功"
        break
    fi
    echo "下载失败，等待重试..."
    sleep 3
done

if [ ! -f /tmp/repo.zip ]; then
    echo "下载失败，尝试备用地址..."
    for i in 1 2 3; do
        if sudo curl -fsSL -o /tmp/repo.zip "https://github.com/YLY19900724/yyy/archive/refs/heads/main.tar.gz"; then
            echo "备用地址下载成功"
            break
        fi
        sleep 3
    done
fi

# 解压
if [ -f /tmp/repo.zip ]; then
    sudo apt-get install -y unzip > /dev/null 2>&1 || true
    sudo unzip -q /tmp/repo.zip
    sudo mv yyy-main/* . 2>/dev/null || sudo mv yyy/* . 2>/dev/null
    sudo rm -rf yyy yyy-main
    echo "项目代码解压完成"
elif [ -f /tmp/repo.tar.gz ] || ls /tmp/repo*.tar.gz 2>/dev/null; then
    TGZ=$(ls /tmp/repo*.tar.gz 2>/dev/null | head -1)
    sudo tar -xzf "$TGZ" --strip-components=1 -C .
    echo "项目代码解压完成"
else
    echo "下载失败，请检查网络"
    exit 1
fi

echo ""
echo "[4/6] 安装项目依赖 ..."
cd /opt/project-review/server
sudo npm install --no-audit --no-fund
echo "依赖安装完成"

echo ""
echo "[5/6] 初始化数据目录 ..."
cd /opt/project-review/server
sudo mkdir -p data uploads
sudo chown -R $USER:$USER /opt/project-review 2>/dev/null || true
echo "数据目录就绪"

echo ""
echo "[6/6] 启动服务 ..."
cd /opt/project-review/server

# 停止旧实例（如果有）
pm2 delete project-review 2>/dev/null || true

# 启动新实例
pm2 start app.js --name project-review
pm2 save

# 设置开机自启（忽略失败，服务器重启后需手动执行）
pm2 startup 2>/dev/null | tail -1 | sudo bash 2>/dev/null || true

echo ""
echo "==================================="
echo "  部署完成！"
echo "==================================="
echo ""
echo "服务状态："
pm2 status
echo ""
echo "测试访问："
curl -s -o /dev/null -w "HTTP 状态码: %{http_code}\n" http://127.0.0.1:3000
echo ""
SERVER_IP=$(curl -s -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "外网访问地址：http://$SERVER_IP:3000"
echo "（请确保腾讯云防火墙已开放 3000 端口）"
