import type { ResumeProjectFields } from "../../types/project.ts";

const RUBRIC_VERSION = 2;
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

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createResumeOptimizationFingerprint(
  fields: ResumeProjectFields,
  targetRole: string,
  winnerBullets: string[],
) {
  const payload = {
    rubricVersion: RUBRIC_VERSION,
    fields: FIELD_KEYS.map((key) => [key, fields[key].trim()]),
    targetRole: targetRole.trim(),
    winnerBullets: winnerBullets.map((bullet) => bullet.trim()).filter(Boolean),
  };
  return `ro-v${RUBRIC_VERSION}-${hashString(JSON.stringify(payload))}`;
}
