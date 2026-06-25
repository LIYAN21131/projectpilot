# ProjectPilot 会话检查点

生成时间：2026-06-25  
主项目目录：`C:\Users\28163\Desktop\projectpilot`  
隔离工作区：`C:\Users\28163\Desktop\projectpilot\.worktrees\resume-optimization-quality-gate`  
功能分支：`feat/resume-optimization-quality-gate`  
隔离工作区当前 HEAD：`23fd75b98f491300c4e68509530300236b0f6499`

## 最新恢复状态（2026-06-25，Task 4 保存点）

### 当前分支与工作区

- 功能分支：`feat/resume-optimization-quality-gate`
- 隔离工作区：`C:\Users\28163\Desktop\projectpilot\.worktrees\resume-optimization-quality-gate`
- 当前 HEAD：`23fd75b98f491300c4e68509530300236b0f6499`
- 功能 worktree 状态：干净，无未提交修改。
- `git diff --check`：通过，无 whitespace 错误。
- 主工作区仍有以下未跟踪文件/目录：
  - `.codex/`
  - `.playwright-cli/`
  - `checkpoint.md`
  - `docs/superpowers/plans/2026-06-25-resume-optimization-quality-gate.md`

### 已完成内容

#### Task 3：生成 Prompt、统一评估 Prompt、请求校验

状态：完成，规格审查和代码质量审查均通过。

相关提交：

```text
403f28c fix: preserve approved evidence rubric
31fc7a2 fix: align resume rubric wording
99ef522 fix: version resume evaluation rubric
161147b fix: harden resume optimization prompt contracts
ebc3614 feat: add resume candidate generation and evaluation prompts
```

主要完成项：

- `normalizeResumeOptimizationRequest` 固定字段白名单、trim、空岗位和全空字段校验。
- 候选生成 Prompt 与统一评估 Prompt 完全分离。
- Prompt 使用版本 2，评估量表使用 rubric v2。
- 用户输入作为单行 JSON 惰性数据序列化，避免分隔符注入。
- 评估 Prompt 包含批准设计中的固定评分量表原文。
- 空缺列表 JSON 示例使用空数组，避免模型照抄后误拒全部候选。
- 所有维度要求返回 `0..20` 整数。

#### Task 4：两阶段 Route Handler

状态：实现完成并提交，规格审查通过；代码质量审查尚未执行。

提交：

```text
23fd75b feat: orchestrate gated resume optimization
```

修改文件：

```text
M  app/api/resume-optimize/route.ts
D  app/api/ai/score-resume-quality/route.ts
M  lib/resume-optimization/service.ts
M  scripts/test-resume-optimization.mjs
M  scripts/test-resume-quality.mjs
```

已实现：

- 新增 `JsonModelCaller` 和 `executeResumeOptimization`。
- 每次请求严格执行两次模型调用：
  1. 候选生成，温度 `0.4`；
  2. 原始内容与三个实际候选统一评估，温度 `0.05`。
- 两次模型调用均无重试。
- 使用 `response_format: { type: "json_object" }`。
- Route Handler 使用 `Request` 和 `NextResponse.json`。
- 请求校验失败返回 `400`。
- 缺少 `DEEPSEEK_API_KEY` 返回 `503`。
- 模型非 2xx、空响应、非法 JSON、规范化或评估异常返回 `502` 技术失败。
- 删除旧评分端点 `app/api/ai/score-resume-quality/route.ts`。
- 删除旧 Prompt/API 测试预期，保留 legacy 确定性兼容测试。
- 未修改 Task 5 范围内的浏览器客户端、埋点、UI。

Task 4 已执行并通过：

```text
npm run test:resume-optimization
npm run test:resume-quality
npx eslint app/api/resume-optimize lib/resume-optimization
git diff --check
```

TDD RED 证据：新增测试首次运行以缺少
`executeResumeOptimization` 导出失败，随后实现并转为 GREEN。

Task 4 规格审查结论：`Spec compliant`。

### 未完成项

