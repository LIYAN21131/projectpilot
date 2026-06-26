export const RECOGNITION_MISSING_KEY_MESSAGE =
  "服务端未读取到 DEEPSEEK_API_KEY，请检查 Vercel 环境变量配置。";

export const RECOGNITION_DEEPSEEK_FAILURE_MESSAGE =
  "AI 识别请求失败，请稍后重试或检查服务端日志。";

export function getDeepSeekApiKey(env: NodeJS.ProcessEnv = process.env) {
  return env.DEEPSEEK_API_KEY?.trim() ?? "";
}
