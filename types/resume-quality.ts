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

export type ResumeQualityAssessment = {
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
