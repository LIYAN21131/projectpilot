# ProjectPilot 项目名称修改入口设计

## 背景

项目导入 / 编辑项目档案页面当前只在顶部状态栏显示“当前项目：未命名项目”。这个位置不够醒目，且没有明确的修改入口，用户容易在导入和编辑流程中一直看到“未命名项目”，却不知道应该在哪里修改。

本次设计目标是在编辑页主内容顶部新增一个清晰的项目名称展示与修改入口，让用户进入页面后第一眼看到当前项目名称，并能快速修改。首轮实现范围覆盖 P0 和 P1；P2 的 AI 建议名称仅预留扩展点，不进入本轮实现。

## 当前代码判断

项目名称字段使用现有 `Project.name`。

相关现状：

- `types/project.ts` 中 `Project` 已有必填字段 `name: string`。
- `app/projects/page.tsx` 的项目档案列表使用 `project.name` 展示项目名称。
- `components/project/ProjectEditor.tsx` 使用 `draft.name` 作为编辑页项目名称状态。
- `ProjectEditor` 的 `persistProject(...)` 已负责把项目写回 `projectpilot.projects` localStorage，并通过 `setProjects(nextProjects)` 同步当前页面 store。
- `components/layout/TopBar.tsx` 当前使用 `projects[0]?.name` 显示“当前项目”，这不能准确代表 `/projects/edit?projectId=xxx` 正在编辑的项目，需要纳入本次修正。

不新增 `title` 字段，不新增 localStorage key，不改变 `projectpilot.projects` 的整体存储结构。

## 范围

本轮实现：

- 在编辑页主内容顶部新增醒目的项目名称展示区域。
- 支持点击按钮打开弹窗修改项目名称。
- 保存后同步编辑页标题区、顶部“当前项目”、项目档案列表和 localStorage。
- 空名称、超长名称校验。
- 保存成功轻提示。
- 保存成功后更新自动保存时间。

不在本轮实现：

- AI 识别完成后的建议名称展示。
- 修改 DeepSeek / AI 识别 prompt。
- 重构编辑页整体流程或拆分大组件。
- 改变资料导入、识别整理、保存、简历优化、面试准备流程。

## 推荐方案

采用“标题区下方轻量项目名称条 + 弹窗修改”的方案。

在编辑页主内容区域顶部，也就是“编辑项目档案”标题和项目状态标签附近，新增项目名称模块。模块优先级高于“资料导入”卡片，但不做大型独立营销式卡片，保持白底、浅灰边框、蓝色主按钮的现有风格。

推荐结构：

```text
编辑项目档案    [待完善]

项目名称
未命名项目                         [设置项目名称]

已自动保存 20:25
资料导入卡片
```

已命名时：

```text
项目名称
校园二手交易平台优化项目             [修改名称]
```

选择弹窗而不是行内编辑，原因是：标题区可以保持稳定布局，移动端不容易拥挤，且不会让新增入口和下方“项目资料”表单混在一起。

## UI 设计

项目名称模块放在 `ProjectEditor` 主内容 `<section className="min-w-0 space-y-6">` 的顶部标题区域内，位于标题 / 状态标签之后、保存状态之前。

展示规则：

- 标签显示 `项目名称`。
- 名称为空或全空格时展示 `未命名项目`。
- 名称使用较大的字体，建议与页面二级标题接近但低于主标题，例如 `text-xl` 或相邻现有样式。
- 名称容器使用 `min-w-0` 和 `truncate`，过长时单行省略。
- 名称元素添加 `title={currentProjectName}`，便于悬停查看完整名称。
- 右侧按钮使用现有 `Button` 的 primary 风格。
- 名称为空或展示为 `未命名项目` 时按钮文案为 `设置项目名称`。
- 已命名时按钮文案为 `修改名称`。
- 窄屏下项目名称和按钮上下排列，避免挤压或重叠。

弹窗 UI：

- 标题：`修改项目名称`
- 输入框 placeholder：`请输入项目名称，例如：校园二手交易平台优化项目`
- 操作按钮：`取消`、`保存`
- 错误提示显示在输入框下方。
- 保存中按钮显示 loading 文案，例如 `保存中...`，并禁用重复点击。

弹窗可在 `ProjectEditor` 内部实现为轻量 modal，不需要引入新的依赖。

## 交互规则

打开弹窗：

- 点击 `设置项目名称` 或 `修改名称` 打开。
- 输入框默认填入当前项目名称。
- 如果当前项目名称为空或等于 `未命名项目`，输入框默认留空，避免用户误以为“未命名项目”是真实名称。
- 打开后输入框自动聚焦。

保存：

- 点击 `保存` 或按 Enter 触发保存。
- 保存前对输入值 `trim()`。
- 空值或全空格时提示 `项目名称不能为空`。
- 超过 30 个字符时提示 `项目名称不能超过 30 个字`。
- 保存过程中禁用保存按钮，避免重复点击。
- 保存成功后关闭弹窗，并显示 toast：`项目名称已更新`。

取消：

- 点击 `取消`、关闭按钮、遮罩，或按 Esc 取消。
- 取消不修改 `draft.name`，不写 localStorage。

## 数据流

