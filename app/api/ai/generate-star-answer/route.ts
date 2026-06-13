import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateStarAnswer } from "@/lib/ai/generateStarAnswer";
import type { StarAnswer } from "@/types/interview";
import type { Project } from "@/types/project";

function buildPrompt(project: Project, targetRole: string | undefined, question: string, retry = false) {
  return `
你是一名资深产品经理面试辅导专家。请根据项目内容，帮助候选人生成面对面试官时可以直接说出口的产品经理面试回答。

回答对象：面试官。
回答场景：候选人正在参加产品经理面试。

必须遵守：
1. 禁止虚构用户没有提供的数据、经历、指标、公司、用户规模、业务结果。
2. 如果缺少数据，只能提示用户补充，不能编造具体数值。
3. 输出必须是结构化 JSON，不要输出 Markdown，不要输出解释文字。
4. 输出结构必须只包含 situation、task、action、result、interviewAnswer 五个字段。
5. situation、task、action、result 保留为结构化拆解，用于学习回答逻辑。
6. 生成 interviewAnswer 时只能参考“项目内容”里的原始字段，不允许参考、复述或改写 situation、task、action、result。
7. interviewAnswer 是主输出，必须像候选人真实面对产品经理面试官回答，而不是项目介绍、报告、总结、PRD 或 AI 生成内容。
8. interviewAnswer 必须使用第一人称，自然口语化，输出一个完整连续段落。
9. interviewAnswer 建议从“这个项目其实来源于...”“当时我发现...”“所以我决定...”这类自然表达开始。
10. interviewAnswer 不要使用标题、列表、数字编号，不要出现“1、2、3、4”、“1.”、“2.”、“3.”、“4.”、“一是”、“二是”、“三是”。如果原始内容里有列表，请改写成自然口语化的连续表达。
11. interviewAnswer 不要出现 STAR、Situation、Task、Action、Result、Task:、Action:、Result:。
12. interviewAnswer 不要出现“首先”、“其次”、“最后”。
13. interviewAnswer 不要出现“我的职责是：”、“需要解决：”、“项目背景是：”、“我负责：”。
14. interviewAnswer 必须形成一个完整故事，并遵循同一条隐含逻辑：为什么发现问题 → 为什么值得做 → 方案如何确定 → 自己做了什么 → 结果如何 → 复盘收获。
15. interviewAnswer 要重点体现我为什么发现这个问题、为什么认为这个问题值得解决、为什么选择当前方案、方案中做了哪些取舍、我具体负责了什么、项目最终产生了什么结果、我从项目中复盘出了什么。
16. interviewAnswer 不要输出项目汇报、PRD 或 STAR 拆解。
17. interviewAnswer 控制在 300~500 字，不要低于 300 字，也不要长篇大论。
18. 如果项目原文没有数字，interviewAnswer 和 STAR 字段都不能编造留存率、转化率、优化次数、用户数量、提升百分比等数字指标。
19. 如果项目中存在真实指标，可以自然引用，但不要机械堆数字。
20. interviewAnswer 必须用完整结尾收束，结尾包含“这个项目给我最大的收获是”，并且结尾至少包含两句话。
${retry ? "\n这次是重新生成。上一版不符合要求。请特别注意：interviewAnswer 不能出现任何编号、列表、一是、二是、三是、首先、其次、最后、Situation、Task、Action、Result，也不能像任务清单。请把职责、痛点、方案都改写成自然语言，不要用冒号引出清单。" : ""}

目标岗位：${targetRole ?? "未指定"}
面试问题：${question}

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
  "situation": "...",
  "task": "...",
  "action": "...",
  "result": "...",
  "interviewAnswer": "..."
}
`;
}

async function requestStarAnswer(
  deepseek: OpenAI,
  project: Project,
  targetRole: string | undefined,
  question: string,
  retry = false,
) {
  const completion = await deepseek.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "user",
        content: buildPrompt(project, targetRole, question, retry),
      },
    ],
    response_format: { type: "json_object" },
    temperature: retry ? 0.2 : 0.3,
  });

  return completion.choices[0]?.message?.content;
}

