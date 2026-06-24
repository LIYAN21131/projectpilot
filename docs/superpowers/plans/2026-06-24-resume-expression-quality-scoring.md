# Resume Expression Quality Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add non-blocking before/after resume expression quality scoring to the existing ProjectEditor flow, with DeepSeek-backed structured evaluation, persisted project data, stale detection, retry states, and a restrained comparison UI.

**Architecture:** Keep scoring isolated from the existing recognition and optimization APIs. A focused scoring route accepts either a before-only or after-comparison request, calls DeepSeek with a strict JSON contract, normalizes the response, and returns program-computed totals and differences. ProjectEditor coordinates requests and persistence, while a dedicated presentational component renders loading, error, stale, before-only, and complete comparison states.

**Tech Stack:** Next.js 16 App Router route handlers, React 19 client components, TypeScript, Tailwind CSS 4, Node built-in test runner/assertions, DeepSeek OpenAI-compatible API.

---

## File Map

- Create `types/resume-quality.ts`: scoring keys, score, comparison, assessment, API request/response types.
- Modify `types/project.ts`: add optional `resumeQualityAssessment`.
- Create `lib/resume-quality/normalize.ts`: validate AI payloads, clamp scores, calculate totals and changes.
- Create `lib/resume-quality/fingerprint.ts`: deterministic stage-specific fingerprints.
- Create `lib/resume-quality/prompt.ts`: fixed rubric, truth constraints, and before/after prompt builders.
- Create `app/api/ai/score-resume-quality/route.ts`: request validation, DeepSeek call, one controlled retry, normalized responses.
- Modify `lib/ai/client.ts`: add before and after scoring client calls without fallback scores.
- Create `components/resume/ResumeQualityComparison.tsx`: pure UI for all scoring states.
- Modify `components/project/ProjectEditor.tsx`: trigger, restore, stale detection, retry, and persistence coordination.
- Create `scripts/test-resume-quality.mjs`: deterministic normalization/fingerprint/prompt tests.
- Modify `package.json`: add `test:resume-quality`.

### Task 1: Define scoring types and normalization behavior

**Files:**
- Create: `scripts/test-resume-quality.mjs`
- Create: `types/resume-quality.ts`
- Create: `lib/resume-quality/normalize.ts`
- Modify: `types/project.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing normalization tests**

Create `scripts/test-resume-quality.mjs` with assertions that:

```js
import assert from "node:assert/strict";
import {
  normalizeResumeQualityScore,
  buildResumeQualityComparison,
} from "../lib/resume-quality/normalize.ts";

const raw = {
  dimensions: [
    { key: "completeness", score: 18.6, reason: "完整链路清楚" },
    { key: "impact", score: -2, reason: "成果价值较弱" },
    { key: "logic", score: 14, reason: "结构清晰" },
    { key: "roleFit", score: 21, reason: "岗位能力突出" },
    { key: "professionalism", score: 16, reason: "表达专业" },
  ],
  summary: "整体可用",
};

const before = normalizeResumeQualityScore(raw);
assert.equal(before.total, 68);
assert.deepEqual(before.dimensions.map((item) => item.score), [19, 0, 14, 20, 16]);

assert.throws(
  () => normalizeResumeQualityScore({
    ...raw,
    dimensions: raw.dimensions.slice(0, 4),
  }),
  /five dimensions/i,
);

const after = normalizeResumeQualityScore({
  ...raw,
  dimensions: raw.dimensions.map((item) => ({ ...item, score: 15 })),
  summary: "优化后",
});

const comparison = buildResumeQualityComparison(before, after, {
  dimensionReasons: raw.dimensions.map(({ key }) => ({ key, reason: `${key} changed` })),
  highlights: ["一", "二", "三", "四"],
  summary: "对比总结",
});

assert.equal(comparison.improvement, 7);
assert.equal(comparison.highlights.length, 3);
assert.equal(comparison.dimensionChanges[0].change, -4);
```

Add `"test:resume-quality": "node --no-warnings --experimental-strip-types scripts/test-resume-quality.mjs"` to `package.json`.

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
npm run test:resume-quality
```

Expected: FAIL because `lib/resume-quality/normalize.ts` does not exist.

- [ ] **Step 3: Add types and minimal normalizer**

Define the five fixed keys and display names in `types/resume-quality.ts`. Implement:

```ts
export function normalizeResumeQualityScore(input: unknown): ResumeQualityScore
export function buildResumeQualityComparison(
  before: ResumeQualityScore,
  after: ResumeQualityScore,
  input: unknown,
): ResumeQualityComparison
```

Rules:

- exactly five unique known keys;
- reason and summary must be non-empty strings;
- scores use `Math.round` then clamp to `0..20`;
- output dimensions follow the fixed rubric order;
- total is the programmatic sum;
- comparison changes and improvement are programmatic;
- highlights are trimmed, non-empty, and limited to three.

