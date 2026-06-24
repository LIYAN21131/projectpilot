"use client";

import Link from "next/link";
import { Clipboard, RotateCcw, Save, SendHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { Input, Select, Textarea } from "@/components/common/Field";
import { Toast } from "@/components/common/Toast";
import {
  optimizeResumeBulletsWithAI,
  prepareInterviewWithAI,
  scoreOptimizedResumeQualityWithAI,
  scoreOriginalResumeQualityWithAI,
} from "@/lib/ai/client";
import {
  ResumeQualityComparison,
  type ResumeQualityViewState,
} from "@/components/resume/ResumeQualityComparison";
import {
  createBeforeResumeQualityFingerprint,
  createComparisonResumeQualityFingerprint,
} from "@/lib/resume-quality/fingerprint";
import { markResumeQualityAssessmentStale } from "@/lib/resume-quality/state";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type {
  InterviewPreparationItem,
  Project,
  ProjectEditorState,
  RecognizedProjectFields,
  RecognitionStatus,
  ResumeProjectFields,
} from "@/types/project";
import type {
  ResumeQualityAssessment,
  ResumeQualityScore,
} from "@/types/resume-quality";

const PROJECTS_KEY = "projectpilot.projects";
const AUTO_SAVE_DELAY = 800;

const emptyProject = (): Project => ({
  id: crypto.randomUUID(),
  name: "",
  summary: "",
  background: "",
  targetUsers: "",
  painPoints: "",
  solution: "",
  responsibilities: "",
  results: "",
  metrics: "",
  tools: "",
  review: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const targetRoleOptions = ["产品经理", "产品运营", "数据分析", "UI设计", "开发工程师"];
const statusOptions = ["待完善", "已整理", "待优化"];
const targetUsersBlockedKeywords = [
  "产品流程",
  "核心流程",
  "用户输入",
  "AI自动提炼",
  "AI 自动提炼",
  "AI自动",
  "AI 自动",
  "STAR",
  "生成面试回答",
  "生成",
  "复制",
  "保存",
  "PostHog",
  "数据埋点",
  "埋点",
  "转化漏斗",
  "漏斗",
  "验证产品",
  "后续优化方向",
  "后续优化",
  "行业场景",
  "回答真实性",
  "项目亮点",
  "工具",
  "功能",
  "方案",
  "设计一款",
  "完成",
  "支持",
  "监测",
  "优化",
];

const sectionDefinitions = [
  { id: "material-import", label: "资料导入" },
  { id: "project-info", label: "项目资料" },
  { id: "resume-optimization", label: "简历优化" },
  { id: "interview-preparation", label: "面试准备" },
] as const;

type SectionId = (typeof sectionDefinitions)[number]["id"];
type SaveState = "idle" | "saving" | "saved" | "error";

type RecognizedProject = RecognizedProjectFields;

type ResumeOptimizeState = "idle" | "loading" | "success" | "error";
type InterviewPrepareState = "idle" | "loading" | "success" | "error";
type CopyState = "idle" | "success" | "error";
type ResumeSaveState = "idle" | "saved";
type InterviewSaveState = "idle" | "saved";

function normalizeSectionId(value?: string): SectionId {
  if (value === "raw-material") return "material-import";
  if (value === "basic-info" || value === "structured-content" || value === "save-status") return "project-info";
  if (value === "future-flow") return "resume-optimization";
  return sectionDefinitions.some((section) => section.id === value)
    ? (value as SectionId)
    : "material-import";
}

function safeReadProjects() {
  try {
    const raw = window.localStorage.getItem(PROJECTS_KEY);
    return { ok: true, projects: raw ? (JSON.parse(raw) as Project[]) : [] };
  } catch {
    return { ok: false, projects: [] as Project[] };
  }
}

function safeWriteProjects(projects: Project[]) {
  try {
    window.localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

function getProjectStatus(project: Project) {
  if (project.editorState?.status) return project.editorState.status;

  if (!project.name.trim() || !project.background.trim() || !project.responsibilities.trim()) {
    return "待完善";
  }

  if (!project.results.trim() || !project.review.trim()) {
    return "待优化";
  }

  return "已整理";
}

function formatTime(value?: string) {
  if (!value) return "尚未保存";
  return new Date(value).toLocaleString();
}

function formatShortTime(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildRawMaterial(project: Project) {
  return [
    project.summary && `项目简介：${project.summary}`,
    project.background && `项目背景：${project.background}`,
    project.targetUsers && `目标用户：${project.targetUsers}`,
    project.painPoints && `用户痛点：${project.painPoints}`,
    project.responsibilities && `我的职责：${project.responsibilities}`,
    project.solution && `解决方案：${project.solution}`,
    project.results && `数据结果：${project.results}`,
    project.metrics && `数据指标：${project.metrics}`,
    project.tools && `使用工具：${project.tools}`,
    project.review && `项目复盘：${project.review}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function hasProjectInfo(project: Project) {
  return [
    project.name,
    project.summary,
    project.background,
    project.targetUsers,
    project.painPoints,
    project.responsibilities,
    project.solution,
    project.results,
    project.metrics,
    project.tools,
    project.review,
  ].some((value) => value?.trim());
}

function resumeFieldsFromProject(project: Project): ResumeProjectFields {
  if (project.confirmedProjectFields) {
    return {
      projectName: project.confirmedProjectFields.projectName,
      background: project.confirmedProjectFields.background,
      painPoint: project.confirmedProjectFields.painPoint,
      responsibility: project.confirmedProjectFields.responsibility,
      actions: project.confirmedProjectFields.actions,
      result: project.confirmedProjectFields.result,
      metrics: project.confirmedProjectFields.metrics,
      tools: project.confirmedProjectFields.tools.join("、"),
    };
  }

  return {
    projectName: project.name || "",
    background: project.background || project.summary || "",
    painPoint: project.painPoints || "",
    responsibility: project.responsibilities || "",
    actions: project.solution || "",
    result: project.results || "",
    metrics: project.metrics || "",
    tools: project.tools || "",
  };
}

function editableResumeFieldsFromProject(project: Project): ResumeProjectFields {
  return {
    projectName: project.name || "",
    background: project.background || project.summary || "",
    painPoint: project.painPoints || "",
    responsibility: project.responsibilities || "",
    actions: project.solution || "",
    result: project.results || "",
    metrics: project.metrics || "",
    tools: project.tools || "",
  };
}

function confirmedFieldsFromProject(project: Project) {
  return {
    projectName: project.name || "",
    projectSummary: project.summary || "",
    background: project.background || "",
    targetUsers: project.targetUsers || "",
    painPoint: project.painPoints || "",
    responsibility: project.responsibilities || "",
    actions: project.solution || "",
    result: project.results || "",
    metrics: project.metrics || "",
    tools: project.tools
      ? project.tools.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
      : [],
    reflection: project.review || "",
  };
}

function cleanBulletText(value: string) {
  return value.replace(/^[-•\d.、\s]+/, "").trim();
}

function fieldPlaceholder() {
  return "未识别到，请手动补充";
}

function fillIfEmpty(current: string, next: string) {
  return current.trim() ? current : next;
}

function sanitizeTargetUsers(value: string) {
  const text = value.trim();
  if (!text) return "";
  return targetUsersBlockedKeywords.some((keyword) => text.includes(keyword)) ? "" : text;
}

function sanitizeProjectTargetUsers(project: Project) {
  const targetUsers = sanitizeTargetUsers(project.targetUsers || "");
  if (targetUsers === project.targetUsers) return project;
  return { ...project, targetUsers };
}

function getInitialRecognitionStatus(project: Project): RecognitionStatus {
  if (project.editorState?.recognitionStatus) return project.editorState.recognitionStatus;
  return hasProjectInfo(project) ? "confirmed" : "idle";
}

export function ProjectEditor({ initialProjectId = "" }: { initialProjectId?: string }) {
  const { hydrated, projects, setProjects, profile, setProfile } = useProjectPilotStore();
  const [draft, setDraft] = useState<Project>(emptyProject());
  const [targetRole, setTargetRole] = useState(profile.targetRole || "产品经理");
  const [projectStatus, setProjectStatus] = useState("待完善");
  const [rawMaterial, setRawMaterial] = useState("");
  const [activeSection, setActiveSection] = useState<SectionId>("material-import");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [restoreMessage, setRestoreMessage] = useState("");
  const [readError, setReadError] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>("idle");
  const [recognitionConfirmedAt, setRecognitionConfirmedAt] = useState("");
  const [lastRecognizedAt, setLastRecognizedAt] = useState("");
  const [resumeBullets, setResumeBullets] = useState<string[]>([]);
  const [resumeOptimizeState, setResumeOptimizeState] = useState<ResumeOptimizeState>("idle");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [resumeSaveState, setResumeSaveState] = useState<ResumeSaveState>("idle");
  const [resumeQualityAssessment, setResumeQualityAssessment] = useState<ResumeQualityAssessment>();
  const [resumeQualityState, setResumeQualityState] = useState<ResumeQualityViewState>("idle");
  const [interviewItems, setInterviewItems] = useState<InterviewPreparationItem[]>([]);
  const [interviewPrepareState, setInterviewPrepareState] = useState<InterviewPrepareState>("idle");
  const [copiedScriptIndex, setCopiedScriptIndex] = useState<number | null>(null);
  const [copyScriptErrorIndex, setCopyScriptErrorIndex] = useState<number | null>(null);
  const [interviewSaveState, setInterviewSaveState] = useState<InterviewSaveState>("idle");
  const initializedRef = useRef(false);
  const userEditedRef = useRef(false);
  const loadedProjectIdRef = useRef("");
  const programmaticScrollRef = useRef(false);
  const restoreDoneRef = useRef(false);
  const userScrolledRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | undefined>(undefined);

  const savedProject = useMemo(
    () => projects.find((project) => project.id === initialProjectId),
    [initialProjectId, projects],
  );
  const isExistingProject = Boolean(savedProject);
  const hasRawMaterial = Boolean(rawMaterial.trim());
  const hasFilledProjectInfo = hasProjectInfo(draft);
  const isRecognitionPending = recognitionStatus === "pendingConfirm";
  const isNextFlowUnlocked = hasFilledProjectInfo && recognitionStatus !== "pendingConfirm" && recognitionStatus !== "recognizing";
  const saveStatusText = restoreMessage
    || (saveState === "saving"
      ? "正在保存..."
      : saveState === "error"
        ? "保存失败，请检查浏览器存储权限"
        : saveState === "saved"
          ? `已自动保存${lastSavedAt ? ` ${formatShortTime(lastSavedAt)}` : ""}`
          : "尚未保存");
  const currentQualityFields = editableResumeFieldsFromProject(draft);
  const expectedResumeQualityFingerprint = resumeQualityAssessment?.after && resumeBullets.length
    ? createComparisonResumeQualityFingerprint(currentQualityFields, resumeBullets, targetRole)
    : createBeforeResumeQualityFingerprint(currentQualityFields, targetRole);
  const resumeQualityAssessmentForDisplay = markResumeQualityAssessmentStale(
    resumeQualityAssessment,
    expectedResumeQualityFingerprint,
  );

  const visibleSections = useMemo(() => {
    return sectionDefinitions.filter((section) => {
      if (section.id === "material-import") return true;
      if (section.id === "project-info") return hasRawMaterial;
      if (section.id === "resume-optimization") return isNextFlowUnlocked;
      if (section.id === "interview-preparation") return isNextFlowUnlocked;
      return false;
    });
  }, [hasRawMaterial, isNextFlowUnlocked]);

  const scrollToSection = useCallback((id: SectionId) => {
    programmaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) window.clearTimeout(programmaticScrollTimerRef.current);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 900);
  }, []);

  useEffect(() => {
    if (visibleSections.some((section) => section.id === activeSection)) return;
    const fallbackSection = visibleSections.some((section) => section.id === "project-info")
      ? "project-info"
      : "material-import";
    const timer = window.setTimeout(() => setActiveSection(fallbackSection), 0);
    return () => window.clearTimeout(timer);
  }, [activeSection, visibleSections]);

  const persistProject = useCallback((
    hasUnsavedDraft: boolean,
    editorStateOverrides: Partial<ProjectEditorState> = {},
    projectOverrides: Partial<Project> = {},
  ) => {
    const now = new Date().toISOString();
    const normalized: Project = {
      ...draft,
      ...projectOverrides,
      name: draft.name.trim() || "未命名项目",
      summary: draft.summary?.trim(),
      background: draft.background.trim(),
      updatedAt: now,
      editorState: {
        activeSection,
        scrollY: typeof window === "undefined" ? 0 : window.scrollY,
        lastSavedAt: now,
        lastEditedAt: draft.updatedAt || now,
        hasUnsavedDraft,
        rawMaterial,
        targetRole,
        status: projectStatus,
        recognitionStatus,
        recognitionConfirmedAt,
        lastRecognizedAt,
        ...editorStateOverrides,
      },
    };

    const current = safeReadProjects();
    if (!current.ok) {
      setSaveState("error");
      return false;
    }

    const exists = current.projects.some((project) => project.id === normalized.id);
    const nextProjects = exists
      ? current.projects.map((project) => (project.id === normalized.id ? normalized : project))
      : [normalized, ...current.projects];

    if (!safeWriteProjects(nextProjects)) {
      setSaveState("error");
      setToastMessage("当前项目保存失败，已保留页面内容，请稍后重试。");
      return false;
    }

    setProjects(nextProjects);
    setProfile({ ...profile, targetRole });
    if (!initialProjectId) {
      window.history.replaceState(null, "", `/projects/edit?projectId=${encodeURIComponent(normalized.id)}`);
    }
    setDraft(normalized);
    setLastSavedAt(now);
    setSaveState("saved");
    setRestoreMessage("");
    return true;
  }, [
    activeSection,
    draft,
    initialProjectId,
    lastRecognizedAt,
    profile,
    projectStatus,
    rawMaterial,
    recognitionConfirmedAt,
    recognitionStatus,
    setProfile,
    setProjects,
    targetRole,
  ]);

  const persistResumeQualityAssessment = useCallback((assessment: ResumeQualityAssessment) => {
    const current = safeReadProjects();
    if (!current.ok) return false;

    const nextProjects = current.projects.map((project) => (
      project.id === draft.id
        ? { ...project, resumeQualityAssessment: assessment }
        : project
    ));
    if (!nextProjects.some((project) => project.id === draft.id)) {
      return false;
    }
    if (!safeWriteProjects(nextProjects)) {
      return false;
    }

    setProjects(nextProjects);
    setDraft((currentDraft) => ({
      ...currentDraft,
      resumeQualityAssessment: assessment,
    }));
    return true;
  }, [draft.id, setProjects]);

  useEffect(() => {
    if (!hydrated) return;

    if (initialProjectId && !savedProject) {
      const timer = window.setTimeout(() => {
        setReadError(true);
        initializedRef.current = true;
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (savedProject) {
      if (loadedProjectIdRef.current === savedProject.id) return;

      const timer = window.setTimeout(() => {
        const editorState = savedProject.editorState;
        const restoredSection = normalizeSectionId(editorState?.activeSection);
        const restoredProject = sanitizeProjectTargetUsers(savedProject);
        loadedProjectIdRef.current = savedProject.id;
        setDraft(restoredProject);
        setRawMaterial(editorState?.rawMaterial ?? buildRawMaterial(restoredProject));
        setTargetRole(editorState?.targetRole || profile.targetRole || "产品经理");
        setProjectStatus(editorState?.status || getProjectStatus(restoredProject));
        setRecognitionStatus(getInitialRecognitionStatus(restoredProject));
        setRecognitionConfirmedAt(editorState?.recognitionConfirmedAt || "");
        setLastRecognizedAt(editorState?.lastRecognizedAt || "");
        setResumeBullets(restoredProject.optimizedResumeBullets ?? []);
        setResumeOptimizeState(restoredProject.optimizedResumeBullets?.length ? "success" : "idle");
        setCopyState("idle");
        setResumeSaveState(restoredProject.optimizedResumeBullets?.length ? "saved" : "idle");
        setResumeQualityAssessment(restoredProject.resumeQualityAssessment);
        setResumeQualityState(restoredProject.resumeQualityAssessment?.before ? "ready" : "idle");
        setInterviewItems(restoredProject.interviewPreparations ?? []);
        setInterviewPrepareState(restoredProject.interviewPreparations?.length ? "success" : "idle");
        setCopiedScriptIndex(null);
        setCopyScriptErrorIndex(null);
        setInterviewSaveState(restoredProject.interviewPreparations?.length ? "saved" : "idle");
        setLastSavedAt(editorState?.lastSavedAt || restoredProject.updatedAt);
        setSaveState("saved");
        setReadError(false);
        initializedRef.current = true;

        if (editorState) {
          setActiveSection(restoredSection);
          setRestoreMessage("已恢复上次编辑状态");
          setToastMessage("已恢复上次编辑状态");
          window.setTimeout(() => {
            if (!restoreDoneRef.current && !userScrolledRef.current) {
              programmaticScrollRef.current = true;
              window.scrollTo({ top: editorState.scrollY, behavior: "auto" });
              restoreDoneRef.current = true;
              window.setTimeout(() => {
                programmaticScrollRef.current = false;
              }, 120);
            }
            setToastMessage("");
          }, 100);
        }
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      loadedProjectIdRef.current = "";
      setReadError(false);
      setLastSavedAt("");
      setRecognitionStatus("idle");
      setRecognitionConfirmedAt("");
      setLastRecognizedAt("");
      setResumeBullets([]);
      setResumeOptimizeState("idle");
      setCopyState("idle");
      setResumeSaveState("idle");
      setResumeQualityAssessment(undefined);
      setResumeQualityState("idle");
      setInterviewItems([]);
      setInterviewPrepareState("idle");
      setCopiedScriptIndex(null);
      setCopyScriptErrorIndex(null);
      setInterviewSaveState("idle");
      initializedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, initialProjectId, profile.targetRole, savedProject]);

  useEffect(() => {
    if (savedProject) return;

    const timer = window.setTimeout(() => setTargetRole(profile.targetRole || "产品经理"), 0);
    return () => window.clearTimeout(timer);
  }, [profile.targetRole, savedProject]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    visibleSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          userEditedRef.current = true;
          setActiveSection(section.id);
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0.01 },
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [visibleSections]);

  useEffect(() => {
    function handleUserScroll() {
      if (!programmaticScrollRef.current) {
        userScrolledRef.current = true;
      }
    }

    window.addEventListener("scroll", handleUserScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleUserScroll);
      if (programmaticScrollTimerRef.current) window.clearTimeout(programmaticScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !initializedRef.current || !userEditedRef.current || readError) return;
    if (recognitionStatus === "pendingConfirm") return;

    const timer = window.setTimeout(() => {
      setSaveState("saving");
      if (persistProject(false)) userEditedRef.current = false;
    }, AUTO_SAVE_DELAY);

    return () => window.clearTimeout(timer);
  }, [activeSection, draft, hydrated, persistProject, projectStatus, rawMaterial, readError, recognitionStatus, targetRole]);

  useEffect(() => {
    if (!hydrated || readError) return;

    function handleBeforeUnload() {
      if (initializedRef.current && recognitionStatus !== "pendingConfirm") persistProject(false);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hydrated, persistProject, readError, recognitionStatus]);

  function markChanged() {
    userEditedRef.current = true;
    setSaveState("idle");
    setRestoreMessage("");
  }

  function updateDraft(key: keyof Project, value: string) {
    markChanged();
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }

  function updateTargetRole(value: string) {
    markChanged();
    setTargetRole(value);
  }

  function updateProjectStatus(value: string) {
    markChanged();
    setProjectStatus(value);
  }

  function updateRawMaterial(value: string) {
    markChanged();
    setRawMaterial(value);
  }

  async function recognizeProject() {
    if (!rawMaterial.trim()) {
      setToastMessage("请先输入项目资料");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    setIsRecognizing(true);
    setRecognitionStatus("recognizing");
    setToastMessage("识别中...");

    try {
      const response = await fetch("/api/ai/recognize-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawMaterial,
          currentProject: {
            projectName: draft.name,
            projectSummary: draft.summary || "",
            background: draft.background,
            targetUsers: draft.targetUsers,
            painPoint: draft.painPoints,
            actions: draft.solution,
            responsibility: draft.responsibilities,
            result: draft.results,
            metrics: draft.metrics,
            tools: draft.tools ? draft.tools.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) : [],
            reflection: draft.review,
          },
        }),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; data?: RecognizedProject };

      if (!response.ok || !result.ok || !result.data) {
        throw new Error(result.message || "识别失败，请重试");
      }

      const recognized = result.data;
      const recognizedAt = new Date().toISOString();
      setDraft((current) => ({
        ...current,
        name: fillIfEmpty(current.name, recognized.projectName),
        summary: recognized.projectSummary ?? "",
        background: fillIfEmpty(current.background, recognized.background),
        targetUsers: recognized.targetUsers ?? "",
        painPoints: fillIfEmpty(current.painPoints, recognized.painPoint),
        solution: fillIfEmpty(current.solution, recognized.actions),
        responsibilities: fillIfEmpty(current.responsibilities, recognized.responsibility),
        results: fillIfEmpty(current.results, recognized.result),
        metrics: fillIfEmpty(current.metrics, recognized.metrics),
        tools: fillIfEmpty(current.tools || "", recognized.tools.join("、")),
        review: fillIfEmpty(current.review, recognized.reflection),
        rawProjectText: rawMaterial,
        recognizedProjectFields: recognized,
        isProjectFieldsConfirmed: false,
        originalResumeText: rawMaterial,
        recognizedResumeFields: {
          projectName: recognized.projectName,
          background: recognized.background,
          painPoint: recognized.painPoint,
          responsibility: recognized.responsibility,
          actions: recognized.actions,
          result: recognized.result,
          metrics: recognized.metrics,
          tools: recognized.tools.join("、"),
        },
        updatedAt: new Date().toISOString(),
      }));
      setRecognitionStatus("pendingConfirm");
      setLastRecognizedAt(recognizedAt);
      setRecognitionConfirmedAt("");
      userEditedRef.current = true;
      setSaveState("idle");
      setIsRecognizing(false);
      setToastMessage("资料已整理，请检查内容，确认无误后保存识别结果。");
      scrollToSection("project-info");
      window.setTimeout(() => setToastMessage(""), 3600);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "识别失败，请重试";
      setIsRecognizing(false);
      setRecognitionStatus("error");
      setToastMessage(message);
      window.setTimeout(() => setToastMessage(""), 3600);
    }
  }

  function saveProject() {
    if (saveState === "saving") return;
    if (recognitionStatus === "pendingConfirm") {
      setToastMessage("请先确认识别内容");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    setSaveState("saving");

    if (persistProject(false)) {
      userEditedRef.current = false;
      setToastMessage("项目已保存");
      window.setTimeout(() => setToastMessage(""), 2400);
    }
  }

  async function requestBeforeResumeQualityScore(fields: ResumeProjectFields) {
    setResumeQualityState("loading-before");

    try {
      const score = await scoreOriginalResumeQualityWithAI(fields, targetRole);
      const now = new Date().toISOString();
      const fingerprint = createBeforeResumeQualityFingerprint(fields, targetRole);
      const assessment: ResumeQualityAssessment = {
        version: 1,
        rubricVersion: 1,
        targetRole,
        before: score,
        status: "current",
        beforeFingerprint: fingerprint,
        sourceFingerprint: fingerprint,
        createdAt: resumeQualityAssessment?.createdAt ?? now,
        updatedAt: now,
      };

      setResumeQualityAssessment(assessment);
      setResumeQualityState("ready");
      if (!persistResumeQualityAssessment(assessment)) {
        setToastMessage("原始评分已生成，但暂未保存，请稍后重试。");
        window.setTimeout(() => setToastMessage(""), 2600);
      }
      return score;
    } catch {
      setResumeQualityState("error-before");
      return undefined;
    }
  }

  async function requestAfterResumeQualityScore(
    fields: ResumeProjectFields,
    bullets: string[],
  ) {
    setResumeQualityState("loading-after");
    const expectedBeforeFingerprint = createBeforeResumeQualityFingerprint(fields, targetRole);
    let before: ResumeQualityScore | undefined =
      resumeQualityAssessment?.beforeFingerprint === expectedBeforeFingerprint
        ? resumeQualityAssessment.before
        : undefined;

    if (!before) {
      try {
        before = await scoreOriginalResumeQualityWithAI(fields, targetRole);
        if (!resumeQualityAssessment?.before) {
          const now = new Date().toISOString();
          setResumeQualityAssessment({
            version: 1,
            rubricVersion: 1,
            targetRole,
            before,
            status: "current",
            beforeFingerprint: expectedBeforeFingerprint,
            sourceFingerprint: expectedBeforeFingerprint,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch {
        setResumeQualityState(
          resumeQualityAssessment?.before ? "error-after" : "error-before",
        );
        return;
      }
    }

    try {
      const response = await scoreOptimizedResumeQualityWithAI(
        fields,
        bullets,
        before,
        targetRole,
      );
      const now = new Date().toISOString();
      setResumeQualityAssessment({
        version: 1,
        rubricVersion: 1,
        targetRole,
        before,
        after: response.score,
        comparison: response.comparison,
        status: "current",
        beforeFingerprint: expectedBeforeFingerprint,
        sourceFingerprint: createComparisonResumeQualityFingerprint(fields, bullets, targetRole),
        createdAt: resumeQualityAssessment?.createdAt ?? now,
        updatedAt: now,
      });
      setResumeQualityState("ready");
    } catch {
      setResumeQualityState("error-after");
    }
  }

  function confirmRecognitionResult() {
    if (saveState === "saving") return;

    const confirmedAt = new Date().toISOString();
    const sanitizedDraft = { ...draft, targetUsers: sanitizeTargetUsers(draft.targetUsers) };
    const confirmedFields = editableResumeFieldsFromProject(sanitizedDraft);
    const confirmedProjectFields = confirmedFieldsFromProject(sanitizedDraft);
    setRecognitionStatus("confirmed");
    setRecognitionConfirmedAt(confirmedAt);
    setSaveState("saving");

    if (persistProject(
      false,
      { recognitionStatus: "confirmed", recognitionConfirmedAt: confirmedAt },
      {
        targetUsers: sanitizedDraft.targetUsers,
        rawProjectText: rawMaterial,
        confirmedProjectFields,
        isProjectFieldsConfirmed: true,
        originalResumeText: rawMaterial,
        confirmedResumeFields: confirmedFields,
        recognizedResumeFields: draft.recognizedResumeFields ?? confirmedFields,
      },
    )) {
      userEditedRef.current = false;
      setToastMessage("识别结果已确认保存，可以继续进行简历优化和面试准备。");
      window.setTimeout(() => setToastMessage(""), 3000);
      void requestBeforeResumeQualityScore(confirmedFields);
    }
  }

  async function optimizeResumeBullets() {
    if (resumeOptimizeState === "loading") return;

    if (!rawMaterial.trim() && !hasProjectInfo(draft)) {
      setToastMessage("请先输入项目经历内容");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    if (recognitionStatus === "pendingConfirm") {
      setToastMessage("请先确认识别内容");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    const fields = resumeFieldsFromProject(draft);
    setResumeOptimizeState("loading");

    try {
      const response = await optimizeResumeBulletsWithAI(fields);
      const bullets = response.bullets.map((item) => item.trim()).filter(Boolean).slice(0, 5);
      if (!bullets.length) {
        throw new Error("empty");
      }
      setResumeBullets(bullets);
      setResumeOptimizeState("success");
      setResumeSaveState("idle");
      setCopyState("idle");
      setToastMessage("优化完成");
      window.setTimeout(() => setToastMessage(""), 2400);
      void requestAfterResumeQualityScore(fields, bullets);
    } catch {
      setResumeOptimizeState("error");
      setToastMessage("网络或模型服务异常，请稍后重试");
      window.setTimeout(() => setToastMessage(""), 2600);
    }
  }

  async function copyResumeBullets() {
    if (!resumeBullets.length) return;

    try {
      await navigator.clipboard.writeText(resumeBullets.map((bullet) => `- ${bullet}`).join("\n"));
      setCopyState("success");
      setToastMessage("复制成功");
      window.setTimeout(() => setToastMessage(""), 2200);
    } catch {
      setCopyState("error");
      setToastMessage("复制失败，请重试");
      window.setTimeout(() => setToastMessage(""), 2400);
    }
  }

  function saveResumeBullets() {
    if (!resumeBullets.length) {
      setToastMessage("优化失败，请重试");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    const confirmedFields = resumeFieldsFromProject(draft);
    if (persistProject(
      false,
      {},
      {
        originalResumeText: rawMaterial,
        confirmedResumeFields: confirmedFields,
        optimizedResumeBullets: resumeBullets,
        resumeQualityAssessment: resumeQualityAssessmentForDisplay,
      },
    )) {
      userEditedRef.current = false;
      setResumeSaveState("saved");
      setToastMessage("已保存到项目中");
      window.setTimeout(() => setToastMessage(""), 2400);
    }
  }

  function retryBeforeResumeQualityScore() {
    void requestBeforeResumeQualityScore(resumeFieldsFromProject(draft));
  }

  function retryAfterResumeQualityScore() {
    if (!resumeBullets.length) return;
    void requestAfterResumeQualityScore(resumeFieldsFromProject(draft), resumeBullets);
  }

  async function generateInterviewPreparation() {
    if (interviewPrepareState === "loading") return;

    if (!hasProjectInfo(draft)) {
      setToastMessage("请先完善项目资料");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    if (recognitionStatus === "pendingConfirm") {
      setToastMessage("请先确认识别内容");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    const isSavedProject = projects.some((project) => project.id === draft.id) && saveState === "saved";
    if (!isSavedProject) {
      setToastMessage("请先保存项目资料后再生成面试准备");
      window.setTimeout(() => setToastMessage(""), 2600);
      return;
    }

    const fields = {
      ...resumeFieldsFromProject(draft),
      optimizedResumeBullets: resumeBullets.length ? resumeBullets : draft.optimizedResumeBullets ?? [],
    };

    setInterviewPrepareState("loading");
    setCopiedScriptIndex(null);
    setCopyScriptErrorIndex(null);

    try {
      const response = await prepareInterviewWithAI(fields);
      const questions = response.questions
        .map((item) => ({
          question: item.question.trim(),
          answerPoints: item.answerPoints.map((point) => cleanBulletText(point)).filter(Boolean).slice(0, 3),
          script: item.script.trim(),
        }))
        .filter((item) => item.question && item.script)
        .slice(0, 5);

      if (!questions.length) {
        throw new Error("empty");
      }

      setInterviewItems(questions);
      setInterviewPrepareState("success");
      setInterviewSaveState("idle");
      setToastMessage("面试准备已生成");
      window.setTimeout(() => setToastMessage(""), 2400);
    } catch {
      setInterviewPrepareState("error");
      setToastMessage("模型服务异常，请稍后重试");
      window.setTimeout(() => setToastMessage(""), 2600);
    }
  }

  async function copyInterviewScript(script: string, index: number) {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedScriptIndex(index);
      setCopyScriptErrorIndex(null);
      setToastMessage("复制成功");
      window.setTimeout(() => setToastMessage(""), 2200);
    } catch {
      setCopiedScriptIndex(null);
      setCopyScriptErrorIndex(index);
      setToastMessage("复制失败，请重试");
      window.setTimeout(() => setToastMessage(""), 2400);
    }
  }

  function saveInterviewPreparation() {
    if (!interviewItems.length) {
      setToastMessage("生成失败，请重试");
      window.setTimeout(() => setToastMessage(""), 2400);
      return;
    }

    if (persistProject(false, {}, { interviewPreparations: interviewItems })) {
      userEditedRef.current = false;
      setInterviewSaveState("saved");
      setToastMessage("已保存到项目中");
      window.setTimeout(() => setToastMessage(""), 2400);
    }
  }

  function saveBeforeReturn() {
    if (!readError && initializedRef.current && recognitionStatus !== "pendingConfirm") persistProject(false);
  }

  function uncertainHint(field: string) {
    if (!draft.recognizedProjectFields?.uncertainFields.includes(field)) return null;
    if (draft.isProjectFieldsConfirmed) return null;

    return <span className="ml-2 text-xs font-medium text-amber-700">建议人工确认</span>;
  }

  if (!hydrated) {
    return <EmptyState title="正在读取项目档案" description="本地数据加载后即可继续编辑。" />;
  }

  if (readError) {
    return (
      <EmptyState
        title="项目数据读取失败，请返回项目档案重新打开。"
        description="页面没有清空当前数据；你可以回到项目档案重新选择项目。"
        action={
          <Link href="/projects">
            <Button variant="secondary">返回项目档案</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Toast message={toastMessage} />

      <div className="grid gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <aside className="h-fit overflow-x-auto rounded-lg border border-[var(--border)] bg-white py-2 lg:sticky lg:top-24 lg:overflow-visible lg:py-3">
          <nav className="flex min-w-max lg:block lg:min-w-0">
            <Link
              href="/projects"
              onClick={saveBeforeReturn}
              className="block border-b-2 border-transparent px-4 py-2.5 text-left text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--surface-panel)] lg:w-full lg:border-b-0 lg:border-r-2"
            >
              返回项目档案
            </Link>
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  userEditedRef.current = true;
                  scrollToSection(section.id);
                }}
                className={`block border-b-2 border-transparent px-4 py-2.5 text-left text-sm transition-colors lg:w-full lg:border-b-0 lg:border-r-2 ${
                  activeSection === section.id
                    ? "border-[var(--primary)] bg-[var(--primary-soft)] font-semibold text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-panel)] hover:text-[var(--foreground)]"
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
          {!isExistingProject && visibleSections.length <= 1 ? (
            <div className="px-4 py-2 text-sm leading-6 text-[var(--text-muted)]">
              粘贴原始资料后，将自动生成后续编辑导航。
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 space-y-6">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">编辑项目档案</h1>
                <span className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                  {projectStatus}
                </span>
              </div>
              <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                saveState === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-[var(--border)] bg-[var(--surface-panel)] text-[var(--text-muted)]"
              }`}>
                {saveStatusText}
              </div>
            </div>
          </div>

          <section id="material-import" className="scroll-mt-24 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">步骤 1</p>
              <h2 className="mt-1 text-xl font-semibold">导入项目资料</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                粘贴项目经历、简历片段、复盘或作品介绍，系统会整理为可编辑的结构化内容。
              </p>
            </div>
            <Textarea
              rows={6}
              value={rawMaterial}
              onChange={(event) => updateRawMaterial(event.target.value)}
              placeholder="粘贴原始项目资料"
              className="max-h-40 overflow-y-auto"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text-subtle)]">已输入 {rawMaterial.length} 字</p>
              <Button onClick={recognizeProject} disabled={isRecognizing}>
                <SendHorizontal size={16} />
                {isRecognizing ? "正在整理..." : "识别并整理"}
              </Button>
            </div>
          </section>

          <section id="project-info" className="scroll-mt-24 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">步骤 2</p>
              <h2 className="mt-1 text-xl font-semibold">检查项目资料</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">核对系统整理的字段，并补充缺失或不准确的信息。</p>
            </div>

            {isRecognitionPending ? (
              <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-950">资料已整理，等待确认</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                      请检查并修改下方内容，确认无误后点击“确认保存识别结果”。确认前，简历优化和面试准备不会解锁。
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button onClick={confirmRecognitionResult} disabled={saveState === "saving"}>
                      <Save size={16} />
                      确认保存识别结果
                    </Button>
                    <Button variant="secondary" onClick={recognizeProject} disabled={isRecognizing}>
                      <RotateCcw size={16} />
                      {isRecognizing ? "正在整理..." : "重新整理"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {recognitionStatus === "confirmed" ? (
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                识别结果已确认保存，可以继续进行后续操作。
              </div>
            ) : null}

            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-base font-semibold">基础信息</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">项目名称{uncertainHint("projectName")}</label>
                    <Input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">求职方向</label>
                    <Select value={targetRole} onChange={(event) => updateTargetRole(event.target.value)}>
                      {targetRoleOptions.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">项目状态</label>
                    <Select value={projectStatus} onChange={(event) => updateProjectStatus(event.target.value)}>
                      {statusOptions.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">最近编辑时间</label>
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] px-3 py-2 text-sm text-[var(--text-muted)]">
                      {formatTime(draft.updatedAt)}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold">项目简介</label>
                    <Textarea
                      rows={4}
                      value={draft.summary || ""}
                      onChange={(event) => updateDraft("summary", event.target.value)}
                      placeholder={fieldPlaceholder()}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-base font-semibold">项目逻辑</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">项目背景{uncertainHint("background")}</label>
                    <Textarea rows={3} value={draft.background} onChange={(event) => updateDraft("background", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">目标用户{uncertainHint("targetUsers")}</label>
                    <Textarea rows={3} value={draft.targetUsers} onChange={(event) => updateDraft("targetUsers", event.target.value)} placeholder="未识别到目标用户，请手动补充" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">用户痛点{uncertainHint("painPoint")}</label>
                    <Textarea rows={3} value={draft.painPoints} onChange={(event) => updateDraft("painPoints", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">关键行动{uncertainHint("actions")}</label>
                    <Textarea rows={3} value={draft.solution} onChange={(event) => updateDraft("solution", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-base font-semibold">个人表达</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">我的职责{uncertainHint("responsibility")}</label>
                    <Textarea rows={3} value={draft.responsibilities} onChange={(event) => updateDraft("responsibilities", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">项目成果{uncertainHint("result")}</label>
                    <Textarea rows={3} value={draft.results} onChange={(event) => updateDraft("results", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">数据指标{uncertainHint("metrics")}</label>
                    <Textarea rows={3} value={draft.metrics} onChange={(event) => updateDraft("metrics", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">使用工具{uncertainHint("tools")}</label>
                    <Textarea rows={3} value={draft.tools || ""} onChange={(event) => updateDraft("tools", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">项目复盘{uncertainHint("reflection")}</label>
                    <Textarea rows={4} value={draft.review} onChange={(event) => updateDraft("review", event.target.value)} placeholder={fieldPlaceholder()} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {isNextFlowUnlocked ? (
          <section id="resume-optimization" className="scroll-mt-24 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">步骤 3</p>
                <h2 className="mt-1 text-xl font-semibold">生成简历表述</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  基于已确认的项目资料生成 3-5 条可直接放入简历的项目 bullet。
                </p>
              </div>
              <Button onClick={optimizeResumeBullets} disabled={resumeOptimizeState === "loading"}>
                <SendHorizontal size={16} />
                {resumeOptimizeState === "loading"
                  ? "优化中..."
                  : resumeOptimizeState === "success"
                    ? "优化完成"
                    : resumeOptimizeState === "error"
                      ? "重新优化"
                      : "优化简历表达"}
              </Button>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                <h3 className="mb-3 text-base font-semibold">已确认结构化内容</h3>
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                  {[
                    ["项目名称", draft.name],
                    ["项目背景", draft.background],
                    ["用户痛点", draft.painPoints],
                    ["个人职责", draft.responsibilities],
                    ["关键行动", draft.solution],
                    ["项目成果", draft.results],
                    ["数据指标", draft.metrics],
                    ["使用工具", draft.tools || ""],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[var(--border)] bg-white p-3">
                      <p className="text-xs font-medium text-[var(--text-subtle)]">{label}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--foreground)]">
                        {value || "待补充"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-base font-semibold">简历优化结果</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={copyResumeBullets} disabled={!resumeBullets.length}>
                      <Clipboard size={15} />
                      {copyState === "success" ? "复制成功" : copyState === "error" ? "复制失败，请重试" : "复制"}
                    </Button>
                    <Button variant="secondary" onClick={optimizeResumeBullets} disabled={resumeOptimizeState === "loading"}>
                      <RotateCcw size={15} />
                      重新优化
                    </Button>
                  </div>
                </div>

                <div className="max-h-[360px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                  {resumeBullets.length ? (
                    <ul className="list-disc space-y-3 pl-5 text-sm text-[var(--foreground)]">
                      {resumeBullets.map((bullet, index) => (
                        <li key={`${bullet}-${index}`} className="break-words leading-7">
                          {cleanBulletText(bullet)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-6 text-[var(--text-muted)]">
                      确认识别内容后，点击“优化简历表达”生成结果。
                    </p>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={saveResumeBullets} disabled={!resumeBullets.length}>
                    <Save size={16} />
                    {resumeSaveState === "saved" ? "已保存到项目中" : "保存优化结果"}
                  </Button>
                </div>
              </div>
            </div>

            <ResumeQualityComparison
              assessment={resumeQualityAssessmentForDisplay}
              state={resumeQualityState}
              onRetryBefore={retryBeforeResumeQualityScore}
              onRetryAfter={retryAfterResumeQualityScore}
            />
          </section>
          ) : null}

          {isNextFlowUnlocked ? (
          <section id="interview-preparation" className="scroll-mt-24 rounded-lg border border-[var(--border)] bg-white p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-subtle)]">步骤 4</p>
                <h2 className="mt-1 text-xl font-semibold">准备面试追问</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                  基于当前项目资料和简历优化结果，生成面试追问、回答思路和可练习话术。
                </p>
              </div>
              <Button onClick={generateInterviewPreparation} disabled={interviewPrepareState === "loading"}>
                <SendHorizontal size={16} />
                {interviewPrepareState === "loading"
                  ? "生成中..."
                  : interviewPrepareState === "success"
                    ? "重新生成"
                    : interviewPrepareState === "error"
                      ? "重试生成"
                      : "生成面试准备"}
              </Button>
            </div>

            {interviewItems.length ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {interviewItems.map((item, index) => (
                    <article key={`${item.question}-${index}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-base font-semibold leading-6">
                          问题 {index + 1}：{item.question}
                        </h3>
                        <Button
                          variant="secondary"
                          onClick={() => copyInterviewScript(item.script, index)}
                          className="shrink-0"
                        >
                          <Clipboard size={15} />
                          {copiedScriptIndex === index
                            ? "复制成功"
                            : copyScriptErrorIndex === index
                              ? "复制失败，请重试"
                              : "复制话术"}
                        </Button>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="mb-2 font-medium text-[var(--text-muted)]">回答思路</p>
                          <ul className="list-disc space-y-1.5 pl-5 leading-6 text-[var(--foreground)]">
                            {item.answerPoints.slice(0, 3).map((point, pointIndex) => (
                              <li key={`${point}-${pointIndex}`} className="break-words">
                                {cleanBulletText(point)}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="mb-2 font-medium text-[var(--text-muted)]">面试话术</p>
                          <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--border)] bg-white p-3">
                            <p className="break-words leading-7 text-[var(--foreground)]">{item.script}</p>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveInterviewPreparation}>
                    <Save size={16} />
                    {interviewSaveState === "saved" ? "已保存到项目中" : "保存面试准备"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-panel)] p-4">
                <p className="text-sm leading-6 text-[var(--text-muted)]">
                  保存项目资料后，点击“生成面试准备”生成 5 个高概率追问和练习话术。
                </p>
              </div>
            )}
          </section>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Button onClick={saveProject} disabled={saveState === "saving"}>
              <Save size={16} />
              {saveState === "saving" ? "保存中..." : "保存项目"}
            </Button>
            <Link href="/projects" onClick={saveBeforeReturn}>
              <Button variant="secondary" className="w-full sm:w-auto">
                返回项目档案
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
