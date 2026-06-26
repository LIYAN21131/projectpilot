import assert from "node:assert/strict";
import {
  buildResumeQualityComparison,
  normalizeResumeQualityScore,
} from "../lib/resume-quality/normalize.ts";
import {
  createBeforeResumeQualityFingerprint,
  createComparisonResumeQualityFingerprint,
} from "../lib/resume-quality/fingerprint.ts";
import { formatResumeQualityChange } from "../lib/resume-quality/presentation.ts";
import { markResumeQualityAssessmentStale } from "../lib/resume-quality/state.ts";

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
assert.equal(before.total, 69);
assert.deepEqual(before.dimensions.map((item) => item.score), [19, 0, 14, 20, 16]);

assert.throws(
  () => normalizeResumeQualityScore({
    ...raw,
    dimensions: raw.dimensions.slice(0, 4),
  }),
  /five dimensions/i,
);

assert.throws(
  () => normalizeResumeQualityScore({
    ...raw,
    dimensions: raw.dimensions.map((item) => (
      item.key === "impact" ? { ...item, key: "completeness" } : item
    )),
  }),
  /unique dimensions/i,
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

assert.equal(after.total, 75);
assert.equal(comparison.improvement, 6);
assert.equal(comparison.highlights.length, 3);
assert.equal(comparison.dimensionChanges[0].change, -4);

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
  createBeforeResumeQualityFingerprint(fields, "产品运营"),
);
assert.notEqual(
  createBeforeResumeQualityFingerprint(fields, "产品经理"),
  createComparisonResumeQualityFingerprint(fields, ["优化 bullet"], "产品经理"),
);

assert.equal(formatResumeQualityChange(8), "+8");
assert.equal(formatResumeQualityChange(0), "0");
assert.equal(formatResumeQualityChange(-3), "-3");

const assessment = {
  version: 1,
  rubricVersion: 1,
  targetRole: "产品经理",
  before,
  status: "current",
  sourceFingerprint: "same",
  createdAt: "2026-06-24T00:00:00.000Z",
  updatedAt: "2026-06-24T00:00:00.000Z",
};

assert.equal(markResumeQualityAssessmentStale(assessment, "same")?.status, "current");
assert.equal(markResumeQualityAssessmentStale(assessment, "changed")?.status, "stale");
assert.equal(
  markResumeQualityAssessmentStale({ ...assessment, status: "stale" }, "same")?.status,
  "current",
);
assert.equal(markResumeQualityAssessmentStale(undefined, "changed"), undefined);

console.log("resume quality normalization passed");
