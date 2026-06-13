import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateInterviewQuestions } from "@/lib/ai/generateInterviewQuestions";
import type { InterviewQuestion, InterviewQuestionType, StarAnswer } from "@/types/interview";
import type { Project } from "@/types/project";

const categories = [
  "项目背景题",
  "用户研究题",
  "产品设计题",
  "数据分析题",
  "复盘题",
  "挑战题",
] as const;

type InterviewCategory = (typeof categories)[number];

type AIInterviewQuestion = {
  category: InterviewCategory;
  type?: InterviewQuestionType;
  question: string;
  answerSuggestion?: Partial<StarAnswer>;
};

type AIInterviewResponse = {
  questions: AIInterviewQuestion[];
};

function buildPrompt(project: Project, targetRole: string | undefined, ruleAnalysis: unknown) {
  return `
你是中文实习求职面试准备助手。请基于用户项目经历，生成适合中文实习面试的项目面试题。

必须遵守：
1. 禁止虚构数据、经历、指标、公司、用户规模、业务结果。
2. 如果项目缺少数据，只能围绕“如何补充/如何衡量”提问，不能编造具体数值。
3. 输出必须是结构化 JSON，不要输出 Markdown，不要输出解释文字。
4. 题目要围绕项目经历，适合产品/运营/设计/数据/开发等实习岗位面试。
5. 必须覆盖 6 类题目，每类生成 1-2 个问题。
6. 生成“数据分析题”时优先引用项目内容里的 metrics 字段；如果 metrics 有内容，问题必须围绕真实指标追问，不要泛泛提问。
7. 数据分析题示例：“用户留存率41%，你如何评价？”、“简历优化：87次说明什么？”、“如何继续提升用户留存率？”。

目标岗位：${targetRole ?? "未指定"}

必须覆盖的分类：
${categories.map((category) => `- ${category}`).join("\n")}

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
  "questions": [
    {
      "category": "项目背景题",
      "type": "common",
      "question": "为什么做这个项目？",
      "answerSuggestion": {
        "situation": "...",
        "task": "...",
        "action": "...",
        "result": "..."
      }
    }
  ]
}
`;
}

function normalizeQuestions(result: AIInterviewResponse, project: Project): InterviewQuestion[] {
  const questions = Array.isArray(result.questions) ? result.questions : [];

  return questions
    .filter((item) => categories.includes(item.category))
    .filter((item) => typeof item.question === "string" && item.question.trim().length > 0)
    .map((item) => ({
      id: crypto.randomUUID(),
      projectId: project.id,
      category: item.category,
      type: item.type === "deep" ? "deep" : "common",
      question: item.question,
      answerSuggestion: {
        situation: item.answerSuggestion?.situation || "建议结合项目背景说明当时的业务场景和用户问题。",
        task: item.answerSuggestion?.task || "建议说明你在项目中的具体职责和需要达成的目标。",
        action: item.answerSuggestion?.action || "建议说明你如何拆解问题、设计方案并推动落地。",
        result: item.answerSuggestion?.result || "建议结合已有结果表达成果；缺少数据时说明可补充的衡量指标。",
      },
    }));
}

export async function POST(request: Request) {
  let project: Project | undefined;

  try {
    const body = (await request.json()) as {
      project?: Project;
      targetRole?: string;
      ruleAnalysis?: unknown;
    };
    project = body.project;

    if (!project) {
      return NextResponse.json({ error: "Missing project" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(generateInterviewQuestions(project));
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
          content: buildPrompt(project, body.targetRole, body.ruleAnalysis),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(generateInterviewQuestions(project));
    }

    const parsed = JSON.parse(content) as AIInterviewResponse;
    const normalized = normalizeQuestions(parsed, project);

    return NextResponse.json(
      normalized.length ? normalized : generateInterviewQuestions(project),
    );
  } catch {
    if (project) {
      return NextResponse.json(generateInterviewQuestions(project));
    }

    return NextResponse.json(
      {
        error: "Failed to generate interview questions",
      },
      { status: 500 },
    );
  }
}
