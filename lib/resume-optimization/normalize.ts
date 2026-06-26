import type {
  ResumeCandidate,
  ResumeCandidateEvaluation,
  ResumeCandidateGeneration,
  ResumeCandidateStyle,
  ResumeUnifiedEvaluation,
} from "../../types/resume-optimization.ts";
import {
  RESUME_CONTENT_DIMENSIONS,
  RESUME_EXPRESSION_DIMENSIONS,
  type ResumeContentDimensionKey,
  type ResumeContentScore,
  type ResumeDimensionScore,
  type ResumeExpressionDimensionKey,
  type ResumeExpressionScore,
} from "../../types/resume-quality.ts";

const CANDIDATE_STYLES: ResumeCandidateStyle[] = [
  "structure",
  "role-fit",
  "outcome-focused",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function requireArray(value: unknown, label: string) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} must be an array`);
  }
  return value;
}

function requireNonEmptyText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    if (/summary/i.test(label)) {
      throw new TypeError(`${label} requires a non-empty summary`);
    }
    if (/reason/i.test(label)) {
      throw new TypeError(`${label} requires a non-empty reason`);
    }
    throw new TypeError(`${label} must be non-empty`);
  }
  return value.trim();
}

function normalizeStringList(value: unknown, label: string, max?: number) {
  const items = requireArray(value, label).map((item) => {
    if (typeof item !== "string") {
      throw new TypeError(`${label} must contain strings`);
    }
    return item.trim();
  });
  const normalized = [...new Set(items.filter(Boolean))];
  return max === undefined ? normalized : normalized.slice(0, max);
}

function normalizeScore(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return Math.min(20, Math.max(0, Math.round(value)));
}

function normalizeStyle(value: unknown): ResumeCandidateStyle {
  if (
    typeof value !== "string" ||
    !CANDIDATE_STYLES.includes(value as ResumeCandidateStyle)
  ) {
    throw new TypeError("Candidates must use known candidate styles");
  }
  return value as ResumeCandidateStyle;
}

function normalizeBullets(value: unknown) {
  const bullets = requireArray(value, "Candidate bullets")
    .map((item) => {
      if (typeof item !== "string") {
        throw new TypeError("Candidate bullets must contain strings");
      }
      return item
        .trim()
        .replace(/^(?:[-*•▪◦‣⁃]|\d+[.)、])\s*/, "")
        .trim();
    })
    .filter(Boolean);

  if (bullets.length < 1 || bullets.length > 5) {
    throw new TypeError("Candidate must contain one to five non-empty bullets");
  }
  return bullets;
}

export function normalizeCandidateGeneration(
  value: unknown,
): ResumeCandidateGeneration {
  const record = requireRecord(value, "Candidate generation");
  const candidates = requireArray(
    record.candidates,
    "Candidate generation candidates",
  );
  if (candidates.length !== 3) {
    throw new TypeError("Candidate generation must contain exactly three candidates");
  }

  const normalized = candidates.map((candidate): ResumeCandidate => {
    const item = requireRecord(candidate, "Candidate");
    return {
      style: normalizeStyle(item.style),
      bullets: normalizeBullets(item.bullets),
    };
  });

  if (new Set(normalized.map(({ style }) => style)).size !== 3) {
    throw new TypeError("Candidate generation must use unique candidate styles");
  }

  const byStyle = new Map(normalized.map((candidate) => [candidate.style, candidate]));
  return {
    candidates: CANDIDATE_STYLES.map((style) => byStyle.get(style)!),
  };
}

function normalizeDimensions<Key extends string>(
  value: unknown,
  definitions: readonly { key: Key; name: string }[],
  label: "content" | "expression",
): ResumeDimensionScore<Key>[] {
  const dimensions = requireArray(value, `${label} dimensions`);
  if (dimensions.length !== definitions.length) {
    throw new TypeError(
      `${label === "content" ? "Exactly two content dimensions" : "Exactly three expression dimensions"} are required`,
    );
  }

  const allowedKeys = new Set(definitions.map(({ key }) => key));
  const normalized = dimensions.map((dimension) => {
    const item = requireRecord(dimension, `${label} dimension`);
    if (typeof item.key !== "string" || !allowedKeys.has(item.key as Key)) {
      throw new TypeError(`${label} dimensions must use known keys`);
    }
    return {
      key: item.key as Key,
      score: normalizeScore(item.score, `${label} dimension score`),
      reason: requireNonEmptyText(item.reason, `${label} dimension reason`),
    };
  });

  if (new Set(normalized.map(({ key }) => key)).size !== definitions.length) {
    throw new TypeError(
      `${label === "content" ? "Content" : "Expression"} score must use unique ${label} dimensions`,
    );
  }

  const byKey = new Map(normalized.map((dimension) => [dimension.key, dimension]));
  return definitions.map(({ key, name }) => ({
    ...byKey.get(key)!,
    name,
  }));
}

function normalizeContentScore(value: unknown): ResumeContentScore {
  const record = requireRecord(value, "Content score");
  const dimensions = normalizeDimensions<ResumeContentDimensionKey>(
    record.dimensions,
    RESUME_CONTENT_DIMENSIONS,
    "content",
  );
  return {
    total: dimensions.reduce((sum, dimension) => sum + dimension.score, 0),
    dimensions,
    summary: requireNonEmptyText(record.summary, "Content score summary"),
  };
}

function normalizeExpressionScore(value: unknown): ResumeExpressionScore {
  const record = requireRecord(value, "Expression score");
  const dimensions = normalizeDimensions<ResumeExpressionDimensionKey>(
    record.dimensions,
    RESUME_EXPRESSION_DIMENSIONS,
    "expression",
  );
  return {
    total: dimensions.reduce((sum, dimension) => sum + dimension.score, 0),
    dimensions,
    summary: requireNonEmptyText(record.summary, "Expression score summary"),
  };
}

function normalizeCandidateEvaluation(value: unknown): ResumeCandidateEvaluation {
  const record = requireRecord(value, "Candidate evaluation");
  return {
    style: normalizeStyle(record.style),
    expression: normalizeExpressionScore(record.expression),
    introducedFacts: normalizeStringList(
      record.introducedFacts,
      "Introduced facts",
    ),
    missingCoreFactIds: normalizeStringList(
      record.missingCoreFactIds,
      "Missing core fact IDs",
    ),
    summary: requireNonEmptyText(record.summary, "Candidate evaluation summary"),
  };
}

export function normalizeUnifiedEvaluation(
  value: unknown,
): ResumeUnifiedEvaluation {
  const record = requireRecord(value, "Unified evaluation");
  const candidates = requireArray(
    record.candidates,
    "Candidate evaluations",
  );
  if (candidates.length !== 3) {
    throw new TypeError(
      "Unified evaluation must contain exactly three candidate evaluations",
    );
  }

  const normalizedCandidates = candidates.map(normalizeCandidateEvaluation);
  if (new Set(normalizedCandidates.map(({ style }) => style)).size !== 3) {
    throw new TypeError("Unified evaluation must use unique candidate styles");
  }
  const byStyle = new Map(
    normalizedCandidates.map((candidate) => [candidate.style, candidate]),
  );

  return {
    content: normalizeContentScore(record.content),
    originalExpression: normalizeExpressionScore(record.originalExpression),
    candidates: CANDIDATE_STYLES.map((style) => byStyle.get(style)!),
    contentGaps: normalizeStringList(record.contentGaps, "Content gaps", 3),
  };
}
