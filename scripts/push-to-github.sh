#!/bin/bash

# GitHub 推送脚本
# 使用方法: bash scripts/push-to-github.sh

set -e

echo "=========================================="
echo "📤 GitHub 推送脚本"
echo "=========================================="
echo ""

# 检查 git
if ! command -v git &> /dev/null; then
    echo "❌ 未安装 git"
    exit 1
fi

# 获取当前目录
PROJECT_DIR="/workspace/projects"
cd "$PROJECT_DIR"

echo "📁 当前目录: $(pwd)"
echo ""

# 检查是否已初始化 git
if [ ! -d ".git" ]; then
    echo "🔧 初始化 Git 仓库..."
    git init
    echo ""
fi

# 显示当前状态
echo "📊 Git 状态："
git status -s
echo ""

# 检查远程仓库
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

echo "=========================================="
echo "📋 推送步骤说明"
echo "=========================================="
echo ""
echo "方式1：使用 Personal Access Token（推荐）"
echo "  1. 创建 GitHub 仓库：https://github.com/new"
echo "  2. 创建 Token：https://github.com/settings/tokens"
echo "  3. 运行以下命令："
echo ""
echo "     git remote add origin https://用户名:TOKEN@github.com/用户名/ai-3d-model-generator.git"
echo "     git add ."
echo "     git commit -m \"Initial commit\""
echo "     git push -u origin main"
echo ""
echo "方式2：使用 GitHub CLI"
echo "  1. 安装: npm install -g gh"
echo "  2. 登录: gh auth login"
echo "  3. 创建仓库并推送: gh repo create ai-3d-model-generator --public --source=. --push"
echo ""
echo "=========================================="
echo ""

# 询问用户选择方式
read -p "是否已经创建了 GitHub 仓库？(y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    read -p "请输入你的 GitHub 用户名: " USERNAME
    read -p "请输入你的 Personal Access Token: " TOKEN
    read -p "请输入仓库名称 (默认: ai-3d-model-generator): " REPO_NAME
    REPO_NAME=${REPO_NAME:-ai-3d-model-generator}
    
    echo ""
    echo "🔧 配置远程仓库..."
    
    # 删除已有的远程仓库
    git remote remove origin 2>/dev/null || true
    
    # 添加新的远程仓库
    git remote add origin "https://${USERNAME}:${TOKEN}@github.com/${USERNAME}/${REPO_NAME}.git"
    
    echo "✅ 远程仓库已配置"
    echo ""
    
    echo "📦 添加文件..."
    git add .
    
    echo "💾 提交更改..."
    git commit -m "Initial commit: AI 3D Model Generator" || echo "No changes to commit"
    
    echo "🚀 推送到 GitHub..."
    git branch -M main
    git push -u origin main --force
    
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "📍 仓库地址: https://github.com/${USERNAME}/${REPO_NAME}"
    echo ""
else
    echo ""
    echo "💡 请先创建 GitHub 仓库："
    echo "   https://github.com/new"
    echo ""
    echo "   详细教程请查看: GITHUB_PUSH_GUIDE.md"
    echo ""
fi

echo "=========================================="
echo "📚 相关文档："
echo "=========================================="
echo "  - GITHUB_PUSH_GUIDE.md  GitHub推送指南"
echo "  - VERCEL_DEPLOY.md      Vercel部署教程"
echo "  - GUIDE.md              使用指南"
echo ""
