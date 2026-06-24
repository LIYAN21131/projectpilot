"use client";

import Link from "next/link";
import { Archive, FileText, History, Users } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { MetricCard } from "@/components/common/MetricCard";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";

export default function DashboardPage() {
  const { projects, resumeResults, interviewPreparations, stats } = useProjectPilotStore();
  const recentRecords = [
    ...resumeResults.map((item) => ({
      id: item.id,
      type: "简历优化",
      title: projects.find((project) => project.id === item.projectId)?.name ?? "未命名项目",
      time: item.createdAt,
      href: "/projects",
    })),
    ...interviewPreparations.map((item) => ({
      id: item.id,
      type: "面试准备",
      title: projects.find((project) => project.id === item.projectId)?.name ?? "未命名项目",
      time: item.createdAt,
      href: "/interview",
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  return (
    <AppShell searchPlaceholder="项目进度概览">
      <PageHeader
        eyebrow="工作台"
        title="项目表达进度"
        description="查看已整理的项目、简历版本和面试准备记录，并继续处理最近的内容。"
        action={
          <Link
            href="/projects/edit"
            className="inline-flex min-h-10 items-center rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-strong)]"
          >
            新建项目
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        <MetricCard
          title="项目总数"
          value={`${stats.projectCount}`}
          helper={stats.projectCount ? "个项目已保存" : "暂无项目"}
          icon={<Archive size={22} />}
          href="/projects"
        />
        <MetricCard
          title="已优化简历数量"
          value={`${stats.resumeOptimizationCount}`}
          helper={stats.resumeOptimizationCount ? "次优化记录" : "等待优化"}
          icon={<FileText size={22} />}
          href="/projects"
        />
        <MetricCard
          title="已生成面试题数量"
          value={`${stats.interviewPrepCount}`}
          helper={stats.interviewPrepCount ? "次生成记录" : "等待生成"}
          icon={<Users size={22} />}
          href="/interview"
        />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">最近编辑</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">继续完善最近处理的项目档案。</p>
          </div>
          <Link href="/projects" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-strong)]">查看全部</Link>
        </div>
        {projects.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href="/projects"
                className="rounded-lg border border-[var(--border)] bg-white p-5 transition-colors duration-200 hover:border-[#b7bcc6] hover:bg-[var(--surface-panel)]"
              >
                <h3 className="font-semibold leading-6">{project.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                  {project.background || "暂未填写项目背景"}
                </p>
                <p className="mt-5 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-subtle)]">
                  更新于 {new Date(project.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="暂无项目"
            description="创建并保存项目档案后，最近编辑内容会显示在这里。"
          />
        )}
      </section>

      <section className="mt-10">
        <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">最近产出</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">简历优化与面试准备的保存记录。</p>
            </div>
            <History size={17} className="text-[var(--text-subtle)]" />
          </div>
          {recentRecords.length ? (
            <div className="divide-y divide-[var(--border)]">
              {recentRecords.map((record) => (
                <Link
                  key={record.id}
                  href={record.href}
                  className="grid gap-1 px-5 py-3.5 text-sm transition-colors hover:bg-[var(--surface-panel)] sm:grid-cols-[120px_1fr_180px] sm:gap-0"
                >
                  <span className="font-medium text-[var(--primary)]">{record.type}</span>
                  <span>{record.title}</span>
                  <span className="text-[var(--text-muted)]">{new Date(record.time).toLocaleString()}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="暂无生成记录" description="完成简历优化或面试准备后，会在这里记录结果。" />
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
