# 🚨 模型生成问题完整排查指南

## 问题现象
点击"满意，生成3D模型"后，显示网络不可用或生成失败。

---

## 第一步：检查环境变量配置

### 1. 进入 Vercel 项目设置
1. 打开 https://vercel.com
2. 点击你的项目 `ai-3d-model-generator`
3. 点击顶部 **Settings**

### 2. 检查环境变量
1. 左侧点击 **Environment Variables**
2. 确认有以下变量：

| 名称 | 值 | Environment |
|------|-----|-------------|
| `TRIPO_PROXY_URL` | `http://tripo-proxy.2776107357.workers.dev` | Production, Preview, Development |

### 3. 如果没有或配置错误
- 点击 **Add** 添加
- 或点击编辑修改
- **必须点击 Save 保存**

---

## 第二步：重新部署（关键！）

⚠️ **环境变量修改后，必须重新部署才能生效！**

### 方法1：通过 Deployments
1. 点击顶部 **Deployments** 标签
2. 找到最新的部署
3. 点击右侧的 **"..."** 菜单
4. 选择 **Redeploy**
5. 点击 **Redeploy** 确认

### 方法2：通过 Git Push
在沙箱中执行：
```bash
cd /workspace/projects
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

## 第三步：验证配置是否生效

部署完成后（等待1-2分钟），访问：

```
https://你的域名/api/health
```

### ✅ 正确结果
```json
{
  "proxyAvailable": true,
  "apiReady": true,
  "recommendation": "系统正常，可以生成3D模型"
}
```

### ❌ 错误结果
```json
{
  "proxyAvailable": false,
  "recommendation": "代理不可用，将使用演示模式"
}
```

如果显示错误结果，说明环境变量还没生效，请重新执行第一步和第二步。

---

## 第四步：测试完整流程

### 1. 打开应用
访问你的域名：`https://ai-3d-model-generator.vercel.app`

### 2. 输入描述
```
一个蓝色的陶瓷咖啡杯
```

### 3. 生成图片
点击"开始生成图片"，等待图片生成完成

### 4. 检查网络状态
在图片预览页面，查看是否显示：
- ✅ "网络服务正常，可生成真实3D模型"
- ❌ "网络服务暂不可用，将使用演示模式"

### 5. 生成3D模型
点击"满意，生成3D模型"

---

## 第五步：检查浏览器控制台

如果还是失败，检查浏览器控制台错误：

1. 按 **F12** 打开开发者工具
2. 点击 **Console** 标签
3. 查看是否有红色错误信息
4. 截图错误信息给我

---

## 常见错误及解决方案

### 错误1: "代理不可用"
**原因**：环境变量未配置或未重新部署  
**解决**：按第一步、第二步操作

### 错误2: "ETIMEDOUT"
**原因**：网络连接超时  
**解决**：
- 检查 Worker URL 是否正确
- 确认使用 HTTP（不是 HTTPS）

### 错误3: "Authentication failed"
**原因**：API Key 无效  
**解决**：API Key 已内置在代码中，无需额外配置

### 错误4: 一直显示"正在生成3D模型"
**原因**：生成时间过长或卡死  
**解决**：
- 刷新页面重试
- 检查 `/api/health` 状态
- 查看浏览器控制台错误

---

## 完整检查清单

- [ ] Settings → Environment Variables 中有 TRIPO_PROXY_URL
- [ ] 值为 `http://tripo-proxy.2776107357.workers.dev`（注意是 HTTP）
- [ ] Environment 选择了 Production
- [ ] 已点击 Save 保存
- [ ] 已点击 Redeploy 重新部署
- [ ] 等待部署完成（1-2分钟）
- [ ] 访问 /api/health 显示 proxyAvailable: true
- [ ] 刷新应用页面
- [ ] 重新测试生成流程

---

## 还是不行？

如果按照以上步骤操作后还是不行，请提供以下信息：

1. `/api/health` 的完整返回结果
2. 浏览器控制台的错误截图
3. Vercel 环境变量配置截图

我会帮你进一步排查！
