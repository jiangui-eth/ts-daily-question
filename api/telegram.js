// ============ 解析器 ============

function extractSection(content, sectionName) {
  const regex = new RegExp(
    `\\*\\*${sectionName}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\*\\*(?:题目|答案|解说|应用场景)\\*\\*|---|## Q\\d+\\.|$)`,
    'i'
  );
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseMarkdown(content) {
  const questions = [];
  const questionBlocks = content.split(/(?=## Q\d+\.)/);

  for (const block of questionBlocks) {
    const headerMatch = block.match(/^## Q(\d+)\.\s*(.+?)(?:\n|$)/);
    if (!headerMatch) continue;

    const number = parseInt(headerMatch[1], 10);
    const title = headerMatch[2].trim();

    questions.push({
      number,
      title,
      question: extractSection(block, '题目'),
      answer: extractSection(block, '答案'),
      explanation: extractSection(block, '解说'),
      useCase: extractSection(block, '应用场景'),
      fullContent: block.trim(),
    });
  }

  return questions;
}

function getTodayDateString() {
  const now = new Date();
  const offset = 8 * 60;
  const localTime = new Date(now.getTime() + offset * 60 * 1000);
  return localTime.toISOString().split('T')[0];
}

function formatQuestion(q) {
  return `Q${q.number}. ${q.title}

题目
${q.question}

答案
${q.answer}

解说
${q.explanation}

应用场景
${q.useCase}`;
}

function formatAnswer(q) {
  return `Q${q.number} 答案

${q.answer}`;
}

function formatExplanation(q) {
  return `Q${q.number} 解说

${q.explanation}`;
}

function formatQuestionList(questions) {
  const lines = questions.map(q => `Q${q.number}. ${q.title}`);
  return `今日题目列表 (共 ${questions.length} 题)\n\n${lines.join('\n')}`;
}

function getHelpMessage() {
  return `TypeScript 专项题库 Bot

可用指令：

帮助 / help - 显示此帮助信息
列表 / list - 查看今日所有题目
Q1 / 题目1 - 查看第 1 题完整内容
Q1答案 / 答案1 - 查看第 1 题答案
Q1解说 / 解说1 - 查看第 1 题解说

提示：数字 1-10 可替换为任意题号`;
}

// ============ 配置 ============

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const GITHUB_RAW_BASE = process.env.GITHUB_RAW_BASE || 'https://raw.githubusercontent.com/jiangui-eth/ts-daily-question/main/questions';
const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;
const TELEGRAM_API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : null;

// SSRF 防护：限制允许的域名
const ALLOWED_GITHUB_HOSTS = ['raw.githubusercontent.com'];

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    return ALLOWED_GITHUB_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

// ============ 核心函数 ============

async function fetchTodayMD() {
  const dateStr = getTodayDateString();
  const url = `${GITHUB_RAW_BASE}/${dateStr}.md`;

  // SSRF 防护：验证 URL 域名
  if (!isAllowedUrl(url)) {
    console.error(`Blocked request to untrusted host: ${url}`);
    return null;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error('Error fetching MD file:', error);
    return null;
  }
}

async function sendMessage(chatId, text) {
  const url = `${TELEGRAM_API}/sendMessage`;
  const maxLength = 4000;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '\n\n...(内容过长已截断)' : text;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncatedText,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

function parseCommand(text) {
  const normalized = text.trim().toLowerCase();

  if (normalized === '帮助' || normalized === 'help' || normalized === '/help' || normalized === '/start') {
    return { type: 'help' };
  }

  if (normalized === '列表' || normalized === 'list' || normalized === '/list') {
    return { type: 'list' };
  }

  const answerMatch = text.match(/^(?:Q?(\d+)\s*答案|答案\s*(\d+)|Q(\d+)\s*answer)$/i);
  if (answerMatch) {
    const num = parseInt(answerMatch[1] || answerMatch[2] || answerMatch[3], 10);
    return { type: 'answer', questionNum: num };
  }

  const explainMatch = text.match(/^(?:Q?(\d+)\s*解说|解说\s*(\d+))$/i);
  if (explainMatch) {
    const num = parseInt(explainMatch[1] || explainMatch[2], 10);
    return { type: 'explanation', questionNum: num };
  }

  const questionMatch = text.match(/^(?:Q(\d+)|题目\s*(\d+)|第\s*(\d+)\s*题)$/i);
  if (questionMatch) {
    const num = parseInt(questionMatch[1] || questionMatch[2] || questionMatch[3], 10);
    return { type: 'question', questionNum: num };
  }

  return { type: 'unknown' };
}

async function handleMessage(message) {
  const chatId = message.chat?.id;
  const text = message.text?.trim() || '';

  if (!chatId) return;

  if (String(chatId) !== ALLOWED_CHAT_ID) {
    console.log(`Ignored message from unauthorized chat: ${chatId}`);
    return;
  }

  if (!text) return;

  const command = parseCommand(text);

  if (command.type === 'help') {
    await sendMessage(chatId, getHelpMessage());
    return;
  }

  if (['list', 'answer', 'explanation', 'question'].includes(command.type)) {
    const mdContent = await fetchTodayMD();

    if (!mdContent) {
      await sendMessage(chatId, '无法获取今日题目，请稍后再试。\n\n提示：请确保今日题目已同步到 GitHub。');
      return;
    }

    const questions = parseMarkdown(mdContent);

    if (questions.length === 0) {
      await sendMessage(chatId, '今日题目解析失败，请检查文件格式。');
      return;
    }

    if (command.type === 'list') {
      await sendMessage(chatId, formatQuestionList(questions));
      return;
    }

    const questionNum = command.questionNum;
    const question = questions.find((q) => q.number === questionNum);

    if (!question) {
      await sendMessage(chatId, `找不到第 ${questionNum} 题，今日共有 ${questions.length} 题。`);
      return;
    }

    switch (command.type) {
      case 'answer':
        await sendMessage(chatId, formatAnswer(question));
        break;
      case 'explanation':
        await sendMessage(chatId, formatExplanation(question));
        break;
      case 'question':
        await sendMessage(chatId, formatQuestion(question));
        break;
    }
    return;
  }

  await sendMessage(chatId, '无法识别的指令，发送「帮助」查看可用命令。');
}

// ============ 入口 ============

module.exports = async function handler(req, res) {
  // 检查必要的环境变量
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN environment variable is not set');
    res.status(500).json({ error: 'Bot not configured' });
    return;
  }

  if (!ALLOWED_CHAT_ID) {
    console.error('ALLOWED_CHAT_ID environment variable is not set');
    res.status(500).json({ error: 'Bot not configured' });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      message: 'TypeScript Daily Question Bot is running',
      date: getTodayDateString(),
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Webhook 签名验证（如果配置了 WEBHOOK_SECRET）
  if (WEBHOOK_SECRET) {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (secretHeader !== WEBHOOK_SECRET) {
      console.error('Invalid webhook secret token');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    const update = req.body;

    if (update?.message) {
      await handleMessage(update.message);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
