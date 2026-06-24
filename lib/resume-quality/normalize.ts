import {
  RESUME_QUALITY_DIMENSIONS,
  type ResumeQualityComparison,
  type ResumeQualityDimensionKey,
  type ResumeQualityScore,
} from "../../types/resume-quality.ts";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Resume quality payload must be an object");
  }
  return value as Record<string, unknown>;
}

function normalizeText(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Dimension score must be a finite number");
  }
  return Math.min(20, Math.max(0, Math.round(value)));
}

function isDimensionKey(value: unknown): value is ResumeQualityDimensionKey {
  return RESUME_QUALITY_DIMENSIONS.some((dimension) => dimension.key === value);
}

export function normalizeResumeQualityScore(input: unknown): ResumeQualityScore {
  const record = asRecord(input);
  if (!Array.isArray(record.dimensions) || record.dimensions.length !== RESUME_QUALITY_DIMENSIONS.length) {
    throw new Error("Resume quality score must contain exactly five dimensions");
  }

  const seen = new Set<ResumeQualityDimensionKey>();
  const inputByKey = new Map<ResumeQualityDimensionKey, Record<string, unknown>>();

  for (const item of record.dimensions) {
    const dimension = asRecord(item);
    if (!isDimensionKey(dimension.key)) {
      throw new Error("Resume quality score contains an unknown dimension");
    }
    if (seen.has(dimension.key)) {
      throw new Error("Resume quality score must contain unique dimensions");
    }
    seen.add(dimension.key);
    inputByKey.set(dimension.key, dimension);
  }

  const dimensions = RESUME_QUALITY_DIMENSIONS.map(({ key, name }) => {
    const dimension = inputByKey.get(key);
    if (!dimension) {
      throw new Error("Resume quality score must contain exactly five dimensions");
    }
    return {
      key,
      name,
      score: normalizeScore(dimension.score),
      reason: normalizeText(dimension.reason, `${name} reason`),
    };
  });

  return {
    total: dimensions.reduce((total, dimension) => total + dimension.score, 0),
    dimensions,
    summary: normalizeText(record.summary, "Score summary"),
  };
}

export function buildResumeQualityComparison(
  before: ResumeQualityScore,
  after: ResumeQualityScore,
  input: unknown,
): ResumeQualityComparison {
  const record = asRecord(input);
  if (!Array.isArray(record.dimensionReasons)) {
    throw new Error("Comparison must contain dimension reasons");
  }

  const reasons = new Map<ResumeQualityDimensionKey, string>();
  for (const item of record.dimensionReasons) {
    const reason = asRecord(item);
    if (!isDimensionKey(reason.key) || reasons.has(reason.key)) {
      throw new Error("Comparison dimension reasons must contain unique dimensions");
    }
    reasons.set(reason.key, normalizeText(reason.reason, "Comparison reason"));
  }

  if (reasons.size !== RESUME_QUALITY_DIMENSIONS.length) {
    throw new Error("Comparison must contain exactly five dimension reasons");
  }

  const beforeByKey = new Map(before.dimensions.map((dimension) => [dimension.key, dimension]));
  const afterByKey = new Map(after.dimensions.map((dimension) => [dimension.key, dimension]));
  const dimensionChanges = RESUME_QUALITY_DIMENSIONS.map(({ key, name }) => {
    const beforeDimension = beforeByKey.get(key);
    const afterDimension = afterByKey.get(key);
    if (!beforeDimension || !afterDimension) {
      throw new Error("Before and after scores must use the same rubric");
    }
    return {
      key,
      name,
      before: beforeDimension.score,
      after: afterDimension.score,
      change: afterDimension.score - beforeDimension.score,
      reason: reasons.get(key) ?? "",
    };
  });

  const highlights = Array.isArray(record.highlights)
    ? record.highlights
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim())
      .slice(0, 3)
    : [];

  return {
    improvement: after.total - before.total,
    dimensionChanges,
    highlights,
    summary: normalizeText(record.summary, "Comparison summary"),
  };
}
