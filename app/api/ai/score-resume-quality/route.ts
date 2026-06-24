import { NextResponse } from "next/server";
import {
  buildAfterResumeQualityPrompt,
  buildBeforeResumeQualityPrompt,
} from "@/lib/resume-quality/prompt";
import {
  normalizeScoringRequest,
  normalizeScoringResponse,
} from "@/lib/resume-quality/service";
import type { ResumeQualityRequest } from "@/types/resume-quality";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

function normalizeBaseUrl(value?: string) {
  return (value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function promptForRequest(request: ResumeQualityRequest) {
  return request.mode === "before"
    ? buildBeforeResumeQualityPrompt(request.fields, request.targetRole)
    : buildAfterResumeQualityPrompt(
      request.fields,
      request.optimizedBullets,
      request.targetRole,
    );
}

async function requestDeepSeek(request: ResumeQualityRequest, apiKey: string) {
  const response = await fetch(`${normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL)}/chat/completions`, {
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
          content: "你是严格遵循 JSON 输出合同的中文简历表达质量评估器。",
        },
        {
          role: "user",
          content: promptForRequest(request),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error("模型服务暂时不可用");
  }

  const payload = (await response.json()) as DeepSeekChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("模型未返回评分内容");
  }
  return content;
}

export async function POST(request: Request) {
  let scoringRequest: ResumeQualityRequest;

  try {
    scoringRequest = normalizeScoringRequest(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "请求内容格式异常" },
      { status: 400 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "评分服务暂时不可用" },
      { status: 503 },
    );
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await requestDeepSeek(scoringRequest, apiKey);
      return NextResponse.json(
        normalizeScoringResponse(scoringRequest, JSON.parse(content)),
      );
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json(
    {
      error: lastError instanceof Error
        ? lastError.message
        : "评分结果格式异常，请稍后重试",
    },
    { status: 502 },
  );
}
