import type { ResumeProjectFields } from "../../types/project.ts";
import type {
  ResumeOptimizationRequest,
  ResumeOptimizationResponse,
} from "../../types/resume-optimization.ts";
import { buildResumeFactList } from "./facts.ts";
import { selectResumeOptimization } from "./gate.ts";
import {
  normalizeCandidateGeneration,
  normalizeUnifiedEvaluation,
} from "./normalize.ts";
import {
  buildCandidateGenerationPrompt,
  buildUnifiedEvaluationPrompt,
} from "./prompt.ts";

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

export type JsonModelCaller = (input: {
  prompt: string;
  temperature: number;
}) => Promise<unknown>;

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

export async function executeResumeOptimization(
  request: ResumeOptimizationRequest,
  callModel: JsonModelCaller,
  now: Date = new Date(),
): Promise<ResumeOptimizationResponse> {
  const normalizedRequest = normalizeResumeOptimizationRequest(request);
  const facts = buildResumeFactList(normalizedRequest.fields);
  const generation = normalizeCandidateGeneration(
    await callModel({
      prompt: buildCandidateGenerationPrompt({
        fields: normalizedRequest.fields,
        facts,
        targetRole: normalizedRequest.targetRole,
      }),
      temperature: 0.4,
    }),
  );
  const evaluation = normalizeUnifiedEvaluation(
    await callModel({
      prompt: buildUnifiedEvaluationPrompt({
        fields: normalizedRequest.fields,
        facts,
        candidates: generation,
        targetRole: normalizedRequest.targetRole,
      }),
      temperature: 0.05,
    }),
  );

  return selectResumeOptimization({
    fields: normalizedRequest.fields,
    targetRole: normalizedRequest.targetRole,
    facts,
    generation,
    evaluation,
    now,
  });
}
