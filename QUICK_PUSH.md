# 🚀 快速推送到 GitHub（复制粘贴即可）

## ⚡ 第一步：创建 GitHub 仓库

1. 访问：**https://github.com/new**
2. Repository name: `ai-3d-model-generator`
3. 选择 **Public**
4. **不要勾选**任何初始化选项（README、.gitignore、license）
5. 点击 **"Create repository"**

---

## ⚡ 第二步：创建 Personal Access Token

1. 访问：**https://github.com/settings/tokens/new**
2. Note: `AI 3D Model Generator`
3. Expiration: `No expiration`
4. 只勾选：**✅ repo**
5. 点击 **"Generate token"**
6. **立即复制 Token**（格式：`ghp_xxxxxxxxxxxx`）

---

## ⚡ 第三步：在沙箱中执行命令

复制以下命令，替换 `你的用户名` 和 `你的Token`：

```bash
# 进入项目目录
cd /workspace/projects

# 配置 Git（替换你的信息）
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"

# 添加远程仓库（替换用户名和Token）
git remote remove origin 2>/dev/null || true
git remote add origin https://你的用户名:ghp_你的Token@github.com/你的用户名/ai-3d-model-generator.git

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: AI 3D Model Generator"

# 推送
git push -u origin main
```

---

## ✅ 示例（假设）

假设：
- GitHub用户名：`johnsmith`
- Token：`ghp_abc123xyz789`

命令应该是：

```bash
cd /workspace/projects
git config --global user.name "johnsmith"
git config --global user.email "johnsmith@example.com"
git remote remove origin 2>/dev/null || true
git remote add origin https://johnsmith:ghp_abc123xyz789@github.com/johnsmith/ai-3d-model-generator.git
git add .
git commit -m "Initial commit: AI 3D Model Generator"
git push -u origin main
```

---

## 🎯 推送成功后

你会看到：
```
Enumerating objects: XXX, done.
Counting objects: 100% (XXX/XXX), done.
...
To https://github.com/你的用户名/ai-3d-model-generator.git
 * [new branch]      main -> main
```

然后访问：
```
https://github.com/你的用户名/ai-3d-model-generator
```

---

## 🚀 接下来部署到 Vercel

1. 访问：**https://vercel.com**
2. 点击 **"Add New..." → "Project"**
3. 选择你的 GitHub 仓库
4. 添加环境变量：
   ```
   TRIPO_PROXY_URL = http://tripo-proxy.2776107357.workers.dev
   ```
5. 点击 **"Deploy"**

---

## ❓ 遇到问题？

### Token 认证失败
- 检查 Token 是否正确复制
- 确认 Token 有 `repo` 权限

### 推送被拒绝
- 确认仓库是空的（创建时没有勾选 README）
- 或使用强制推送：`git push -u origin main --force`

### 找不到 main 分支
```bash
git branch -M main
git push -u origin main
```
