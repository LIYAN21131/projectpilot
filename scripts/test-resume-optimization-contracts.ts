import type { ResumeOptimizationResponse } from "../types/resume-optimization";
import type {
  ResumeQualityAssessmentV2NeedsInformation,
  ResumeQualityAssessmentV2NoImprovement,
  ResumeQualityAssessmentV2Optimized,
} from "../types/resume-quality";

declare const response: ResumeOptimizationResponse;

if (response.status === "optimized") {
  const assessment: ResumeQualityAssessmentV2Optimized = response.assessment;
  const outcome: "optimized" = assessment.outcome;
  const optimizedTotal: number = assessment.optimizedTotal;
  void outcome;
  void optimizedTotal;
} else if (response.status === "needs-information") {
  const assessment: ResumeQualityAssessmentV2NeedsInformation =
    response.assessment;
  const outcome: "needs-information" = assessment.outcome;
  const optimizedExpression: undefined = assessment.optimizedExpression;
  void outcome;
  void optimizedExpression;
} else {
  const assessment: ResumeQualityAssessmentV2NoImprovement =
    response.assessment;
  const outcome: "no-improvement" = assessment.outcome;
  const optimizedTotal: undefined = assessment.optimizedTotal;
  void outcome;
  void optimizedTotal;
}
