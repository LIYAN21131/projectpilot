import { NextResponse } from "next/server";
import type { InterviewPreparationItem } from "@/types/project";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

type InterviewPrepareRequest = {
  projectName?: unknown;
  background?: unknown;
  painPoint?: unknown;
  responsibility?: unknown;
  actions?: unknown;
  result?: unknown;
  metrics?: unknown;
  tools?: unknown;
  optimizedResumeBullets?: unknown;
};

type InterviewPrepareFields = {
  projectName: string;
  background: string;
  painPoint: string;
  responsibility: string;
  actions: string;
  result: string;
  metrics: string;
  tools: string;
  optimizedResumeBullets: string[];
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function normalizeFields(body: InterviewPrepareRequest): InterviewPrepareFields {
  return {
    projectName: normalizeText(body.projectName),
    background: normalizeText(body.background),
    painPoint: normalizeText(body.painPoint),
    responsibility: normalizeText(body.responsibility),
    actions: normalizeText(body.actions),
    result: normalizeText(body.result),
    metrics: normalizeText(body.metrics),
    tools: normalizeText(body.tools),
    optimizedResumeBullets: Array.isArray(body.optimizedResumeBullets)
      ? body.optimizedResumeBullets
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

function hasUsableProjectContent(fields: InterviewPrepareFields) {
  return [
    fields.projectName,
    fields.background,
    fields.painPoint,
    fields.responsibility,
    fields.actions,
    fields.result,
    fields.metrics,
    fields.tools,
    fields.optimizedResumeBullets.join("\n"),
  ].some((value) => value.trim().length > 0);
}

function normalizeQuestion(value: Partial<InterviewPreparationItem>): InterviewPreparationItem | null {
  const question = normalizeText(value.question);
  const script = normalizeText(value.script);
  const answerPoints = Array.isArray(value.answerPoints)
    ? value.answerPoints
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/^[-•\d.、\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (!question || !script) return null;

  return {
    question,
    answerPoints,
    script,
  };
}

function parseTextQuestions(content: string) {
  return content
    .split(/\n(?=(?:问题\s*\d+|Q\d+|[一二三四五]、))/)
    .map((chunk) => {
      const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const questionLine = lines.find((line) => /[？?]/.test(line)) || lines[0] || "";
      const question = questionLine.replace(/^(问题\s*\d+[:：]?|Q\d+[:：]?|[一二三四五]、)/, "").trim();
      const answerPoints = lines
        .filter((line) => /^[-•]/.test(line))
        .map((line) => line.replace(/^[-•\d.、\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 3);
      const scriptIndex = lines.findIndex((line) => line.includes("面试话术") || line.includes("话术"));
      const script = scriptIndex >= 0
        ? lines.slice(scriptIndex).join("").replace(/^.*?[：:]/, "").trim()
        : lines.filter((line) => !line.includes(question)).slice(-1)[0] || "";

      return normalizeQuestion({ question, answerPoints, script });
    })
    .filter((item): item is InterviewPreparationItem => Boolean(item))
    .slice(0, 5);
}

function parseAIContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as { questions?: unknown };
    if (Array.isArray(parsed.questions)) {
      return parsed.questions
        .map((item) => normalizeQuestion(item as Partial<InterviewPreparationItem>))
        .filter((item): item is InterviewPreparationItem => Boolean(item))
        .slice(0, 5);
    }
  } catch {
    // Fall back to text parsing below.
  }

  return parseTextQuestions(trimmed);
}

function containsUnsupportedNumber(questions: InterviewPreparationItem[], fields: InterviewPrepareFields) {
  const source = [
    fields.projectName,
    fields.background,
    fields.painPoint,
    fields.responsibility,
    fields.actions,
    fields.result,
    fields.metrics,
    fields.tools,
    fields.optimizedResumeBullets.join("\n"),
  ].join("\n");
  const allowedNumbers = new Set(source.match(/\d+(?:\.\d+)?%?|\d+\+/g) ?? []);
  const generated = questions
    .map((item) => [item.question, ...item.answerPoints, item.script].join("\n"))
    .join("\n");
  const generatedNumbers = generated.match(/\d+(?:\.\d+)?%?|\d+\+/g) ?? [];

  return generatedNumbers.some((number) => {
    if (allowedNumbers.has(number)) return false;
    if (number.includes("%") || number.includes("+")) return true;

    const numericValue = Number.parseFloat(number);
    if (numericValue >= 10) return true;

    const numberIndex = generated.indexOf(number);
    const nearbyText = generated.slice(Math.max(0, numberIndex - 8), numberIndex + number.length + 8);
    return /用户|人|名|位|样本|反馈|测试|访谈|调研|同学|朋友|HR/.test(nearbyText);
  });
}

function containsUnsupportedSourceClaim(questions: InterviewPreparationItem[], fields: InterviewPrepareFields) {
  const source = [
    fields.projectName,
    fields.background,
    fields.painPoint,
    fields.responsibility,
    fields.actions,
    fields.result,
    fields.metrics,
    fields.tools,
    fields.optimizedResumeBullets.join("\n"),
  ].join("\n");
  const generated = questions
    .map((item) => [item.question, ...item.answerPoints, item.script].join("\n"))
    .join("\n");
  const sourceClaims = ["HR"];

  return sourceClaims.some((claim) => generated.includes(claim) && !source.includes(claim));
}

function buildUserPrompt(fields: InterviewPrepareFields) {
  return `请根据以下项目资料，生成 5 个面试中高概率被追问的问题。

每个问题需要包含：
1. question：面试问题
2. answerPoints：回答思路，使用 3 条以内 bullet
3. script：可直接口述的面试话术，控制在 120-180 字左右

硬性限制：
- 不得出现项目资料中没有提供过的任何数字、样本量、用户反馈、HR 评价、测试结果或业务效果。
- 如果数据指标为“暂无明确量化数据”，回答“如何验证”时必须明确说明目前还没有量化验证，只能说明已有功能结果和后续计划如何验证。
- 不得把“使用工具”推断成开发、上线、部署、集成等事实，除非项目资料明确提供。
- 不得添加“我自己/身边同学/市场调研/用户访谈/HR 朋友”等项目资料没有提供的来源。

问题方向需要覆盖：
- 为什么做这个项目
- 你的核心贡献是什么
- 项目的难点是什么
- 数据或结果如何验证
- 如果继续迭代，你会怎么优化

项目资料如下：

【项目名称】
${fields.projectName}

【项目背景】
${fields.background}

【用户痛点】
${fields.painPoint}

【个人职责】
${fields.responsibility}

【关键行动】
${fields.actions}

【项目成果】
${fields.result}

【数据指标】
${fields.metrics}

【使用工具】
${fields.tools}

【简历优化结果】
${fields.optimizedResumeBullets.map((bullet) => `- ${bullet}`).join("\n")}

请严格按照以下 JSON 格式返回，不要输出多余解释：

{
  "questions": [
    {
      "question": "",
      "answerPoints": ["", "", ""],
      "script": ""
    }
  ]
}`;
}

export async function POST(request: Request) {
  let body: InterviewPrepareRequest;

  try {
    body = (await request.json()) as InterviewPrepareRequest;
  } catch {
    return NextResponse.json({ error: "请求内容格式异常" }, { status: 400 });
  }

  const fields = normalizeFields(body);
  if (!hasUsableProjectContent(fields)) {
    return NextResponse.json({ error: "请先完善项目资料" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "模型服务异常，请稍后重试" }, { status: 500 });
  }

  const systemPrompt = `你是一名专业的产品经理面试官和简历项目辅导老师，擅长根据候选人的项目经历，生成真实面试中可能被追问的问题，并帮助候选人整理清晰、自然、可信的回答。

请严格遵守以下规则：

1. 只能基于用户提供的项目资料生成问题和回答。
2. 不得虚构任何事实、数据、用户数量、转化率、增长率或业务成果。
3. 如果项目资料中没有具体数据，不要编造数据。
4. 问题要像真实面试官会问的问题，不要太空泛。
5. 回答要适合大学生、应届生或实习生在面试中表达。
6. 回答不要太官方，不要像论文或宣传稿。
7. 回答需要自然、口语化、可信。
8. 每个回答都要尽量体现：背景、行动、结果、反思。
9. 不要输出鸡汤式表达，例如“我收获很大”“我会继续努力”等空话。
10. 不要过度夸大项目价值。
11. 不要输出与当前项目无关的问题。
12. 不要输出标题解释，只返回结构化结果。
13. 不得出现项目资料中没有提供过的任何数字、样本量、用户反馈、HR 评价、测试结果或业务效果。
14. 如果数据指标为“暂无明确量化数据”，回答“如何验证”时必须明确说明目前还没有量化验证，只能说明已有功能结果和后续计划如何验证。
15. 不得添加“我自己/身边同学/市场调研/用户访谈/HR 朋友”等项目资料没有提供的来源。
16. 不得把“使用工具”推断成开发、上线、部署、集成等事实，除非项目资料明确提供。`;

  try {
    const response = await fetch(`${normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(fields) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.25,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "模型服务异常，请稍后重试" }, { status: 502 });
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    const questions = content ? parseAIContent(content) : [];

    if (!questions.length) {
      return NextResponse.json({ error: "生成失败，请重试" }, { status: 502 });
    }

    if (containsUnsupportedNumber(questions, fields) || containsUnsupportedSourceClaim(questions, fields)) {
      return NextResponse.json({ error: "生成失败，请重试" }, { status: 502 });
    }

    return NextResponse.json({ questions: questions.slice(0, 5) });
  } catch {
    return NextResponse.json({ error: "模型服务异常，请稍后重试" }, { status: 502 });
  }
}
