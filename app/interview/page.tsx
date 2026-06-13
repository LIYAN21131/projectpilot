import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { InterviewQuestionList } from "@/components/interview/InterviewQuestionList";

export default function InterviewPage() {
  return (
    <AppShell searchPlaceholder="搜索知识点...">
      <PageHeader
        eyebrow="项目 / 面试准备"
        title="面试准备 (Interview Prep)"
        description="针对当前项目简历与档案自动生成面试知识库。"
      />
      <InterviewQuestionList />
    </AppShell>
  );
}
