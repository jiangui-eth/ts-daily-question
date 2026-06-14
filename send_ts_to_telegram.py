#!/usr/bin/env python3
"""
TypeScript 专项题库 → Telegram 推送脚本
每天由 launchd 在 10:05 自动调用，读取当天 MD 文件并发送到 Telegram。
直接发送 MD 文件，用户可在 Telegram 中查看完整内容。
"""

import urllib.request
import json
import os
import uuid
from datetime import date

# ── 配置 ──────────────────────────────────────────────
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
CHAT_ID   = os.environ.get("TELEGRAM_CHAT_ID")
FOLDER    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "questions")

if not BOT_TOKEN or not CHAT_ID:
    print("[ERROR] 请设置环境变量 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_ID")
    print("示例：export TELEGRAM_BOT_TOKEN='your_token'")
    print("      export TELEGRAM_CHAT_ID='your_chat_id'")
    exit(1)
# ──────────────────────────────────────────────────────


def send_message(text: str) -> bool:
    """向 Telegram 发送一条消息，成功返回 True。"""
    url  = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": CHAT_ID, "text": text}).encode()
    req  = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            return result.get("ok", False)
    except Exception as e:
        print(f"[ERROR] 发送失败: {e}")
        return False


def send_document(file_path: str, caption: str = "") -> bool:
    """向 Telegram 发送文件，成功返回 True。"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendDocument"
    boundary = uuid.uuid4().hex

    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        file_data = f.read()

    # 构建 multipart/form-data 请求体
    body = b""
    # chat_id 字段
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="chat_id"\r\n\r\n'
    body += f"{CHAT_ID}\r\n".encode()
    # caption 字段
    if caption:
        body += f"--{boundary}\r\n".encode()
        body += b'Content-Disposition: form-data; name="caption"\r\n\r\n'
        body += f"{caption}\r\n".encode()
    # document 字段（文件）
    body += f"--{boundary}\r\n".encode()
    body += f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'.encode()
    body += b"Content-Type: text/markdown\r\n\r\n"
    body += file_data
    body += b"\r\n"
    body += f"--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return result.get("ok", False)
    except Exception as e:
        print(f"[ERROR] 文件发送失败: {e}")
        return False


def main():
    today   = date.today().strftime("%Y-%m-%d")
    md_path = os.path.join(FOLDER, f"{today}.md")

    if not os.path.exists(md_path):
        send_message(f"⚠️ [{today}] TS 题目文件尚未生成，请稍后检查。")
        print(f"[WARN] 文件不存在: {md_path}")
        return

    if os.path.getsize(md_path) == 0:
        send_message(f"⚠️ [{today}] TS 题目文件为空。")
        return

    caption = f"📘 TypeScript 专项题库 — {today}"
    ok = send_document(md_path, caption)
    print(f"[{'✓' if ok else '✗'}] 推送{'成功' if ok else '失败'}")


if __name__ == "__main__":
    main()
