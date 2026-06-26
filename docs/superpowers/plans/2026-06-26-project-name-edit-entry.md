# Project Name Edit Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent project-name display and rename dialog to the project import/edit page, with synchronized localStorage, top bar, and project list state.

**Architecture:** Keep the UI changes localized to `ProjectEditor` and `TopBar`. Extract project-name display, validation, and immutable update helpers into a tiny pure utility so the behavior can be tested without a browser UI harness.

**Tech Stack:** Next.js 16.2 App Router, React 19.2 client components, TypeScript, existing Tailwind CSS utility classes, localStorage-backed `useProjectPilotStore`.

---

### Task 1: Project Name Helper Tests

**Files:**
- Create: `scripts/test-project-name.mjs`
- Create: `lib/project/projectName.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `scripts/test-project-name.mjs` with assertions for:

```js
import assert from "node:assert/strict";
import {
  getProjectNameDisplay,
  isUnnamedProjectName,
  validateProjectName,
  updateProjectNameInList,
} from "../lib/project/projectName.ts";

const now = "2026-06-26T12:00:00.000Z";
const baseProject = {
  id: "p1",
  name: "",
  background: "",
  targetUsers: "",
  painPoints: "",
  solution: "",
  responsibilities: "",
  results: "",
  metrics: "",
  tools: "",
  review: "",
  createdAt: "2026-06-25T12:00:00.000Z",
  updatedAt: "2026-06-25T12:00:00.000Z",
  editorState: {
    activeSection: "material-import",
    scrollY: 0,
    lastSavedAt: "2026-06-25T12:00:00.000Z",
    lastEditedAt: "2026-06-25T12:00:00.000Z",
    hasUnsavedDraft: false,
    status: "待完善",
  },
};

assert.equal(getProjectNameDisplay(""), "未命名项目");
assert.equal(getProjectNameDisplay("  "), "未命名项目");
assert.equal(getProjectNameDisplay("校园二手交易平台"), "校园二手交易平台");
assert.equal(isUnnamedProjectName(""), true);
assert.equal(isUnnamedProjectName("未命名项目"), true);
assert.equal(isUnnamedProjectName("真实项目"), false);
assert.deepEqual(validateProjectName("  "), { ok: false, message: "项目名称不能为空" });
assert.deepEqual(validateProjectName("一".repeat(31)), { ok: false, message: "项目名称不能超过 30 个字" });
assert.deepEqual(validateProjectName(" 校园二手交易平台 "), { ok: true, value: "校园二手交易平台" });

const result = updateProjectNameInList([baseProject], "p1", "校园二手交易平台", now);
assert.equal(result.ok, true);
assert.equal(result.projects[0].name, "校园二手交易平台");
assert.equal(result.projects[0].updatedAt, now);
assert.equal(result.projects[0].editorState.lastSavedAt, now);
assert.equal(result.projects[0].editorState.lastEditedAt, now);
assert.equal(result.projects[0].editorState.status, "待完善");
assert.equal(updateProjectNameInList([baseProject], "missing", "新名称", now).ok, false);
```

- [ ] **Step 2: Run tests to verify RED**

Run: `node --no-warnings --experimental-strip-types scripts/test-project-name.mjs`

Expected: fail because `lib/project/projectName.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `lib/project/projectName.ts` with:

```ts
import type { Project } from "@/types/project";

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
  if (!trimmed) return { ok: false, message: "项目名称不能为空" };
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
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --no-warnings --experimental-strip-types scripts/test-project-name.mjs`

Expected: all assertions pass.

### Task 2: Editor Rename UI

**Files:**
- Modify: `components/project/ProjectEditor.tsx`

- [ ] **Step 1: Add local modal state**

Add state for `isNameDialogOpen`, `nameInput`, `nameError`, and `isNameSaving`.

- [ ] **Step 2: Add open/cancel/save handlers**

Add handlers that default unnamed projects to an empty input, validate with `validateProjectName`, update the current project using existing safe localStorage functions, sync `setProjects`, `setDraft`, `lastSavedAt`, `saveState`, and show `项目名称已更新`.

- [ ] **Step 3: Render project name module above save status**

Render the label, truncated name, and primary button in the existing page header block. Button text uses `设置项目名称` when unnamed and `修改名称` otherwise.

- [ ] **Step 4: Render accessible modal**

Render a fixed overlay with title `修改项目名称`, input placeholder, cancel/save buttons, Enter save, Esc cancel, and error text.

### Task 3: Top Bar Sync

**Files:**
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/layout/TopBar.tsx`
- Modify: `app/projects/edit/page.tsx`

- [ ] **Step 1: Pass current project id**

Extend `AppShell` with optional `currentProjectId`, pass it to `TopBar`, and pass the awaited `projectId` from `app/projects/edit/page.tsx`.

- [ ] **Step 2: Resolve top bar project by id**

Update `TopBar` to display `projects.find(project.id === currentProjectId)?.name`, falling back to the first project and then `未命名项目` / existing default.

### Task 4: Verification

**Files:**
- Modify only if lint/build exposes a real issue.

- [ ] **Step 1: Run helper tests**

Run: `node --no-warnings --experimental-strip-types scripts/test-project-name.mjs`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Run build**

Run: `npm run build`

- [ ] **Step 4: Manual browser check**

Start the dev server, open `/projects/edit`, set a name, verify the header, top bar, localStorage-backed refresh, and list page.
