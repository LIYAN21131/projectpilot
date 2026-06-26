import assert from "node:assert/strict";
import {
  getProjectNameDisplay,
  isUnnamedProjectName,
  validateProjectName,
  updateProjectNameInList,
} from "../lib/project/projectName.ts";

const now = "2026-06-26T12:00:00.000Z";
const baseProject = {
  id: "p1",
  name: "",
  background: "",
  targetUsers: "",
  painPoints: "",
  solution: "",
  responsibilities: "",
  results: "",
  metrics: "",
  tools: "",
  review: "",
  createdAt: "2026-06-25T12:00:00.000Z",
  updatedAt: "2026-06-25T12:00:00.000Z",
  editorState: {
    activeSection: "material-import",
    scrollY: 0,
    lastSavedAt: "2026-06-25T12:00:00.000Z",
    lastEditedAt: "2026-06-25T12:00:00.000Z",
    hasUnsavedDraft: false,
    status: "待完善",
  },
};

assert.equal(getProjectNameDisplay(""), "未命名项目");
assert.equal(getProjectNameDisplay("  "), "未命名项目");
assert.equal(getProjectNameDisplay("校园二手交易平台"), "校园二手交易平台");
assert.equal(isUnnamedProjectName(""), true);
assert.equal(isUnnamedProjectName("未命名项目"), true);
assert.equal(isUnnamedProjectName("真实项目"), false);
assert.deepEqual(validateProjectName("  "), { ok: false, message: "项目名称不能为空" });
assert.deepEqual(validateProjectName("一".repeat(31)), { ok: false, message: "项目名称不能超过 30 个字" });
assert.deepEqual(validateProjectName(" 校园二手交易平台 "), { ok: true, value: "校园二手交易平台" });

const result = updateProjectNameInList([baseProject], "p1", "校园二手交易平台", now);
assert.equal(result.ok, true);
assert.equal(result.projects[0].name, "校园二手交易平台");
assert.equal(result.projects[0].updatedAt, now);
assert.equal(result.projects[0].editorState.lastSavedAt, now);
assert.equal(result.projects[0].editorState.lastEditedAt, now);
assert.equal(result.projects[0].editorState.status, "待完善");
assert.equal(updateProjectNameInList([baseProject], "missing", "新名称", now).ok, false);

console.log("project name helpers passed");
