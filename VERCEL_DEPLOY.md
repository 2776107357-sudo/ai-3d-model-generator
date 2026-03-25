# 🚀 Vercel 部署完整指南

## 前置要求

- 有 GitHub 账号
- 有 Vercel 账号（可用 GitHub 登录）
- 项目代码已准备好

---

## 方式一：通过 Vercel Dashboard（推荐，最简单）

### 第一步：准备代码仓库

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 仓库名：`ai-3d-model-generator`
   - 设为 Public 或 Private
   - 点击 "Create repository"

2. **推送代码到 GitHub**
   ```bash
   cd /workspace/projects
   
   # 初始化 git（如果还没有）
   git init
   
   # 添加远程仓库
   git remote add origin https://github.com/你的用户名/ai-3d-model-generator.git
   
   # 添加所有文件
   git add .
   
   # 提交
   git commit -m "Initial commit: AI 3D Model Generator"
   
   # 推送到 GitHub
   git push -u origin main
   ```

### 第二步：导入到 Vercel

1. **登录 Vercel**
   - 访问 https://vercel.com
   - 点击 "Sign Up" 或 "Log In"
   - 选择 "Continue with GitHub"

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择你的 GitHub 仓库 `ai-3d-model-generator`
   - 点击 "Import"

3. **配置项目**
   - Framework Preset: **Next.js**（自动检测）
   - Root Directory: `./`（默认）
   - Build Command: `pnpm run build`（默认）
   - Output Directory: `.next`（默认）

### 第三步：设置环境变量

在部署前，点击 **"Environment Variables"** 展开，添加：

```
名称: TRIPO_PROXY_URL
值: http://tripo-proxy.2776107357.workers.dev

名称: TRIPO_API_KEY
值: tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09

名称: TRIPO_CLIENT_ID
值: tcli_d63c726072c241789029971c4fa47f0e
```

### 第四步：部署

点击 **"Deploy"** 按钮，等待 1-2 分钟部署完成。

### 第五步：获取访问地址

部署成功后：
- Vercel 会提供一个域名：`https://ai-3d-model-generator.vercel.app`
- 点击访问即可使用

---

## 方式二：通过 Vercel CLI

### 第一步：安装 Vercel CLI

```bash
npm install -g vercel
```

### 第二步：登录 Vercel

```bash
vercel login
```

选择你的登录方式（GitHub/Email/GitLab）。

### 第三步：部署项目

```bash
cd /workspace/projects

# 部署到生产环境
vercel --prod
```

第一次部署会询问一些配置：
- Set up and deploy? **Y**
- Which scope? 选择你的账号
- Link to existing project? **N**
- What's your project's name? **ai-3d-model-generator**
- In which directory is your code located? `./`
- Want to modify these settings? **N**

### 第四步：设置环境变量

```bash
# 设置环境变量
vercel env add TRIPO_PROXY_URL production
# 输入: http://tripo-proxy.2776107357.workers.dev

vercel env add TRIPO_API_KEY production
# 输入: tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09

vercel env add TRIPO_CLIENT_ID production
# 输入: tcli_d63c726072c241789029971c4fa47f0e
```

### 第五步：重新部署

```bash
vercel --prod
```

---

## 方式三：一键部署（最快）

### 创建部署配置文件

在项目根目录创建 `vercel.json`：

\`\`\`json
{
  "env": {
    "TRIPO_PROXY_URL": "http://tripo-proxy.2776107357.workers.dev",
    "TRIPO_API_KEY": "tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09",
    "TRIPO_CLIENT_ID": "tcli_d63c726072c241789029971c4fa47f0e"
  },
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
\`\`\`

### 一键部署按钮

在 GitHub 仓库的 README.md 中添加：

\`\`\`markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/ai-3d-model-generator)
\`\`\`

---

## 🔍 验证部署

### 1. 检查健康状态

访问：`https://你的域名/api/health`

期望结果：
```json
{
  "proxyAvailable": true,
  "apiReady": true,
  "recommendation": "系统正常，可以生成3D模型"
}
```

### 2. 测试完整流程

1. 访问应用首页
2. 输入："一个蓝色的陶瓷咖啡杯"
3. 等待图片生成
4. 确认图片后生成3D模型
5. 检查是否显示"网络服务正常"
6. 下载GLB模型文件

---

## ⚠️ 常见问题

### Q1: 构建失败 - pnpm not found

**解决**：在项目根目录创建 `.npmrc` 文件：
```
shamefully-hoist=true
auto-install-peers=true
```

### Q2: 环境变量不生效

**解决**：
1. 在 Vercel Dashboard → Settings → Environment Variables 检查
2. 确保环境变量名称正确
3. 重新部署项目

### Q3: API 调用超时

**解决**：
- Vercel 免费版有 10 秒超时限制
- 3D生成可能需要更长时间
- 考虑使用 Vercel 的 Pro 计划（60秒超时）

### Q4: 部署后仍使用演示模式

**解决**：
1. 检查 `/api/health` 返回
2. 确认环境变量已正确设置
3. 查看 Vercel 部署日志

### Q5: 域名访问不了

**解决**：
- 在 Vercel Dashboard → Domains 添加自定义域名
- 或使用 Vercel 提供的默认域名

---

## 📊 Vercel 免费额度

| 资源 | 免费额度 |
|------|---------|
| 带宽 | 100GB/月 |
| 构建时长 | 6000分钟/月 |
| 函数执行 | 100GB/月 |
| Serverless函数超时 | 10秒 |

**注意**：3D生成可能需要10-30秒，如果超时：
- 升级到 Pro 计划（60秒超时）
- 或优化代码，使用后台任务

---

## 🎯 推荐配置

### 生产环境优化

创建 `.env.production`：
```bash
TRIPO_PROXY_URL=http://tripo-proxy.2776107357.workers.dev
TRIPO_API_KEY=你的API密钥
```

### vercel.json 高级配置

\`\`\`json
{
  "env": {
    "TRIPO_PROXY_URL": "@tripo_proxy_url",
    "TRIPO_API_KEY": "@tripo_api_key"
  },
  "functions": {
    "app/api/generate-3d/route.ts": {
      "maxDuration": 60
    }
  },
  "regions": ["hkg1", "sin1"]
}
\`\`\`

---

## ✅ 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] Vercel 账号已创建
- [ ] 项目已导入到 Vercel
- [ ] 环境变量已设置
- [ ] 部署成功
- [ ] `/api/health` 检查通过
- [ ] 完整流程测试通过

---

## 🎉 完成！

部署成功后，你将获得：
- ✅ 真实的 Tripo AI 3D 模型生成
- ✅ 全球 CDN 加速
- ✅ 自动 HTTPS
- ✅ 自动部署（每次 push 自动更新）
