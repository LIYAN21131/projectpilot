import type { Project } from "@/types/project";

export function analyzeProject(project: Project) {
  const strengths = [
    project.metrics ? "已有量化指标，可直接转化为简历成果表达。" : "建议补充更明确的量化指标。",
    project.responsibilities ? "职责描述可进一步拆成任务、行动和结果。" : "需要补充你在项目中的具体职责。",
    project.painPoints ? "用户痛点明确，适合在面试中展开业务判断。" : "建议补充目标用户的核心痛点。",
  ];

  return {
    summary: `${project.name || "该项目"}具备产品岗位项目表达基础，适合围绕用户问题、方案设计和结果指标进行提炼。`,
    strengths,
  };
}
