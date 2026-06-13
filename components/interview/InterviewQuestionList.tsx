"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Clipboard, Sparkles } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Toast } from "@/components/common/Toast";
import { ProjectSelector } from "@/components/project/ProjectSelector";
import {
  generateInterviewQuestionsWithAI,
  generateStarAnswerWithAI,
} from "@/lib/ai/client";
import { trackEvent } from "@/lib/analytics";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type { InterviewPreparation, InterviewQuestion } from "@/types/interview";

const categories = ["项目背景题", "用户研究题", "产品设计题", "数据分析题", "复盘题", "挑战题"];

type AnswerStatus = "idle" | "loading" | "success" | "error";

function formatQuestion(question: InterviewQuestion) {
  return question.answerSuggestion.interviewAnswer ?? "";
}

function LoadingAnswerState() {
  return (
    <div className="rounded border border-[var(--border)] bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded bg-[var(--primary-soft)] text-[var(--primary)]">
        <Sparkles size={20} />
      </div>
      <h3 className="text-lg font-semibold">AI正在生成面试回答</h3>
      <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
        <p>正在分析项目内容...</p>
        <p>正在构建回答逻辑...</p>
        <p>正在生成最终答案...</p>
        <p>请稍候</p>
      </div>
      <div className="mx-auto mt-5 size-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
    </div>
  );
}

function ErrorAnswerState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded border border-[var(--border)] bg-white p-6 text-center">
      <h3 className="text-lg font-semibold">面试回答生成失败</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">请重试</p>
      <Button onClick={onRetry} className="mt-5">
        <Sparkles size={15} />
        重新生成
      </Button>
    </div>
  );
}

