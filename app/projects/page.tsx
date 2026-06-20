"use client";

import Link from "next/link";
import { Edit3, Plus } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";
import type { Project } from "@/types/project";

const DEMO_SEEDED_KEY = "projectpilot.demoSeeded";

const demoRawMaterial = "我发现很多应届生并不是完全没有项目经历，而是做过项目后不知道如何提炼项目背景、用户痛点、个人职责、解决方案和项目成果。因此我设计了 ProjectPilot，希望通过项目资料管理、结构化整理、简历优化和面试准备流程，帮助用户把讲不清的项目变成可写进简历、可应对面试追问的项目表达。";

function createDemoProject(): Project {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: "ProjectPilot 项目经历优化工具",
    summary: "面向产品岗位求职者，帮助用户将零散项目资料整理成可用于简历和面试表达的项目档案。",
    background: "应届生在求职时经常存在项目经历零散、表达不清、无法应对面试追问的问题。",
    targetUsers: "准备产品经理实习或校招的大学生、应届生。",
    painPoints: "做过项目但不知道怎么讲，简历 bullet 不清晰，面试时容易被追问卡住。",
    solution: "设计项目档案首页和项目编辑页，将项目资料、结构化内容、简历优化和面试准备放到同一个项目流程中。",
    responsibilities: "负责需求分析、用户流程设计、页面结构规划、MVP 功能拆解和前端实现推进。",
    results: "当前为 MVP 阶段，主要用于验证用户是否能顺利完成项目资料整理流程。",
    metrics: "",
    review: "第一版不追求复杂 AI 功能，先保证用户路径清晰，降低用户理解成本。",
    createdAt: now,
    updatedAt: now,
    editorState: {
      activeSection: "material-import",
      scrollY: 0,
      lastSavedAt: now,
      lastEditedAt: now,
      hasUnsavedDraft: false,
      rawMaterial: demoRawMaterial,
      targetRole: "产品经理",
      status: "待完善",
    },
  };
}

function projectTitle(name: string) {
  return name.trim() || "未命名项目";
}

function projectSummary(project: Project) {
  return project.summary?.trim() || project.background.trim() || "暂未填写项目简介";
}

function projectStatus(project: Project) {
  if (project.editorState?.status) return project.editorState.status;

  if (!project.background.trim() || !project.responsibilities.trim() || !project.results.trim()) {
    return "待完善";
  }

  if (!project.metrics.trim() || !project.review.trim()) {
    return "待优化";
  }

  return "已整理";
}

function projectTargetRole(project: Project, fallback: string) {
  return project.editorState?.targetRole || fallback || "产品经理";
}

export default function ProjectsPage() {
  const { hydrated, projects, setProjects, profile } = useProjectPilotStore();
  const fallbackTargetRole = profile.targetRole || "产品经理";

  useEffect(() => {
    if (!hydrated || projects.length) return;

    try {
      if (window.localStorage.getItem(DEMO_SEEDED_KEY) === "true") return;
      setProjects([createDemoProject()]);
      window.localStorage.setItem(DEMO_SEEDED_KEY, "true");
    } catch {
      setProjects([createDemoProject()]);
    }
  }, [hydrated, projects.length, setProjects]);

  return (
    <AppShell searchPlaceholder="搜索项目档案...">
      <PageHeader
        title="项目档案"
        description="管理你的项目经历，把零散资料整理成可用于简历和面试的项目表达。"
        action={
          <Link href="/projects/edit">
            <Button>
              <Plus size={16} />
              新建项目
            </Button>
          </Link>
        }
      />

      <section>
        <h2 className="mb-4 text-xl font-semibold">我的项目</h2>

        {!hydrated ? (
          <EmptyState title="正在读取项目档案" description="本地数据加载后即可查看项目列表。" />
        ) : projects.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex h-60 min-w-0 flex-col rounded border border-[var(--border)] bg-white p-4 transition hover:border-[var(--primary)]"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h3 className="line-clamp-2 min-w-0 break-words text-base font-semibold leading-6" title={projectTitle(project.name)}>
                      {projectTitle(project.name)}
                    </h3>
                    <span className="shrink-0 rounded bg-[var(--surface-panel)] px-2 py-1 text-xs font-medium text-[var(--text-muted)]">
                      {projectStatus(project)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-[var(--primary)]">
                    求职方向：{projectTargetRole(project, fallbackTargetRole)}
                  </p>
                  <p
                    className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[var(--text-muted)]"
                    title={projectSummary(project)}
                  >
                    {projectSummary(project)}
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <p className="text-xs text-[var(--text-subtle)]">
                    最近编辑：{new Date(project.updatedAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Link href={`/projects/edit?projectId=${encodeURIComponent(project.id)}`}>
                      <Button variant="secondary">
                        <Edit3 size={15} />
                        管理项目
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="还没有项目档案"
            description="点击“新建项目”，开始整理你的第一个项目经历。"
            action={
              <Link href="/projects/edit">
                <Button>
                  <Plus size={16} />
                  新建项目
                </Button>
              </Link>
            }
          />
        )}
      </section>
    </AppShell>
  );
}
