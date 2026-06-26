import assert from "node:assert/strict";
import {
  getDeepSeekApiKey,
  RECOGNITION_DEEPSEEK_FAILURE_MESSAGE,
  RECOGNITION_MISSING_KEY_MESSAGE,
} from "../lib/ai/deepseekServer.ts";

assert.equal(getDeepSeekApiKey({}), "");
assert.equal(getDeepSeekApiKey({ DEEPSEEK_API_KEY: "   " }), "");
assert.equal(getDeepSeekApiKey({ DEEPSEEK_API_KEY: " sk-test \n" }), "sk-test");

assert.equal(
  RECOGNITION_MISSING_KEY_MESSAGE,
  "服务端未读取到 DEEPSEEK_API_KEY，请检查 Vercel 环境变量配置。",
);
assert.equal(
  RECOGNITION_DEEPSEEK_FAILURE_MESSAGE,
  "AI 识别请求失败，请稍后重试或检查服务端日志。",
);

console.log("deepseek server env handling passed");