1. Task 4 代码质量审查。
2. 如代码质量审查发现问题：由 Task 4 实现 agent 或新的接管 agent 修复，并重新审查。
3. Task 5：更新浏览器客户端和 analytics 合同。
4. Task 6：更新版本 2 质量对比 UI。
5. Task 7：集成 `ProjectEditor` 状态、保存和安全回退流程。
6. Task 8：全量测试、ESLint、生产构建、浏览器验证、需求审计和最终代码审查。
7. 全部通过后使用 `superpowers:finishing-a-development-branch`；不要自行合并到主分支。

### 下次继续的明确指令

1. 切换/进入：

```powershell
Set-Location C:\Users\28163\Desktop\projectpilot\.worktrees\resume-optimization-quality-gate
git status --short --branch
git log -5 --oneline
```

2. 确认 HEAD 为 `23fd75b98f491300c4e68509530300236b0f6499`，且 worktree 干净。
3. 不要重复实现 Task 4。
4. 先派发 Task 4 独立代码质量审查，审查范围：
   - BASE：`403f28c509568a481bdb77bd23c7b6cef3c6e71f`
   - HEAD：`23fd75b98f491300c4e68509530300236b0f6499`
5. 重点检查：
   - `executeResumeOptimization` 是否严格只有两次调用；
   - Route Handler 错误分类是否正确；
   - 非法 JSON/空响应/模型异常是否统一作为技术失败；
   - DeepSeek 请求合同、类型与测试是否稳健；
   - 删除旧端点后是否遗留无效依赖；
   - 文件职责和测试质量。
6. 代码质量审查通过后，再开始 Task 5。每个后续 Task 继续严格执行：
   - TDD RED；
   - 实现并提交；
   - 独立规格审查；
   - 独立代码质量审查；
   - 问题修复与复审。

## 0. 恢复执行前必须知道的状态

- 已评审通过的设计：
  - `docs/superpowers/specs/2026-06-25-resume-optimization-quality-gate-design.md`
  - 设计提交：`694723d`
- 已生成但尚未提交的实施计划位于主项目：
  - `docs/superpowers/plans/2026-06-25-resume-optimization-quality-gate.md`
- 实际代码改动全部在隔离 worktree 中，不在主项目工作区。
- 隔离工作区基线测试曾全部通过：
  - `npm run test:parser`
  - `npm run test:target-users`
  - `npm run test:resume-quality`
- Task 1 和 Task 2 已完成，并经过规格审查与代码质量审查。
- 当前被中断时已经派发 Task 3：
  - Agent ID：`019efce7-4b04-7c41-9b24-90c63837cd02`
  - 昵称：`Pasteur`
  - 最后一次等待被用户中断；随后再次等待 10 秒返回超时，没有最终状态。
  - 恢复时必须先检查该 agent 状态和 worktree 状态，避免重复实现或覆盖其未提交改动。

> ID 校正：用户指定的 `019efcc7-3ebe-7602-852e-8fc72176a423` 实际是已经完成并关闭的 Task 2 实现 agent，不是当前排队的 Task 3 agent。本文件仍按要求完整记录该 ID，并另行记录真实当前 Task 3。

## 1. 已完成任务 ID `019efcdc-6e68-7e11-8515-df7da49cf4bf` 的全部结论

该 ID 是 Task 2 的代码质量审查 agent，昵称 `Ampere`。

### 1.1 第一次代码质量审查结论

审查范围：

- BASE SHA：`a75184ac00404538c6a1387f7b40873b86704ee0`
- 当时 HEAD SHA：`54d32cacc9d20ee43e03236fcac9535d1fe15165`
- 审查内容：
  - 严格模型响应规范化；
  - 确定性候选质量门槛；
  - v2 内容指纹；
  - 边界测试。

确认的优点：

- 严格规范化实现了固定候选风格和固定评分维度。
- 分数会被四舍五入并限制到 `0..20`。
- 文本会被清理，列表会被去重。
- 总分全部由程序计算，不信任模型返回的总分。
- 候选顺序和指纹具有确定性。
- 未知事实 ID 会被安全拒绝。
- 测试覆盖规范化、分数边界、并列排序、安全回退和指纹。
- 聚焦测试和 ESLint 通过。

