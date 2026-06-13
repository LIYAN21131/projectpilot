"use client";

import Link from "next/link";
import { Clipboard, FileText, Save, SendHorizontal, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Input, Select, Textarea } from "@/components/common/Field";
import { Toast } from "@/components/common/Toast";
import { optimizeResumeWithAI } from "@/lib/ai/client";
import { formatProjectMetrics } from "@/lib/ai/extractProjectMetrics";
import {
  checkProjectMissingFields,
  identifyProjectType,
  suggestProjectMetrics,
} from "@/lib/ai/rules/projectRules";
import { trackEvent } from "@/lib/analytics";
import { targetRoles } from "@/lib/mock/projects";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type { Project } from "@/types/project";
import type { ResumeOptimizationResult } from "@/types/resume";

const emptyProject = (): Project => ({
  id: crypto.randomUUID(),
  name: "",
  background: "",
  targetUsers: "",
  painPoints: "",
  solution: "",
  responsibilities: "",
  results: "",
  metrics: "",
  review: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const sections = [
  { id: "background", label: "项目背景", key: "background", placeholder: "描述项目初衷、业务场景、团队环境和外部约束。" },
  { id: "pain-points", label: "用户痛点", key: "painPoints", placeholder: "描述旧流程、旧产品或目标用户遇到的关键问题。" },
  { id: "target-users", label: "目标用户", key: "targetUsers", placeholder: "描述项目服务的人群、使用场景和核心诉求。" },
  { id: "solutions", label: "解决方案", key: "solution", placeholder: "描述你的产品方案、功能设计、流程优化或策略选择。" },
  { id: "responsibilities", label: "个人职责", key: "responsibilities", placeholder: "描述你承担的角色、推进动作和协作边界。" },
  { id: "results", label: "项目成果", key: "results", placeholder: "描述交付成果、业务反馈、上线结果或用户变化。" },
  { id: "metrics", label: "数据指标", key: "metrics", placeholder: "列出转化率、留存率、效率、完成率、使用人数等可量化指标。" },
  { id: "review", label: "项目复盘", key: "review", placeholder: "记录关键决策、经验教训和面试中可展开的亮点。" },
] as const;

const unrecognizedContent = "未识别到内容";

const extractionFields = [
  { key: "name", labels: ["项目名称", "项目名", "名称"] },
  { key: "background", labels: ["项目背景", "背景"] },
  { key: "painPoints", labels: ["用户痛点", "痛点", "核心痛点"] },
  { key: "targetUsers", labels: ["目标用户", "用户群体", "服务用户", "面向用户"] },
  { key: "solution", labels: ["解决方案", "产品方案", "方案"] },
  { key: "responsibilities", labels: ["个人职责", "我的职责", "职责", "负责内容"] },
  { key: "results", labels: ["项目成果", "成果", "产出", "项目产出"] },
  { key: "metrics", labels: ["数据指标", "指标", "量化指标"] },
  { key: "review", labels: ["项目复盘", "复盘", "总结反思"] },
] as const;

const allExtractionLabels = extractionFields.flatMap((field) => field.labels);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLabeledLine(line: string) {
  return allExtractionLabels.some((label) => new RegExp(`^\\s*${escapeRegExp(label)}\\s*[：:]`).test(line));
}

function extractFieldValue(source: string, labels: readonly string[]) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matchedLabel = labels.find((label) => new RegExp(`^\\s*${escapeRegExp(label)}\\s*[：:]`).test(line));

    if (!matchedLabel) continue;

    const firstLineValue = line.replace(new RegExp(`^\\s*${escapeRegExp(matchedLabel)}\\s*[：:]\\s*`), "");
    const valueLines = [firstLineValue];

    for (let nextIndex = index + 1; nextIndex < lines.length; nextIndex += 1) {
      const nextLine = lines[nextIndex];
      if (isLabeledLine(nextLine)) break;
      valueLines.push(nextLine);
    }

    const value = valueLines.join("\n").trim();
    return value || unrecognizedContent;
  }

  return unrecognizedContent;
}

function extractProjectByMock(source: string, _fileName?: string): Project {
  void _fileName;
  const base = emptyProject();
  const text = source.trim();

  const extractedProject = extractionFields.reduce(
    (project, field) => ({
      ...project,
      [field.key]: extractFieldValue(text, field.labels),
    }),
    base,
  );

  return {
    ...extractedProject,
    metrics: formatProjectMetrics(extractedProject, text),
  };
}

function originalResume(project: Project) {
  return `项目名称：${project.name}
项目背景：${project.background || "待补充"}
目标用户：${project.targetUsers || "待补充"}
用户痛点：${project.painPoints || "待补充"}
解决方案：${project.solution || "待补充"}
个人职责：${project.responsibilities || "待补充"}
项目成果：${project.results || "待补充"}
数据指标：${project.metrics || "待补充"}`;
}

