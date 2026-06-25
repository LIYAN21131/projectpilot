export const RESUME_QUALITY_DIMENSIONS = [
  { key: "completeness", name: "信息完整度" },
  { key: "impact", name: "成果表达力" },
  { key: "logic", name: "逻辑清晰度" },
  { key: "roleFit", name: "岗位匹配度" },
  { key: "professionalism", name: "表达专业度" },
] as const;

export type ResumeQualityDimensionKey =
  (typeof RESUME_QUALITY_DIMENSIONS)[number]["key"];

export type ResumeQualityDimensionScore = {
  key: ResumeQualityDimensionKey;
  name: string;
  score: number;
  reason: string;
};

export type ResumeQualityScore = {
  total: number;
  dimensions: ResumeQualityDimensionScore[];
  summary: string;
};

export type ResumeQualityDimensionChange = {
  key: ResumeQualityDimensionKey;
  name: string;
  before: number;
  after: number;
  change: number;
  reason: string;
};

export type ResumeQualityComparison = {
  improvement: number;
  dimensionChanges: ResumeQualityDimensionChange[];
  highlights: string[];
  summary: string;
};

export type ResumeQualityAssessmentV1 = {
  version: 1;
  rubricVersion: 1;
  targetRole: string;
  before?: ResumeQualityScore;
  after?: ResumeQualityScore;
  comparison?: ResumeQualityComparison;
  status: "current" | "stale";
  beforeFingerprint?: string;
  sourceFingerprint: string;
  createdAt: string;
  updatedAt: string;
};

export const RESUME_CONTENT_DIMENSIONS = [
  { key: "completeness", name: "信息完整度" },
  { key: "evidence", name: "成果证据" },
] as const;

export const RESUME_EXPRESSION_DIMENSIONS = [
  { key: "logic", name: "逻辑清晰度" },
  { key: "roleFit", name: "岗位匹配度" },
  { key: "professionalism", name: "表达专业度" },
] as const;

export type ResumeContentDimensionKey =
  (typeof RESUME_CONTENT_DIMENSIONS)[number]["key"];

export type ResumeExpressionDimensionKey =
  (typeof RESUME_EXPRESSION_DIMENSIONS)[number]["key"];

export type ResumeDimensionScore<Key extends string> = {
  key: Key;
  name: string;
  score: number;
  reason: string;
};

export type ResumeContentScore = {
  total: number;
  dimensions: ResumeDimensionScore<ResumeContentDimensionKey>[];
  summary: string;
};

export type ResumeExpressionScore = {
  total: number;
  dimensions: ResumeDimensionScore<ResumeExpressionDimensionKey>[];
  summary: string;
};

export type ResumeExpressionChange = {
  key: ResumeExpressionDimensionKey;
  name: string;
  before: number;
  after: number;
  change: number;
  reason: string;
};

export type ResumeQualityAssessmentV2 = {
  version: 2;
  rubricVersion: 2;
  targetRole: string;
  outcome: "optimized" | "needs-information" | "no-improvement";
  content: ResumeContentScore;
  originalExpression: ResumeExpressionScore;
  optimizedExpression?: ResumeExpressionScore;
  originalTotal: number;
  optimizedTotal?: number;
  expressionChanges: ResumeExpressionChange[];
  highlights: string[];
  suggestions: string[];
  rejectionCounts: Partial<
    Record<
      import("./resume-optimization").ResumeCandidateRejectionReason,
      number
    >
  >;
  status: "current" | "stale";
  sourceFingerprint: string;
  createdAt: string;
  updatedAt: string;
};

export type ResumeQualityAssessment =
  | ResumeQualityAssessmentV1
  | ResumeQualityAssessmentV2;

export function isResumeQualityAssessmentV2(
  value: ResumeQualityAssessment | undefined,
): value is ResumeQualityAssessmentV2 {
  return value?.version === 2;
}

export type ResumeQualityRequest =
  | {
      mode: "before";
      fields: import("./project").ResumeProjectFields;
      targetRole: string;
    }
  | {
      mode: "after";
      fields: import("./project").ResumeProjectFields;
      optimizedBullets: string[];
      before: ResumeQualityScore;
      targetRole: string;
    };

export type ResumeQualityResponse =
  | {
      mode: "before";
      score: ResumeQualityScore;
    }
  | {
      mode: "after";
      score: ResumeQualityScore;
      comparison: ResumeQualityComparison;
    };
