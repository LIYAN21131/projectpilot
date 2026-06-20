import assert from "node:assert/strict";
import {
  cleanTargetUsersCandidates,
  extractTargetUsersCandidates,
  normalizeTargetUsers,
  normalizeTargetUsersCandidates,
} from "../lib/ai/targetUsers.ts";

const processText = (raw, aiCandidates = []) => {
  const candidates = cleanTargetUsersCandidates(raw, normalizeTargetUsersCandidates([
    ...aiCandidates,
    ...extractTargetUsersCandidates(raw),
  ]));

  return {
    targetUsersCandidates: candidates,
    targetUsers: normalizeTargetUsers(raw, candidates),
  };
};

const flowOnlyText = `因此我决定设计一款能够帮助用户快速梳理项目经历、生成面试回答的工具。
产品的核心流程为：用户输入项目经历→AI自动提炼STAR结构→生成面试回答→支持复制和保存。
为了验证产品效果，我接入了PostHog进行数据埋点，重点监测用户从输入项目资料到复制生成结果的转化漏斗。
根据测试反馈，我发现用户最关注的是面试回答生成质量，因此后续优化方向主要集中在行业场景细分、回答真实性增强以及项目亮点自动挖掘等功能。`;

assert.deepEqual(processText(flowOnlyText), {
  targetUsersCandidates: [],
  targetUsers: "",
});

assert.deepEqual(processText(flowOnlyText, [
  "用户输入项目经历",
  "AI自动提炼STAR结构",
  "生成面试回答",
  "支持复制和保存",
  "接入PostHog进行数据埋点",
  "后续优化方向主要集中在行业场景细分",
]), {
  targetUsersCandidates: [],
  targetUsers: "",
});

const clearGroupText = "在求职过程中，我发现很多应届生和产品经理求职者虽然做过项目，但在面试中经常无法清晰表达项目经历。";

assert.deepEqual(processText(clearGroupText), {
  targetUsersCandidates: ["应届生", "产品经理求职者"],
  targetUsers: "应届生、产品经理求职者",
});

console.log("targetUsers normalization passed 3 cases");