function formatSavedTime(value: string) {
  return new Date(value).toLocaleString();
}

function projectCardTitle(project: Project) {
  const name = project.name.trim();
  return name && name !== unrecognizedContent ? name : "未命名项目";
}

function projectCardBackground(project: Project) {
  const background = project.background.trim();
  return background && background !== unrecognizedContent ? background : "暂未填写项目背景";
}

export function ProjectEditor() {
  const {
    hydrated,
    projects,
    setProjects,
    resumeResults,
    setResumeResults,
    interviewPreparations,
    setInterviewPreparations,
    setInterviewQuestions,
  } = useProjectPilotStore();
  const [selectedId, setSelectedId] = useState("");
  const [creationMode, setCreationMode] = useState<"ai" | "manual">("ai");
  const [draft, setDraft] = useState<Project>(emptyProject());
  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [targetRole, setTargetRole] = useState("产品经理");
  const [optimization, setOptimization] = useState<ResumeOptimizationResult | undefined>();
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCopyingOptimized, setIsCopyingOptimized] = useState(false);
  const [deletingProjectIds, setDeletingProjectIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedId),
    [projects, selectedId],
  );
  const activeProject = selectedProject ?? draft;
  const relatedOptimization = optimization ?? resumeResults.find((result) => result.projectId === activeProject.id);
  const projectTypeResult = identifyProjectType(activeProject);
  const missingFieldsResult = checkProjectMissingFields(activeProject);
  const suggestedMetricsResult = suggestProjectMetrics(projectTypeResult.projectType);
  const isEditingProject = Boolean(selectedProject);
  const formTitle = isEditingProject ? `编辑项目：${activeProject.name || "未命名项目"}` : "新建项目";
  const modeLabel = isEditingProject ? "编辑项目" : "新建项目";

  function createNew(mode: "ai" | "manual") {
    setCreationMode(mode);
    setSelectedId("");
    setDraft(emptyProject());
    setOptimization(undefined);
  }

  function startNewProject() {
    createNew("ai");
    window.setTimeout(() => document.getElementById("创建方式")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function selectProject(project: Project) {
    setSelectedId(project.id);
    setDraft(project);
    setOptimization(resumeResults.find((result) => result.projectId === project.id));
    window.setTimeout(() => document.getElementById("创建方式")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function updateField(key: keyof Project, value: string) {
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2600);
  }

  async function handleFile(file?: File) {
    if (!file) return;
    setSourceName(file.name);
    let text = "";
    if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      text = await file.text();
      setSourceText(text);
    }
    setDraft(extractProjectByMock(text, file.name));
    setSelectedId("");
  }

  async function identifyFromText() {
    const rawProjectContent = sourceText.trim();

    if (!rawProjectContent) {
      showToast("请先粘贴项目资料。");
      return;
    }

    if (isRecognizing) return;
    setIsRecognizing(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      setDraft(extractProjectByMock(rawProjectContent, sourceName));
      setSelectedId("");
      showToast("识别完成，请确认项目信息");
    } catch {
      showToast("识别失败，请重试");
    } finally {
      setIsRecognizing(false);
    }
  }

  async function saveProject() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const isNew = !projects.some((project) => project.id === draft.id);
      const normalized = {
        ...draft,
        name: draft.name.trim() || "未命名项目",
        updatedAt: new Date().toISOString(),
      };
      setProjects(isNew ? [normalized, ...projects] : projects.map((project) => (project.id === normalized.id ? normalized : project)));
      setDraft(normalized);
      setSelectedId(normalized.id);
      trackEvent(isNew ? "project_created" : "project_updated", { projectId: normalized.id });
      showToast(isNew ? "项目已保存到项目列表" : "项目修改已保存");
      window.setTimeout(() => document.getElementById(`project-card-${normalized.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    } catch {
      showToast("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProjectById(projectId: string) {
    if (deletingProjectIds.has(projectId)) return;
    setDeletingProjectIds((current) => new Set(current).add(projectId));

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      setProjects(projects.filter((project) => project.id !== projectId));
      setResumeResults(resumeResults.filter((result) => result.projectId !== projectId));
      setInterviewPreparations(interviewPreparations.filter((item) => item.projectId !== projectId));
      if (selectedId === projectId) {
        setInterviewQuestions([]);
        createNew("manual");
      }
      trackEvent("project_deleted", { projectId });
      showToast("项目已删除");
    } catch {
      showToast("删除失败，请重试");
    } finally {
      setDeletingProjectIds((current) => {
        const next = new Set(current);
        next.delete(projectId);
        return next;
      });
    }
  }

  async function startOptimization() {
    if (isOptimizing) return;
    setIsOptimizing(true);

    try {
      const result = await optimizeResumeWithAI(activeProject, targetRole);
      setOptimization(result);
      setResumeResults([result, ...resumeResults]);
      trackEvent("resume_optimized", { projectId: activeProject.id, targetRole });
      showToast("简历优化已完成");
    } catch {
      showToast("优化失败，请重试");
    } finally {
      setIsOptimizing(false);
    }
  }

  async function copyOptimizedContent() {
    if (!relatedOptimization) return;
    if (isCopyingOptimized) return;
    setIsCopyingOptimized(true);

    try {
      await navigator.clipboard.writeText(relatedOptimization.optimizedContent);
      trackEvent("result_copied", { source: "project_detail_resume", resultId: relatedOptimization.id });
      showToast("已复制到剪贴板");
    } catch {
      showToast("复制失败，请手动复制");
    } finally {
      setIsCopyingOptimized(false);
    }
  }

  if (!hydrated) {
    return <EmptyState title="正在读取项目档案" description="本地数据加载后即可继续编辑。" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
      <aside className="h-fit overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-panel)] py-3 lg:sticky lg:top-24 lg:overflow-visible lg:border-b-0 lg:border-r lg:py-4">
        <div className="px-4 pb-3 text-xs font-bold uppercase text-[var(--text-subtle)]">项目结构</div>
        <div className="flex min-w-max lg:block lg:min-w-0">
          {["创建方式", "项目原始内容", "AI优化区域", "简历版本对比", "面试准备"].map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="block border-b-2 border-transparent px-4 py-2 text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:bg-white lg:border-b-0 lg:border-r-2"
            >
              {item}
            </a>
          ))}
        </div>
      </aside>

      <section className="mx-auto w-full max-w-5xl">
        <Toast message={toastMessage} />

        <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">项目档案</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">管理你的项目经历，用于简历优化和面试准备</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={startNewProject}>
              <FileText size={16} />
              新建项目
            </Button>
          </div>
        </div>

        <section id="项目列表" className="mb-8 rounded border border-[var(--border)] bg-white p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xl font-semibold">项目列表</h2>
            <p className="text-sm text-[var(--text-muted)]">已保存的项目会显示在这里，点击编辑可继续完善。</p>
          </div>
          {projects.length ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
              {projects.map((project) => {
                const isCurrentProject = project.id === selectedId;
                const cardTitle = projectCardTitle(project);
                const cardBackground = projectCardBackground(project);

                return (
                  <div
                    key={project.id}
                    id={`project-card-${project.id}`}
                    onClick={() => selectProject(project)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectProject(project);
                      }
                    }}
                    className={`flex h-56 min-w-0 flex-col rounded border bg-white p-4 text-left transition hover:border-[var(--primary)] ${isCurrentProject ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h3 className="line-clamp-2 min-w-0 break-words text-base font-semibold leading-6" title={cardTitle}>
                        {cardTitle}
                      </h3>
                      <span className="shrink-0 rounded bg-[var(--surface-panel)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                        {isCurrentProject ? "编辑中" : "已保存"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 min-w-0 break-words text-sm leading-6 text-[var(--text-muted)]" title={cardBackground}>
                      {cardBackground}
                    </p>
                    <div className="mt-auto pt-4">
                      <p className="text-xs text-[var(--text-subtle)]">最近保存：{formatSavedTime(project.updatedAt)}</p>
                    </div>
                    <div className="mt-3 flex shrink-0 gap-2">
                      <Button
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectProject(project);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={deletingProjectIds.has(project.id)}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteProjectById(project.id);
                        }}
                      >
                        {deletingProjectIds.has(project.id) ? "删除中..." : "删除"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded border border-[var(--border)] bg-[var(--surface-panel)] p-6">
              <h3 className="font-semibold">暂无项目</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">你可以通过 AI识别 或 手动填写 创建第一个项目。</p>
              <Button onClick={startNewProject} className="mt-4">
                新建项目
              </Button>
            </div>
          )}
        </section>

        <section id="创建方式" className="mb-8 rounded border border-[var(--border)] bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold">{formTitle}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`rounded border p-4 ${creationMode === "ai" ? "border-[var(--primary)] bg-[var(--surface-panel)]" : "border-[var(--border)] bg-white"}`}>
              <div className="mb-4">
                <h3 className="font-semibold">AI识别创建</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">上传或粘贴项目资料，AI自动提取字段</p>
              </div>
              <Button variant={creationMode === "ai" ? "primary" : "secondary"} onClick={() => createNew("ai")}>
                <FileText size={16} />
                AI识别
              </Button>
            </div>

            <div className={`rounded border p-4 ${creationMode === "manual" ? "border-[var(--primary)] bg-[var(--surface-panel)]" : "border-[var(--border)] bg-white"}`}>
              <div className="mb-4">
                <h3 className="font-semibold">手动创建</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">直接填写项目背景、用户痛点、解决方案等信息</p>
              </div>
              <Button variant={creationMode === "manual" ? "primary" : "secondary"} onClick={() => createNew("manual")}>
                手动填写
              </Button>
            </div>
          </div>

          {creationMode === "ai" ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface-panel)] px-4 py-5 text-sm text-[var(--text-muted)]">
                <Upload size={20} className="mb-2 text-[var(--primary)]" />
                支持 PDF / Word / PPT / 文本内容
                <input className="hidden" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,text/plain" onChange={(event) => handleFile(event.target.files?.[0])} />
              </label>
              <div>
                <label className="mb-2 block text-sm font-semibold">粘贴项目资料</label>
                <Textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={5} placeholder="请粘贴项目介绍、PRD、简历项目经历或面试准备资料" />
                <div className="mt-3 flex justify-end">
                  <Button onClick={identifyFromText} disabled={isRecognizing}>
                    <FileText size={16} />
                    {isRecognizing ? "识别中..." : "开始AI识别"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-muted)]">保持现有表单填写方式，填写后点击保存项目。</p>
          )}
        </section>

        <section id="项目原始内容" className="mb-8 rounded border border-[var(--border)] bg-white p-6">
          <h2 className="text-xl font-semibold">项目信息编辑</h2>
          <p className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-muted)]">当前模式：{modeLabel}</p>
          <div className="mb-6 mt-5">
            <Input value={draft.name} onChange={(event) => updateField("name", event.target.value)} placeholder="项目名称" className="text-2xl font-semibold" />
          </div>
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.id} id={section.id}>
                <label className="mb-2 block text-sm font-semibold">{section.label}</label>
                <Textarea rows={section.key === "review" ? 5 : 3} value={draft[section.key]} onChange={(event) => updateField(section.key, event.target.value)} placeholder={section.placeholder} />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={saveProject} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? "保存中..." : "保存项目"}
            </Button>
          </div>
        </section>

        <section className="mb-8 rounded border border-[var(--border)] bg-white p-6">
          <h2 className="mb-5 text-xl font-semibold">规则分析结果</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">项目类型</p>
              <p className="mt-3 text-lg font-semibold">
                {projectTypeResult.projectType || "建议补充"}
              </p>
            </div>

            <div className="rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">缺失字段</p>
              {missingFieldsResult.missingFields.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingFieldsResult.missingFields.map((field) => (
                    <span key={field} className="rounded bg-white px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                      {field}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">建议补充</p>
              )}
            </div>

            <div className="rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">建议补充指标</p>
              {suggestedMetricsResult.metrics.length ? (
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
                  {suggestedMetricsResult.metrics.map((metric) => (
                    <li key={metric}>- {metric}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-muted)]">建议补充</p>
              )}
            </div>
          </div>
        </section>

        <section id="AI优化区域" className="mb-8 rounded border border-[var(--border)] bg-white p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">AI优化区域</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">先选择目标岗位，再根据当前项目内容生成建议。</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="w-44">
                {targetRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </Select>
              <Button onClick={startOptimization} disabled={isOptimizing}>
                <SendHorizontal size={16} />
                {isOptimizing ? "优化中..." : "开始优化"}
              </Button>
            </div>
          </div>
          {relatedOptimization ? (
            <div className="grid gap-3 md:grid-cols-2">
              {relatedOptimization.suggestions.map((suggestion) => (
                <div key={suggestion} className="rounded border border-[var(--border)] bg-[var(--surface-panel)] p-4 text-sm leading-6">
                  {suggestion}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="等待优化" description="点击开始优化后，会生成项目描述、成果、指标和岗位匹配建议。" />
          )}
        </section>

        <section id="简历版本对比" className="mb-8 rounded border border-[var(--border)] bg-white p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">简历版本对比</h2>
            <Button variant="secondary" onClick={copyOptimizedContent} disabled={!relatedOptimization || isCopyingOptimized}>
              <Clipboard size={15} />
              {isCopyingOptimized ? "复制中..." : "复制优化内容"}
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded border border-[var(--border)] p-4">
              <h3 className="mb-3 font-semibold">原始版本</h3>
              <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-muted)]">{originalResume(activeProject)}</pre>
            </div>
            <div className="rounded border border-[var(--border)] p-4">
              <h3 className="mb-3 font-semibold">优化版本</h3>
              <pre className="whitespace-pre-wrap text-sm leading-7">{relatedOptimization?.optimizedContent || "完成 AI 优化后展示优化版本。"}</pre>
            </div>
          </div>
        </section>

        <section id="面试准备" className="rounded border border-[var(--border)] bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">面试准备</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">基于当前项目生成面试题和 STAR 回答建议。</p>
            </div>
            <Link href="/interview">
              <Button>
                <SendHorizontal size={16} />
                生成面试题
              </Button>
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