function normalizeStarAnswer(result: Partial<StarAnswer>, project: Project, question: string): StarAnswer {
  const fallback = generateStarAnswer(project, question);

  return {
    situation: result.situation || fallback.situation,
    task: result.task || fallback.task,
    action: result.action || fallback.action,
    result: result.result || fallback.result,
    interviewAnswer: result.interviewAnswer || fallback.interviewAnswer,
  };
}

function logAnswerLength(answer: StarAnswer) {
  console.log("answer length", answer.interviewAnswer?.length ?? 0);
}

function hasUnsupportedNumbers(answer: StarAnswer, project: Project) {
  const sourceText = [
    project.name,
    project.background,
    project.targetUsers,
    project.painPoints,
    project.solution,
    project.responsibilities,
    project.results,
    project.metrics,
    project.review,
  ].join(" ");
  const answerText = [
    answer.situation,
    answer.task,
    answer.action,
    answer.result,
    answer.interviewAnswer,
  ].join(" ");
  const numbers = answerText.match(/\d+(?:\.\d+)?%?/g) ?? [];

  return numbers.some((value) => !sourceText.includes(value));
}

function hasForbiddenInterviewAnswerFormat(answer: StarAnswer) {
  const text = answer.interviewAnswer ?? "";

  return [
    /(^|[\s\n\r])[1-4][\.\、．]/,
    /一是|二是|三是/,
    /首先|其次|最后/,
    /STAR|Situation|Task|Action|Result|Task:|Action:|Result:/i,
    /我的职责是[:：]|需要解决[:：]|项目背景是[:：]|我负责[:：]/,
    /[\n\r]\s*[-*]/,
  ].some((pattern) => pattern.test(text));
}

function isInvalidAnswer(answer: StarAnswer, project: Project) {
  const answerLength = answer.interviewAnswer?.length ?? 0;

  return (
    answerLength < 300 ||
    answerLength > 500 ||
    hasUnsupportedNumbers(answer, project) ||
    hasForbiddenInterviewAnswerFormat(answer)
  );
}

export async function POST(request: Request) {
  let project: Project | undefined;
  let question = "";

  try {
    const body = (await request.json()) as {
      project?: Project;
      question?: string;
      targetRole?: string;
      ruleAnalysis?: unknown;
    };
    project = body.project;
    question = body.question ?? "";
    void body.ruleAnalysis;

    if (!project) {
      return NextResponse.json({ error: "Missing project" }, { status: 400 });
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      console.log("answer source:", "fallback");
      const fallback = generateStarAnswer(project, question);
      logAnswerLength(fallback);
      return NextResponse.json(fallback);
    }

    const deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });

    let content = await requestStarAnswer(deepseek, project, body.targetRole, question);
    if (!content) {
      console.log("answer source:", "fallback");
      const fallback = generateStarAnswer(project, question);
      logAnswerLength(fallback);
      return NextResponse.json(fallback);
    }

    let parsed = JSON.parse(content) as Partial<StarAnswer>;
    let answer = normalizeStarAnswer(parsed, project, question);

    if (isInvalidAnswer(answer, project)) {
      content = await requestStarAnswer(deepseek, project, body.targetRole, question, true);

      if (content) {
        parsed = JSON.parse(content) as Partial<StarAnswer>;
        answer = normalizeStarAnswer(parsed, project, question);
      }
    }

    if (isInvalidAnswer(answer, project)) {
      console.log("answer source:", "fallback");
      const fallback = generateStarAnswer(project, question);
      logAnswerLength(fallback);
      return NextResponse.json(fallback);
    }

    console.log("answer source:", "deepseek");
    logAnswerLength(answer);
    return NextResponse.json(answer);
  } catch {
    if (project) {
      console.log("answer source:", "fallback");
      const fallback = generateStarAnswer(project, question);
      logAnswerLength(fallback);
      return NextResponse.json(fallback);
    }

    return NextResponse.json(
      {
        error: "Failed to generate STAR answer",
      },
      { status: 500 },
    );
  }
}
