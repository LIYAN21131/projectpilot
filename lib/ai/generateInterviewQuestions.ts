import type { InterviewQuestion, InterviewQuestionType } from "@/types/interview";
import type { Project } from "@/types/project";
import { generateStarAnswer } from "./generateStarAnswer";

type QuestionSeed = {
  category: string;
  type: InterviewQuestionType;
  question: string;
};

function parseMetricLines(metrics: string) {
  return metrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== "未识别到内容");
}

function buildMetricQuestions(project: Project) {
  const metrics = parseMetricLines(project.metrics);

  if (!metrics.length) {
    return [
      { category: "数据分析题", type: "common" as const, question: "你如何衡量这个项目是否成功？" },
    ];
  }

  const [primaryMetric, secondaryMetric] = metrics;
  const questions: QuestionSeed[] = [
    { category: "数据分析题", type: "common" as const, question: `${primaryMetric}，你如何评价这个结果？` },
  ];

  if (secondaryMetric) {
    questions.push({
      category: "数据分析题",
      type: "deep" as const,
      question: `${secondaryMetric}说明了什么？后续你会如何继续提升？`,
    });
  }

  return questions;
}

export function generateInterviewQuestions(project: Project): InterviewQuestion[] {
  const questions = [
    { category: "项目背景题", type: "common" as const, question: "为什么做这个项目？" },
    { category: "用户研究题", type: "deep" as const, question: "你如何验证用户需求是真实存在的？" },
    { category: "产品设计题", type: "deep" as const, question: "为什么采用这样的产品方案和流程设计？" },
    ...buildMetricQuestions(project),
    { category: "复盘题", type: "common" as const, question: "如果重做一次，你会怎么调整？" },
    { category: "挑战题", type: "deep" as const, question: "为什么用户不用竞品，而要使用你的方案？" },
  ];

  return questions.map((item) => ({
    id: crypto.randomUUID(),
    projectId: project.id,
    ...item,
    answerSuggestion: generateStarAnswer(project, item.question),
  }));
}
