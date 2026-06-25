import type { ResumeProjectFields } from "../../types/project.ts";
import type { ResumeOptimizationRequest } from "../../types/resume-optimization.ts";

const FIELD_KEYS = [
  "projectName",
  "background",
  "painPoint",
  "responsibility",
  "actions",
  "result",
  "metrics",
  "tools",
] as const satisfies readonly (keyof ResumeProjectFields)[];

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeResumeOptimizationRequest(
  value: unknown,
): ResumeOptimizationRequest {
  const request =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const rawFields =
    typeof request.fields === "object" && request.fields !== null
      ? (request.fields as Record<string, unknown>)
      : {};

  const fields = Object.fromEntries(
    FIELD_KEYS.map((key) => [key, toTrimmedString(rawFields[key])]),
  ) as ResumeProjectFields;
  const targetRole = toTrimmedString(request.targetRole);

  if (!targetRole) {
    throw new Error("Target role is required.");
  }
  if (!FIELD_KEYS.some((key) => fields[key])) {
    throw new Error("At least one resume field is required.");
  }

  return { fields, targetRole };
}
