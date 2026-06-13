import type { Project } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";
import { analyzeProject } from "./analyzeProject";

export function optimizeResume(
  project: Project,
  targetRole: string,
): ResumeOptimizationResult {
  const analysis = analyzeProject(project);
  const name = project.name || "项目经历";
  const missingMetrics =
    project.metrics.trim().length === 0
      ? "当前项目缺少数据指标，建议补充转化率、留存率、使用人数、完成率等指标。"
      : `已有指标：${project.metrics}`;

  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    targetRole,
    suggestions: [
      `项目描述优化：将“${name}”压缩为清晰的业务场景，突出目标用户、关键痛点和产品方案。`,
      `项目成果优化：把“${project.results || "项目产出"}”改写为可被招聘方快速理解的结果表达，优先强调个人贡献。`,
      `数据指标建议：${missingMetrics}`,
      `岗位匹配建议：面向${targetRole}岗位，优势是${analysis.strengths[0]}；缺失能力可从业务判断、数据验证和跨团队推进中补充。`,
    ],
    optimizedContent: `【${name}】｜${targetRole}相关项目
- 面向${project.targetUsers || "目标用户"}，识别${project.painPoints || "核心痛点"}，明确项目目标与产品优化方向。
- 负责${project.responsibilities || "需求分析、方案设计与项目推进"}，将零散问题拆解为可落地的产品方案。
- 设计并推动${project.solution || "关键功能与流程优化方案"}，提升用户完成关键任务的效率和体验稳定性。
- 项目最终实现${project.results || "核心流程交付"}，${project.metrics || "建议补充转化率、留存率、使用人数、完成率等量化指标"}。`,
    createdAt: new Date().toISOString(),
  };
}
