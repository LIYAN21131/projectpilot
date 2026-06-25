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
  facts,
  [
    {
      id: "projectName-1",
      source: "projectName",
      text: "ProjectPilot",
      core: false,
    },
    {
      id: "background-1",
      source: "background",
      text: "求职者难以整理项目经历",
      core: false,
    },
    {
      id: "painPoint-1",
      source: "painPoint",
      text: "表达松散",
      core: false,
    },
    {
      id: "painPoint-2",
      source: "painPoint",
      text: "缺少岗位重点",
      core: false,
    },
    {
      id: "responsibility-1",
      source: "responsibility",
      text: "负责需求分析",
      core: true,
    },
    {
      id: "responsibility-2",
      source: "responsibility",
      text: "设计核心流程",
      core: true,
    },
    {
      id: "actions-1",
      source: "actions",
      text: "访谈目标用户",
      core: true,
    },
    {
      id: "actions-2",
      source: "actions",
      text: "完成原型验证",
      core: true,
    },
    {
      id: "result-1",
      source: "result",
      text: "完成 MVP 验证",
      core: true,
    },
    {
      id: "metrics-1",
      source: "metrics",
      text: "邀请 8 名用户试用",
      core: true,
    },
    {
      id: "tools-1",
      source: "tools",
      text: "Figma、Next.js",
      core: false,
    },
  ],
);
assert.deepEqual(buildResumeFactList(fields), facts);

console.log("resume optimization fact extraction passed");
