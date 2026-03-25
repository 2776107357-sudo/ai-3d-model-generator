# Cloudflare Worker 部署指南

## 方案说明

由于沙箱环境存在网络出站限制，无法直接访问外部API。本方案使用Cloudflare Workers作为代理服务器，解决网络访问问题。

## 架构流程

```
沙箱环境 → Cloudflare Worker → Tripo AI API
         (可访问)    (全球CDN)   (外网)
```

## 部署步骤

### 方式1: 通过 Cloudflare Dashboard 部署（推荐）

1. **登录 Cloudflare**
   - 访问 https://dash.cloudflare.com
   - 进入 Workers & Pages

2. **创建 Worker**
   - 点击 "Create Application"
   - 选择 "Create Worker"
   - 命名为 `tripo-proxy`

3. **编辑代码**
   - 点击 "Quick Edit"
   - 复制 `tripo-proxy.js` 的内容
   - 粘贴并保存

4. **部署**
   - 点击 "Save and Deploy"
   - 获取Worker URL: `https://tripo-proxy.你的账号.workers.dev`

### 方式2: 通过 Wrangler CLI 部署

1. **安装 Wrangler**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **创建项目**
   ```bash
   mkdir tripo-proxy
   cd tripo-proxy
   wrangler init
   ```

4. **复制代码**
   - 将 `tripo-proxy.js` 内容复制到 `src/index.ts`

5. **配置 wrangler.toml**
   ```toml
   name = "tripo-proxy"
   main = "src/index.ts"
   compatibility_date = "2024-01-01"
   
   [vars]
   ENVIRONMENT = "production"
   ```

6. **部署**
   ```bash
   wrangler deploy
   ```

## 环境变量配置（可选）

如果需要更安全的配置，可以在 Cloudflare Dashboard 中设置环境变量：

1. 进入 Worker 设置
2. 添加 Variables
3. 配置 Tripo API Key

## 测试验证

部署完成后，测试代理是否工作：

```bash
# 健康检查
curl https://tripo-proxy.你的账号.workers.dev/health

# 测试API（需要真实的API Key）
curl -X GET https://tripo-proxy.你的账号.workers.dev/api/v2/task/test \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 自定义域名（可选）

1. 在 Cloudflare Dashboard 中添加自定义域名
2. 在 Workers 设置中添加 Route
3. 例如: `tripo.yourdomain.com/*` -> `tripo-proxy`

## 优势

- ✅ 全球CDN加速，访问速度快
- ✅ 无需服务器，自动扩展
- ✅ 免费额度充足（每天100,000次请求）
- ✅ 支持HTTPS，安全可靠
- ✅ 完整的CORS支持

## 故障排查

如果遇到问题，请检查：
1. Worker是否成功部署
2. URL是否正确
3. API Key是否有效
4. 查看 Worker 的实时日志