export function InterviewQuestionList() {
  const {
    projects,
    interviewQuestions,
    setInterviewQuestions,
    interviewPreparations,
    setInterviewPreparations,
  } = useProjectPilotStore();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [openId, setOpenId] = useState("");
  const [questions, setQuestions] = useState<InterviewQuestion[]>(interviewQuestions);
  const [toastMessage, setToastMessage] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [answerStatuses, setAnswerStatuses] = useState<Record<string, AnswerStatus>>({});
  const [copyingAnswerId, setCopyingAnswerId] = useState("");
  const pendingAnswerIds = useRef(new Set<string>());
  const effectiveProjectId = projectId || projects[0]?.id || "";
  const effectiveQuestions = questions.length ? questions : interviewQuestions;
  const visibleQuestions = effectiveQuestions.filter((question) =>
    categories.includes(question.category),
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === effectiveProjectId),
    [projects, effectiveProjectId],
  );

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  }

  function getAnswerStatus(question: InterviewQuestion) {
    return answerStatuses[question.id] ?? (question.answerSuggestion.interviewAnswer ? "success" : "idle");
  }

  function setAnswerStatus(questionId: string, status: AnswerStatus) {
    setAnswerStatuses((current) => ({ ...current, [questionId]: status }));
  }

  function markQuestionsIdle(next: InterviewQuestion[]) {
    setAnswerStatuses(
      next.reduce<Record<string, AnswerStatus>>((statuses, question) => {
        statuses[question.id] = "idle";
        return statuses;
      }, {}),
    );
  }

  function updateQuestionAnswer(questionId: string, answerSuggestion: InterviewQuestion["answerSuggestion"]) {
    const currentQuestions = questions.length ? questions : interviewQuestions;
    const updatedQuestions = currentQuestions.map((item) =>
      item.id === questionId ? { ...item, answerSuggestion } : item,
    );

    setQuestions(updatedQuestions);
    setInterviewQuestions(updatedQuestions);
    setInterviewPreparations(
      interviewPreparations.map((preparation, index) =>
        index === 0 && preparation.projectId === selectedProject?.id
          ? { ...preparation, questions: updatedQuestions }
          : preparation,
      ),
    );
  }

  async function generate() {
    if (!selectedProject) return;
    if (isGeneratingQuestions) return;
    setIsGeneratingQuestions(true);

    try {
      const next = await generateInterviewQuestionsWithAI(selectedProject);
      const preparation: InterviewPreparation = {
        id: crypto.randomUUID(),
        projectId: selectedProject.id,
        questions: next,
        createdAt: new Date().toISOString(),
      };
      setQuestions(next);
      setInterviewQuestions(next);
      setInterviewPreparations([preparation, ...interviewPreparations]);
      markQuestionsIdle(next);
      setOpenId("");
      trackEvent("interview_generated", { projectId: selectedProject.id });
      showToast("面试题已生成");
    } catch {
      showToast("生成失败，请重试");
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  async function openQuestion(question: InterviewQuestion, open: boolean) {
    if (open) {
      setOpenId("");
      return;
    }

    setOpenId(question.id);

    if (!selectedProject) return;
    if (getAnswerStatus(question) === "success") {
      console.log("answer source:", "storage");
      return;
    }
    if (pendingAnswerIds.current.has(question.id)) return;

    pendingAnswerIds.current.add(question.id);
    setAnswerStatus(question.id, "loading");

    try {
      const answerSuggestion = await generateStarAnswerWithAI(selectedProject, question.question);
      if (!answerSuggestion.interviewAnswer) {
        throw new Error("Missing interview answer");
      }

      updateQuestionAnswer(question.id, answerSuggestion);
      setAnswerStatus(question.id, "success");
      showToast("面试回答已生成");
    } catch {
      setAnswerStatus(question.id, "error");
      showToast("答案生成失败，请重试");
    } finally {
      pendingAnswerIds.current.delete(question.id);
    }
  }

  async function regenerateAnswer(question: InterviewQuestion) {
    if (!selectedProject) return;
    if (pendingAnswerIds.current.has(question.id)) return;

    const clearedAnswer = {
      ...question.answerSuggestion,
      interviewAnswer: "",
    };
    updateQuestionAnswer(question.id, clearedAnswer);
    showToast("缓存已清除，可重新生成");

    pendingAnswerIds.current.add(question.id);
    setAnswerStatus(question.id, "loading");

    try {
      const answerSuggestion = await generateStarAnswerWithAI(selectedProject, question.question);
      if (!answerSuggestion.interviewAnswer) {
        throw new Error("Missing interview answer");
      }

      updateQuestionAnswer(question.id, answerSuggestion);
      setAnswerStatus(question.id, "success");
      showToast("面试回答已生成");
    } catch {
      setAnswerStatus(question.id, "error");
      showToast("答案生成失败，请重试");
    } finally {
      pendingAnswerIds.current.delete(question.id);
    }
  }

  async function copyInterviewAnswer(question: InterviewQuestion) {
    if (copyingAnswerId) return;
    setCopyingAnswerId(question.id);

    try {
      await navigator.clipboard.writeText(formatQuestion(question));
      showToast("已复制到剪贴板");
      trackEvent("result_copied", { source: "interview_answer", questionId: question.id });
    } catch {
      showToast("复制失败，请手动复制");
    } finally {
      setCopyingAnswerId("");
    }
  }

  if (!projects.length) {
    return (
      <EmptyState
        title="暂无可准备面试的项目"
        description="请先在项目档案中保存一个项目经历，再生成面试题与回答建议。"
      />
    );
  }

  return (
    <div className="grid min-h-[680px] rounded border border-[var(--border)] bg-white lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-panel)] py-4 lg:overflow-visible lg:border-b-0 lg:border-r lg:py-5">
        <div className="px-5 pb-3 text-xs font-bold uppercase text-[var(--text-subtle)]">面试类目</div>
        <div className="flex min-w-max lg:block lg:min-w-0">
          {categories.map((category, index) => (
            <a
              key={category}
              href={`#category-${index}`}
              className={`block border-b-2 px-5 py-3 text-sm font-medium lg:border-b-0 lg:border-r-2 ${
                index === 0
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:bg-white"
              }`}
            >
              {category}
            </a>
          ))}
        </div>
      </aside>

      <section className="p-4 sm:p-6 lg:p-8">
        <Toast message={toastMessage} />

        <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto]">
          <ProjectSelector projects={projects} value={effectiveProjectId} onChange={setProjectId} />
          <Button onClick={generate} disabled={isGeneratingQuestions}>
            <Sparkles size={17} />
            {isGeneratingQuestions ? "生成中..." : "生成面试题"}
          </Button>
        </div>

        {!visibleQuestions.length ? (
          <EmptyState
            title="等待生成面试题"
            description="生成后会展示项目背景、用户研究、产品设计、数据分析、复盘和挑战题。"
          />
        ) : (
          <div className="space-y-8">
            {categories.map((category, index) => {
              const group = visibleQuestions.filter((question) => question.category === category);
              if (!group.length) return null;
              return (
                <section key={category} id={`category-${index}`}>
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex size-11 items-center justify-center rounded bg-[var(--primary-soft)] text-[var(--primary)]">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold">{category}</h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        基于当前项目内容生成可展开的回答建议。
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.map((question, questionIndex) => {
                      const open = openId === question.id;
                      const answerStatus = getAnswerStatus(question);
                      const isGeneratingAnswer = answerStatus === "loading";
                      const isCopyingAnswer = copyingAnswerId === question.id;
                      return (
                        <article key={question.id} className="rounded border border-[var(--border)] bg-white">
                          <button
                            onClick={() => openQuestion(question, open)}
                            disabled={isGeneratingAnswer}
                            className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-3 text-sm font-semibold">
                              <span className="rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--text-muted)]">
                                Q{questionIndex + 1}
                              </span>
                              <span className="rounded bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                                {question.type === "common" ? "常见问题" : "深挖问题"}
                              </span>
                              <span className="min-w-0 flex-1">{question.question}</span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-2 text-sm text-[var(--text-muted)]">
                              {isGeneratingAnswer ? "生成中..." : null}
                              {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </span>
                          </button>
                          {open ? (
                            <div className="border-t border-[var(--border)] bg-[var(--surface-panel)] p-4">
                              {answerStatus === "loading" ? <LoadingAnswerState /> : null}

                              {answerStatus === "error" ? (
                                <ErrorAnswerState onRetry={() => regenerateAnswer(question)} />
                              ) : null}

                              {answerStatus === "success" ? (
                                <>
                                  <div className="mb-5 rounded border border-[var(--border)] bg-white p-4">
                                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <h3 className="font-semibold">面试回答示例</h3>
                                      <div className="flex flex-wrap gap-2">
                                        <Button variant="secondary" onClick={() => regenerateAnswer(question)}>
                                          <Sparkles size={15} />
                                          重新生成答案
                                        </Button>
                                        <Button variant="secondary" onClick={() => copyInterviewAnswer(question)} disabled={isCopyingAnswer}>
                                          <Clipboard size={15} />
                                          {isCopyingAnswer ? "复制中..." : "复制回答"}
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-sm leading-7 text-[var(--foreground)]">
                                      {formatQuestion(question)}
                                    </p>
                                  </div>
                                  <div className="mb-4 flex items-center justify-between">
                                    <span className="inline-flex rounded bg-white px-2 py-1 text-xs font-medium text-[var(--primary)]">
                                      STAR回答结构
                                    </span>
                                  </div>
                                  <div className="grid gap-3 text-sm leading-6">
                                    <p><strong>Situation：</strong>{question.answerSuggestion.situation}</p>
                                    <p><strong>Task：</strong>{question.answerSuggestion.task}</p>
                                    <p><strong>Action：</strong>{question.answerSuggestion.action}</p>
                                    <p><strong>Result：</strong>{question.answerSuggestion.result}</p>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
