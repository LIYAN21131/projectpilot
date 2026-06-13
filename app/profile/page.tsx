"use client";

import { KeyRound, PenLine, UserCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Field";
import { useProjectPilotStore } from "@/lib/storage/useProjectPilotStore";

export default function ProfilePage() {
  const { profile, setProfile } = useProjectPilotStore();

  return (
    <AppShell searchPlaceholder="搜索设置...">
      <div className="mb-10 flex flex-col gap-6 border-b border-[var(--border)] pb-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative flex size-24 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-subtle)]">
            <UserCircle size={52} />
            <button className="absolute -bottom-3 -right-3 flex size-10 items-center justify-center rounded-full border border-[var(--border)] bg-white shadow-sm">
              <PenLine size={17} />
            </button>
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{profile.name}</h1>
            <p className="mt-2 text-lg text-[var(--text-muted)]">待更新职位 • 当前无候选项目</p>
            <span className="mt-2 inline-flex rounded bg-[var(--primary-soft)] px-2 py-1 text-sm text-[var(--text-muted)]">
              应聘岗位：{profile.targetRole}
            </span>
          </div>
        </div>
        <Button>更新简历</Button>
      </div>

      <section className="max-w-5xl">
        <h2 className="mb-6 text-2xl font-semibold">个人信息</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium">全名</span>
            <Input
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">目标岗位</span>
            <Input
              value={profile.targetRole}
              onChange={(event) => setProfile({ ...profile, targetRole: event.target.value })}
            />
          </label>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["项目数量", profile.projectCount],
            ["简历优化次数", profile.resumeOptimizationCount],
            ["面试准备次数", profile.interviewPrepCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded border border-[var(--border)] bg-white p-5">
              <p className="text-sm text-[var(--text-muted)]">{label}</p>
              <p className="mt-3 font-mono text-3xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded border border-dashed border-[var(--border)] bg-white p-5">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-[var(--primary)]" />
            <div>
              <h3 className="font-semibold">API Key 设置入口</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">第一版仅保留入口占位，暂不接入真实 AI API。</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
