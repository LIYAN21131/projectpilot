"use client";

import { useMemo, useState } from "react";
import { Clipboard, SendHorizontal } from "lucide-react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Select } from "@/components/common/Field";
import { Toast } from "@/components/common/Toast";
import { ProjectSelector } from "@/components/project/ProjectSelector";
import { optimizeResumeWithAI } from "@/lib/ai/client";
import { trackEvent } from "@/lib/analytics";
import { targetRoles } from "@/lib/mock/projects";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type { Project } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";

function originalResume(project?: Project) {
  if (!project) return "";
  return `项目名称：${project.name}
项目背景：${project.background || "待补充"}
目标用户：${project.targetUsers || "待补充"}
用户痛点：${project.painPoints || "待补充"}
个人职责：${project.responsibilities || "待补充"}
项目成果：${project.results || "待补充"}
数据指标：${project.metrics || "待补充"}`;
}

export function ResumeOptimizationPanel() {
  const { projects, resumeResults, setResumeResults } = useProjectPilotStore();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [targetRole, setTargetRole] = useState("产品经理");
  const [result, setResult] = useState<ResumeOptimizationResult | undefined>(resumeResults[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const effectiveProjectId = projectId || projects[0]?.id || "";
  const effectiveResult = result ?? resumeResults[0];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === effectiveProjectId),
    [projects, effectiveProjectId],
  );

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  }

  async function runOptimization() {
    if (!selectedProject) return;
    if (isOptimizing) return;
    setIsOptimizing(true);

    try {
      const next = await optimizeResumeWithAI(selectedProject, targetRole);
      setResult(next);
      setResumeResults([next, ...resumeResults]);
      trackEvent("resume_optimized", { projectId: selectedProject.id, targetRole });
      showToast("简历优化已完成");
    } catch {
      showToast("优化失败，请重试");
    } finally {
      setIsOptimizing(false);
    }
  }

  async function copyResult() {
    if (!effectiveResult) return;
    if (isCopying) return;
    setIsCopying(true);

    try {
      await navigator.clipboard.writeText(effectiveResult.optimizedContent);
      trackEvent("result_copied", { source: "resume", resultId: effectiveResult.id });
      showToast("已复制到剪贴板");
    } catch {
      showToast("复制失败，请手动复制");
    } finally {
      setIsCopying(false);
    }
  }

  if (!projects.length) {
    return (
      <EmptyState
        title="暂无可优化的项目"
        description="请先在项目档案中保存一个项目经历，再生成简历优化建议。"
      />
    );
  }

  return (
    <div className="grid min-h-[720px] overflow-hidden rounded border border-[var(--border)] bg-white xl:grid-cols-[minmax(0,1fr)_380px]">
      <Toast message={toastMessage} />
      <section className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8 rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-muted)]">
          已同步当前项目内容
        </div>
        <h2 className="text-2xl font-semibold">简历内容编辑</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">选择项目和目标岗位，生成适合投递的项目经历表达。</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">选择目标项目</span>
            <ProjectSelector projects={projects} value={effectiveProjectId} onChange={setProjectId} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">选择目标岗位</span>
            <Select value={targetRole} onChange={(event) => setTargetRole(event.target.value)}>
              {targetRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded border border-[var(--border)] p-5">
            <h3 className="mb-4 text-lg font-semibold">原始版本</h3>
            <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-muted)]">{originalResume(selectedProject)}</pre>
          </section>
          <section className="rounded border border-[var(--border)] p-5">
            <h3 className="mb-4 text-lg font-semibold">优化版本</h3>
            {effectiveResult ? (
              <pre className="whitespace-pre-wrap text-sm leading-7">{effectiveResult.optimizedContent}</pre>
            ) : (
              <p className="text-sm leading-7 text-[var(--text-muted)]">点击开始优化后，这里会展示优化版简历内容。</p>
            )}
          </section>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button onClick={runOptimization} disabled={isOptimizing} className="px-5">
            <SendHorizontal size={17} />
            {isOptimizing ? "优化中..." : "开始优化"}
          </Button>
          <Button variant="secondary" onClick={copyResult} disabled={!effectiveResult || isCopying}>
            <Clipboard size={15} />
            {isCopying ? "复制中..." : "复制"}
          </Button>
        </div>
      </section>

      <aside className="border-t border-[var(--border)] bg-[var(--surface-panel)] p-4 sm:p-6 lg:p-8 xl:border-l xl:border-t-0">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-semibold">AI 分析结果</h3>
          <span className="text-sm text-[var(--text-muted)]">最后更新：刚刚</span>
        </div>
        {!effectiveResult ? (
          <EmptyState title="等待生成优化结果" description="AI 分析项目内容后，会输出四类优化建议。" />
        ) : (
          <div className="space-y-3">
            {effectiveResult.suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded border border-[var(--border)] bg-white p-3 text-sm leading-6">
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
