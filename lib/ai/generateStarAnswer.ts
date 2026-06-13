import type { StarAnswer } from "@/types/interview";
import type { Project } from "@/types/project";

function buildInterviewAnswer(project: Project) {
  const resultExpression = project.metrics
    ? `项目落地后，产出是${project.results || "完成了阶段性交付"}，如果面试官继续追问效果，我会结合${project.metrics}说明，但会把数字放回用户问题和方案验证里解释。`
    : `项目落地后，产出是${project.results || "完成了阶段性交付"}。原始资料里没有真实数据，所以我不会临时包装留存率、转化率或者提升比例，而是会坦诚说明交付结果和后续验证思路。`;
  const reviewExpression = project.review
    ? `这个项目给我最大的收获是${project.review}。同时我也意识到，面试里讲项目不能只讲做了哪些功能，更要讲清楚自己为什么这样判断、为什么这样取舍，以及结果是怎么被验证的。`
    : "这个项目给我最大的收获是，产品经理不能只讲自己做了什么，更要把问题判断、方案取舍、推进动作和结果验证连起来。另一个收获是，越具体的功能设计，越需要回到用户场景里解释它为什么值得做。";

  return [
    `这个项目其实来源于${project.background || "我在梳理现有流程时看到的一些体验阻塞"}。当时我发现${project.targetUsers || "目标用户"}并不是没有需求，而是卡在${project.painPoints || "流程不够顺、信息组织不够清楚"}，这会影响他们完成关键任务，所以我判断它不是顺手优化的小问题，而是值得单独解决的产品问题。`,
    `在确定方案时，我没有一上来就堆功能，而是先看核心阻塞点，再选择${project.solution || "从核心流程和关键触点切入，先做一个能验证判断的方案"}。这样能更直接回应用户痛点，也能避免一次性改动过大，导致投入很重但验证不清楚。`,
    `在这个项目里，我主要负责${project.responsibilities || "问题拆解、产品方案设计和推进落地"}。推进过程中，我会先把用户场景、方案边界和协作节奏梳理清楚，再和相关同学对齐优先级，保证方案能真正落到可交付的结果上。`,
    resultExpression,
    reviewExpression,
  ].join("");
}

export function generateStarAnswer(project: Project, question: string): StarAnswer {
  const answer = {
    situation: `项目背景是${project.background || "用户在现有流程中存在效率或体验问题"}，目标用户为${project.targetUsers || "核心目标用户"}，需要解决${project.painPoints || "明确的业务或体验痛点"}。`,
    task: `我的任务是${project.responsibilities || "完成需求拆解、方案设计和项目推进"}，并在面试中回应“${question}”这个核心追问。`,
    action: `我先梳理用户场景和约束，再推动${project.solution || "可验证的产品方案"}，通过调研、原型、沟通和复盘持续收敛方案。`,
    result: `项目最终产出为${project.results || "可展示的项目成果"}，关键指标是${project.metrics || "建议补充转化率、留存率、使用人数、完成率等量化结果"}。`,
  };

  return {
    ...answer,
    interviewAnswer: buildInterviewAnswer(project),
  };
}
