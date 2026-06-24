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
    <div className="grid min-h-[720px] overflow-hidden rounded-lg border border-[var(--border)] bg-white xl:grid-cols-[minmax(0,1fr)_360px]">
      <Toast message={toastMessage} />
      <section className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center gap-2 rounded-lg border border-blue-100 bg-[var(--primary-soft)] px-4 py-3 text-sm text-blue-800">
          <span className="size-2 rounded-full bg-[var(--primary)]" />
          使用项目档案中的已保存内容
        </div>
        <h2 className="text-xl font-semibold">生成设置</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">选择项目和目标岗位，生成后请结合真实经历逐项核对。</p>

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
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">输入</p>
              <h3 className="mt-1 text-base font-semibold">项目原始内容</h3>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-muted)]">{originalResume(selectedProject)}</pre>
          </section>
          <section className="rounded-lg border border-[var(--border)] p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">输出</p>
              <h3 className="mt-1 text-base font-semibold">简历项目表述</h3>
            </div>
            {effectiveResult ? (
              <pre className="whitespace-pre-wrap text-sm leading-7">{effectiveResult.optimizedContent}</pre>
            ) : (
              <p className="text-sm leading-7 text-[var(--text-muted)]">生成后将在此显示可编辑、可复制的项目经历表述。</p>
            )}
          </section>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Button onClick={runOptimization} disabled={isOptimizing} className="px-5">
            <SendHorizontal size={17} />
            {isOptimizing ? "正在生成..." : "生成简历表述"}
          </Button>
          <Button variant="secondary" onClick={copyResult} disabled={!effectiveResult || isCopying}>
            <Clipboard size={15} />
            {isCopying ? "复制中..." : "复制"}
          </Button>
        </div>
      </section>

      <aside className="border-t border-[var(--border)] bg-[var(--surface-panel)] p-4 sm:p-6 lg:p-8 xl:border-l xl:border-t-0">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">校对参考</p>
          <h3 className="mt-1 text-lg font-semibold">表达建议</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">用于检查信息完整性，不替代你的真实项目判断。</p>
        </div>
        {!effectiveResult ? (
          <EmptyState title="暂无表达建议" description="生成简历表述后，这里会同步展示需要核对的重点。" />
        ) : (
          <div className="space-y-3">
            {effectiveResult.suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm leading-6">
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
