import { NextResponse } from "next/server";
import {
  executeResumeOptimization,
  normalizeResumeOptimizationRequest,
  type JsonModelCaller,
} from "@/lib/resume-optimization/service";
import type { ResumeOptimizationRequest } from "@/types/resume-optimization";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";
const SYSTEM_MESSAGE =
  "你是中文简历事实约束优化器。只能依据用户确认的事实改写和评估，不得编造、推断或遗漏核心事实；必须严格返回提示词要求的 JSON 对象，不得输出 Markdown、解释或额外文本。";
const SERVICE_UNAVAILABLE_MESSAGE = "简历优化服务暂时不可用，请稍后再试。";
const TECHNICAL_FAILURE_MESSAGE = "简历优化失败，请稍后重试。";

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function normalizeBaseUrl(value?: string) {
  return (value?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function createDeepSeekCaller(apiKey: string): JsonModelCaller {
  return async ({ prompt, temperature }) => {
    const response = await fetch(
      `${normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL)}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
          messages: [
            { role: "system", content: SYSTEM_MESSAGE },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          stream: false,
          temperature,
        }),
      },
    );

    if (!response.ok) {
      throw new Error("DeepSeek request failed");
    }

    const payload = (await response.json()) as DeepSeekChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error("DeepSeek returned empty content");
    }

    return JSON.parse(content);
  };
}

export async function POST(request: Request) {
  let optimizationRequest: ResumeOptimizationRequest;
  try {
    optimizationRequest = normalizeResumeOptimizationRequest(
      await request.json(),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "请求内容格式不正确。",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: SERVICE_UNAVAILABLE_MESSAGE },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json(
      await executeResumeOptimization(
        optimizationRequest,
        createDeepSeekCaller(apiKey),
      ),
    );
  } catch {
    return NextResponse.json(
      { error: TECHNICAL_FAILURE_MESSAGE },
      { status: 502 },
    );
  }
}
