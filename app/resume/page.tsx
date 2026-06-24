import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ResumeOptimizationPanel } from "@/components/resume/ResumeOptimizationPanel";

export default function ResumePage() {
  return (
    <AppShell searchPlaceholder="简历优化">
      <PageHeader
        eyebrow="项目表达"
        title="简历优化"
        description="基于已确认的项目资料生成项目经历要点，并保留原始内容用于逐项核对。"
      />
      <ResumeOptimizationPanel />
    </AppShell>
  );
}
