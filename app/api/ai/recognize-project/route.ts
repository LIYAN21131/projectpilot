import { NextResponse } from "next/server";
import {
  cleanTargetUsersCandidates,
  extractTargetUsersCandidates,
  normalizeTargetUsers,
  normalizeTargetUsersCandidates,
} from "@/lib/ai/targetUsers";
import type { RecognizedProjectFields } from "@/types/project";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-flash";
const NO_METRICS_TEXT = "暂无明确量化数据";

type RecognizeProjectRequest = {
  rawMaterial?: unknown;
  currentProject?: unknown;
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTools(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[、,，;；\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeUncertainFields(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasExplicitMetric(value: string) {
  return /\d+(?:\.\d+)?%?|\d+\+|[一二三四五六七八九十百千万]+(?:名|人|个|次|天|周|月|年)/.test(value);
}

function normalizeMetrics(value: unknown) {
  const text = normalizeText(value);
  if (!text || text === NO_METRICS_TEXT) return NO_METRICS_TEXT;
  return hasExplicitMetric(text) ? text : NO_METRICS_TEXT;
}

function extractMetricFallback(rawMaterial: string) {
  const metrics = [
    ...rawMaterial.matchAll(/\d{4}\s*年\s*\d+\s*月\s*至\s*\d{4}\s*年\s*\d+\s*月/g),
    ...rawMaterial.matchAll(/\d+\s*名[^，。；\n]*?(?:访谈|用户|应届生)/g),
    ...rawMaterial.matchAll(/(?:超过|约|大约)?\s*\d+(?:\.\d+)?%\s*[^，。；\n]*?(?:用户|采纳率|转化率|比例|占比)?/g),
    ...rawMaterial.matchAll(/\d+\s*人[^，。；\n]*?(?:参与|输入|获得|复制|完成|使用|提交)/g),
    ...rawMaterial.matchAll(/(?:采纳率|转化率|完成率|复制率)[^，。；\n]*?\d+(?:\.\d+)?%/g),
  ]
    .map((match) => match[0].trim())
    .filter(Boolean);

  return Array.from(new Set(metrics)).join("；");
}

function extractProjectNameFallback(rawMaterial: string) {
  return rawMaterial.match(/名为\s*([A-Za-z0-9_\-\u4e00-\u9fa5]+)/)?.[1]?.trim() || "";
}

function compactSentence(value: string, maxLength = 100) {
  const text = value.replace(/\s+/g, "").trim();
  if (text.length <= maxLength) return text;

  const firstSentence = text.split(/[。！？!?]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= maxLength) {
    return firstSentence.endsWith("。") ? firstSentence : `${firstSentence}。`;
  }

  return `${text.slice(0, maxLength - 1)}。`;
}

function similarityRatio(first: string, second: string) {
  const firstChars = new Set(first.replace(/[，。；、\s]/g, ""));
  const secondChars = new Set(second.replace(/[，。；、\s]/g, ""));
  if (!firstChars.size || !secondChars.size) return 0;

  let overlap = 0;
  firstChars.forEach((char) => {
    if (secondChars.has(char)) overlap += 1;
  });

  return overlap / Math.min(firstChars.size, secondChars.size);
}

function isProjectSummaryTooSimilar(summary: string, background: string) {
  if (!summary || !background) return false;
  return summary.includes(background) || background.includes(summary) || similarityRatio(summary, background) > 0.72;
}

function hasBackgroundOpening(value: string) {
  return /^(?:我在|在).{0,12}(?:过程中|时)?(?:，)?我?发现|^(?:大量|很多)[^。]{0,24}虽然/.test(value.trim());
}

function inferProjectType(projectName: string, rawMaterial: string) {
  const nameType = projectName.match(/(?:AI)?[^，。；\n]{0,16}(?:工具|平台|系统|产品|应用)/)?.[0];
  if (nameType) return nameType;

  const rawType = rawMaterial.match(/(?:名为\s*[A-Za-z0-9_\-\u4e00-\u9fa5]+\s*的|设计了?一款(?:名为\s*[A-Za-z0-9_\-\u4e00-\u9fa5]+\s*的)?)([^，。；\n]{2,30}(?:工具|平台|系统|产品|应用))/)?.[1];
  return rawType?.trim() || "项目工具";
}

function summarizeActions(actions: string) {
  const text = actions
    .replace(/^设计/, "")
    .replace(/用户输入/g, "项目资料输入")
    .replace(/AI自动/g, "AI 自动")
    .split(/[；。\n]/)[0]
    ?.trim();

  if (!text) return "核心流程梳理、内容生成和结果管理";
  return text.length > 32 ? text.slice(0, 32) : text;
}

function normalizeProjectSummary(
  value: unknown,
  fields: {
    projectName: string;
    targetUsers: string;
    painPoint: string;
    actions: string;
    background: string;
    rawMaterial: string;
  },
) {
  const rawSummary = normalizeText(value);
  const shouldRewrite = !rawSummary
    || rawSummary.length > 120
    || hasBackgroundOpening(rawSummary)
    || isProjectSummaryTooSimilar(rawSummary, fields.background);

  if (!shouldRewrite) return compactSentence(rawSummary, 100);

  const projectName = fields.projectName && fields.projectName !== "未命名项目" ? fields.projectName : "本项目";
  const targetUsers = fields.targetUsers || "目标用户";
  const projectType = inferProjectType(fields.projectName, fields.rawMaterial);
  const actions = summarizeActions(fields.actions);
  const painPoint = fields.painPoint || "关键场景中的表达和效率问题";

  return compactSentence(`${projectName} 是一款面向${targetUsers}的${projectType}，支持${actions}，帮助用户解决${painPoint}。`, 100);
}

function extractBackgroundFallback(rawMaterial: string) {
  const match = rawMaterial.match(/项目背景来源于(.+?)(?:因此|所以)/);
  if (match?.[1]) return match[1].trim();
  return "";
}

function extractPainPointFallback(rawMaterial: string) {
  const points: string[] = [];
  if (/无法在面试中清晰表达自己的项目经历|做过但讲不出来/.test(rawMaterial)) {
    points.push("做过项目但无法在面试中清晰表达项目经历");
  }
  if (rawMaterial.includes("面试回答组织困难")) points.push("面试回答组织困难");
  if (rawMaterial.includes("项目亮点提炼不清")) points.push("项目亮点提炼不清");
  return points.join("，");
}

function extractResponsibilityFallback(rawMaterial: string) {
  const match = rawMaterial.match(/完成了从(.+?)的完整产品流程实践/);
  if (match?.[1]) {
    return `负责${match[1].replace(/、/g, "、")}。`;
  }
  return "";
}

function extractActionsFallback(rawMaterial: string) {
  const actions: string[] = [];
  const flow = rawMaterial.match(/产品的核心流程为[:：](.+?)(?:。|\n)/)?.[1]?.trim();
  if (flow) actions.push(`设计${flow}`);
  if (rawMaterial.includes("PostHog")) actions.push("接入 PostHog 进行数据埋点，监测转化漏斗");
  return actions.join("；");
}

function extractResultFallback(rawMaterial: string) {
  const name = extractProjectNameFallback(rawMaterial) || "项目";
  if (/产品设计与落地工作/.test(rawMaterial)) {
    return `完成 ${name} 的产品设计与落地工作。`;
  }
  return "";
}

function containsUnsupportedClaim(value: string, rawMaterial: string) {
  return ["点赞", "评论", "收藏", "分享"].some((word) => value.includes(word) && !rawMaterial.includes(word));
}

function normalizeRecognizedProject(
  value: Partial<RecognizedProjectFields>,
  rawMaterial: string,
): RecognizedProjectFields {
  const fallbackMetrics = extractMetricFallback(rawMaterial);
  const metrics = fallbackMetrics || normalizeMetrics(value.metrics);
  const result = normalizeText(value.result);
  const projectName = normalizeText(value.projectName) || extractProjectNameFallback(rawMaterial) || "未命名项目";
  const background = normalizeText(value.background) || extractBackgroundFallback(rawMaterial);
  const aiTargetCandidates = normalizeTargetUsersCandidates(value.targetUsersCandidates);
  const targetUsersCandidates = cleanTargetUsersCandidates(rawMaterial, normalizeTargetUsersCandidates([
    ...aiTargetCandidates,
    ...extractTargetUsersCandidates(rawMaterial),
  ]));
  const targetUsers = normalizeTargetUsers(rawMaterial, targetUsersCandidates);
  const painPoint = normalizeText(value.painPoint) || extractPainPointFallback(rawMaterial);
  const actions = normalizeText(value.actions) || extractActionsFallback(rawMaterial);
  const projectSummary = normalizeProjectSummary(value.projectSummary, {
    projectName,
    targetUsers,
    painPoint,
    actions,
    background,
    rawMaterial,
  });

  return {
    projectName,
    projectSummary,
    background,
    targetUsersCandidates,
    targetUsers,
    painPoint,
    responsibility: normalizeText(value.responsibility) || extractResponsibilityFallback(rawMaterial),
    actions,
    result: result && !containsUnsupportedClaim(result, rawMaterial) ? result : extractResultFallback(rawMaterial),
    metrics,
    tools: normalizeTools(value.tools),
    reflection: normalizeText(value.reflection),
    uncertainFields: normalizeUncertainFields(value.uncertainFields),
  };
}

function extractJson(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) return fenced;

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseAIContent(content: string, rawMaterial: string): RecognizedProjectFields | null {
  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<RecognizedProjectFields>;
    return normalizeRecognizedProject(parsed, rawMaterial);
  } catch {
    return null;
  }
}

function buildPrompt(rawMaterial: string) {
  return `请从以下原始项目描述中提取结构化信息。

请严格执行两步：
第一步：在内部先抽取事实片段，包括用户是谁、痛点是什么、我负责什么、我做了哪些事情、使用了哪些工具、有哪些数字指标、项目完成了什么。
第二步：再将事实片段归入对应字段。

如果原文中有明确事实，必须提取到对应字段；不确定时才留空或加入 uncertainFields。

原始项目描述：

${rawMaterial}

请严格按照以下 JSON 格式返回：

{
  "projectName": "",
  "projectSummary": "",
  "background": "",
  "targetUsersCandidates": [],
  "targetUsers": "",
  "painPoint": "",
  "responsibility": "",
  "actions": "",
  "result": "",
  "metrics": "",
  "tools": [],
  "reflection": "",
  "uncertainFields": []
}

字段要求：

projectName：
只填写项目名称，没有明确名称则写“未命名项目”。

projectSummary：
请基于项目名称、目标用户、用户痛点、核心功能和项目成果，生成一句抽象项目简介。
用于回答“这是一个什么项目”。
表达格式接近：“这是一个面向xxx用户的xxx工具，支持xxx、xxx、xxx，帮助用户解决xxx问题。”
只写 1-2 句话，控制在 50-100 字，不能超过 100 字。
重点说明项目类型、目标用户、核心功能、解决的问题。
不能直接复制 background。
不要写长篇背景、具体调研过程、数据指标或项目复盘。
如果原文中没有明确项目名称，可以用“本项目”开头。
如果内容以“我在求职过程中发现”“大量应届生虽然做过项目”等背景叙述开头，请改写成项目介绍句。

background：
请提取项目产生的背景和原因，用于回答“为什么做这个项目”。
重点说明用户问题、场景观察或痛点来源。
可以比 projectSummary 更具体，但不要写成产品功能介绍。
不要写产品功能流程。
不要和 projectSummary 完全重复。

targetUsersCandidates：
只提取原文中明确出现的人群词，或“人群 + 痛点”组合。

必须返回数组。

只允许返回使用该产品的人、存在该痛点的人、被调研的人、被服务的人群。

“用户”这个泛称不能单独作为目标用户；“帮助用户”“用户输入”“用户复制”“用户保存”都不能作为目标用户。

不要返回产品流程、核心流程、功能介绍、解决方案、工具、数据埋点、后续优化方向、数据指标或项目成果。

如果原文中没有明确用户人群，请返回空数组。

正确示例：
["应届生", "产品经理求职者", "项目经历表达困难的学生"]

错误示例：
["用户输入项目经历"]
["AI自动提炼STAR结构"]
["生成面试回答"]
["支持复制和保存"]
["接入PostHog进行数据埋点"]
["后续优化方向主要集中在行业场景细分"]

targetUsers：
由系统根据 targetUsersCandidates 清洗生成，你可以返回空字符串。

painPoint：
只填写用户遇到的问题，不要写解决方案。

responsibility：
只填写我在项目中负责的内容。

actions：
只填写我具体做过的事情。

result：
只填写项目最终完成的成果或验证结果。

metrics：
只填写明确的数据指标。没有数据则写“暂无明确量化数据”。

tools：
只填写工具名称数组，例如 ["Figma", "Stitch", "DeepSeek"]。

reflection：
只填写项目复盘或后续优化方向。没有则为空字符串。

uncertainFields：
如果某些字段不确定，请把字段名放入数组中，例如 ["tools", "reflection"]。

请注意：
不要把产品流程放到目标用户。
不要把验证方式、数据埋点、项目描述、解决方案或项目成果放到目标用户。
不要把长篇项目介绍放到数据指标。
不要把用户痛点写成项目成果。
不要编造任何原文没有的信息。`;
}

export async function POST(request: Request) {
  let body: RecognizeProjectRequest;

  try {
    body = (await request.json()) as RecognizeProjectRequest;
  } catch {
    return jsonError("请求内容格式异常，请稍后重试。");
  }

  const rawMaterial = normalizeText(body.rawMaterial);
  if (!rawMaterial) {
    return jsonError("请先输入项目资料");
  }

  if (rawMaterial.length < 20) {
    return jsonError("原始资料内容较少，请补充更多项目背景、职责或结果后再识别。");
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return jsonError("DeepSeek API Key 未配置，请先在环境变量中配置 DEEPSEEK_API_KEY。", 500);
  }

  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL);
  const model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  const systemPrompt = `你是一名严谨的项目经历信息抽取助手，专门帮助用户从原始项目描述中提取结构化项目信息。

你的任务不是润色，也不是总结文章，而是进行精准字段提取。

请严格遵守以下规则：

1. 只能基于用户提供的原文进行提取。
2. 不得虚构任何事实、数据、工具、用户数量、转化率或项目成果。
3. 不确定的信息不要硬填。
4. 如果某个字段没有明确内容，请返回空字符串或空数组。
5. 不要把一个字段的信息混入另一个字段。
6. 数据指标字段只能包含明确数字、比例、人数、时间、转化率等量化信息。
7. 使用工具字段只能包含工具或平台名称。
8. projectSummary 是抽象项目简介，只写这是一个什么项目，不能复制 background，不能写调研过程、数据指标或复盘；长度控制在 50-100 字。
9. background 是项目产生原因，重点写用户问题或场景来源，不要写成产品功能流程，也不要和 projectSummary 完全重复。
10. targetUsersCandidates 必须是数组，只能包含原文明确出现的人群词，或“人群 + 痛点”组合；不要包含产品流程、功能介绍、数据埋点、验证方式、项目描述、解决方案、后续优化方向或项目成果；如果没有明确人群信息则返回空数组，不要根据项目名称猜测。
11. 用户痛点字段只写问题，不写解决方案。
12. 我的职责字段只写用户本人负责的事情。
13. 项目成果字段只写最终完成或验证的结果。
14. 不要输出解释说明。
15. 必须返回标准 JSON。`;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: buildPrompt(rawMaterial),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) {
      return jsonError("识别失败，请重试", 502);
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      return jsonError("识别失败，请重试", 502);
    }

    const data = parseAIContent(content, rawMaterial);
    if (!data) {
      return jsonError("识别失败，请重试", 502);
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return jsonError("识别失败，请重试", 502);
  }
}