第一次发现的问题：

1. Important：事实失败提前返回，导致其他适用的拒绝原因没有被统计。
   - 位置：`lib/resume-optimization/gate.ts:103`
   - 示例：候选同时新增事实并且评分退步时，只记录 `introduced_fact`，没有记录 `dimension_regressed` 或 `total_score_decreased`。
   - 要求：累计所有适用的拒绝原因，不能因事实失败提前停止。

2. Important：`needs-information` 只依赖低内容分和非空缺口，没有考虑候选为何失败。
   - 位置：`lib/resume-optimization/gate.ts:227`
   - 风险：即使三个候选都是 `invalid_candidate`，也可能被错误展示为“用户信息不足”。
   - 要求：回退分类必须结合拒绝原因，模型或评估结构问题不能归咎于用户内容。

3. Minor：最终 `logic` 排序比较实际不可达。
   - 位置：`lib/resume-optimization/gate.ts:149`
   - 原因：总分等于 `logic + roleFit + professionalism + 固定内容分`。当总分、岗位匹配度和专业度都相等时，逻辑分必然相等。
   - 要求：移除该冗余比较或明确记录该数学不变量。

第一次结论：`Changes required`。

### 1.2 第一轮修复后的复审结论

对应修复提交：

- `f928a9813f0ccc7dc9878488fda9359376b93895`
- 提交信息：`fix: improve resume gate rejection diagnostics`

复审确认已经完成：

- 拒绝原因可以跨事实失败和评分失败累计。
- 纯 `invalid_candidate` 和纯 `introduced_fact` 不再触发 `needs-information`。
- 已移除冗余的 `logic` 排序比较。
- 新增回归测试通过。
- ESLint 和 diff 检查通过。

复审仍发现两个 Important 问题：

1. 混合有效和无效的缺失事实 ID 时，遗漏了有效拒绝原因。
   - 位置：`lib/resume-optimization/gate.ts:92`
   - 情况：`missingCoreFactIds` 同时包含真实核心事实 ID 和未知 ID。
   - 当时行为：只记录 `invalid_candidate`。
   - 正确行为：同时记录 `missing_core_fact` 和 `invalid_candidate`。

2. 无效候选的评分失败仍可能参与内容不足判断。
   - 位置：`lib/resume-optimization/gate.ts:215`
   - 情况：两个无效且低分的候选，加一个仅新增事实的候选。
   - 风险：错误进入 `needs-information`，仍然可能把模型问题归咎于用户。
   - 正确行为：只有结构有效、事实安全候选的内容相关失败，才能支持 `needs-information`。

第二次结论：`Changes required`。

### 1.3 最终修复后的审查结论

最终修复提交：

- `7cc7bb6804fff9b1f16907ac2eb6075ad3d62c24`
- 提交信息：`fix: classify mixed resume gate failures safely`

最终确认：

- 混合已知和未知缺失事实 ID 时，会同时统计两个适用原因。
- `invalid_candidate` 或事实不安全候选不能触发 `needs-information`。
- 相关回归测试通过。
- `npm run test:resume-quality` 通过。
- ESLint 通过。
- diff 检查通过。
- 没有剩余 Critical、Important 或 Minor 问题。

最终结论：`Approved`。

## 2. 用户指定的任务 ID `019efcc7-3ebe-7602-852e-8fc72176a423`

该 ID 实际为 Task 2 实现 agent，昵称 `Meitner`。该 agent 已完成并关闭，不是当前排队任务。

### 2.1 完整原始输入

