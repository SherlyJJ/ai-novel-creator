#!/bin/bash
# 同人创作空间 - 一键部署脚本
# 在服务器上执行此脚本即可

set -e

echo "🚀 开始部署同人创作空间..."

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js 版本: $(node -v)"

# 2. 安装依赖
echo "📦 安装前端依赖..."
npm install

echo "📦 安装后端依赖..."
cd server && npm install && cd ..

# 3. 构建前端
echo "🔨 构建前端静态文件..."
DISABLE_ELECTRON=1 npx vite build

# 4. 构建后端
echo "🔨 构建后端..."
cd server && npm run build && cd ..

# 5. 配置环境变量
if [ ! -f server/.env ]; then
    echo "📝 创建环境配置文件..."
    cat > server/.env << EOF
PORT=3001
DATA_DIR=../data
AI_API_URL=
AI_API_KEY=
AI_MODEL=deepseek-chat
EOF
    echo "⚠️  请编辑 server/.env 配置 AI API（可选，用户也可在前端自行配置）"
fi

# 6. 创建数据目录
mkdir -p data

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 启动命令："
echo "   cd server && npm start"
echo ""
echo "🌐 访问地址："
echo "   http://你的服务器IP:3001"
echo ""
echo "💡 建议："
echo "   - 配置 Nginx 反向代理到 3001 端口"
echo "   - 绑定域名和 HTTPS 证书"
echo "   - 使用 PM2 管理进程：pm2 start 'npm start' --name ai-novel"
