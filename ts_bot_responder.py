#!/usr/bin/env python3
"""
TypeScript 题库 Bot 交互脚本
每分钟由 launchd 触发，轮询 Telegram 新消息并响应指令。

支持指令：
  帮助              — 指令列表
  今日题目          — 今日所有题目标题
  Q1 / 第1题        — 查看第 N 题题干
  Q1答案 / 第1题答案 — 查看第 N 题完整答案 + 解说
"""

import urllib.request
import json
import os
import re
from datetime import date

# ── 配置 ──────────────────────────────────────────────
BOT_TOKEN   = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID     = os.environ.get("TELEGRAM_CHAT_ID")
FOLDER      = os.path.dirname(os.path.abspath(__file__))
OFFSET_FILE = "/tmp/ts-bot-offset.txt"   # 记录已处理的 update_id

if not BOT_TOKEN or not CHAT_ID:
    print("[ERROR] 请设置环境变量 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID")
    print("示例：export TELEGRAM_BOT_TOKEN='your_token'")
    print("      export TELEGRAM_CHAT_ID='your_chat_id'")
    exit(1)
# ──────────────────────────────────────────────────────


# ── Telegram API ───────────────────────────────────────

def api(method: str, **params) -> dict:
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/{method}"
    data = json.dumps(params).encode()
    req  = urllib.request.Request(url, data=data,
                                  headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"[ERROR] {method}: {e}")
        return {"ok": False}


def send(text: str):
    """发送消息，超过 4000 字符自动截断。"""
    if len(text) > 4000:
        text = text[:3970] + "\n…（内容过长，请查看本地题库文件）"
    api("sendMessage", chat_id=int(CHAT_ID), text=text)


# ── offset 持久化 ──────────────────────────────────────

def load_offset() -> int:
    try:
        with open(OFFSET_FILE) as f:
            return int(f.read().strip())
    except Exception:
        return 0


def save_offset(offset: int):
    with open(OFFSET_FILE, "w") as f:
        f.write(str(offset))


# ── MD 文件解析 ────────────────────────────────────────

def parse_md(filepath: str) -> list[dict]:
    """
    解析题目 MD 文件，返回题目列表。
    每项包含：idx, title, body（题干）, answer（答案）, explanation（解说）
    """
    if not os.path.exists(filepath):
        return []
    with open(filepath, encoding="utf-8") as f:
        content = f.read()

    blocks = re.split(r'(?=^## Q)', content, flags=re.MULTILINE)
    questions = []

    for block in blocks:
        block = block.strip()
        if not block.startswith("## Q"):
            continue

        idx_m   = re.match(r'^## Q(\d+)', block)
        title_m = re.match(r'^## Q\d*\.?\s*(.+)', block)
        idx   = int(idx_m.group(1)) if idx_m else len(questions) + 1
        title = title_m.group(1).strip() if title_m else "未知"

        def extract(tag: str, *stop_tags: str) -> str:
            ends = '|'.join(rf'\*\*{t}\*\*' for t in stop_tags) + r'|^## Q|\Z'
            pat  = rf'\*\*{tag}\*\*\s*\n(.*?)(?={ends})'
            m    = re.search(pat, block, re.DOTALL | re.MULTILINE)
            return m.group(1).strip() if m else ""

        questions.append({
            "idx":         idx,
            "title":       title,
            "body":        extract("题目",  "答案", "解说", "应用场景"),
            "answer":      extract("答案",  "解说", "应用场景"),
            "explanation": extract("解说",  "应用场景"),
        })

    return questions


def today_md() -> tuple[str, str]:
    d = date.today().strftime("%Y-%m-%d")
    return os.path.join(FOLDER, f"{d}.md"), d


# ── 指令处理 ───────────────────────────────────────────

HELP_TEXT = (
    "📖 可用指令：\n\n"
    "今日题目        — 查看今日所有题目\n"
    "Q1 / 第1题      — 查看第 N 题题干\n"
    "Q1答案 / 第1题答案 — 查看第 N 题完整答案 + 解说\n"
    "帮助            — 显示此列表"
)


def handle(text: str):
    text = text.strip()
    md_path, today = today_md()
    questions = parse_md(md_path)

    # 帮助
    if re.fullmatch(r'帮助|/help|help', text, re.IGNORECASE):
        send(HELP_TEXT)
        return

    # 今日题目
    if re.fullmatch(r'今日题目|/today', text, re.IGNORECASE):
        if not questions:
            send(f"⚠️ {today} 的题目文件尚未生成。")
            return
        lines = [f"📚 {today} 共 {len(questions)} 题：\n"]
        for q in questions:
            lines.append(f"  Q{q['idx']}. {q['title']}")
        lines.append("\n发送「Q1」查看题干，「Q1答案」查看答案")
        send("\n".join(lines))
        return

    # Q1 / 第1题 — 题干
    m = re.fullmatch(r'[Qq第](\d+)题?', text)
    if m:
        n = int(m.group(1))
        q = next((x for x in questions if x["idx"] == n), None)
        if not q:
            send(f"❌ 找不到第 {n} 题（今日共 {len(questions)} 题）。")
            return
        send(f"【Q{n}. {q['title']}】\n\n{q['body']}\n\n💡 发送「Q{n}答案」查看完整答案")
        return

    # Q1答案 / 第1题答案
    m = re.fullmatch(r'[Qq第](\d+)题?答案', text)
    if m:
        n = int(m.group(1))
        q = next((x for x in questions if x["idx"] == n), None)
        if not q:
            send(f"❌ 找不到第 {n} 题（今日共 {len(questions)} 题）。")
            return
        parts = [f"【Q{n}. {q['title']}】\n"]
        if q["answer"]:
            parts.append(f"▌答案\n{q['answer']}")
        if q["explanation"]:
            parts.append(f"\n▌解说\n{q['explanation']}")
        send("\n".join(parts))
        return

    # 未识别
    send("❓ 未识别的指令，发送「帮助」查看可用命令。")


# ── 主循环 ─────────────────────────────────────────────

def poll_once(offset: int) -> int:
    """轮询一次，返回新的 offset。"""
    result = api("getUpdates", offset=offset, timeout=30, limit=20)
    if not result.get("ok"):
        return offset

    for update in result.get("result", []):
        uid = update["update_id"]
        msg = update.get("message") or update.get("edited_message")
        if msg and str(msg.get("chat", {}).get("id")) == CHAT_ID:
            text = msg.get("text", "").strip()
            if text:
                print(f"[MSG] {text}")
                handle(text)
        offset = uid + 1
        save_offset(offset)

    return offset


def main():
    """持续运行，监听 Telegram 消息。"""
    print("🤖 Bot 已启动，正在监听消息...")
    offset = load_offset()
    while True:
        try:
            offset = poll_once(offset)
        except KeyboardInterrupt:
            print("\n👋 Bot 已停止")
            break
        except Exception as e:
            print(f"[ERROR] {e}")
            import time
            time.sleep(5)


if __name__ == "__main__":
    main()
