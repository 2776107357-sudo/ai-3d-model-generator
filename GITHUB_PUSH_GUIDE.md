# 📤 GitHub 推送完整指南

## 方式一：使用 GitHub Personal Access Token（推荐）

### 第一步：创建 GitHub 仓库

1. **登录 GitHub**
   - 访问 https://github.com
   - 登录你的账号

2. **创建新仓库**
   - 点击右上角 **"+"** → **"New repository"**
   - 或直接访问：https://github.com/new

3. **填写仓库信息**
   - Repository name: `ai-3d-model-generator`
   - Description: `AI 3D模型生成器`
   - 选择 **Public** 或 **Private**
   - ⚠️ **不要勾选** "Add a README file"（我们已有代码）
   - ⚠️ **不要勾选** ".gitignore" 或 "license"
   - 点击 **"Create repository"**

4. **记录仓库地址**
   ```
   https://github.com/你的用户名/ai-3d-model-generator.git
   ```

### 第二步：创建 Personal Access Token

1. **访问 Token 设置**
   - 登录 GitHub
   - 点击右上角头像 → **Settings**
   - 左侧菜单最下方 → **Developer settings**
   - 点击 **"Personal access tokens"** → **"Tokens (classic)"**
   - 或直接访问：https://github.com/settings/tokens

2. **生成新 Token**
   - 点击 **"Generate new token"** → **"Generate new token (classic)"**
   - Note: `AI 3D Model Generator`
   - Expiration: 选择 `No expiration` 或 `90 days`
   - 勾选权限：
     - ✅ `repo` (完整仓库访问权限)
   - 点击 **"Generate token"**

3. **保存 Token**
   - ⚠️ **立即复制 Token**（只显示一次）
   - 格式类似：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - 保存到安全的地方

### 第三步：配置 Git（在沙箱中执行）

```bash
# 进入项目目录
cd /workspace/projects

# 配置 Git 用户信息（如果还没配置）
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"

# 查看当前 Git 状态
git status
```

### 第四步：推送代码

**选项A：使用 HTTPS + Token（推荐）**

```bash
# 1. 查看现有远程仓库
git remote -v

# 2. 如果已有origin，先删除
git remote remove origin

# 3. 添加远程仓库（使用Token认证）
# 格式：https://用户名:Token@github.com/用户名/仓库名.git
git remote add origin https://你的用户名:ghp_你的Token@github.com/你的用户名/ai-3d-model-generator.git

# 4. 添加所有文件
git add .

# 5. 提交
git commit -m "Initial commit: AI 3D Model Generator"

# 6. 推送到 GitHub
git push -u origin main
```

**选项B：使用交互式输入**

```bash
# 1. 添加远程仓库（不带Token）
git remote add origin https://github.com/你的用户名/ai-3d-model-generator.git

# 2. 推送（会提示输入用户名和密码）
git push -u origin main

# 当提示输入密码时，粘贴你的 Personal Access Token（不是GitHub密码）
# Username: 你的GitHub用户名
# Password: ghp_你的Token
```

---

## 方式二：使用 GitHub CLI（更简单）

### 第一步：安装 GitHub CLI

```bash
# 沙箱环境可能已安装，检查一下
gh --version

# 如果未安装
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### 第二步：认证

```bash
# 登录 GitHub
gh auth login

# 选择：
# ? What account do you want to log into? GitHub.com
# ? What is your preferred protocol for Git operations? HTTPS
# ? Authenticate Git with your GitHub token? Yes
# ? How would you like to authenticate GitHub CLI? Paste an authentication token
```

粘贴你的 Personal Access Token

### 第三步：创建仓库并推送

```bash
cd /workspace/projects

# 创建仓库并推送（一条命令完成）
gh repo create ai-3d-model-generator --public --source=. --push

# 或者如果仓库已存在
git remote add origin https://github.com/你的用户名/ai-3d-model-generator.git
git push -u origin main
```

---

## 方式三：使用 SSH（需要配置 SSH Key）

### 第一步：生成 SSH Key

```bash
# 生成 SSH Key
ssh-keygen -t ed25519 -C "你的GitHub邮箱"

# 按 Enter 使用默认路径
# 可以设置密码，也可以留空

# 启动 SSH Agent
eval "$(ssh-agent -s)"

# 添加 SSH Key
ssh-add ~/.ssh/id_ed25519
```

### 第二步：添加到 GitHub

```bash
# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

1. 复制公钥内容
2. GitHub → Settings → SSH and GPG keys → New SSH key
3. 粘贴公钥，保存

### 第三步：推送

```bash
# 使用 SSH 地址
git remote add origin git@github.com:你的用户名/ai-3d-model-generator.git
git push -u origin main
```

---

## ✅ 验证推送成功

### 1. 检查本地状态

```bash
git log --oneline -5
git remote -v
```

### 2. 访问 GitHub 仓库

访问：`https://github.com/你的用户名/ai-3d-model-generator`

应该能看到所有文件。

### 3. 检查文件列表

确保包含：
- ✅ `src/` 目录
- ✅ `package.json`
- ✅ `README.md`
- ✅ `vercel.json`
- ✅ `.env.example`

---

## ⚠️ 常见问题

### Q1: 提示 "fatal: not a git repository"

**解决**：
```bash
cd /workspace/projects
git init
```

### Q2: 提示 "fatal: remote origin already exists"

**解决**：
```bash
# 删除已有的远程仓库
git remote remove origin

# 重新添加
git remote add origin https://github.com/你的用户名/ai-3d-model-generator.git
```

### Q3: 提示 "Authentication failed"

**解决**：
- 检查 Token 是否正确
- 检查 Token 权限是否包含 `repo`
- Token 是否已过期

### Q4: 推送被拒绝 "Updates were rejected"

**解决**：
```bash
# 强制推送（覆盖远程仓库，谨慎使用）
git push -u origin main --force
```

### Q5: 找不到 main 分支

**解决**：
```bash
# 检查当前分支
git branch

# 如果是 master，重命名为 main
git branch -M main
```

---

## 🎯 快速命令汇总

```bash
# 进入项目目录
cd /workspace/projects

# 配置 Git
git config --global user.name "你的用户名"
git config --global user.email "你的邮箱"

# 初始化（如果需要）
git init

# 添加远程仓库（使用Token）
git remote add origin https://用户名:Token@github.com/用户名/ai-3d-model-generator.git

# 添加文件
git add .

# 提交
git commit -m "Initial commit: AI 3D Model Generator"

# 推送
git push -u origin main
```

---

## 📋 推送后下一步

推送成功后，你可以：

1. **部署到 Vercel**
   - 访问 https://vercel.com
   - 导入 GitHub 仓库
   - 设置环境变量
   - 部署

2. **查看代码**
   - 访问 `https://github.com/你的用户名/ai-3d-model-generator`

3. **克隆到本地**
   ```bash
   git clone https://github.com/你的用户名/ai-3d-model-generator.git
   ```
