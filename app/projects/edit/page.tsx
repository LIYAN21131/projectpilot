import { AppShell } from "@/components/layout/AppShell";
import { ProjectEditor } from "@/components/project/ProjectEditor";

export default async function ProjectEditPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;

  return (
    <AppShell searchPlaceholder="搜索项目档案..." hideSidebar>
      <ProjectEditor initialProjectId={projectId} />
    </AppShell>
  );
}
