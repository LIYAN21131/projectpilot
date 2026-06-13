import type { InterviewQuestion, StarAnswer } from "@/types/interview";
import type { Project } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";
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
    throw new Error(`AI request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
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
