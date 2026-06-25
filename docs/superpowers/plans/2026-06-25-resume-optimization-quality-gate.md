# Resume Optimization Quality Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-draft resume optimization flow with a three-candidate, fact-safe quality gate that only delivers a non-regressing winner and otherwise preserves the current content with actionable guidance.

**Architecture:** The existing `POST /api/resume-optimize` Route Handler remains the single browser-facing endpoint, but it performs two separate DeepSeek requests with different prompts: candidate generation, then unified evaluation of the original text and all three candidates. Focused library modules build the fact list, normalize model payloads, compute all totals and rejection reasons, select the winner deterministically, and return a typed success or safe-fallback outcome. `ProjectEditor` coordinates UI state and persistence; the quality component only renders normalized version-2 assessments.

**Tech Stack:** Next.js 16.2 App Router Route Handlers, React 19.2 client components, TypeScript 5, DeepSeek OpenAI-compatible API, Node assertion-based deterministic tests, existing localStorage store and analytics.

---

## Source guidance checked

- `AGENTS.md`: read the installed Next.js documentation before code changes.
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`

The endpoint remains a non-cached `POST` Route Handler using the Web `Request` API and `NextResponse.json`.

## File map

- Create `types/resume-optimization.ts`: facts, candidates, model evaluation payloads, quality-gate results, API request/response unions.
- Modify `types/resume-quality.ts`: introduce version-2 content/expression score types and retain a legacy version-1 type for stored-project compatibility.
- Modify `types/project.ts`: keep `resumeQualityAssessment` as the persistence location, typed as the versioned union.
- Create `lib/resume-optimization/facts.ts`: deterministic fact extraction and stable IDs.
- Create `lib/resume-optimization/normalize.ts`: strict normalization for candidate and evaluation model responses.
- Create `lib/resume-optimization/gate.ts`: program-computed totals, rejection reasons, fallback classification, and winner ordering.
- Create `lib/resume-optimization/prompt.ts`: separate generation and unified-evaluation prompts.
- Create `lib/resume-optimization/service.ts`: request validation and final API response assembly.
- Replace `app/api/resume-optimize/route.ts`: run generation and evaluation as two separate model calls and return a normalized outcome.
- Remove `app/api/ai/score-resume-quality/route.ts`: superseded by the unified evaluation performed during optimization.
- Modify `lib/ai/client.ts`: pass `targetRole` and consume the new response union; remove old before/after scoring calls.
- Modify `components/resume/ResumeQualityComparison.tsx`: render content score, original/optimized expression score, success details, safe fallback, and legacy/stale states.
- Modify `components/project/ProjectEditor.tsx`: replace asynchronous after-scoring with one gated optimization request and distinct fallback/technical-error states.
- Modify `types/analytics.ts`: add optimization pass/fallback/rejection/technical-failure event names.
- Modify `scripts/test-resume-quality.mjs`: remove obsolete version-1 prompt/service expectations while retaining legacy normalization tests if still imported.
- Create `scripts/test-resume-optimization.mjs`: deterministic facts, normalization, gate, prompt, and service tests.
- Modify `package.json`: add `test:resume-optimization`.

### Task 1: Define version-2 contracts and deterministic fact extraction

**Files:**
- Create: `types/resume-optimization.ts`
- Modify: `types/resume-quality.ts`
- Modify: `types/project.ts`
- Create: `lib/resume-optimization/facts.ts`
- Create: `scripts/test-resume-optimization.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the new test command**

Add to `package.json`:

```json
"test:resume-optimization": "node --no-warnings --experimental-strip-types scripts/test-resume-optimization.mjs"
```

- [ ] **Step 2: Write failing fact-extraction tests**

Create `scripts/test-resume-optimization.mjs`:

```js
import assert from "node:assert/strict";
import { buildResumeFactList } from "../lib/resume-optimization/facts.ts";

const fields = {
  projectName: "ProjectPilot",
  background: "求职者难以整理项目经历",
  painPoint: "表达松散；缺少岗位重点",
  responsibility: "负责需求分析；设计核心流程",
  actions: "访谈目标用户；完成原型验证",
  result: "完成 MVP 验证",
  metrics: "邀请 8 名用户试用",
  tools: "Figma、Next.js",
};

const facts = buildResumeFactList(fields);

assert.deepEqual(
  facts.filter((fact) => fact.core).map((fact) => fact.source),
  ["responsibility", "responsibility", "actions", "actions", "result", "metrics"],
);
assert.equal(facts.find((fact) => fact.id === "responsibility-1")?.text, "负责需求分析");
assert.equal(facts.find((fact) => fact.id === "actions-2")?.text, "完成原型验证");
assert.equal(facts.find((fact) => fact.source === "tools")?.core, false);
assert.deepEqual(buildResumeFactList(fields), facts);
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```powershell
npm run test:resume-optimization
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/resume-optimization/facts.ts`.

- [ ] **Step 4: Define the new contracts**

Create `types/resume-optimization.ts` with:

```ts
import type { ResumeProjectFields } from "./project";
import type {
  ResumeContentScore,
  ResumeExpressionScore,
  ResumeQualityAssessmentV2,
} from "./resume-quality";

