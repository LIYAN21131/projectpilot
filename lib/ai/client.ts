import type { InterviewQuestion, StarAnswer } from "@/types/interview";
import type { InterviewPreparationItem, Project, ResumeProjectFields } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";
import type {
  ResumeQualityResponse,
  ResumeQualityScore,
} from "@/types/resume-quality";
import { generateInterviewQuestions } from "./generateInterviewQuestions";
import { generateStarAnswer } from "./generateStarAnswer";
import { optimizeResume } from "./optimizeResume";

async function postAI<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `AI request failed: ${response.status}`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      message = errorBody.error || message;
    } catch {
      // Keep the status-based message when the response body cannot be parsed.
    }
    throw new Error(message);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("AI response parse failed");
  }
}

export async function optimizeResumeWithAIOrThrow(
  project: Project,
  targetRole: string,
): Promise<ResumeOptimizationResult> {
  return postAI<ResumeOptimizationResult>("/api/ai/optimize-resume", {
    project,
    targetRole,
  });
}

export async function optimizeResumeWithAI(
  project: Project,
  targetRole: string,
): Promise<ResumeOptimizationResult> {
  try {
    return await postAI<ResumeOptimizationResult>("/api/ai/optimize-resume", {
      project,
      targetRole,
    });
  } catch {
    return optimizeResume(project, targetRole);
  }
}

export async function optimizeResumeBulletsWithAI(
  fields: ResumeProjectFields,
): Promise<{ bullets: string[] }> {
  return postAI<{ bullets: string[] }>("/api/resume-optimize", fields);
}

export async function prepareInterviewWithAI(
  fields: ResumeProjectFields & { optimizedResumeBullets: string[] },
): Promise<{ questions: InterviewPreparationItem[] }> {
  return postAI<{ questions: InterviewPreparationItem[] }>("/api/interview-prepare", fields);
}

export async function scoreOriginalResumeQualityWithAI(
  fields: ResumeProjectFields,
  targetRole: string,
) {
  const response = await postAI<ResumeQualityResponse>("/api/ai/score-resume-quality", {
    mode: "before",
    fields,
    targetRole,
  });
  if (response.mode !== "before") {
    throw new Error("Unexpected resume quality response");
  }
  return response.score;
}

export async function scoreOptimizedResumeQualityWithAI(
  fields: ResumeProjectFields,
  optimizedBullets: string[],
  before: ResumeQualityScore,
  targetRole: string,
) {
  const response = await postAI<ResumeQualityResponse>("/api/ai/score-resume-quality", {
    mode: "after",
    fields,
    optimizedBullets,
    before,
    targetRole,
  });
  if (response.mode !== "after") {
    throw new Error("Unexpected resume quality response");
  }
  return {
    score: response.score,
    comparison: response.comparison,
  };
}

export async function generateInterviewQuestionsWithAI(
  project: Project,
): Promise<InterviewQuestion[]> {
  try {
    return await postAI<InterviewQuestion[]>("/api/ai/generate-interview", {
      project,
    });
  } catch {
    return generateInterviewQuestions(project);
  }
}

export async function generateStarAnswerWithAI(
  project: Project,
  question: string,
): Promise<StarAnswer> {
  try {
    return await postAI<StarAnswer>("/api/ai/generate-star-answer", {
      project,
      question,
    });
  } catch {
    console.log("answer source:", "fallback");
    const fallback = generateStarAnswer(project, question);
    console.log("answer length", fallback.interviewAnswer?.length ?? 0);
    return fallback;
  }
}
