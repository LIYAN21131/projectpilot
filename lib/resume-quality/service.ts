import type { ResumeProjectFields } from "../../types/project.ts";
import type {
  ResumeQualityRequest,
  ResumeQualityResponse,
} from "../../types/resume-quality.ts";
import {
  buildResumeQualityComparison,
  normalizeResumeQualityScore,
} from "./normalize.ts";

const FIELD_KEYS: Array<keyof ResumeProjectFields> = [
  "projectName",
  "background",
  "painPoint",
  "responsibility",
  "actions",
  "result",
  "metrics",
  "tools",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Scoring request must be an object");
  }
  return value as Record<string, unknown>;
}

function normalizeFields(value: unknown): ResumeProjectFields {
  const record = asRecord(value);
  const fields = Object.fromEntries(
    FIELD_KEYS.map((key) => [key, typeof record[key] === "string" ? record[key].trim() : ""]),
  ) as ResumeProjectFields;

  if (!Object.values(fields).some(Boolean)) {
    throw new Error("Resume fields must contain usable content");
  }
  return fields;
}

export function normalizeScoringRequest(input: unknown): ResumeQualityRequest {
  const record = asRecord(input);
  const targetRole = typeof record.targetRole === "string" ? record.targetRole.trim() : "";
  if (!targetRole) {
    throw new Error("Target role is required");
  }

  const fields = normalizeFields(record.fields);
  if (record.mode === "before") {
    return { mode: "before", fields, targetRole };
  }

  if (record.mode === "after") {
    const optimizedBullets = Array.isArray(record.optimizedBullets)
      ? record.optimizedBullets
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .map((item) => item.trim())
      : [];
    if (!optimizedBullets.length) {
      throw new Error("After scoring requires optimized bullets");
    }
    return {
      mode: "after",
      fields,
      optimizedBullets,
      before: normalizeResumeQualityScore(record.before),
      targetRole,
    };
  }

  throw new Error("Scoring mode must be before or after");
}

export function normalizeScoringResponse(
  request: ResumeQualityRequest,
  input: unknown,
): ResumeQualityResponse {
  const record = asRecord(input);
  const score = normalizeResumeQualityScore(record);

  if (request.mode === "before") {
    return { mode: "before", score };
  }

  return {
    mode: "after",
    score,
    comparison: buildResumeQualityComparison(
      request.before,
      score,
      asRecord(record.comparison),
    ),
  };
}
