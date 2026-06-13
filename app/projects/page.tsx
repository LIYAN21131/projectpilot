import { AppShell } from "@/components/layout/AppShell";
import { ProjectEditor } from "@/components/project/ProjectEditor";

export default function ProjectsPage() {
  return (
    <AppShell searchPlaceholder="搜索项目文件...">
      <ProjectEditor />
    </AppShell>
  );
}
