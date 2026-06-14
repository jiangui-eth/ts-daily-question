# TypeScript 专项题库

每日自动生成中级/高级 TypeScript 编程题，通过 Telegram Bot 推送并支持交互查询。

## 项目结构

```
├── api/
│   └── telegram.js          # Vercel Webhook 端点
├── questions/
│   └── YYYY-MM-DD.md        # 每日题目文件
├── send_ts_to_telegram.py   # 每日推送脚本
├── com.ts-question.*.plist  # launchd 任务配置
├── CLAUDE.md                # Claude Code 生成指引
└── README.md
```

## Telegram Bot

**Bot**: [@TypeScriptAssistantBot](https://t.me/TypeScriptAssistantBot)

### 支持的指令

| 指令 | 说明 |
|------|------|
| `帮助` / `help` | 显示帮助信息 |
| `列表` / `list` | 查看今日所有题目 |
| `Q1` / `题目1` | 查看第 1 题完整内容 |
| `Q1答案` / `答案1` | 查看第 1 题答案 |
| `Q1解说` / `解说1` | 查看第 1 题解说 |

> 数字可替换为任意题号（如 Q3、答案5）

## 自动化流程

```
10:00  Claude 生成题目 → questions/YYYY-MM-DD.md
10:02  launchd 同步到 GitHub → Vercel 自动部署
10:05  launchd 推送 MD 文件到 Telegram
```

### launchd 任务

| 任务 | 时间 | 作用 |
|------|------|------|
| `com.ts-question.git-sync` | 10:02 | `git push` 同步到 GitHub |
| `com.ts-question.telegram` | 10:05 | 推送当日 MD 文件 |

```bash
# 查看状态
launchctl list | grep ts-question

# 安装任务
cp com.ts-question.*.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.ts-question.git-sync.plist
launchctl load ~/Library/LaunchAgents/com.ts-question.telegram.plist
```

### 日志

- Git 同步: `/tmp/ts-git-sync.log`
- Telegram 推送: `/tmp/ts-telegram.log`

## 部署

### Vercel Webhook

- **URL**: https://ts-daily-question.vercel.app/api/telegram
- 推送到 GitHub 后自动部署

### 手动操作

```bash
# 推送题目文件
python3 send_ts_to_telegram.py

# 手动部署
vercel --prod
```

## 知识点覆盖

映射类型、条件类型、`infer`、模板字面量类型、函数重载、泛型约束与默认值、协变与逆变、类型守卫、递归类型、装饰器、声明合并、索引签名、工具类型实现、枚举、抽象类与访问修饰符。

## License

MIT