export type ResumeFactSource =
  | "projectName"
  | "background"
  | "painPoint"
  | "responsibility"
  | "actions"
  | "result"
  | "metrics"
  | "tools";

export type ResumeFact = {
  id: string;
  source: ResumeFactSource;
  text: string;
  core: boolean;
};

export type ResumeCandidateStyle =
  | "structure"
  | "role-fit"
  | "outcome-focused";

export type ResumeCandidate = {
  style: ResumeCandidateStyle;
  bullets: string[];
};

export type ResumeCandidateGeneration = {
  candidates: ResumeCandidate[];
};

export type ResumeCandidateEvaluation = {
  style: ResumeCandidateStyle;
  expression: ResumeExpressionScore;
  introducedFacts: string[];
  missingCoreFactIds: string[];
  summary: string;
};

export type ResumeUnifiedEvaluation = {
  content: ResumeContentScore;
  originalExpression: ResumeExpressionScore;
  candidates: ResumeCandidateEvaluation[];
  contentGaps: string[];
};

export type ResumeCandidateRejectionReason =
  | "introduced_fact"
  | "missing_core_fact"
  | "total_score_decreased"
  | "no_expression_improvement"
  | "dimension_regressed"
  | "invalid_candidate";

export type ResumeOptimizationRequest = {
  fields: ResumeProjectFields;
  targetRole: string;
};

export type ResumeOptimizationResponse =
  | {
      status: "optimized";
      bullets: string[];
      assessment: ResumeQualityAssessmentV2;
    }
  | {
      status: "needs-information" | "no-improvement";
      assessment: ResumeQualityAssessmentV2;
    };
```

Modify `types/resume-quality.ts` so version 1 remains available as `ResumeQualityAssessmentV1`, then add:

```ts
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
  rejectionCounts: Partial<Record<
    import("./resume-optimization").ResumeCandidateRejectionReason,
    number
  >>;
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
```

Keep `Project.resumeQualityAssessment?: ResumeQualityAssessment` unchanged in `types/project.ts`.

- [ ] **Step 5: Implement deterministic fact extraction**

Create `lib/resume-optimization/facts.ts`:

```ts
import type {
  ResumeFact,
  ResumeFactSource,
} from "../../types/resume-optimization.ts";
import type { ResumeProjectFields } from "../../types/project.ts";

const SOURCES: ResumeFactSource[] = [
  "projectName",
  "background",
  "painPoint",
  "responsibility",
  "actions",
  "result",
  "metrics",
  "tools",
];

const CORE_SOURCES = new Set<ResumeFactSource>([
  "responsibility",
  "actions",
  "result",
  "metrics",
]);

