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
    <AppShell searchPlaceholder="搜索项目...">
      <PageHeader title="欢迎回来" />
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

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">最近编辑项目</h2>
          <Link href="/projects" className="text-sm font-medium text-[var(--primary)]">查看全部</Link>
        </div>
        {projects.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {projects.slice(0, 3).map((project) => (
              <Link
                key={project.id}
                href="/projects"
                className="rounded border border-[var(--border)] bg-white p-4 transition hover:border-[var(--primary)]"
              >
                <h3 className="font-semibold">{project.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                  {project.background || "暂未填写项目背景"}
                </p>
                <p className="mt-4 text-xs text-[var(--text-subtle)]">
                  {new Date(project.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="暂无近期项目，开始创建一个吧"
            description="保存项目经历后，这里会展示最近编辑的项目。"
          />
        )}
      </section>

      <section className="mt-8">
        <div className="rounded border border-[var(--border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <h2 className="text-sm font-semibold">最近生成记录</h2>
            <History size={17} className="text-[var(--text-subtle)]" />
          </div>
          {recentRecords.length ? (
            <div className="divide-y divide-[var(--border)]">
              {recentRecords.map((record) => (
                <Link
                  key={record.id}
                  href={record.href}
                  className="grid gap-1 px-5 py-3 text-sm hover:bg-[var(--surface-panel)] sm:grid-cols-[120px_1fr_180px] sm:gap-0"
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
