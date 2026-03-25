#!/bin/bash

# 自动推送脚本
# 用户名：2776107357-sudo

echo "=========================================="
echo "🚀 推送代码到 GitHub"
echo "=========================================="
echo ""
echo "你的 GitHub 用户名：2776107357-sudo"
echo "仓库名称：ai-3d-model-generator"
echo ""

# 请替换你的 Token
read -p "请输入你的 GitHub Token (ghp_开头): " TOKEN

if [ -z "$TOKEN" ]; then
    echo ""
    echo "❌ Token 不能为空"
    echo ""
    echo "如何创建 Token："
    echo "1. 访问 https://github.com/settings/tokens/new"
    echo "2. Note: AI 3D Model Generator"
    echo "3. Expiration: No expiration"
    echo "4. 只勾选 repo"
    echo "5. 点击 Generate token 并复制"
    exit 1
fi

echo ""
echo "🔧 配置 Git..."

cd /workspace/projects

# 配置用户信息
git config --global user.name "2776107357-sudo"
git config --global user.email "2776107357-sudo@users.noreply.github.com"

# 移除旧的远程仓库
git remote remove origin 2>/dev/null

# 添加新的远程仓库
git remote add origin "https://2776107357-sudo:${TOKEN}@github.com/2776107357-sudo/ai-3d-model-generator.git"

echo "✅ Git 配置完成"
echo ""

echo "📦 推送代码..."
git push -u origin main --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📍 访问你的仓库："
    echo "   https://github.com/2776107357-sudo/ai-3d-model-generator"
    echo ""
    echo "🚀 接下来："
    echo "1. 访问 https://vercel.com"
    echo "2. 导入你的 GitHub 仓库"
    echo "3. 添加环境变量："
    echo "   TRIPO_PROXY_URL = http://tripo-proxy.2776107357.workers.dev"
    echo "4. 点击 Deploy"
    echo ""
else
    echo ""
    echo "❌ 推送失败，请检查："
    echo "1. Token 是否正确"
    echo "2. Token 是否有 repo 权限"
    echo "3. 网络连接是否正常"
    echo ""
fi
