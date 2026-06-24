import type { ResumeQualityAssessment } from "../../types/resume-quality.ts";

export function markResumeQualityAssessmentStale(
  assessment: ResumeQualityAssessment | undefined,
  expectedFingerprint: string,
) {
  if (!assessment) {
    return assessment;
  }
  if (assessment.sourceFingerprint === expectedFingerprint) {
    return assessment.status === "current"
      ? assessment
      : { ...assessment, status: "current" as const };
  }
  if (assessment.status === "stale") {
    return assessment;
  }
  return {
    ...assessment,
    status: "stale" as const,
  };
}
