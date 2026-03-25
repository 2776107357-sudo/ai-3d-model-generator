#!/bin/bash

# Vercel 快速部署脚本
# 使用方法: bash scripts/deploy-to-vercel.sh

set -e

echo "=========================================="
echo "🚀 AI 3D模型生成器 - Vercel 部署脚本"
echo "=========================================="
echo ""

# 检查 git
if ! command -v git &> /dev/null; then
    echo "❌ 未安装 git"
    exit 1
fi

# 检查 vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 正在安装 Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "📋 部署步骤："
echo ""
echo "方式1：通过 Vercel Dashboard（推荐）"
echo "  1. 访问 https://vercel.com"
echo "  2. 使用 GitHub 登录"
echo "  3. 点击 'Add New Project'"
echo "  4. 导入你的 GitHub 仓库"
echo "  5. 添加环境变量（见下方）"
echo "  6. 点击 Deploy"
echo ""
echo "=========================================="
echo "环境变量配置："
echo "=========================================="
echo ""
echo "TRIPO_PROXY_URL = http://tripo-proxy.2776107357.workers.dev"
echo "TRIPO_API_KEY = tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09"
echo "TRIPO_CLIENT_ID = tcli_d63c726072c241789029971c4fa47f0e"
echo ""
echo "=========================================="
echo ""

# 询问是否使用 CLI 部署
read -p "是否使用 Vercel CLI 部署？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 开始部署..."
    echo ""
    
    # 登录 Vercel
    echo "第一步：登录 Vercel"
    vercel login
    
    # 部署
    echo ""
    echo "第二步：部署项目"
    vercel --prod
    
    echo ""
    echo "✅ 部署完成！"
    echo ""
    echo "⚠️  请记得在 Vercel Dashboard 设置环境变量："
    echo "   Settings → Environment Variables"
    echo ""
    echo "   TRIPO_PROXY_URL"
    echo "   TRIPO_API_KEY"
    echo "   TRIPO_CLIENT_ID"
    echo ""
else
    echo ""
    echo "💡 推荐：使用 Vercel Dashboard 部署"
    echo "   详细步骤请查看 VERCEL_DEPLOY.md 文件"
    echo ""
fi

echo "=========================================="
echo "📚 相关文档："
echo "=========================================="
echo "  - VERCEL_DEPLOY.md  完整部署指南"
echo "  - GUIDE.md          使用指南"
echo "  - NETWORK_SOLUTION.md 网络方案说明"
echo ""
