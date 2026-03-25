# 🚀 完整操作指南

## 当前状态说明

你的应用已经部署完成：
- ✅ 图片生成功能正常
- ⚠️ 3D模型生成使用演示模式（因为沙箱网络限制）

---

## 方案选择

### 🎯 方案A：快速体验（推荐新手）

**适合人群**：想快速看效果，不想配置

**操作步骤**：
1. 直接访问应用
2. 输入描述词生成图片
3. 确认后生成3D模型（演示模式）
4. 预览和下载示例模型

**效果**：可以看到完整的流程，但3D模型是示例模型

---

### 🔧 方案B：启用真实3D生成（推荐开发者）

**适合人群**：需要真实的Tripo AI 3D模型

**前置要求**：
- 有Cloudflare账号（免费）
- 能访问 Cloudflare Dashboard

#### 步骤1：登录Cloudflare

1. 访问 https://dash.cloudflare.com
2. 登录或注册账号（免费）

#### 步骤2：创建Worker

1. 点击左侧菜单 **"Workers & Pages"**
2. 点击 **"Create Application"**
3. 选择 **"Create Worker"**
4. 名称输入：`tripo-proxy`
5. 点击 **"Deploy"**

#### 步骤3：编辑Worker代码

1. 部署后点击 **"Edit code"**
2. 删除默认代码
3. 复制下面的完整代码：

\`\`\`javascript
export default {
  async fetch(request, env, ctx) {
    // CORS处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);
    
    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'tripo-proxy' 
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Tripo API代理
    if (url.pathname.startsWith('/api/')) {
      const TRIPO_API = 'https://api.tripo3d.ai/v2';
      const tripoUrl = TRIPO_API + url.pathname.replace('/api/v2', '') + url.search;
      
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'host') {
          headers.set(key, value);
        }
      });

      const proxyReq = {
        method: request.method,
        headers: headers,
      };

      if (request.method !== 'GET') {
        proxyReq.body = await request.text();
      }

      const response = await fetch(tripoUrl, proxyReq);
      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('Tripo Proxy OK');
  },
};
\`\`\`

4. 点击右上角 **"Save and Deploy"**

#### 步骤4：获取Worker URL

1. 部署成功后，复制显示的URL
2. 格式类似：`https://tripo-proxy.你的账号.workers.dev`

#### 步骤5：验证Worker

在浏览器访问：
```
https://你的worker地址/health
```

应该看到：
```json
{"status":"ok","service":"tripo-proxy"}
```

#### 步骤6：配置项目

在项目根目录创建文件 `.env.local`：

\`\`\`bash
TRIPO_PROXY_URL=https://tripo-proxy.你的账号.workers.dev
\`\`\`

---

## 🧪 测试验证

### 测试网络连接

访问你的应用地址 + `/api/health`：
```
https://你的应用域名/api/health
```

查看返回结果：
- `"proxyAvailable": true` → 配置成功
- `"proxyAvailable": false` → 继续使用演示模式

### 测试完整流程

1. 访问应用
2. 输入描述："一个蓝色的陶瓷咖啡杯"
3. 等待图片生成
4. 确认图片，点击生成3D模型
5. 观察状态：
   - 显示"网络服务正常" → 使用真实Tripo API
   - 显示"演示模式" → 继续使用示例模型

---

## ⚠️ 常见问题

### Q1: Worker部署失败
**解决**：
- 确保已登录Cloudflare账号
- 检查网络连接
- 尝试刷新页面重试

### Q2: 健康检查失败
**解决**：
- 确认Worker URL正确
- 检查Worker是否成功部署
- 查看Worker的日志

### Q3: 3D生成一直使用演示模式
**解决**：
- 检查 `.env.local` 文件是否存在
- 确认 `TRIPO_PROXY_URL` 配置正确
- 重启开发服务器

### Q4: API Key错误
**解决**：
当前已预配置API Key：
- Client ID: `tcli_d63c726072c241789029971c4fa47f0e`
- API Key: `tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09`

如需使用自己的Key，在 `.env.local` 添加：
```
TRIPO_API_KEY=你的API密钥
```

---

## 📊 当前配置位置

| 配置项 | 文件位置 | 说明 |
|--------|---------|------|
| Worker代码 | `cloudflare-worker/tripo-proxy.js` | 可直接复制使用 |
| 环境变量 | `.env.local` (需创建) | 配置Worker地址 |
| API配置 | `src/app/api/generate-3d/route.ts` | 已预配置 |

---

## 🎯 快速决策

**如果你只是想看看效果**：
→ 直接使用，系统会自动用演示模式

**如果你需要真实的3D模型**：
→ 按照上面的步骤部署Worker，大约5-10分钟

**如果你遇到问题**：
→ 检查 `/api/health` 端点的返回信息