function splitFacts(value: string) {
  return value
    .split(/[\n。；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildResumeFactList(fields: ResumeProjectFields): ResumeFact[] {
  return SOURCES.flatMap((source) =>
    splitFacts(fields[source]).map((text, index) => ({
      id: `${source}-${index + 1}`,
      source,
      text,
      core: CORE_SOURCES.has(source),
    })),
  );
}
```

- [ ] **Step 6: Run the test and verify GREEN**

Run:

```powershell
npm run test:resume-optimization
npx eslint types/resume-optimization.ts types/resume-quality.ts types/project.ts lib/resume-optimization/facts.ts
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts/test-resume-optimization.mjs types/resume-optimization.ts types/resume-quality.ts types/project.ts lib/resume-optimization/facts.ts
git commit -m "feat: define resume optimization quality contracts"
```

### Task 2: Implement strict normalization and the deterministic quality gate

**Files:**
- Modify: `scripts/test-resume-optimization.mjs`
- Create: `lib/resume-optimization/normalize.ts`
- Create: `lib/resume-optimization/gate.ts`
- Create: `lib/resume-optimization/fingerprint.ts`

- [ ] **Step 1: Write failing gate tests**

Append imports and fixtures to `scripts/test-resume-optimization.mjs`:

```js
import {
  normalizeCandidateGeneration,
  normalizeUnifiedEvaluation,
} from "../lib/resume-optimization/normalize.ts";
import { selectResumeOptimization } from "../lib/resume-optimization/gate.ts";
import { createResumeOptimizationFingerprint } from "../lib/resume-optimization/fingerprint.ts";

const generation = normalizeCandidateGeneration({
  candidates: [
    { style: "structure", bullets: ["梳理需求并完成原型验证"] },
    { style: "role-fit", bullets: ["负责需求分析并推动 MVP 验证"] },
    { style: "outcome-focused", bullets: ["完成 MVP 验证并组织 8 名用户试用"] },
  ],
});

const evaluation = normalizeUnifiedEvaluation({
  content: {
    dimensions: [
      { key: "completeness", score: 16, reason: "职责、行动和结果完整" },
      { key: "evidence", score: 14, reason: "有用户试用证据" },
    ],
    summary: "内容基础较完整",
  },
  originalExpression: {
    dimensions: [
      { key: "logic", score: 12, reason: "结构基本可读" },
      { key: "roleFit", score: 13, reason: "体现部分产品能力" },
      { key: "professionalism", score: 13, reason: "表达基本专业" },
    ],
    summary: "原始表达可用",
  },
  candidates: [
    {
      style: "structure",
      expression: {
        dimensions: [
          { key: "logic", score: 16, reason: "链路更清楚" },
          { key: "roleFit", score: 13, reason: "岗位信息持平" },
          { key: "professionalism", score: 14, reason: "表达更精炼" },
        ],
        summary: "结构改善",
      },
      introducedFacts: [],
      missingCoreFactIds: [],
      summary: "可交付",
    },
    {
      style: "role-fit",
      expression: {
        dimensions: [
          { key: "logic", score: 14, reason: "结构改善" },
          { key: "roleFit", score: 17, reason: "岗位能力更突出" },
          { key: "professionalism", score: 14, reason: "表达更专业" },
        ],
        summary: "岗位匹配最佳",
      },
      introducedFacts: ["新增了未提供的上线结果"],
      missingCoreFactIds: [],
      summary: "存在新增事实",
    },
    {
      style: "outcome-focused",
      expression: {
        dimensions: [
          { key: "logic", score: 13, reason: "结构略有改善" },
          { key: "roleFit", score: 14, reason: "岗位匹配改善" },
          { key: "professionalism", score: 16, reason: "成果表达更精炼" },
        ],
        summary: "成果表达最佳",
      },
      introducedFacts: [],
      missingCoreFactIds: ["actions-2"],
      summary: "遗漏核心行动",
    },
  ],
  contentGaps: [],
});

const selected = selectResumeOptimization({
  fields,
  targetRole: "产品经理",
  facts,
  generation,
  evaluation,
  now: "2026-06-25T00:00:00.000Z",
});

assert.equal(selected.status, "optimized");
assert.deepEqual(selected.bullets, ["梳理需求并完成原型验证"]);
assert.equal(selected.assessment.originalTotal, 68);
assert.equal(selected.assessment.optimizedTotal, 73);
assert.equal(selected.assessment.rejectionCounts.introduced_fact, 1);
assert.equal(selected.assessment.rejectionCounts.missing_core_fact, 1);
```

Add boundary tests:

```js
const regressionEvaluation = structuredClone(evaluation);
regressionEvaluation.candidates[0].expression.dimensions[1].score = 10;
const regressionResult = selectResumeOptimization({
  fields,
  targetRole: "产品经理",
  facts,
  generation,
  evaluation: regressionEvaluation,
  now: "2026-06-25T00:00:00.000Z",
});
assert.equal(regressionResult.status, "no-improvement");

const fingerprint = createResumeOptimizationFingerprint(
  fields,
  "产品经理",
  ["梳理需求并完成原型验证"],
);
assert.equal(
  fingerprint,
  createResumeOptimizationFingerprint({ ...fields }, "产品经理", ["梳理需求并完成原型验证"]),
);
assert.notEqual(
  fingerprint,
  createResumeOptimizationFingerprint(fields, "产品运营", ["梳理需求并完成原型验证"]),
);
```

- [ ] **Step 2: Run the test and verify RED**

Run `npm run test:resume-optimization`.

Expected: FAIL because normalization, gate, and fingerprint modules do not exist.

- [ ] **Step 3: Implement strict normalizers**

Create `lib/resume-optimization/normalize.ts` with exported functions:

```ts
export function normalizeCandidateGeneration(input: unknown): ResumeCandidateGeneration
export function normalizeUnifiedEvaluation(input: unknown): ResumeUnifiedEvaluation
```

Required behavior:

```ts
const CANDIDATE_STYLES = ["structure", "role-fit", "outcome-focused"] as const;

function normalizeScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Dimension score must be finite");
  }
  return Math.min(20, Math.max(0, Math.round(value)));
}
```

- Require exactly three candidates and exactly one of each style.
- Require 1–5 non-empty bullets per candidate.
- Strip bullet prefixes before returning.
- Require exactly two content dimensions in fixed order.
- Require exactly three expression dimensions in fixed order.
- Require exactly three candidate evaluations matching the generation styles.
- Trim and deduplicate `introducedFacts`, `missingCoreFactIds`, and `contentGaps`.
- Limit `contentGaps` to three.
- Reject evaluation payloads that reference a missing-core ID not present in the supplied fact list during gate processing by adding `invalid_candidate`.
- Compute content and expression totals in code; never trust a model-provided total.

- [ ] **Step 4: Implement the gate**

Create `lib/resume-optimization/gate.ts`:

```ts
const MAX_DIMENSION_REGRESSION = -2;

export function selectResumeOptimization(input: {
  fields: ResumeProjectFields;
  targetRole: string;
  facts: ResumeFact[];
  generation: ResumeCandidateGeneration;
  evaluation: ResumeUnifiedEvaluation;
  now: string;
}): ResumeOptimizationResponse
```

For each candidate, compute rejection reasons:

```ts
if (candidateEvaluation.introducedFacts.length) reasons.add("introduced_fact");
if (candidateEvaluation.missingCoreFactIds.length) reasons.add("missing_core_fact");
if (candidateTotal < originalTotal) reasons.add("total_score_decreased");
if (!changes.some((change) => change > 0)) reasons.add("no_expression_improvement");
if (changes.some((change) => change < MAX_DIMENSION_REGRESSION)) {
  reasons.add("dimension_regressed");
}
```

Only candidates with no reasons qualify. Sort qualified candidates by:

```ts
[
  candidateTotal,
  roleFitScore,
  professionalismScore,
  logicScore,
]
```

descending.

When a winner exists, return `status: "optimized"` with its bullets and a version-2 assessment.

When no winner exists:

- Return `needs-information` if either content dimension is `<= 12` and `contentGaps` is non-empty.
- Otherwise return `no-improvement`.
- Return no bullets.
- Limit suggestions to three and only expose them for `needs-information`.

- [ ] **Step 5: Implement the version-2 fingerprint**

Create `lib/resume-optimization/fingerprint.ts` with the existing FNV-1a approach and:

```ts
export function createResumeOptimizationFingerprint(
  fields: ResumeProjectFields,
  targetRole: string,
  bullets: string[] = [],
) {
  return createFingerprint({
    rubricVersion: 2,
    fields: FIELD_KEYS.map((key) => [key, fields[key].trim()]),
    targetRole: targetRole.trim(),
    bullets: bullets.map((bullet) => bullet.trim()).filter(Boolean),
  });
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```powershell
npm run test:resume-optimization
npx eslint lib/resume-optimization types/resume-optimization.ts types/resume-quality.ts
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add scripts/test-resume-optimization.mjs lib/resume-optimization types/resume-optimization.ts types/resume-quality.ts
git commit -m "feat: add deterministic resume optimization quality gate"
```

### Task 3: Add separate generation and unified-evaluation prompts

**Files:**
- Modify: `scripts/test-resume-optimization.mjs`
- Create: `lib/resume-optimization/prompt.ts`
- Create: `lib/resume-optimization/service.ts`

- [ ] **Step 1: Write failing prompt and request tests**

Append:

```js
import {
  buildCandidateGenerationPrompt,
  buildUnifiedEvaluationPrompt,
} from "../lib/resume-optimization/prompt.ts";
import { normalizeResumeOptimizationRequest } from "../lib/resume-optimization/service.ts";

const request = normalizeResumeOptimizationRequest({
  fields,
  targetRole: "产品经理",
});
assert.equal(request.targetRole, "产品经理");

assert.throws(
  () => normalizeResumeOptimizationRequest({ fields, targetRole: "" }),
  /target role/i,
);

const generationPrompt = buildCandidateGenerationPrompt(fields, facts, "产品经理");
assert.match(generationPrompt, /structure/);
assert.match(generationPrompt, /role-fit/);
assert.match(generationPrompt, /outcome-focused/);
assert.match(generationPrompt, /不得虚构/);
assert.match(generationPrompt, /只返回合法 JSON/);

const evaluationPrompt = buildUnifiedEvaluationPrompt(
  fields,
  facts,
  generation.candidates,
  "产品经理",
);
assert.match(evaluationPrompt, /同一次评估/);
assert.match(evaluationPrompt, /introducedFacts/);
assert.match(evaluationPrompt, /missingCoreFactIds/);
assert.match(evaluationPrompt, /contentGaps/);
assert.doesNotMatch(evaluationPrompt, /保证候选通过/);
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-optimization`.

Expected: FAIL because prompt and service modules do not exist.

- [ ] **Step 3: Implement request validation**

Create `lib/resume-optimization/service.ts`:

```ts
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

export function normalizeResumeOptimizationRequest(
  input: unknown,
): ResumeOptimizationRequest {
  const record = asRecord(input);
  const targetRole =
    typeof record.targetRole === "string" ? record.targetRole.trim() : "";
  if (!targetRole) throw new Error("Target role is required");

  const fieldRecord = asRecord(record.fields);
  const fields = Object.fromEntries(
    FIELD_KEYS.map((key) => [
      key,
      typeof fieldRecord[key] === "string" ? fieldRecord[key].trim() : "",
    ]),
  ) as ResumeProjectFields;

  if (!Object.values(fields).some(Boolean)) {
    throw new Error("Resume fields must contain usable content");
  }

  return { fields, targetRole };
}
```

- [ ] **Step 4: Implement generation prompt**

Create `lib/resume-optimization/prompt.ts` and export:

```ts
export function buildCandidateGenerationPrompt(
  fields: ResumeProjectFields,
  facts: ResumeFact[],
  targetRole: string,
): string
```

The prompt must:

- Request exactly three candidates with styles `structure`, `role-fit`, and `outcome-focused`.
- Require 1–5 bullets for each candidate.
- Include the full fact list with IDs and `core` flags.
- Include the target role.
- Prohibit invented facts, data, tools, deployment, launch, integration, and unsupported impact.
- State that deleting a core fact to become shorter is prohibited.
- Require this exact JSON shape:

```json
{
  "candidates": [
    { "style": "structure", "bullets": ["..."] },
    { "style": "role-fit", "bullets": ["..."] },
    { "style": "outcome-focused", "bullets": ["..."] }
  ]
}
```

- [ ] **Step 5: Implement unified evaluation prompt**

Export:

```ts
export function buildUnifiedEvaluationPrompt(
  fields: ResumeProjectFields,
  facts: ResumeFact[],
  candidates: ResumeCandidate[],
  targetRole: string,
): string
```

The prompt must explicitly state:

- Original and all three candidates are scored in the same evaluation.
- Content score comes only from confirmed original fields.
- Content dimensions: `completeness`, `evidence`.
- Expression dimensions: `logic`, `roleFit`, `professionalism`.
- Each dimension is an integer from 0–20.
- No total or pass/fail decision should be returned.
- `introducedFacts` contains concise descriptions of unsupported claims.
- `missingCoreFactIds` contains only IDs from the supplied fact list.
- `contentGaps` contains at most three actionable information types, never fabricated answers.
- A candidate may score lower; the evaluator must not force improvement.

Require this JSON shape:

```json
{
  "content": {
    "dimensions": [
      { "key": "completeness", "score": 0, "reason": "..." },
      { "key": "evidence", "score": 0, "reason": "..." }
    ],
    "summary": "..."
  },
  "originalExpression": {
    "dimensions": [
      { "key": "logic", "score": 0, "reason": "..." },
      { "key": "roleFit", "score": 0, "reason": "..." },
      { "key": "professionalism", "score": 0, "reason": "..." }
    ],
    "summary": "..."
  },
  "candidates": [
    {
      "style": "structure",
      "expression": {
        "dimensions": [
          { "key": "logic", "score": 0, "reason": "..." },
          { "key": "roleFit", "score": 0, "reason": "..." },
          { "key": "professionalism", "score": 0, "reason": "..." }
        ],
        "summary": "..."
      },
      "introducedFacts": [],
      "missingCoreFactIds": [],
      "summary": "..."
    }
  ],
  "contentGaps": []
}
```

- [ ] **Step 6: Run tests and verify GREEN**

Run:

```powershell
npm run test:resume-optimization
npx eslint lib/resume-optimization/prompt.ts lib/resume-optimization/service.ts
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add scripts/test-resume-optimization.mjs lib/resume-optimization/prompt.ts lib/resume-optimization/service.ts
git commit -m "feat: add resume candidate generation and evaluation prompts"
```

### Task 4: Replace the optimization Route Handler with two-stage orchestration

**Files:**
- Modify: `app/api/resume-optimize/route.ts`
- Delete: `app/api/ai/score-resume-quality/route.ts`
- Modify: `scripts/test-resume-optimization.mjs`
- Modify: `scripts/test-resume-quality.mjs`

- [ ] **Step 1: Extract and test a model-call helper contract**

Add to `lib/resume-optimization/service.ts`:

```ts
export type JsonModelCaller = (prompt: string, temperature: number) => Promise<unknown>;

export async function executeResumeOptimization(
  request: ResumeOptimizationRequest,
  callModel: JsonModelCaller,
  now = new Date().toISOString(),
): Promise<ResumeOptimizationResponse> {
  const facts = buildResumeFactList(request.fields);
  const generation = normalizeCandidateGeneration(
    await callModel(
      buildCandidateGenerationPrompt(request.fields, facts, request.targetRole),
      0.4,
    ),
  );
  const evaluation = normalizeUnifiedEvaluation(
    await callModel(
      buildUnifiedEvaluationPrompt(
        request.fields,
        facts,
        generation.candidates,
        request.targetRole,
      ),
      0.05,
    ),
  );
  return selectResumeOptimization({
    ...request,
    facts,
    generation,
    evaluation,
    now,
  });
}
```

Append a failing test with a fake caller:

```js
import { executeResumeOptimization } from "../lib/resume-optimization/service.ts";

const prompts = [];
const result = await executeResumeOptimization(
  { fields, targetRole: "产品经理" },
  async (prompt, temperature) => {
    prompts.push({ prompt, temperature });
    return prompts.length === 1
      ? { candidates: generation.candidates }
      : {
          content: {
            dimensions: evaluation.content.dimensions,
            summary: evaluation.content.summary,
          },
          originalExpression: {
            dimensions: evaluation.originalExpression.dimensions,
            summary: evaluation.originalExpression.summary,
          },
          candidates: evaluation.candidates,
          contentGaps: [],
        };
  },
  "2026-06-25T00:00:00.000Z",
);
assert.equal(prompts.length, 2);
assert.equal(prompts[0].temperature, 0.4);
assert.equal(prompts[1].temperature, 0.05);
assert.equal(result.status, "optimized");
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-optimization`.

Expected: FAIL because `executeResumeOptimization` is not exported.

- [ ] **Step 3: Implement the two-call service helper**

Add the exact helper above and required imports to `lib/resume-optimization/service.ts`.

- [ ] **Step 4: Replace the Route Handler**

Replace `app/api/resume-optimize/route.ts` with a focused handler:

```ts
import { NextResponse } from "next/server";
import {
  executeResumeOptimization,
  normalizeResumeOptimizationRequest,
} from "@/lib/resume-optimization/service";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

type DeepSeekChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function callDeepSeekJson(prompt: string, temperature: number, apiKey: string) {
  const response = await fetch(
    `${normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL)}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: "你必须严格遵守中文简历事实约束和 JSON 输出合同。",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature,
        stream: false,
      }),
    },
  );

  if (!response.ok) throw new Error("模型服务暂时不可用");
  const payload = (await response.json()) as DeepSeekChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("模型未返回有效内容");
  return JSON.parse(content) as unknown;
}

