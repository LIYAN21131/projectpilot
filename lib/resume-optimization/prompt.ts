import type { ResumeProjectFields } from "../../types/project.ts";
import type {
  ResumeCandidateGeneration,
  ResumeFact,
} from "../../types/resume-optimization.ts";

type CandidateGenerationPromptInput = {
  fields: ResumeProjectFields;
  facts: ResumeFact[];
  targetRole: string;
};

type UnifiedEvaluationPromptInput = CandidateGenerationPromptInput & {
  candidates: ResumeCandidateGeneration;
};

const GENERATION_OUTPUT =
  '{"candidates":[{"style":"structure","bullets":["string"]},{"style":"role-fit","bullets":["string"]},{"style":"outcome-focused","bullets":["string"]}]}';

const EXPRESSION_OUTPUT =
  '{"dimensions":[{"key":"logic","score":0,"reason":"string"},{"key":"roleFit","score":0,"reason":"string"},{"key":"professionalism","score":0,"reason":"string"}],"summary":"string"}';

function evaluationCandidateOutput(style: string) {
  return `{"style":"${style}","expression":${EXPRESSION_OUTPUT},"introducedFacts":["string"],"missingCoreFactIds":["string"],"summary":"string"}`;
}

const EVALUATION_OUTPUT =
  `{"content":{"dimensions":[{"key":"completeness","score":0,"reason":"string"},{"key":"evidence","score":0,"reason":"string"}],"summary":"string"},` +
  `"originalExpression":${EXPRESSION_OUTPUT},` +
  `"candidates":[${[
    "structure",
    "role-fit",
    "outcome-focused",
  ]
    .map(evaluationCandidateOutput)
    .join(",")}],` +
  '"contentGaps":["string"]}';

function serializeContext(
  fields: ResumeProjectFields,
  facts: ResumeFact[],
  targetRole: string,
) {
  return [
    `目标岗位：${targetRole}`,
    `用户确认字段：${JSON.stringify(fields)}`,
    `事实清单：${JSON.stringify(facts)}`,
  ].join("\n");
}

export function buildCandidateGenerationPrompt({
  fields,
  facts,
  targetRole,
}: CandidateGenerationPromptInput) {
  return [
    "你是简历表达优化器。仅改写表达，不改变事实。",
    serializeContext(fields, facts, targetRole),
    "生成三个不同侧重点的候选：structure 强调结构清晰，role-fit 强调目标岗位匹配，outcome-focused 强调行动与结果。",
    "严格约束：",
    "1. 不得编造任何事实、数据、结果或经历。",
    "2. 不得根据工具名称推断未确认的技能、职责或成果。",
    "3. 不得删除或遗漏任何 core=true 的事实。",
    "4. 每个候选必须包含 1-5 条非空 bullet。",
    "5. 三个 style 必须且只能是 structure、role-fit、outcome-focused，并按此顺序返回。",
    "只能返回以下 JSON，不得返回 Markdown、解释或额外字段：",
    GENERATION_OUTPUT,
  ].join("\n");
}

export function buildUnifiedEvaluationPrompt({
  fields,
  facts,
  candidates,
  targetRole,
}: UnifiedEvaluationPromptInput) {
  return [
    "你是独立简历质量评估器。必须在同一次请求中统一评估原始内容和全部三个候选。",
    serializeContext(fields, facts, targetRole),
    `待评估候选：${JSON.stringify(candidates)}`,
    "评分规则：",
    "1. 内容评分只能依据用户确认字段；所有版本共享同一内容评分。",
    "2. 内容维度固定为 completeness 0-20、evidence 0-20。",
    "3. 表达维度固定为 logic 0-20、roleFit 0-20、professionalism 0-20。",
    "4. originalExpression 评估用户确认字段的原始表达；三个候选分别评估其实际 bullets。",
    "5. 对每个候选返回 introducedFacts、missingCoreFactIds 和简短 summary；整体返回最多三条 contentGaps。",
    "6. introducedFacts 记录候选新增或推断的未确认事实；missingCoreFactIds 只能填写事实清单中 core=true 且被遗漏的 ID。",
    "7. 允许候选分数低于原始表达，不得强行判定有提升。",
    "8. 不得返回 total、总分、是否通过或 pass/fail 决策。",
    "9. candidates 必须且只能包含 structure、role-fit、outcome-focused，并按此顺序返回。",
    "只能返回以下 JSON，不得返回 Markdown、解释或额外字段：",
    EVALUATION_OUTPUT,
  ].join("\n");
}