```text
Implement Task 2: strict normalization, deterministic quality gate, and v2 fingerprint.

Worktree: C:\Users\28163\Desktop\projectpilot\.worktrees\resume-optimization-quality-gate
Branch: feat/resume-optimization-quality-gate
You are not alone in the codebase; do not revert existing commits. Own only:
- scripts/test-resume-optimization.mjs
- lib/resume-optimization/normalize.ts
- lib/resume-optimization/gate.ts
- lib/resume-optimization/fingerprint.ts
- minimal type corrections in types/resume-optimization.ts or types/resume-quality.ts only if strictly required by Task 2.

Use superpowers:test-driven-development strictly. Existing Task 1 contracts are committed and reviewed.

Requirements:
1. Add tests first for normalizeCandidateGeneration, normalizeUnifiedEvaluation, selectResumeOptimization, createResumeOptimizationFingerprint.
2. Candidate generation normalizer:
- exactly 3 candidates
- one each style structure, role-fit, outcome-focused
- 1-5 non-empty bullets each, strip bullet prefixes
- fixed style output order
- reject duplicate/unknown styles.
3. Unified evaluation normalizer:
- exactly two content dims completeness/evidence, exactly three expression dims logic/roleFit/professionalism, integer round+clamp 0..20, non-empty reasons/summary
- exactly three candidate evaluations, one per style in fixed order
- trim/dedupe introducedFacts, missingCoreFactIds, contentGaps; max 3 contentGaps
- compute totals in code, ignore model totals.
4. Gate input: fields, targetRole, facts, generation, evaluation, now. It must:
- pair candidates/evaluations by style
- hard reject introduced facts or missing core facts
- treat unknown missingCoreFactIds as invalid_candidate
- reject candidate total below original total
- require at least one expression dimension improves by >=1
- reject any expression dimension change < -2
- calculate originalTotal=content.total+originalExpression.total and candidate totals in code
- qualified winner sorting descending: candidate total, roleFit, professionalism, logic
- optimized response only exposes winner bullets and optimized assessment; expressionChanges contain three dims and reasons; highlights derive only positive changes, max 3
- rejectionCounts counts reasons across rejected candidates.
- no winner: needs-information only if any content dimension <=12 AND contentGaps non-empty; suggestions max3. Otherwise no-improvement with no suggestions.
- sourceFingerprint version 2 based on fixed field order, target role and winner bullets for optimized, empty bullets for fallback.
5. Use test fixtures based on the approved plan. Ensure tests cover:
- one valid structure winner while role-fit is rejected introduced_fact and outcome-focused rejected missing_core_fact
- original total 68, optimized 73 (adjust fixture scores if needed while preserving logic)
- total tie breaker order
- total equal with one positive dimension is allowed if no dimension below -2
- -2 regression allowed, -3 rejected
- all flat dims rejected no_expression_improvement
- sparse content with gaps => needs-information
- complete content/all rejected => no-improvement
- unknown missing fact id => invalid_candidate
- fingerprint deterministic and changes on role/bullets/fields.
6. Keep files focused and no AI calls/prompts yet.
7. RED: run npm run test:resume-optimization and verify missing module/function failure.
8. GREEN verification:
- npm run test:resume-optimization
- npm run test:resume-quality
- npx eslint lib/resume-optimization scripts/test-resume-optimization.mjs types/resume-optimization.ts types/resume-quality.ts
9. Commit message: feat: add deterministic resume optimization quality gate

Report DONE status, RED evidence, summary, exact verification output status, commit SHA, files changed, concerns.
```

### 2.2 规格评审要求

规格审查 agent：`019efcd4-c351-78b2-91bd-01676fda0b0c`，昵称 `Jason`。

完整审查重点：

- `normalizeCandidateGeneration`：
  - 必须恰好三个候选；
  - 必须是三个固定且唯一的 style；
  - 每个候选必须有 `1–5` 条清理后的 bullet；
  - 固定输出顺序；
  - 拒绝重复或未知 style。
- `normalizeUnifiedEvaluation`：
  - 固定内容维度和表达维度；
  - 分数规范化；
  - 文本非空；
  - 恰好三个候选评估；
  - 列表清理、去重；
  - `contentGaps` 最多三条；
  - 总分必须由程序计算。