export async function POST(request: Request) {
  let normalized;
  try {
    normalized = normalizeResumeOptimizationRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "请求内容格式异常" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "优化服务暂时不可用" }, { status: 503 });
  }

  try {
    const result = await executeResumeOptimization(
      normalized,
      (prompt, temperature) => callDeepSeekJson(prompt, temperature, apiKey),
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "优化暂时失败，请重试" },
      { status: 502 },
    );
  }
}
```

Do not retry generation or evaluation in this iteration; uncontrolled retries would exceed the agreed “one generation batch, one evaluation batch” behavior.

- [ ] **Step 5: Remove the superseded scoring endpoint**

Delete:

```text
app/api/ai/score-resume-quality/route.ts
```

Remove old prompt/service expectations from `scripts/test-resume-quality.mjs`. Keep deterministic legacy normalization, fingerprint, presentation, and stale-state tests until version-1 modules are removed in a later migration.

- [ ] **Step 6: Run focused verification**

Run:

```powershell
npm run test:resume-optimization
npm run test:resume-quality
npx eslint app/api/resume-optimize lib/resume-optimization
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add app/api/resume-optimize/route.ts app/api/ai/score-resume-quality/route.ts lib/resume-optimization/service.ts scripts/test-resume-optimization.mjs scripts/test-resume-quality.mjs
git commit -m "feat: orchestrate gated resume optimization"
```

### Task 5: Update the browser client and analytics contracts

**Files:**
- Modify: `lib/ai/client.ts`
- Modify: `types/analytics.ts`
- Modify: `scripts/test-resume-optimization.mjs`

- [ ] **Step 1: Add a response-shape assertion**

Append:

```js
assert.equal(result.status, "optimized");
assert.equal("bullets" in result, true);
assert.equal(result.assessment.version, 2);
```

- [ ] **Step 2: Update the client**

Replace:

```ts
export async function optimizeResumeBulletsWithAI(
  fields: ResumeProjectFields,
): Promise<{ bullets: string[] }>
```

with:

```ts
export async function optimizeResumeBulletsWithAI(
  fields: ResumeProjectFields,
  targetRole: string,
): Promise<ResumeOptimizationResponse> {
  return postAI<ResumeOptimizationResponse>("/api/resume-optimize", {
    fields,
    targetRole,
  });
}
```

Remove:

```ts
scoreOriginalResumeQualityWithAI
scoreOptimizedResumeQualityWithAI
```

and their obsolete type imports.

- [ ] **Step 3: Add analytics event names**

Extend `AnalyticsEventName` in `types/analytics.ts`:

```ts
| "resume_optimization_passed"
| "resume_optimization_safe_fallback"
| "resume_candidate_rejected"
| "resume_optimization_technical_error"
| "resume_optimization_saved";
```

Only send counts, scores, role, outcome, and rejection reason names. Never send resume text, candidate text, or fact text.

- [ ] **Step 4: Run verification**

Run:

```powershell
npm run test:resume-optimization
npx eslint lib/ai/client.ts types/analytics.ts
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add lib/ai/client.ts types/analytics.ts scripts/test-resume-optimization.mjs
git commit -m "feat: expose gated optimization client contract"
```

### Task 6: Replace the quality comparison UI with version-2 success and fallback states

**Files:**
- Modify: `components/resume/ResumeQualityComparison.tsx`
- Modify: `lib/resume-quality/presentation.ts`
- Modify: `scripts/test-resume-optimization.mjs`

- [ ] **Step 1: Add pure presentation-helper tests**

Add to `lib/resume-quality/presentation.ts`:

```ts
export function formatResumeQualityChange(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export function describeResumeOptimizationOutcome(
  outcome: ResumeQualityAssessmentV2["outcome"],
) {
  if (outcome === "optimized") return "已通过质量门槛";
  if (outcome === "needs-information") return "建议补充信息后重试";
  return "当前版本暂不建议替换";
}
```

Append tests:

```js
import {
  describeResumeOptimizationOutcome,
  formatResumeQualityChange,
} from "../lib/resume-quality/presentation.ts";

assert.equal(formatResumeQualityChange(3), "+3");
assert.equal(describeResumeOptimizationOutcome("needs-information"), "建议补充信息后重试");
assert.equal(describeResumeOptimizationOutcome("no-improvement"), "当前版本暂不建议替换");
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-optimization`.

Expected: FAIL because `describeResumeOptimizationOutcome` does not exist.

- [ ] **Step 3: Implement the helper**

Add the exact helper above to `lib/resume-quality/presentation.ts`.

- [ ] **Step 4: Replace the component contract**

Use:

```ts
export type ResumeQualityViewState =
  | "idle"
  | "loading"
  | "ready"
  | "technical-error";

type Props = {
  assessment?: ResumeQualityAssessment;
  state: ResumeQualityViewState;
  onRetry: () => void;
};
```

Rendering rules:

- Legacy version-1 assessment: show a neutral “评分标准已更新，请重新优化” message; do not render old five-dimension comparisons as current.
- `idle`: explain that optimization generates three candidates and only returns a version that passes the quality gate.
- `loading`: “正在生成并评估 3 个候选版本…”.
- `technical-error`: “优化暂时失败，请重试” with one retry button.
- Version-2 `optimized`:
  - Cards for content score `/40`, original expression `/60`, optimized expression `/60`, and total change.
  - Only the three expression dimension changes.
  - Positive highlights derived from changes greater than zero.
  - Text stating that content score is shared and unchanged.
- Version-2 `needs-information`:
  - Preserve-current-content message.
  - Up to three suggestions.
  - “补充项目资料后重新优化” retry button.
- Version-2 `no-improvement`:
  - “当前版本已较完整，暂不建议替换”.
  - No fabricated content suggestions.
  - Retry button remains available.
- Never render rejected candidate text or authenticity-risk language.

- [ ] **Step 5: Run lint and tests**

Run:

```powershell
npm run test:resume-optimization
npx eslint components/resume/ResumeQualityComparison.tsx lib/resume-quality/presentation.ts
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add components/resume/ResumeQualityComparison.tsx lib/resume-quality/presentation.ts scripts/test-resume-optimization.mjs
git commit -m "feat: render gated resume optimization outcomes"
```

### Task 7: Integrate gated optimization into ProjectEditor

**Files:**
- Modify: `components/project/ProjectEditor.tsx`
- Modify: `lib/resume-quality/state.ts`
- Modify: `scripts/test-resume-optimization.mjs`

- [ ] **Step 1: Add version-aware stale-state tests**

Add a helper in `lib/resume-quality/state.ts`:

```ts
export function getCurrentResumeQualityAssessment(
  assessment: ResumeQualityAssessment | undefined,
  expectedFingerprint: string,
): ResumeQualityAssessment | undefined
```

Append tests:

```js
import { getCurrentResumeQualityAssessment } from "../lib/resume-quality/state.ts";

const currentV2 = {
  ...selected.assessment,
  sourceFingerprint: "same",
  status: "current",
};
const legacyV1 = {
  version: 1,
  rubricVersion: 1,
  targetRole: "产品经理",
  before: {
    total: 60,
    dimensions: [],
    summary: "旧评分",
  },
  status: "current",
  sourceFingerprint: "same",
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
};
assert.equal(getCurrentResumeQualityAssessment(currentV2, "same")?.status, "current");
assert.equal(getCurrentResumeQualityAssessment(currentV2, "changed")?.status, "stale");
assert.equal(getCurrentResumeQualityAssessment(legacyV1, "same")?.version, 1);
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-optimization`.

Expected: FAIL because `getCurrentResumeQualityAssessment` does not exist.

- [ ] **Step 3: Implement the version-aware helper**

Use the existing immutable stale-marking behavior:

```ts
export function getCurrentResumeQualityAssessment(
  assessment: ResumeQualityAssessment | undefined,
  expectedFingerprint: string,
) {
  if (!assessment) return undefined;
  if (assessment.sourceFingerprint === expectedFingerprint) {
    return assessment.status === "current"
      ? assessment
      : { ...assessment, status: "current" as const };
  }
  return assessment.status === "stale"
    ? assessment
    : { ...assessment, status: "stale" as const };
}
```

- [ ] **Step 4: Replace editor imports and state**

In `components/project/ProjectEditor.tsx`:

- Remove `scoreOriginalResumeQualityWithAI`, `scoreOptimizedResumeQualityWithAI`, `ResumeQualityScore`, and old fingerprint imports.
- Import:

```ts
import { trackEvent } from "@/lib/analytics";
import { createResumeOptimizationFingerprint } from "@/lib/resume-optimization/fingerprint";
import { getCurrentResumeQualityAssessment } from "@/lib/resume-quality/state";
import { isResumeQualityAssessmentV2 } from "@/types/resume-quality";
```

Use:

```ts
type ResumeOptimizeState =
  | "idle"
  | "loading"
  | "success"
  | "safe-fallback"
  | "error";
```

Keep `resumeQualityAssessment` in state. Replace old `loading-before/loading-after` coordination with `idle/loading/ready/technical-error`.

- [ ] **Step 5: Remove obsolete score functions**

Delete:

```ts
requestBeforeResumeQualityScore
requestAfterResumeQualityScore
retryBeforeResumeQualityScore
retryAfterResumeQualityScore
```

In `confirmRecognitionResult`, remove:

```ts
void requestBeforeResumeQualityScore(confirmedFields);
```

Confirmation must still save successfully without making an optimization request.

- [ ] **Step 6: Implement the gated optimization transition**

Replace the API portion of `optimizeResumeBullets` with:

```ts
const fields = resumeFieldsFromProject(draft);
setResumeOptimizeState("loading");
setResumeQualityState("loading");

try {
  const response = await optimizeResumeBulletsWithAI(fields, targetRole);
  setResumeQualityAssessment(response.assessment);
  setResumeQualityState("ready");
  setCopyState("idle");

  for (const [reason, count] of Object.entries(response.assessment.rejectionCounts)) {
    if (!count) continue;
    trackEvent("resume_candidate_rejected", {
      reason,
      count,
      targetRole,
    });
  }

  if (response.status === "optimized") {
    setResumeBullets(response.bullets);
    setResumeOptimizeState("success");
    setResumeSaveState("idle");
    trackEvent("resume_optimization_passed", {
      targetRole,
      originalTotal: response.assessment.originalTotal,
      optimizedTotal: response.assessment.optimizedTotal,
    });
    setToastMessage("已选出通过质量门槛的优化版本");
  } else {
    setResumeOptimizeState("safe-fallback");
    trackEvent("resume_optimization_safe_fallback", {
      targetRole,
      outcome: response.status,
    });
    setToastMessage(
      response.status === "needs-information"
        ? "当前信息不足，已保留原内容"
        : "当前版本已较完整，暂不建议替换",
    );
    persistResumeQualityAssessment(response.assessment);
  }
  window.setTimeout(() => setToastMessage(""), 3000);
} catch {
  setResumeOptimizeState("error");
  setResumeQualityState("technical-error");
  trackEvent("resume_optimization_technical_error", { targetRole });
  setToastMessage("优化暂时失败，请重试");
  window.setTimeout(() => setToastMessage(""), 2600);
}
```

Do not clear existing saved bullets before a new request succeeds. A safe fallback must leave the currently saved result unchanged.

- [ ] **Step 7: Update fingerprint and save behavior**

Compute:

```ts
const expectedResumeQualityFingerprint =
  createResumeOptimizationFingerprint(
    currentQualityFields,
    targetRole,
    isResumeQualityAssessmentV2(resumeQualityAssessment)
      && resumeQualityAssessment.outcome === "optimized"
      ? resumeBullets
      : [],
  );
```

Use `getCurrentResumeQualityAssessment` for display.

`saveResumeBullets` must require:

```ts
resumeBullets.length > 0
isResumeQualityAssessmentV2(resumeQualityAssessmentForDisplay)
resumeQualityAssessmentForDisplay.outcome === "optimized"
resumeQualityAssessmentForDisplay.status === "current"
```

On successful save:

```ts
trackEvent("resume_optimization_saved", {
  targetRole,
  total: resumeQualityAssessmentForDisplay.optimizedTotal,
});
```

- [ ] **Step 8: Update the result and quality UI wiring**

- The optimize button remains disabled only while loading.
- During safe fallback, keep current saved bullets visible if they exist, but label them “当前已保存版本”; do not present them as the new result.
- If no bullets exist, show the fallback guidance instead of an empty “optimization failed” message.
- Disable copy/save unless a newly accepted or restored accepted result exists.
- Pass:

```tsx
<ResumeQualityComparison
  assessment={resumeQualityAssessmentForDisplay}
  state={resumeQualityState}
  onRetry={optimizeResumeBullets}
/>
```

- Update step description to: “一次生成 3 个候选，仅返回通过事实与评分门槛的版本。”

- [ ] **Step 9: Run focused checks**

Run:

```powershell
npm run test:resume-optimization
npm run test:resume-quality
npx eslint components/project/ProjectEditor.tsx components/resume/ResumeQualityComparison.tsx lib/resume-quality lib/resume-optimization lib/ai/client.ts types
```

Expected: all commands exit 0.

- [ ] **Step 10: Commit**

```powershell
git add components/project/ProjectEditor.tsx components/resume/ResumeQualityComparison.tsx lib/resume-quality/state.ts scripts/test-resume-optimization.mjs
git commit -m "feat: integrate safe resume optimization flow"
```

### Task 8: Full verification and requirements audit

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run all deterministic tests**

```powershell
npm run test:parser
npm run test:target-users
npm run test:resume-quality
npm run test:resume-optimization
```

Expected: all commands exit 0.

- [ ] **Step 2: Run source lint**

```powershell
npx eslint app components lib types scripts
```

Expected: exit 0.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: Next.js 16.2 production build exits 0.

- [ ] **Step 4: Run browser verification**

Start the app:

```powershell
npm run dev
```

Verify with the browser skill:

1. Open an existing confirmed project.
2. Trigger optimization.
3. Confirm the loading text states that three candidates are being generated and evaluated.
4. On success, confirm only one candidate is visible.
5. Confirm content `/40`, expression `/60`, and total comparison are rendered.
6. Confirm copy and save work for an accepted candidate.
7. Use a sparse project and confirm safe fallback preserves current content and shows at most three suggestions.
8. Confirm a simulated API failure shows technical-error language, not content-insufficiency language.
9. Confirm browser console contains no errors.

- [ ] **Step 5: Audit every design requirement**

Confirm from tests and source:

- Exactly three candidate styles are requested and normalized.
- Generation and evaluation are separate model requests with separate prompts.
- Original and all candidates are evaluated in one evaluation request.
- Content score is shared and totals 40.
- Expression score totals 60.
- Totals and pass/fail are computed in code.
- Introduced facts and missing core facts are hard failures.
- Winner total never falls below original.
- At least one expression dimension improves by at least 1.
- No expression dimension regresses by more than 2.
- Rejected candidates are never returned to the browser.
- No-winner responses contain no bullets.
- Sparse-content fallback returns at most three suggestions.
- Already-good fallback does not fabricate suggestions.
- Technical failure is separate from business fallback.
- Stored version-1 assessments do not crash the UI.
- Analytics contains no resume text.

- [ ] **Step 6: Review repository state**

```powershell
git diff --check
git status --short
git log -8 --oneline
```

Expected: no whitespace errors. Preserve unrelated untracked `.codex/` and `.playwright-cli/` directories.

- [ ] **Step 7: Final commit if verification required fixes**

Only if verification caused scoped fixes:

```powershell
git add <only-the-files-fixed-during-verification>
git commit -m "fix: harden resume optimization quality gate"
```
