"use client";

import type { Project } from "@/types/project";
import { Select } from "@/components/common/Field";

export function ProjectSelector({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">选择项目</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name || "未命名项目"}
        </option>
      ))}
    </Select>
  );
}