- Gate：
  - 新增事实和遗漏核心事实是硬拒绝；
  - 未知事实 ID 为 `invalid_candidate`；
  - 总分不得下降；
  - 至少一个表达维度提升；
  - 任一表达维度下降超过 2 分则拒绝；
  - 排序、结果暴露、变化和拒绝统计必须正确；
  - 安全回退分类必须正确。
- 指纹必须固定使用 v2、固定字段、岗位和 bullet。
- 测试必须明确覆盖设计中的所有边界。
- 不得提前实现 Prompt、API 或 UI。

规格审查曾指出：

- 原 `logicTie` 测试的三个总分不相等，未实际测试最终 logic tie-breaker。
- 实现 agent 正确指出：最终 logic tie-breaker 在数学上不可独立触发。
- 处理决定：
  - 保留可达的排序规则测试；
  - 将误导性测试改为“完全相等时保持确定性候选顺序”；
  - 最终规格审查结论为 `Spec compliant`。

### 2.3 后续代码质量评审要求

代码质量审查 agent：`019efcdc-6e68-7e11-8515-df7da49cf4bf`。

审查关注：

- 数据规范化的完整性；
- 不可变性；
- 排序确定性；
- 未知事实 ID；
- 多重拒绝原因统计；
- 高亮生成；
- 类型安全；
- 重复或不可达逻辑；
- 文件职责；
- 测试质量；
- 回退提示不能把模型错误归因于用户。

### 2.4 已执行的待处理逻辑和最终状态

该 agent 先后产生以下提交：

1. `c7363ac095fb213911aa8adb5c87d138d89a74b3`
   - `feat: add deterministic resume optimization quality gate`
2. `54d32cacc9d20ee43e03236fcac9535d1fe15165`
   - `test: cover deterministic candidate tie ordering`
3. `f928a9813f0ccc7dc9878488fda9359376b93895`
   - `fix: improve resume gate rejection diagnostics`
4. `7cc7bb6804fff9b1f16907ac2eb6075ad3d62c24`
   - `fix: classify mixed resume gate failures safely`

最终实现逻辑：

- 所有适用拒绝原因都会累计。
- 事实新增不会掩盖评分下降等其他原因。
- 已知核心事实遗漏和未知事实 ID 可以同时记录。
- 只有事实安全、结构有效候选的内容相关失败，才能支持“信息不足”回退。
- 全部无效候选不会被展示为用户信息不足。
- 全部仅新增事实候选不会被展示为用户信息不足。
- 完全并列时使用稳定候选顺序保证确定性。
- Task 2 已通过规格审查和代码质量审查。

## 3. 实际当前排队/运行任务：Task 3

实际 Agent ID：`019efce7-4b04-7c41-9b24-90c63837cd02`  
昵称：`Pasteur`

### 3.1 Task 3 完整输入

```text
Implement Task 3: separate candidate-generation and unified-evaluation prompts plus request validation.

Worktree: C:\Users\28163\Desktop\projectpilot\.worktrees\resume-optimization-quality-gate
Do not revert others. Own:
- scripts/test-resume-optimization.mjs
- lib/resume-optimization/prompt.ts
- lib/resume-optimization/service.ts
- minimal type fixes only if necessary.
Use strict TDD.

Requirements:
1. Tests first:
- normalizeResumeOptimizationRequest trims fields and targetRole; rejects empty target role; rejects all-empty fields; tolerates missing/non-string field values as empty.
- generation prompt contains all three style keys, target role, serialized facts with IDs/core flags, strict no-fabrication/tool inference/core deletion constraints, exact JSON-only contract.
- unified evaluation prompt states original + all three are evaluated in same request; content only from confirmed fields; fixed content and expression dimensions 0-20; no totals/pass decision; introducedFacts/missingCoreFactIds/contentGaps; allows candidates lower scores/no forced improvement; exact JSON-only shape for all 3 styles.
- ensure generation and evaluation prompts are materially different and evaluation includes actual candidate bullets.
2. service.ts normalize request using exact fixed fields. Return {fields,targetRole}. Clear English validation errors currently used by tests.
3. prompt.ts focused exports buildCandidateGenerationPrompt and buildUnifiedEvaluationPrompt. Inputs fields/facts/targetRole and fields/facts/candidates/targetRole.
4. Generation exact output shape candidates style structure/role-fit/outcome-focused and 1-5 bullets.
5. Evaluation exact output includes two content dimensions, original expression, exactly 3 candidate evaluation objects, contentGaps. Explicitly model must not return totals or pass/fail.
6. All prompt language Chinese, concise but strict. Do not build API/model caller yet.
7. RED run expected missing module.
8. Verify:
- npm run test:resume-optimization
- npm run test:resume-quality
- npx eslint lib/resume-optimization/prompt.ts lib/resume-optimization/service.ts scripts/test-resume-optimization.mjs
9. Commit: feat: add resume candidate generation and evaluation prompts

Report RED evidence, implementation, tests, commit SHA, files, concerns.
```

