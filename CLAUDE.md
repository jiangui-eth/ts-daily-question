# CLAUDE.md

Claude Code 生成 TypeScript 每日题目的指引。项目详情见 [README.md](./README.md)。

## 题目生成规范

### 文件位置
`questions/YYYY-MM-DD.md`

### MD 格式（严格遵守）

```markdown
# TypeScript 专项题库 — YYYY-MM-DD

## Q1. 题目标题

**题目**

（题干描述 + 代码示例）

**答案**

（完整代码实现）

**解说**

（原理解释，常见误区/陷阱）

**应用场景**

（1～2 个实际开发场景）
```

多题继续追加 `## Q2.`、`## Q3.` 等。

### 知识点（生成前查已有文件避免重复）

映射类型、条件类型、`infer`、模板字面量类型、函数重载、泛型约束与默认值、协变与逆变、类型守卫（`typeof` / `instanceof` / 自定义谓词 / `asserts`）、递归类型、装饰器、声明合并、索引签名、工具类型手动实现（`Partial` / `Required` / `Pick` / `Omit` / `Exclude` / `Extract` 等）、枚举细节、抽象类与访问修饰符。

## Telegram 配置

Bot Token 和 Chat ID 通过环境变量配置，详见 `.env.example`。

手动推送：`python3 send_ts_to_telegram.py`
