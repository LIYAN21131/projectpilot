import type { ResumeProjectFields } from "./project";
import type {
  ResumeContentScore,
  ResumeExpressionScore,
  ResumeQualityAssessmentV2NeedsInformation,
  ResumeQualityAssessmentV2NoImprovement,
  ResumeQualityAssessmentV2Optimized,
} from "./resume-quality";

export type { ResumeCandidateRejectionReason } from "./resume-quality";

export type ResumeFactSource =
  | "projectName"
  | "background"
  | "painPoint"
  | "responsibility"
  | "actions"
  | "result"
  | "metrics"
  | "tools";

export type ResumeFact = {
  id: string;
  source: ResumeFactSource;
  text: string;
  core: boolean;
};

export type ResumeCandidateStyle =
  | "structure"
  | "role-fit"
  | "outcome-focused";

export type ResumeCandidate = {
  style: ResumeCandidateStyle;
  bullets: string[];
};

export type ResumeCandidateGeneration = {
  candidates: ResumeCandidate[];
};

export type ResumeCandidateEvaluation = {
  style: ResumeCandidateStyle;
  expression: ResumeExpressionScore;
  introducedFacts: string[];
  missingCoreFactIds: string[];
  summary: string;
};

export type ResumeUnifiedEvaluation = {
  content: ResumeContentScore;
  originalExpression: ResumeExpressionScore;
  candidates: ResumeCandidateEvaluation[];
  contentGaps: string[];
};

export type ResumeOptimizationRequest = {
  fields: ResumeProjectFields;
  targetRole: string;
};

export type ResumeOptimizationResponse =
  | {
      status: "optimized";
      bullets: string[];
      assessment: ResumeQualityAssessmentV2Optimized;
    }
  | {
      status: "needs-information";
      assessment: ResumeQualityAssessmentV2NeedsInformation;
    }
  | {
      status: "no-improvement";
      assessment: ResumeQualityAssessmentV2NoImprovement;
    };