### 3.2 恢复时动作

1. 先调用 agent 状态查询或等待：
   - `019efce7-4b04-7c41-9b24-90c63837cd02`
2. 检查隔离 worktree：
   - `git status --short`
   - `git log -5 --oneline`
3. 如果 agent 已完成：
   - 检查实际 diff；
   - 派发 Task 3 规格审查；
   - 规格通过后派发代码质量审查；
   - 有问题必须回到同一个实现 agent 修复并复审。
4. 如果 agent 仍在运行：
   - 等待，不要重新派发相同任务。
5. 如果 agent 已失败或消失，但 worktree 有未提交改动：
   - 先审查改动；
   - 使用新的修复 agent 接管；
   - 不要直接覆盖或重做。

## 4. 剩余下一步执行计划

### Task 3：生成 Prompt、统一评估 Prompt、请求校验

状态：已经派发，结果未知。

完成门槛：

- TDD RED/ GREEN 证据；
- 优化测试、旧评分回归测试、ESLint 通过；
- 独立提交；
- 规格审查通过；
- 代码质量审查通过。

### Task 4：替换为两阶段 Route Handler

目标：

- 浏览器仍只调用 `POST /api/resume-optimize`。
- 服务端内部严格进行两个独立 DeepSeek 请求：
  1. 一次生成三个候选；
  2. 一次统一评估原文和三个候选。
- 增加可注入的 `JsonModelCaller` 和 `executeResumeOptimization`。
- 第一次调用温度约 `0.4`。
- 第二次统一评估温度约 `0.05`。
- 使用 `response_format: { type: "json_object" }`。
- 不在本轮增加不可控重试。
- 删除被替代的 `app/api/ai/score-resume-quality/route.ts`。
- 保留旧的确定性评分基础测试，删除已过时的旧 Prompt/API 预期。

### Task 5：更新浏览器客户端与埋点合同

目标：

- `optimizeResumeBulletsWithAI(fields, targetRole)` 返回新的结果联合类型。
- 删除旧的：
  - `scoreOriginalResumeQualityWithAI`
  - `scoreOptimizedResumeQualityWithAI`
- 新增事件：
  - `resume_optimization_passed`
  - `resume_optimization_safe_fallback`
  - `resume_candidate_rejected`
  - `resume_optimization_technical_error`
  - `resume_optimization_saved`
- 埋点禁止发送简历正文、候选正文和事实正文。

### Task 6：更新质量对比 UI

目标：

- 展示内容基础分 `/40`。
- 展示原始表达分 `/60`。
- 成功时展示优化表达分 `/60` 和总分变化。
- 只展示三个表达维度变化。
- 明确说明内容分共享且不因改写变化。
- 支持：
  - `optimized`
  - `needs-information`
  - `no-improvement`
  - 技术失败
  - legacy v1 提示
  - stale 状态
- 不展示失败候选。
- 不展示真实性风险或焦虑措辞。

### Task 7：集成 `ProjectEditor`

目标：

- 删除独立优化前/后评分请求。
- 用户确认识别结果时不再自动评分。
- 点击优化时：
  - 设置统一 loading；
  - 一次请求取得最终优化或安全回退；
  - 成功才替换当前新生成结果；
  - 安全回退保留原始或已保存结果；
  - 技术失败与业务回退严格分开。
