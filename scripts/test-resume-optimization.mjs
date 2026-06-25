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
assert.equal(
  facts.find((fact) => fact.id === "responsibility-1")?.text,
  "负责需求分析",
);
assert.equal(
  facts.find((fact) => fact.id === "actions-2")?.text,
  "完成原型验证",
);
assert.equal(facts.find((fact) => fact.source === "tools")?.core, false);
assert.deepEqual(buildResumeFactList(fields), facts);

console.log("resume optimization fact extraction passed");
