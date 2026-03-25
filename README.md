# 🎨 AI 3D模型生成器

一键将文字描述转换为高质量3D数字模型

## ✨ 功能特性

- 🖼️ **AI图片生成** - 根据描述自动生成主视图和三视图
- 🎯 **参考图支持** - 可上传参考图作为风格灵感（不照抄）
- 🧊 **3D模型生成** - 使用Tripo AI生成真实3D模型
- 👁️ **交互式预览** - 实时3D预览，支持旋转缩放
- 📦 **一键下载** - 导出GLB格式3D模型文件

## 🚀 快速部署

### 方式1：部署到 Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/ai-3d-model-generator)

**步骤**：
1. 点击上方按钮
2. 登录 GitHub 授权
3. 在 Vercel 中设置环境变量：
   ```
   TRIPO_PROXY_URL=http://tripo-proxy.2776107357.workers.dev
   TRIPO_API_KEY=tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09
   ```
4. 点击 Deploy

📖 [详细部署教程](./VERCEL_DEPLOY.md)

### 方式2：本地开发

```bash
# 克隆项目
git clone https://github.com/你的用户名/ai-3d-model-generator.git
cd ai-3d-model-generator

# 安装依赖
pnpm install

# 创建环境变量文件
cp .env.example .env.local

# 启动开发服务器
pnpm dev
```

## 📖 使用指南

### 基本流程

1. **输入描述** - 描述你想生成的物品
   ```
   例如：一个复古风格的陶瓷花瓶，带有精美的花纹装饰
   ```

2. **上传参考图（可选）** - 提供风格参考
   - 仅作为灵感参考，不会照抄
   - AI会根据文字描述进行创新

3. **生成图片** - 等待生成主视图和三视图
   - 主视图：产品展示图
   - 正视图/侧视图/后视图：三视图

4. **确认效果** - 查看生成结果
   - 满意：继续生成3D模型
   - 不满意：重新生成

5. **生成3D模型** - 将图片转换为3D模型
   - 自动使用Tripo AI生成
   - 实时显示进度

6. **预览下载** - 交互式预览和下载
   - 3D预览：支持旋转、缩放
   - 下载：GLB格式模型文件

### 网络说明

**演示模式**：
- 当前沙箱环境无法访问外网
- 自动使用示例模型展示流程
- 部署到Vercel后可使用真实3D生成

**真实模式**：
- 部署到支持外网的环境（Vercel/Netlify等）
- 配置Worker代理地址
- 使用真实的Tripo AI API

## 🏗️ 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 主页面
│   │   ├── api/
│   │   │   ├── generate-images/     # 图片生成API
│   │   │   ├── generate-3d/         # 3D模型生成API
│   │   │   └── health/              # 健康检查API
│   │   └── ...
│   └── components/
│       ├── ModelViewer.tsx          # 3D预览组件
│       └── ui/                      # shadcn/ui组件
├── cloudflare-worker/
│   └── tripo-proxy.js               # Worker代理代码
├── scripts/
│   └── deploy-to-vercel.sh          # 部署脚本
├── GUIDE.md                         # 完整使用指南
├── VERCEL_DEPLOY.md                 # Vercel部署教程
└── NETWORK_SOLUTION.md              # 网络方案说明
```

## 🔧 技术栈

- **前端框架**: Next.js 16 + React 19
- **UI组件**: shadcn/ui + Tailwind CSS
- **3D渲染**: Three.js + React Three Fiber
- **AI图片生成**: 豆包/即梦（通过coze-coding-dev-sdk）
- **3D模型生成**: Tripo AI
- **网络代理**: Cloudflare Workers

## 📚 文档

- [完整使用指南](./GUIDE.md)
- [Vercel部署教程](./VERCEL_DEPLOY.md)
- [网络方案说明](./NETWORK_SOLUTION.md)

## ⚙️ 环境变量

```bash
# Tripo AI 配置
TRIPO_PROXY_URL=http://tripo-proxy.2776107357.workers.dev
TRIPO_API_KEY=tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09
TRIPO_CLIENT_ID=tcli_d63c726072c241789029971c4fa47f0e
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

---

**注意**：本项目仅供学习和研究使用。生成的3D模型质量取决于AI服务，请合理使用。
