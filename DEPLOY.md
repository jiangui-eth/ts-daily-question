# Telegram Bot Vercel Webhook 部署指南

## 架构

```
用户发送消息 → Telegram Server → POST Webhook → Vercel Serverless
                                                      ↓
                                        fetch GitHub Raw (当天 MD)
                                                      ↓
                                        解析 → sendMessage → 用户收到回复
```

## 部署步骤

### 1. 初始化 GitHub 仓库

```bash
# 在题库目录执行
cd "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库"

# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库后（例如 ts-daily-question）
git remote add origin https://github.com/YOUR_USERNAME/ts-daily-question.git
git branch -M main
git push -u origin main
```

### 2. 更新 GitHub Raw URL

部署前，编辑 `api/telegram.ts`，将 `GITHUB_RAW_BASE` 改为你的仓库地址：

```ts
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/YOUR_USERNAME/ts-daily-question/main';
```

或者在 Vercel 环境变量中设置 `GITHUB_RAW_BASE`。

### 3. 部署到 Vercel

```bash
# 安装 Vercel CLI（如果还没有）
npm install -g vercel

# 登录 Vercel
vercel login

# 部署
cd "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库"
vercel --prod
```

部署成功后，会获得一个 URL，例如：`https://ts-daily-question.vercel.app`

### 4. 配置 Vercel 环境变量（必须）

在 Vercel Dashboard 中设置：

| 变量名 | 说明 |
|--------|------|
| `TELEGRAM_BOT_TOKEN` | 从 @BotFather 获取的 Bot Token |
| `TELEGRAM_WEBHOOK_SECRET` | 自定义的 Webhook 签名密钥（推荐 32 位随机字符串） |
| `GITHUB_RAW_BASE` | `https://raw.githubusercontent.com/YOUR_USERNAME/ts-daily-question/main/questions` |
| `ALLOWED_CHAT_ID` | 你的 Telegram Chat ID（从 @userinfobot 获取） |

### 5. 设置 Telegram Webhook

```bash
# 替换变量后执行
# <YOUR_BOT_TOKEN> - 从 @BotFather 获取
# <YOUR_VERCEL_URL> - Vercel 部署 URL
# <YOUR_WEBHOOK_SECRET> - 与 Vercel 环境变量中设置的一致

curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR_VERCEL_URL>/api/telegram",
    "secret_token": "<YOUR_WEBHOOK_SECRET>"
  }'
```

### 6. 验证 Webhook

```bash
# 检查 Webhook 状态（替换 <YOUR_BOT_TOKEN>）
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

正常响应示例：
```json
{
  "ok": true,
  "result": {
    "url": "https://ts-daily-question.vercel.app/api/telegram",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 7. 配置自动 Git 同步（launchd）

```bash
# 复制 plist 到 LaunchAgents
cp com.ts-question.git-sync.plist ~/Library/LaunchAgents/

# 加载任务
launchctl load ~/Library/LaunchAgents/com.ts-question.git-sync.plist

# 查看状态
launchctl list | grep ts-question
```

此任务会在每天 10:02 自动将新题目推送到 GitHub。

## Bot 指令

| 指令 | 说明 |
|------|------|
| `帮助` / `help` | 显示帮助信息 |
| `列表` / `list` | 查看今日所有题目 |
| `Q1` / `题目1` | 查看第 1 题完整内容 |
| `Q1答案` / `答案1` | 查看第 1 题答案 |
| `Q1解说` / `解说1` | 查看第 1 题解说 |

## 日志查看

```bash
# Vercel 日志
vercel logs

# Git 同步日志
tail -f "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库/logs/git-sync.log"
```

## 与现有系统的兼容性

| 组件 | 状态 |
|------|------|
| `send_ts_to_telegram.py` | ✅ 保留（每日主动推送完整 MD 文件） |
| `ts_bot_responder.py` | ⚠️ 可停用（Webhook 替代本地轮询） |
| Claude 定时任务 | ✅ 保留（生成 MD 文件） |
| launchd 推送任务 | ✅ 保留（作为备份推送） |

## 故障排除

### Webhook 无响应

1. 检查 Vercel 部署状态：`vercel ls`
2. 检查 Webhook 配置：`curl .../getWebhookInfo`
3. 查看 Vercel 日志：`vercel logs`

### 获取不到今日题目

1. 确认 MD 文件已推送到 GitHub
2. 检查 Raw URL 是否正确
3. 手动测试：`curl https://raw.githubusercontent.com/.../YYYY-MM-DD.md`

### 删除 Webhook（恢复轮询模式）

```bash
# 替换 <YOUR_BOT_TOKEN>
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```
