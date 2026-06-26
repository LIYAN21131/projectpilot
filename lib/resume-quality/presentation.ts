import type { ResumeQualityAssessmentV2 } from "../../types/resume-quality.ts";

export function formatResumeQualityChange(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

export function describeResumeOptimizationOutcome(
  outcome: ResumeQualityAssessmentV2["outcome"],
) {
  if (outcome === "optimized") return "已通过质量门槛";
  if (outcome === "needs-information") return "建议补充信息后重试";
  return "当前版本暂不建议替换";
}
