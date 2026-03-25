#!/bin/bash

# 快速部署 Cloudflare Worker 脚本
# 需要先安装: npm install -g wrangler

echo "======================================"
echo "Tripo AI 代理 - Cloudflare Worker 部署"
echo "======================================"
echo ""

# 检查是否安装 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 未安装 wrangler，请先运行:"
    echo "   npm install -g wrangler"
    exit 1
fi

echo "📋 部署步骤:"
echo ""
echo "1. 创建 Worker 项目"
echo "   mkdir tripo-proxy && cd tripo-proxy"
echo "   wrangler init"
echo ""
echo "2. 将以下代码复制到 src/index.ts:"
echo "   （见 cloudflare-worker/tripo-proxy.js）"
echo ""
echo "3. 部署 Worker:"
echo "   wrangler deploy"
echo ""
echo "4. 记录生成的 URL（格式: https://tripo-proxy.你的账号.workers.dev）"
echo ""
echo "5. 配置环境变量:"
echo "   在项目根目录创建 .env.local 文件:"
echo "   TRIPO_PROXY_URL=https://tripo-proxy.你的账号.workers.dev"
echo ""
echo "======================================"