Add `resumeQualityAssessment?: ResumeQualityAssessment` to `Project`.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```powershell
npm run test:resume-quality
```

Expected: PASS with no warnings.

### Task 2: Add deterministic fingerprints and prompt constraints

**Files:**
- Modify: `scripts/test-resume-quality.mjs`
- Create: `lib/resume-quality/fingerprint.ts`
- Create: `lib/resume-quality/prompt.ts`

- [ ] **Step 1: Add failing fingerprint and prompt tests**

Append assertions:

```js
import {
  createBeforeResumeQualityFingerprint,
  createComparisonResumeQualityFingerprint,
} from "../lib/resume-quality/fingerprint.ts";
import {
  buildBeforeResumeQualityPrompt,
  buildAfterResumeQualityPrompt,
} from "../lib/resume-quality/prompt.ts";

const fields = {
  projectName: "ProjectPilot",
  background: "求职者项目表达不清",
  painPoint: "缺少结构",
  responsibility: "需求分析",
  actions: "设计整理流程",
  result: "完成 MVP 验证",
  metrics: "",
  tools: "Next.js",
};

assert.equal(
  createBeforeResumeQualityFingerprint(fields, "产品经理"),
  createBeforeResumeQualityFingerprint({ ...fields }, "产品经理"),
);
assert.notEqual(
  createBeforeResumeQualityFingerprint(fields, "产品经理"),
  createBeforeResumeQualityFingerprint({ ...fields, result: "结果变化" }, "产品经理"),
);
assert.notEqual(
  createBeforeResumeQualityFingerprint(fields, "产品经理"),
  createComparisonResumeQualityFingerprint(fields, ["优化 bullet"], "产品经理"),
);

const beforePrompt = buildBeforeResumeQualityPrompt(fields, "产品经理");
const afterPrompt = buildAfterResumeQualityPrompt(fields, ["优化 bullet"], "产品经理");
for (const prompt of [beforePrompt, afterPrompt]) {
  assert.match(prompt, /不得虚构/);
  assert.match(prompt, /不能判断经历真实性/);
  assert.match(prompt, /合法 JSON/);
  assert.match(prompt, /0 到 20/);
}
assert.match(afterPrompt, /允许持平或下降/);
```

- [ ] **Step 2: Run the test and verify RED**

Run `npm run test:resume-quality`.

Expected: FAIL because fingerprint and prompt modules do not exist.

- [ ] **Step 3: Implement deterministic helpers**

Implement stable field serialization in fixed key order and a small deterministic hash returning a versioned string such as `rq-v1-xxxxxxxx`. Use separate before/comparison functions so adding bullets changes the fingerprint.

Implement prompt builders containing:

- the five fixed rubric dimensions and score bands;
- all 15 truth and output constraints from the design;
- target role;
- original fields;
- optimized bullets only for after comparison;
- exact JSON-only output shape.

- [ ] **Step 4: Run the test and verify GREEN**

Run `npm run test:resume-quality`.

Expected: PASS.

### Task 3: Implement the scoring route and client contract

**Files:**
- Modify: `scripts/test-resume-quality.mjs`
- Create: `app/api/ai/score-resume-quality/route.ts`
- Modify: `lib/ai/client.ts`

- [ ] **Step 1: Add failing request-normalization tests**

Export a pure `scoreResumeQualityPayload` helper from a colocated server module or `lib/resume-quality/service.ts` so it can be tested without HTTP. Add tests for:

```js
import { normalizeScoringRequest } from "../lib/resume-quality/service.ts";

assert.equal(normalizeScoringRequest({
  mode: "before",
  fields,
  targetRole: "产品经理",
}).mode, "before");

assert.throws(
  () => normalizeScoringRequest({ mode: "after", fields, targetRole: "产品经理", bullets: [] }),
  /optimized bullets/i,
);
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-quality`.

Expected: FAIL because `service.ts` does not exist.

- [ ] **Step 3: Implement route and client**

Create `lib/resume-quality/service.ts` for request validation and normalized response assembly.

Create `POST /api/ai/score-resume-quality`:

- parse JSON and return 400 for invalid/missing fields;
- return 503 when `DEEPSEEK_API_KEY` is absent;
- call `${DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/chat/completions`;
- use `DEEPSEEK_MODEL || "deepseek-chat"`;
- request `response_format: { type: "json_object" }`;
- use temperature `0.1`;
- retry exactly once when JSON parsing or normalization fails;
- return 502 after the second invalid response;
- never return a locally fabricated score.

Add client functions:

```ts
scoreOriginalResumeQualityWithAI(fields, targetRole)
scoreOptimizedResumeQualityWithAI(fields, optimizedBullets, before, targetRole)
```

