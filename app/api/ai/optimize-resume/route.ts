import { NextResponse } from "next/server";
import OpenAI from "openai";
import { optimizeResume } from "@/lib/ai/optimizeResume";
import type { Project } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";

type AIResumeResponse = {
  suggestions: string[];
  optimizedContent: string;
};

type FallbackResumeResponse = AIResumeResponse & {
  formatWarning?: boolean;
};

function buildPrompt(project: Project, targetRole: string, ruleAnalysis: unknown) {
  return `
你是中文实习求职简历优化助手。请基于用户项目经历，生成适合中文实习简历表达的优化建议和优化版项目经历。

必须遵守：
1. 禁止虚构数据、经历、指标、公司、用户规模、业务结果。
2. 如果缺少数据，只能给出建议补充的指标或表达方向，不能编造具体数值。
3. 输出必须是结构化 JSON，不要输出 Markdown，不要输出解释文字。
4. 语言要适合中文实习简历表达，专业、简洁、偏产品岗位求职场景。

目标岗位：${targetRole}

规则分析结果：
${JSON.stringify(ruleAnalysis ?? {}, null, 2)}

项目内容：
${JSON.stringify(
  {
    name: project.name,
    background: project.background,
    targetUsers: project.targetUsers,
    painPoints: project.painPoints,
    solution: project.solution,
    responsibilities: project.responsibilities,
    results: project.results,
    metrics: project.metrics,
    review: project.review,
  },
  null,
  2,
)}

请严格返回这个 JSON 结构：
{
  "suggestions": [
    "项目描述优化：...",
    "项目成果优化：...",
    "数据指标建议：...",
    "岗位匹配建议：..."
  ],
  "optimizedContent": "【项目名称】｜目标岗位相关项目\\n- ...\\n- ..."
}
`;
}

function normalizeAIResult(
  result: FallbackResumeResponse,
  project: Project,
  targetRole: string,
): ResumeOptimizationResult {
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    targetRole,
    suggestions: Array.isArray(result.suggestions) ? result.suggestions.filter(Boolean) : [],
    optimizedContent: result.optimizedContent || "",
    createdAt: new Date().toISOString(),
    ...(result.formatWarning ? { formatWarning: true } : {}),
  };
}

function normalizeAIContent(content: string): FallbackResumeResponse {
  try {
    const parsed = JSON.parse(content) as Partial<AIResumeResponse>;
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const optimizedContent = typeof parsed.optimizedContent === "string" ? parsed.optimizedContent.trim() : "";

    if (suggestions.length || optimizedContent) {
      return { suggestions, optimizedContent };
    }
  } catch {
    // Fall through to text fallback below.
  }

  const fallbackText = content.trim();
  return {
    suggestions: fallbackText ? ["AI 返回格式异常，已为你保留可用文本。"] : [],
    optimizedContent: fallbackText,
    formatWarning: true,
  };
}

export async function POST(request: Request) {
  let project: Project | undefined;
  let targetRole = "产品经理";

  try {
    const body = (await request.json()) as {
      project?: Project;
      targetRole?: string;
      ruleAnalysis?: unknown;
    };
    project = body.project;
    targetRole = body.targetRole ?? targetRole;

    if (!project) {
      return NextResponse.json({ error: "Missing project" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(optimizeResume(project, targetRole));
    }

    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: buildPrompt(project, targetRole, body.ruleAnalysis),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content?.trim()) {
      return NextResponse.json(
        { error: "本次没有生成有效内容" },
        { status: 502 },
      );
    }

    const parsed = normalizeAIContent(content);
    return NextResponse.json(normalizeAIResult(parsed, project, targetRole));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
