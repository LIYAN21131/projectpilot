import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InterviewQuestionList } from "@/components/interview/InterviewQuestionList";

export default function InterviewPage() {
  return (
    <AppShell searchPlaceholder="面试准备">
      <PageHeader
        eyebrow="项目表达"
        title="面试准备"
        description="围绕项目背景、决策过程和结果生成追问题，并整理成可练习的回答结构。"
      />
      <InterviewQuestionList />
    </AppShell>
  );
}
