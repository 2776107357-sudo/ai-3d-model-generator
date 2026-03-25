# 网络环境解决方案

## 问题背景

沙箱环境存在网络出站限制，无法直接访问外部API（如Tripo AI）。本方案通过Cloudflare Workers代理解决此问题。

## 方案架构

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  沙箱环境    │ ---> │ Cloudflare Worker │ ---> │  Tripo AI   │
│ (Next.js)   │      │   (代理服务)       │      │    API      │
└─────────────┘      └──────────────────┘      └─────────────┘
    有网络限制            全球CDN节点            外网服务
```

## 部署步骤

### 第一步：部署 Cloudflare Worker

1. 访问 https://dash.cloudflare.com
2. 进入 Workers & Pages
3. 点击 "Create Application" → "Create Worker"
4. 命名为 `tripo-proxy`
5. 复制 `cloudflare-worker/tripo-proxy.js` 的代码
6. 点击 "Save and Deploy"
7. 记录生成的URL（格式：`https://tripo-proxy.你的账号.workers.dev`）

### 第二步：配置环境变量（可选）

如果你部署了自己的Worker，创建 `.env.local` 文件：

```bash
TRIPO_PROXY_URL=https://tripo-proxy.你的账号.workers.dev
```

### 第三步：验证配置

1. 启动应用
2. 输入物品描述生成图片
3. 确认图片后生成3D模型
4. 观察进度更新

## 已提供的代理

项目已预配置代理地址：`https://tripo-proxy.2776107357.workers.dev`

如果此代理不可用，请：
1. 部署自己的Cloudflare Worker（参考`cloudflare-worker/`目录）
2. 更新`.env.local`中的`TRIPO_PROXY_URL`

## 演示模式

如果所有代理都不可用，系统会自动切换到演示模式：
- 使用公开的示例3D模型
- 模拟真实的生成过程
- UI会显示"演示模式"标签

## 文件结构

```
cloudflare-worker/
├── tripo-proxy.js      # Worker源代码
└── README.md           # 部署指南

src/app/api/
└── generate-3d/
    └── route.ts        # 3D生成API（包含代理逻辑）

.env.example            # 环境变量示例
```

## 故障排查

### 问题：一直显示"正在检查服务连接"

**原因**：代理健康检查失败

**解决方案**：
1. 检查Worker是否正常运行
2. 访问 `https://你的worker地址/health` 验证
3. 查看Worker日志排查问题

### 问题：生成失败，显示网络错误

**原因**：Worker无法访问Tripo AI API

**解决方案**：
1. 检查API Key是否正确
2. 确认Worker的网络配置
3. 查看Worker日志

### 问题：使用的是演示模型

**原因**：代理不可用，自动降级

**解决方案**：
1. 部署自己的Worker
2. 配置环境变量指向新的Worker

## 性能优化

- **健康检查缓存**：减少重复检查
- **超时控制**：避免请求卡死
- **自动重试**：提高成功率
- **降级机制**：保证用户体验

## 安全建议

1. 不要在客户端暴露API Key
2. 使用环境变量存储敏感信息
3. Worker中添加请求来源验证
4. 定期更换API Key
