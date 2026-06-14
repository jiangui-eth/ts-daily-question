/**
 * MD 文件解析器
 * 解析 TypeScript 专项题库的 MD 文件，提取题目、答案、解说、应用场景
 */

export interface Question {
  number: number;
  title: string;
  question: string;
  answer: string;
  explanation: string;
  useCase: string;
  fullContent: string;
}

/**
 * 解析 MD 文件内容，提取所有题目
 */
export function parseMarkdown(content: string): Question[] {
  const questions: Question[] = [];

  // 按 ## Q 分割题目
  const questionBlocks = content.split(/(?=## Q\d+\.)/);

  for (const block of questionBlocks) {
    // 匹配题目编号和标题
    const headerMatch = block.match(/^## Q(\d+)\.\s*(.+?)(?:\n|$)/);
    if (!headerMatch) continue;

    const number = parseInt(headerMatch[1], 10);
    const title = headerMatch[2].trim();

    // 提取各部分内容
    const questionContent = extractSection(block, '题目');
    const answerContent = extractSection(block, '答案');
    const explanationContent = extractSection(block, '解说');
    const useCaseContent = extractSection(block, '应用场景');

    questions.push({
      number,
      title,
      question: questionContent,
      answer: answerContent,
      explanation: explanationContent,
      useCase: useCaseContent,
      fullContent: block.trim(),
    });
  }

  return questions;
}

/**
 * 提取指定章节的内容
 */
function extractSection(content: string, sectionName: string): string {
  // 匹配 **章节名** 后的内容，直到下一个 **章节名** 或 --- 或文件结尾
  const regex = new RegExp(
    `\\*\\*${sectionName}\\*\\*\\s*\\n([\\s\\S]*?)(?=\\*\\*(?:题目|答案|解说|应用场景)\\*\\*|---|## Q\\d+\\.|$)`,
    'i'
  );

  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  // 使用东八区时间
  const offset = 8 * 60; // UTC+8
  const localTime = new Date(now.getTime() + offset * 60 * 1000);
  return localTime.toISOString().split('T')[0];
}

/**
 * 格式化单个题目的完整输出
 */
export function formatQuestion(q: Question): string {
  return `📘 Q${q.number}. ${q.title}

**题目**
${q.question}

**答案**
${q.answer}

**解说**
${q.explanation}

**应用场景**
${q.useCase}`;
}

/**
 * 格式化答案部分
 */
export function formatAnswer(q: Question): string {
  return `📝 Q${q.number} 答案

${q.answer}`;
}

/**
 * 格式化解说部分
 */
export function formatExplanation(q: Question): string {
  return `💡 Q${q.number} 解说

${q.explanation}`;
}

/**
 * 格式化题目列表
 */
export function formatQuestionList(questions: Question[]): string {
  const lines = questions.map(q => `Q${q.number}. ${q.title}`);
  return `📋 今日题目列表 (共 ${questions.length} 题)\n\n${lines.join('\n')}`;
}

/**
 * 生成帮助信息
 */
export function getHelpMessage(): string {
  return `🤖 TypeScript 专项题库 Bot

📌 可用指令：

• 帮助 / help — 显示此帮助信息
• 列表 / list — 查看今日所有题目
• Q1 / 题目1 — 查看第 1 题完整内容
• Q1答案 / 答案1 — 查看第 1 题答案
• Q1解说 / 解说1 — 查看第 1 题解说

💡 提示：数字 1-10 可替换为任意题号`;
}