- 新状态：
  - `idle`
  - `loading`
  - `success`
  - `safe-fallback`
  - `error`
- 保存时只允许保存：
  - v2；
  - outcome 为 `optimized`；
  - assessment 为 `current`；
  - 存在 winner bullets。
- 已保存旧结果不得在新请求失败或安全回退时被清空。
- 复制/保存按钮只对通过门槛或已恢复的通过版本可用。

### Task 8：全量验证与需求审计

必须执行：

```powershell
npm run test:parser
npm run test:target-users
npm run test:resume-quality
npm run test:resume-optimization
npx eslint app components lib types scripts
npm run build
git diff --check
git status --short
git log -8 --oneline
```

还必须进行浏览器验证：

- 成功路径只显示一个胜出候选；
- 显示 `/40` 和 `/60`；
- 保存和复制有效；
- 稀疏内容进入安全回退；
- 安全回退最多三条建议；
- 技术失败不显示内容不足；
- 浏览器控制台无错误。

完成所有任务后：

- 派发整个实现的最终代码审查；
- 使用 `superpowers:finishing-a-development-branch`；
- 不得直接在主分支上合并，除非用户明确选择。

## 5. 全部拒绝规则

候选只要符合以下任一条件就必须拒绝：

1. `introduced_fact`
   - 新增原始字段不存在的事实；
   - 新增数据、人数、金额、比例、转化率、增长率；
   - 新增职责、行动、结果；
   - 根据工具推断开发、部署、上线、发布、集成或增长。

2. `missing_core_fact`
   - 遗漏个人职责；
   - 遗漏体现用户贡献的关键行动；
   - 遗漏明确成果；
   - 遗漏重要数据指标。

3. `invalid_candidate`
   - 候选为空；
   - bullet 结构非法；
   - style 未知或重复；
   - 评估引用未知事实 ID；
   - 评估结构不完整。

4. `total_score_decreased`
   - 候选总分低于原始总分。

5. `no_expression_improvement`
   - `logic`、`roleFit`、`professionalism` 三项均没有至少提升 1 分。

6. `dimension_regressed`
   - 任一表达维度下降超过 2 分；
   - `-2` 允许；
   - `-3` 必须拒绝。

拒绝原因必须累计：

- 同一个候选可以同时有多个拒绝原因；
- 不能因事实失败提前停止评分原因统计；
- 已知遗漏事实与未知事实 ID 可以同时记录。

## 6. 安全回退规则

### `needs-information`

必须同时满足：

- 至少一个内容基础维度 `<= 12`；
- `contentGaps` 非空；
- 至少存在一个结构有效、事实安全候选，因内容相关原因未通过。

可支持内容不足判断的候选失败包括：

- `missing_core_fact`；
- `total_score_decreased`；
- `no_expression_improvement`；
- `dimension_regressed`。

但该候选不能同时是：

- `invalid_candidate`；
- `introduced_fact`。

返回规则：

- 不返回候选 bullet；
- 保留当前内容；
- 最多返回三条建议；
- 建议只能说明需要补充的信息类型，不能编造答案。

### `no-improvement`

以下情况必须使用：

- 内容维度均不低于 13，三个候选仍无提升；
- 全部候选无效；
- 全部候选只存在新增事实；
- 没有任何事实安全且结构有效的内容相关失败；
- 评分无法证明候选比当前版本更好。

返回规则：

- 不返回候选 bullet；
- 不强行生成补充建议；
- 提示当前版本较完整，暂不建议替换。

### 技术失败

包括：

- 网络错误；
- 模型超时；
- 非法 JSON；
- 模型空响应；
- 规范化失败；
- 评估结构异常。

技术失败：

- 不属于 `needs-information`；
- 不属于 `no-improvement`；
- Route Handler 返回技术错误状态；
- UI 显示“优化暂时失败，请重试”；
- 不显示内容不足建议。

## 7. 评分和排序约束

### 内容基础分：40 分

