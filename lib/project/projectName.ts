import type { Project } from "../../types/project";

export const UNNAMED_PROJECT_NAME = "未命名项目";
export const PROJECT_NAME_MAX_LENGTH = 30;

export type ProjectNameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function getProjectNameDisplay(name?: string) {
  const trimmed = name?.trim() ?? "";
  return trimmed || UNNAMED_PROJECT_NAME;
}

export function isUnnamedProjectName(name?: string) {
  return getProjectNameDisplay(name) === UNNAMED_PROJECT_NAME;
}

export function validateProjectName(value: string): ProjectNameValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false, message: "项目名称不能为空" };
  }

  if (trimmed.length > PROJECT_NAME_MAX_LENGTH) {
    return { ok: false, message: "项目名称不能超过 30 个字" };
  }

  return { ok: true, value: trimmed };
}

export function updateProjectNameInList(
  projects: Project[],
  projectId: string,
  nextName: string,
  savedAt: string,
) {
  let updatedProject: Project | undefined;
  const nextProjects = projects.map((project) => {
    if (project.id !== projectId) return project;

    updatedProject = {
      ...project,
      name: nextName,
      updatedAt: savedAt,
      editorState: project.editorState
        ? {
            ...project.editorState,
            lastSavedAt: savedAt,
            lastEditedAt: savedAt,
            hasUnsavedDraft: false,
          }
        : project.editorState,
    };

    return updatedProject;
  });

  return updatedProject
    ? { ok: true as const, projects: nextProjects, project: updatedProject }
    : { ok: false as const, projects, project: undefined };
}
