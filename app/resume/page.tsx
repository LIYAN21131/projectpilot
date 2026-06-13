import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResumeOptimizationPanel } from "@/components/resume/ResumeOptimizationPanel";

export default function ResumePage() {
  return (
    <AppShell searchPlaceholder="搜索项目、简历或关键词...">
      <PageHeader
        eyebrow="项目 / 简历优化"
        title="简历优化"
        description="根据项目经历生成更适合产品岗位的简历表达。"
      />
      <ResumeOptimizationPanel />
    </AppShell>
  );
}
