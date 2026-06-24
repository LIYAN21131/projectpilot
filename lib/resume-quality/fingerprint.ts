import type { ResumeProjectFields } from "../../types/project.ts";

const RUBRIC_VERSION = 1;
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

function normalizedFields(fields: ResumeProjectFields) {
  return FIELD_KEYS.map((key) => [key, fields[key].trim()]);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createFingerprint(payload: unknown) {
  return `rq-v${RUBRIC_VERSION}-${hashString(JSON.stringify(payload))}`;
}

export function createBeforeResumeQualityFingerprint(
  fields: ResumeProjectFields,
  targetRole: string,
) {
  return createFingerprint({
    stage: "before",
    rubricVersion: RUBRIC_VERSION,
    targetRole: targetRole.trim(),
    fields: normalizedFields(fields),
  });
}

export function createComparisonResumeQualityFingerprint(
  fields: ResumeProjectFields,
  optimizedBullets: string[],
  targetRole: string,
) {
  return createFingerprint({
    stage: "comparison",
    rubricVersion: RUBRIC_VERSION,
    targetRole: targetRole.trim(),
    fields: normalizedFields(fields),
    optimizedBullets: optimizedBullets.map((bullet) => bullet.trim()).filter(Boolean),
  });
}