Both must throw through `postAI`; no fallback score.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npm run test:resume-quality
npx eslint app/api/ai/score-resume-quality lib/resume-quality lib/ai/client.ts types
```

Expected: both commands exit 0.

### Task 4: Build the comparison component

**Files:**
- Create: `components/resume/ResumeQualityComparison.tsx`
- Modify: `scripts/test-resume-quality.mjs`

- [ ] **Step 1: Add failing pure presentation-helper tests**

Export and test:

```ts
formatResumeQualityChange(value: number): string
```

Assertions:

```js
import { formatResumeQualityChange } from "../components/resume/ResumeQualityComparison.tsx";
assert.equal(formatResumeQualityChange(8), "+8");
assert.equal(formatResumeQualityChange(0), "0");
assert.equal(formatResumeQualityChange(-3), "-3");
```

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-quality`.

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the component**

Props:

```ts
type Props = {
  assessment?: ResumeQualityAssessment;
  state: "idle" | "loading-before" | "loading-after" | "ready" | "error-before" | "error-after";
  onRetryBefore: () => void;
  onRetryAfter: () => void;
};
```

Render:

- idle explanatory state;
- localized loading message without blocking other content;
- before-only total and five dimensions plus “完成简历优化后查看对比”;
- complete top summary cards, five dimension comparisons, collapsible reasons, three highlights, summary;
- neutral stale banner;
- localized retry button for each failure state;
- no risk level, gauge, radar chart, celebratory animation, or claims of guaranteed improvement.

- [ ] **Step 4: Run tests and lint**

Run:

```powershell
npm run test:resume-quality
npx eslint components/resume/ResumeQualityComparison.tsx
```

Expected: PASS and exit 0.

### Task 5: Integrate scoring into ProjectEditor

**Files:**
- Modify: `components/project/ProjectEditor.tsx`

- [ ] **Step 1: Add failing state-transition helper tests**

Create pure helpers in `lib/resume-quality/state.ts` and test:

```ts
markResumeQualityAssessmentStale(
  assessment,
  expectedFingerprint,
): ResumeQualityAssessment
```

Assertions:

- matching fingerprint keeps `current`;
- mismatching fingerprint returns a copy with `stale`;
- undefined assessment remains undefined.

- [ ] **Step 2: Run and verify RED**

Run `npm run test:resume-quality`.

Expected: FAIL because `state.ts` does not exist.

- [ ] **Step 3: Implement state helper and editor integration**

In `ProjectEditor`:

- restore saved assessment when loading a project;
- maintain a temporary assessment state and request state;
- after successful `confirmRecognitionResult`, call original scoring asynchronously;
- persist the before assessment into the same project without changing the localStorage key;
- after successful optimization, call after scoring asynchronously;
- keep after score temporary until `saveResumeBullets`;
- save optimized bullets and complete assessment together;
- add independent retry handlers;
- mark saved assessment stale when confirmed fields, bullets, target role, or rubric fingerprint no longer matches;
- render `ResumeQualityComparison` below the optimization result;
- do not gate optimization, copy, save, or interview generation on scoring state.

- [ ] **Step 4: Run focused checks**

Run:

```powershell
npm run test:resume-quality
npx eslint components/project/ProjectEditor.tsx components/resume/ResumeQualityComparison.tsx lib/resume-quality lib/ai/client.ts types
```

Expected: exit 0.

### Task 6: Full verification and requirements audit

**Files:**
- Verify all modified feature files.

- [ ] **Step 1: Run all deterministic tests**

```powershell
npm run test:parser
npm run test:target-users
npm run test:resume-quality
```

Expected: all exit 0.

- [ ] **Step 2: Run source lint**

Because the repository contains `.worktrees` build artifacts that the broad lint command may scan, run:

```powershell
npx eslint app components lib types scripts
```

Expected: 0 errors.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: Next.js 16 production build exits 0.

- [ ] **Step 4: Audit the design requirements**

Verify from the diff and tests:

- before score triggers after confirmed save;
- after score triggers after optimization;
- failures never block existing flow;
- totals and changes are program-computed;
- no local fallback score exists;
- no existing localStorage key changed;
- complete assessment persists only with save;
- stale state preserves previous result;
- no authenticity-risk UI is rendered;
- prompt prohibits fabricated facts and metrics.

- [ ] **Step 5: Review repository status**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors. Preserve pre-existing UI modifications and report all remaining untracked directories.

## Execution Note

The working tree already contains user-owned, uncommitted UI changes, including `ProjectEditor.tsx`. Do not create implementation commits that accidentally bundle those changes. Keep the feature changes reviewable in the working tree unless the user explicitly requests a commit strategy.
