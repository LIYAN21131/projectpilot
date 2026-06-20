import { NextResponse } from "next/server";
import type { ResumeProjectFields } from "@/types/project";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

type ResumeOptimizeRequest = Partial<ResumeProjectFields>;

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

function normalizeFields(body: ResumeOptimizeRequest): ResumeProjectFields {
  return {
    projectName: normalizeText(body.projectName),
    background: normalizeText(body.background),
    painPoint: normalizeText(body.painPoint),
    responsibility: normalizeText(body.responsibility),
    actions: normalizeText(body.actions),
    result: normalizeText(body.result),
    metrics: normalizeText(body.metrics),
    tools: normalizeText(body.tools),
  };
}

function hasUsableContent(fields: ResumeProjectFields) {
  return Object.values(fields).some((value) => value.trim().length > 0);
}

function buildUserPrompt(fields: ResumeProjectFields) {
  return `请根据以下项目内容，生成 3-5 条适合放入简历的项目经历 bullet。

要求：
- 每条 bullet 以短横线开头
- 每条控制在 40 字左右
- 表达要专业、精炼、清晰
- 突出个人职责、关键行动和项目结果
- 不得虚构数据和事实
- 使用工具只能作为工具信息，不得据此推断开发、部署、上线、集成或增长结果
- 原文没有明确提供“开发、集成、部署、上线、发布”等动作时，不得使用这些表述
- 不要仅根据使用工具字段生成 bullet，优先使用个人职责、关键行动和项目成果
- 不要输出标题
- 不要输出解释
- 不要输出建议
- 只输出 bullet 内容

项目内容如下：

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

请开始输出。`;
}

function parseBullets(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as { bullets?: unknown };
    if (Array.isArray(parsed.bullets)) {
      return parsed.bullets
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/^[-•\d.、\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    // Fall back to line parsing below.
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-•\d.、\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function POST(request: Request) {
  let body: ResumeOptimizeRequest;

  try {
    body = (await request.json()) as ResumeOptimizeRequest;
  } catch {
    return NextResponse.json({ error: "请求内容格式异常" }, { status: 400 });
  }

  const fields = normalizeFields(body);
  if (!hasUsableContent(fields)) {
    return NextResponse.json({ error: "请先输入项目经历内容" }, { status: 400 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "网络或模型服务异常，请稍后重试" }, { status: 500 });
  }

  const systemPrompt = `你是一名专业的产品经理简历优化专家，擅长将普通项目经历优化为适合求职简历展示的项目描述。

你的任务不是编故事，也不是扩写文章，而是在用户提供的信息基础上，优化简历表达。

请严格遵守以下规则：

1. 不得虚构任何事实、数据、成果、用户数量、转化率、增长率或业务影响。
2. 只能基于用户提供的内容进行优化。
3. 如果原文没有具体数据，不要编造数据。
4. 如果没有量化结果，可以使用“优化”“提升”“增强”“改善”“验证”等非具体量化表达。
5. 输出内容必须适合直接放入简历。
6. 语言要专业、精炼，不要太长。
7. 不要写成大段文章。
8. 必须使用 bullet 形式输出。
9. 每条 bullet 尽量体现“做了什么 + 怎么做 + 带来了什么结果”。
10. 避免空话，例如“认真负责”“沟通能力强”“学习能力强”等。
11. 避免过度夸大，例如“显著提升”“大幅增长”“行业领先”，除非用户原文提供了依据。
12. 不要输出解释说明。
13. 不要输出标题。
14. 不要输出与简历无关的建议。
15. 不要添加用户没有提供过的工具、技术、平台或数据。
16. 使用工具字段只代表用户提供的工具清单，不得据此推断开发、部署、上线、集成或业务增长。
17. 原文没有明确提供“开发、集成、部署、上线、发布”等动作时，不得使用这些表述。
18. 不要仅根据使用工具字段生成 bullet，优先使用个人职责、关键行动和项目成果。`;

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
        temperature: 0.2,
        stream: false,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "网络或模型服务异常，请稍后重试" }, { status: 502 });
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    const bullets = content ? parseBullets(content) : [];

    if (!bullets.length) {
      return NextResponse.json({ error: "优化失败，请重试" }, { status: 502 });
    }

    return NextResponse.json({ bullets });
  } catch {
    return NextResponse.json({ error: "网络或模型服务异常，请稍后重试" }, { status: 502 });
  }
}