- `completeness`：20
- `evidence`：20
- 只根据确认原始字段计算；
- 所有候选共享；
- 改写不能提高内容分。

### 表达效果分：60 分

- `logic`：20
- `roleFit`：20
- `professionalism`：20
- 原文和每个候选分别评分。

### 总分

```text
总分 = 内容基础分 + 表达效果分
```

所有总分、差值和通过判断必须由程序计算，不能接受模型提供的算术结果。

### 候选通过条件

必须全部满足：

- 没有新增事实；
- 没有遗漏核心事实；
- 结构有效；
- 总分不低于原始版本；
- 至少一个表达维度提升至少 1 分；
- 任一表达维度下降不超过 2 分。

### 候选排序

在合格候选中依次比较：

1. 总分；
2. `roleFit`；
3. `professionalism`。

原设计还写了 `logic`，但它在前述条件相等后数学上必然相等，因此实现已移除该不可达比较。完全并列时保留规范化后的固定 style 顺序：

1. `structure`
2. `role-fit`
3. `outcome-focused`

## 8. Prompt 和模型约束

- 一次生成请求必须恰好产生三个候选：
  - `structure`
  - `role-fit`
  - `outcome-focused`
- 每个候选 `1–5` 条 bullet。
- 生成和评估必须是两个独立模型请求，使用不同 Prompt。
- 评估请求必须在同一次请求中同时评估：
  - 原始版本；
  - 三个候选。
- 评估模型：
  - 不返回总分；
  - 不返回通过或失败；
  - 允许候选分数下降；
  - 不得为了展示优化效果强行提高分数。
- 输出必须是合法 JSON，不得包含 Markdown 或解释性文本。
- 所有提示词必须禁止：
  - 虚构事实；
  - 虚构数据；
  - 工具推断；
  - 删除核心事实换取精炼；
  - 无依据的夸大词。

## 9. 类型与持久化约束

- 必须保留 v1 评分结构兼容已存项目。
- v2 assessment 是带判别字段的联合类型：
  - `optimized` 必须包含 `optimizedExpression` 和 `optimizedTotal`；
  - fallback assessment 不得包含优化结果字段。
- API response 的 `status` 必须与 assessment 的 `outcome` 类型严格关联。
- 评分结果继续持久化在 `Project.resumeQualityAssessment`。
- v1 UI 不再伪装为当前评分，应提示评分标准已更新。
- 指纹必须包含：
  - rubric v2；
  - 固定顺序字段；
  - 目标岗位；
  - 成功时的 winner bullets；
  - fallback 时空 bullets。

## 10. 工作流约束

- 使用 `superpowers:subagent-driven-development`。
- 每个 Task：
  1. 新实现 agent；
  2. 严格 TDD；
  3. 实现 agent 自审并提交；
  4. 独立规格审查；
  5. 规格问题由原实现 agent 修复；
  6. 规格通过后再进行代码质量审查；
  7. 代码质量问题由原实现 agent 修复；
  8. 复审通过后才能进入下一 Task。
- 不允许并行派发会修改相同文件的实现 agent。
- 不允许跳过 RED 证据。
- 不允许仅信任 agent 报告，必须检查实际代码和 diff。
- 不允许在完成验证前声称功能完成。
- 当前工作必须继续留在隔离 worktree。

## 11. 已完成提交序列

```text
7cc7bb6 fix: classify mixed resume gate failures safely
f928a98 fix: improve resume gate rejection diagnostics
54d32ca test: cover deterministic candidate tie ordering
c7363ac feat: add deterministic resume optimization quality gate
a75184a refactor: strengthen resume optimization contracts
4e367a1 test: align resume optimization fixture
1079b17 feat: define resume optimization quality contracts
694723d docs: design resume optimization quality gate
```

## 12. 主工作区未跟踪文件

主项目最后检查时存在：

```text
?? .codex/
?? .playwright-cli/
?? docs/superpowers/plans/2026-06-25-resume-optimization-quality-gate.md
```

这些属于用户或会话资产，不得删除或意外提交。