新增一个集中函数处理名称更新，例如 `updateProjectName(nextName: string)`。它只负责名称修改，不改变项目状态和其他业务字段。

保存名称时的顺序：

1. 校验输入。
2. 生成 `now = new Date().toISOString()`。
3. 构造 `normalized` 项目，保持现有项目字段，仅覆盖：
   - `name: trimmedName`
   - `updatedAt: now`
   - `editorState.lastSavedAt: now`
   - `editorState.lastEditedAt: now`
4. 按当前 `draft.id` 在 `projectpilot.projects` 中查找并替换对应项目。
5. 写回 localStorage。
6. 调用 `setProjects(nextProjects)`。
7. 调用 `setDraft(updatedProject)`。
8. 更新 `lastSavedAt` 和 `saveState`。
9. 显示 toast。

实现时优先复用 `persistProject(...)`，但需要确保 `projectOverrides.name` 能覆盖默认的 `draft.name.trim() || "未命名项目"`。如果当前 `persistProject` 的 merge 顺序会覆盖掉传入名称，应调整为让 `projectOverrides.name` 生效，或在 `updateProjectName` 内独立执行同样的安全读写逻辑。

新增函数应避免和普通字段编辑的自动保存互相冲突。保存项目名称成功后，`userEditedRef.current` 应保持为 false 或被重置，防止随后无意义地重复自动保存。

## 顶部当前项目同步

`TopBar` 当前用 `projects[0]?.name` 显示“当前项目”，这在编辑非第一个项目时会显示错误。

本次需要改为按当前 URL 的 `projectId` 查找：

- 使用当前 pathname / search params 读取 `projectId`。
- 在 `projects` 中查找 `id === projectId` 的项目。
- 找到则显示该项目 `name`，空名称 fallback 到 `未命名项目`。
- 找不到且存在项目列表时可保留现有 fallback 到第一个项目。
- 没有项目时显示现有默认文案。

这样保存名称后，由于 `setProjects(nextProjects)` 已更新 store，顶部“当前项目：xxx”会同步刷新。

## 项目列表同步

项目列表页无需新增字段。只要 `projectpilot.projects` 中对应 `project.id` 的 `name` 更新，`app/projects/page.tsx` 当前 `projectTitle(project.name)` 会自然显示新名称。

需要保持当前列表 fallback：

- `project.name.trim()` 有值时显示真实名称。
- 没有值时显示 `未命名项目`。

## 状态逻辑

项目状态不受名称修改影响。

保留现有 `editorState.status` 和 `getProjectStatus(...)` 的判断。名称从 `未命名项目` 改为真实名称，不应自动把项目从“待完善”改成“已整理”或其他状态。

如果现有 `getProjectStatus` 把缺少 `name` 作为“待完善”的条件，名称修改只会满足名称字段本身，不改变其他字段的完整性判断。

## P2 预留：建议名称

AI 识别返回结果里已有 `recognized.projectName`。后续可以在识别完成后，如果当前项目名称为空或为 `未命名项目`，在项目名称模块下方展示：

```text
建议名称：校园二手交易平台优化项目    [使用该名称]
```

本轮不实现该展示和按钮，原因是用户已确认首轮只做 P0/P1，避免扩大改动面。

后续实现时应复用同一个 `updateProjectName(...)`，不要另写一套保存逻辑。

## 错误处理

校验错误：

- 空名称：弹窗内显示 `项目名称不能为空`。
- 超长名称：弹窗内显示 `项目名称不能超过 30 个字`。

持久化错误：

- localStorage 读取或写入失败时，不关闭弹窗。
- 保存按钮恢复可点击。
- 显示错误提示：`项目名称保存失败，请稍后重试`。
- 不清空用户输入。

## 测试与验收

手动验收：

- 进入 `/projects/edit?projectId=xxx`，主内容顶部能看到项目名称区域。
- 当前名称为空或为 `未命名项目` 时，按钮显示 `设置项目名称`。
- 点击按钮后弹窗打开，输入框默认按规则填入当前名称。
- 输入真实名称保存后，编辑页项目名称立即更新。
- 顶部“当前项目：xxx”立即同步。
- 返回项目档案列表后，对应项目卡片显示新名称。
- 刷新编辑页后名称仍存在。
- 再次点击 `修改名称`，输入框默认显示当前真实名称。
- 空名称不能保存，并提示 `项目名称不能为空`。
- 超过 30 个字不能保存，并提示 `项目名称不能超过 30 个字`。
- 点击取消、遮罩或按 Esc 不修改名称。
- 按 Enter 可以保存。
- 保存过程中重复点击不会产生重复写入。
- 修改名称不影响资料导入、AI 识别、确认保存、简历优化和面试准备入口。
- 浏览器控制台没有明显报错。

自动化或命令验证：

- 运行 `npm run lint`。
- 如实现涉及纯函数校验，可补充最小单元测试；本轮主要是客户端 UI 与 localStorage 同步，优先保证手动验收完整。

## 实现边界

- 不重构整个 `ProjectEditor`。
- 不修改 AI prompt。
- 不新增依赖。
- 不新增重复名称字段。
- 新增代码集中在 `ProjectEditor` 和必要的 `TopBar` 同步逻辑。
- 若抽取小组件，只抽取项目名称模块或弹窗，避免牵动其他流程。
