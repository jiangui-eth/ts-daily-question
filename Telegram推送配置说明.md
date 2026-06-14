# TypeScript 题库 × Telegram 推送配置说明

> 配置日期：2026-06-14

---

## 一、整体架构

```
Claude 定时任务（10:00）
    └─ 生成每日 MD 题目文件
    └─ 调用 send_ts_to_telegram.py

Mac launchd（10:05）← 双保险
    └─ 调用 send_ts_to_telegram.py
            └─ 读取当日 MD 文件
            └─ 提取题目部分（过滤答案/解说）
            └─ 调用 Telegram Bot API
                    └─ 推送到你的 TG
```

---

## 二、Telegram Bot 信息

| 项目 | 说明 |
|------|------|
| Bot Token | 通过环境变量 `TELEGRAM_BOT_TOKEN` 配置 |
| Chat ID | 通过环境变量 `TELEGRAM_CHAT_ID` 配置 |
| Bot 创建入口 | [@BotFather](https://t.me/BotFather) |
| Chat ID 查询 | [@userinfobot](https://t.me/userinfobot) |

详见 `.env.example` 文件。

---

## 三、相关文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 推送脚本 | `TypeScript 专项题库/send_ts_to_telegram.py` | 读取 MD → 推送 TG |
| launchd 配置 | `TypeScript 专项题库/com.ts-question.telegram.plist` | Mac 定时触发器 |
| 每日题目 | `TypeScript 专项题库/YYYY-MM-DD.md` | Claude 自动生成 |

---

## 四、launchd 安装步骤

首次配置时在终端执行：

```bash
# 复制 plist 到 LaunchAgents
cp "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库/com.ts-question.telegram.plist" \
   ~/Library/LaunchAgents/

# 加载（立即生效，无需重启）
launchctl load ~/Library/LaunchAgents/com.ts-question.telegram.plist
```

---

## 五、手动测试推送

```bash
python3 "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库/send_ts_to_telegram.py"
```

查看推送日志：

```bash
cat "/Users/jane-m4/Desktop/claude_dev/TypeScript 专项题库/logs/telegram.log"
```

---

## 六、推送内容说明

TG 消息**只包含题目部分**（不含答案、解说、应用场景），保持消息简洁。完整内容见本地 MD 文件。

消息格式示例：

```
📚 TypeScript 每日一题 — 2026-06-15
────────────────────────────
【实现 MyReturnType<T>】

不使用内置 ReturnType，手动实现同等效果。

function foo(a: number): string { return String(a); }
type R = MyReturnType<typeof foo>; // string

─────────────────
💡 完整答案 & 解说见本地题库文件
```

---

## 七、Make.com Webhook（备用中转）

配置过程中曾尝试通过 Make.com 中转推送，Webhook URL 为：

```
https://hook.us2.make.com/9tow31t16ag6n7utygd56v7ashfbptv5
```

最终因沙箱网络限制改为 Mac 本地脚本方案，Make.com 场景可保留备用。

---

## 八、常见问题

**Q：TG 没有收到消息怎么排查？**

1. 确认 Cowork 在 10:00 时处于开启状态（Claude 定时任务依赖应用运行）
2. 手动运行测试命令，查看终端输出
3. 检查 `logs/telegram.log` 是否有报错
4. 确认 Bot 未被封禁：访问 `https://api.telegram.org/bot{TOKEN}/getMe` 验证 Token 有效性

**Q：如何修改推送时间？**

launchd 时间在 plist 文件的 `StartCalendarInterval` 字段修改，改完需重新加载：

```bash
launchctl unload ~/Library/LaunchAgents/com.ts-question.telegram.plist
launchctl load   ~/Library/LaunchAgents/com.ts-question.telegram.plist
```

Claude 定时任务时间在 Cowork 侧边栏「Scheduled」里调整。

**Q：如何停止推送？**

```bash
launchctl unload ~/Library/LaunchAgents/com.ts-question.telegram.plist
```

Claude 定时任务在 Scheduled 面板中暂停即可。
