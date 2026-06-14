import type { Project } from "@/types/project";

export type StructuredProjectResult = {
  projectName: string;
  projectBackground: string;
  userPainPoint: string;
  targetUser: string;
  solution: string;
  myRole: string;
  resultData: string;
  projectOutcome: string;
  projectHighlight: string;
};

export type StructuredProjectValidation = {
  isValid: boolean;
  warnings: string[];
};

type StructuredField = keyof StructuredProjectResult;

const emptyStructuredProject: StructuredProjectResult = {
  projectName: "",
  projectBackground: "",
  userPainPoint: "",
  targetUser: "",
  solution: "",
  myRole: "",
  resultData: "",
  projectOutcome: "",
  projectHighlight: "",
};

const labelMap: Record<StructuredField, string[]> = {
  projectName: ["项目名称", "项目名", "产品名称", "产品名", "工具名称", "工具名", "平台名称", "平台名", "名称"],
  projectBackground: ["项目背景", "背景", "业务背景", "场景来源", "项目来源", "为什么做", "项目描述", "项目介绍", "项目简介"],
  userPainPoint: ["用户痛点", "痛点", "问题", "业务问题", "核心问题", "困难", "原流程问题", "风险点"],
  targetUser: ["目标用户", "用户群体", "服务对象", "典型用户", "适用人群", "面向用户", "使用人群"],
  solution: ["解决方案", "产品方案", "方案", "核心功能", "功能设计", "用户流程", "解决方式", "核心流程", "核心流程为"],
  myRole: ["个人职责", "我的职责", "职责", "负责内容", "工作内容", "项目职责", "负责事项", "参与内容", "职责分工"],
  resultData: ["数据指标", "指标", "量化指标", "结果数据", "数据结果", "验证数据", "测试数据"],
  projectOutcome: ["项目成果", "成果", "结果", "项目结果", "成果总结", "结果总结", "验证结果"],
  projectHighlight: ["项目亮点", "亮点", "创新点", "产品价值", "能力体现", "项目价值", "完整闭环", "复盘"],
};

const semanticRules: Record<StructuredField, string[]> = {
  projectName: ["项目名", "产品名", "工具名", "平台名", "系统名", "名称"],
  projectBackground: ["背景", "场景", "来源", "为了", "由于", "随着", "在", "业务", "环境", "需求来自"],
  userPainPoint: ["问题", "困难", "痛点", "低效", "不清楚", "不方便", "成本高", "容易遗漏", "风险", "讲不出来", "表达不清", "难以", "不容易", "提炼不清晰", "分散", "重复", "耗时"],
  targetUser: ["用户", "人群", "学生", "求职者", "商家", "玩家", "应届生", "运营", "老师", "企业", "管理员", "使用者", "面向"],
  solution: ["功能", "流程", "方案", "支持", "自动", "生成", "管理", "保存", "复制", "识别", "推荐", "匹配", "导出", "看板", "上传", "检索"],
  myRole: ["我负责", "我使用", "我完成", "我设计", "我参与", "负责", "设计了", "完成了", "使用", "协作", "推进", "梳理", "搭建"],
  resultData: ["名", "个", "人", "次", "%", "％", "百分比", "超过", "达到", "提升", "降低", "转化率", "采纳率", "成功率", "点击", "输入", "生成", "复制", "保存", "测试", "访谈", "体验"],
  projectOutcome: ["验证了", "证明", "表明", "具备", "采纳价值", "真实需求", "意愿", "效果", "成果", "价值"],
  projectHighlight: ["亮点", "创新", "价值", "闭环", "沉淀", "复用", "完整", "能力", "优势", "体验提升"],
};

const priorityBySignal: StructuredField[] = [
  "resultData",
  "myRole",
  "solution",
  "targetUser",
  "userPainPoint",
  "projectOutcome",
  "projectHighlight",
  "projectBackground",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(source: string) {
  return source.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
}

function labelPattern(label: string) {
  return new RegExp(`^\\s*(?:[-*•]|\\d+[.、])?\\s*(?:【|\\[)?${escapeRegExp(label)}(?:】|\\])?\\s*[：:]`);
}

function findLabeledField(line: string): StructuredField | undefined {
  return (Object.keys(labelMap) as StructuredField[]).find((field) =>
    labelMap[field].some((label) => labelPattern(label).test(line)),
  );
}

function stripLabel(line: string, field: StructuredField) {
  const label = labelMap[field].find((item) => labelPattern(item).test(line));
  return label ? line.replace(labelPattern(label), "").trim() : line.trim();
}

function splitSentences(source: string) {
  return normalizeText(source)
    .split(/[\n。；;!?！？]+/)
    .map((item) => item.replace(/^\s*(?:[-*•]|\d+[.、])\s*/, "").trim())
    .filter(Boolean);
}

function hasNumberSignal(text: string) {
  return /\d+(\.\d+)?\s*(%|％|人|人次|次|分钟|小时|天|个月|倍|单|条|个|份|元|万|k|K)?/.test(text);
}

function hasResultDataSignal(text: string) {
  return (
    hasNumberSignal(text) ||
    /(转化率|采纳率|成功率|提升率|百分比|超过|达到)\s*\d*/.test(text)
  );
}

function hasDataPollutionSignal(text: string) {
  return hasResultDataSignal(text) && /(点击|输入|生成|复制|保存|测试|访谈|体验|采纳率|转化率|成功率|提升|降低|超过|达到)/.test(text);
}

function hasSolutionFlowSignal(text: string) {
  return /(核心流程为|用户输入|AI自动|自动|生成|支持复制|复制|保存|最终输出|输出|支持.*操作)/.test(text);
}

function hasTargetUserSignal(text: string) {
  return /(应届生|求职者|学生|商家|玩家|用户|人群|内容作者|管理员|运营|老师|企业|使用者)/.test(text);
}

function scoreField(sentence: string, field: StructuredField) {
  const keywordScore = semanticRules[field].reduce((score, keyword) => score + (sentence.includes(keyword) ? 2 : 0), 0);
  const numberScore = field === "resultData" && hasResultDataSignal(sentence) ? 12 : 0;
  const roleScore = field === "myRole" && /我(负责|使用|完成|设计|参与|推进|梳理|搭建)/.test(sentence) ? 6 : 0;
  const solutionScore = field === "solution" && hasSolutionFlowSignal(sentence) ? 8 : 0;
  const targetPenalty = field === "targetUser" && hasDataPollutionSignal(sentence) ? -12 : 0;
  const backgroundPenalty = field === "projectBackground" && hasResultDataSignal(sentence) ? -8 : 0;
  const namePenalty = field === "projectName" && sentence.length > 40 ? -8 : 0;

  return keywordScore + numberScore + roleScore + solutionScore + targetPenalty + backgroundPenalty + namePenalty;
}

function classifySentence(sentence: string): StructuredField {
  const scored = priorityBySignal
    .map((field) => ({ field, score: scoreField(sentence, field) }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) {
    return scored[0].field;
  }

  return "projectBackground";
}

function appendUnique(result: StructuredProjectResult, field: StructuredField, value: string) {
  const cleanValue = value.trim();
  if (!cleanValue) return;
  const existing = result[field];
  if (existing.includes(cleanValue)) return;
  result[field] = existing ? `${existing}\n${cleanValue}` : cleanValue;
}

function extractLabeledSections(source: string) {
  const result = { ...emptyStructuredProject };
  const lines = normalizeText(source).split("\n");
  let currentField: StructuredField | undefined;

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const labeledField = findLabeledField(cleanLine);
    if (labeledField) {
      currentField = labeledField;
      appendUnique(result, currentField, stripLabel(cleanLine, currentField));
      continue;
    }

    if (currentField) {
      const semanticField = classifySentence(cleanLine);
      if (semanticField !== currentField && scoreField(cleanLine, semanticField) >= 6) {
        appendUnique(result, semanticField, cleanLine);
      } else {
        appendUnique(result, currentField, cleanLine);
      }
    }
  }

  return result;
}

function inferProjectName(source: string, result: StructuredProjectResult) {
  if (result.projectName.trim()) return;

  const firstLine = normalizeText(source).split("\n").find(Boolean)?.trim() ?? "";
  const nameLikeMatch = firstLine.match(/(?:项目|产品|工具|平台|系统)?(?:名称|名)[：:]\s*(.+)$/);
  if (nameLikeMatch?.[1] && nameLikeMatch[1].length <= 40) {
    result.projectName = nameLikeMatch[1].trim();
    return;
  }

  if (firstLine.length > 3 && firstLine.length <= 30 && !/[。；;!?！？]/.test(firstLine)) {
    result.projectName = firstLine.replace(/^[-*•\d.、\s]+/, "");
  }
}

function removeDuplicateContent(result: StructuredProjectResult) {
  const seen = new Set<string>();

  for (const field of Object.keys(result) as StructuredField[]) {
    const parts = result[field]
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item)) return false;
        seen.add(item);
        return true;
      });
    result[field] = parts.join("\n");
  }
}

function trimOversizedFields(result: StructuredProjectResult, source: string) {
  const maxLength = Math.max(80, Math.floor(normalizeText(source).length * 0.4));

  for (const field of Object.keys(result) as StructuredField[]) {
    if (result[field].length <= maxLength) continue;

    const kept: string[] = [];
    let total = 0;
    for (const sentence of splitSentences(result[field])) {
      if (total + sentence.length > maxLength) break;
      kept.push(sentence);
      total += sentence.length;
    }
    result[field] = kept.join("\n") || result[field].slice(0, maxLength);
  }
}

function applySemanticCorrection(result: StructuredProjectResult, source: string) {
  const allClassifiedText = new Set(
    Object.values(result)
      .flatMap((value) => splitSentences(value))
      .map((item) => item.trim()),
  );

  for (const sentence of splitSentences(source)) {
    if (allClassifiedText.has(sentence)) continue;
    const labeledField = findLabeledField(sentence);
    if (labeledField) {
      appendUnique(result, labeledField, stripLabel(sentence, labeledField));
      continue;
    }
    appendUnique(result, classifySentence(sentence), sentence);
  }

  if (!result.resultData && hasNumberSignal(source)) {
    splitSentences(source)
      .filter((sentence) => hasNumberSignal(sentence))
      .forEach((sentence) => appendUnique(result, "resultData", sentence));
  }

  if (!result.userPainPoint && /问题|困难|痛点|低效|不方便|讲不出来|遗漏|成本/.test(source)) {
    splitSentences(source)
      .filter((sentence) => scoreField(sentence, "userPainPoint") > 0)
      .forEach((sentence) => appendUnique(result, "userPainPoint", sentence));
  }

  if (!result.targetUser && /用户|人群|学生|求职者|商家|玩家|应届生/.test(source)) {
    splitSentences(source)
      .filter((sentence) => scoreField(sentence, "targetUser") > 0)
      .forEach((sentence) => appendUnique(result, "targetUser", sentence));
  }
}

function moveMatchingSentences(
  result: StructuredProjectResult,
  from: StructuredField,
  to: StructuredField,
  predicate: (sentence: string) => boolean,
) {
  const kept: string[] = [];

  for (const sentence of splitSentences(result[from])) {
    if (predicate(sentence)) {
      appendUnique(result, to, sentence);
    } else {
      kept.push(sentence);
    }
  }

  result[from] = kept.join("\n");
}

function extractTargetUserFromSource(result: StructuredProjectResult, source: string) {
  if (result.targetUser.trim() && !hasDataPollutionSignal(result.targetUser)) return;

  const targetSentences = splitSentences(source)
    .filter((sentence) => hasTargetUserSignal(sentence) && !hasDataPollutionSignal(sentence))
    .filter((sentence) => !/参与体验|点击|输入|生成|复制|保存|采纳率|成功率|转化率/.test(sentence));

  if (targetSentences.length) {
    result.targetUser = targetSentences.join("\n");
  }
}

function extractPainPointFromSource(result: StructuredProjectResult, source: string) {
  if (result.userPainPoint.trim() && !hasResultDataSignal(result.userPainPoint)) return;

  const painPointSentences = splitSentences(source)
    .filter((sentence) => scoreField(sentence, "userPainPoint") > 0 && !hasResultDataSignal(sentence))
    .filter((sentence) => !/访谈|测试|体验|点击|输入|生成|复制|保存|采纳率|成功率|转化率/.test(sentence));

  if (painPointSentences.length) {
    result.userPainPoint = painPointSentences.join("\n");
  }
}

function extractSolutionFromSource(result: StructuredProjectResult, source: string) {
  if (result.solution.trim()) return;

  splitSentences(source)
    .filter((sentence) => hasSolutionFlowSignal(sentence) && !hasResultDataSignal(sentence))
    .forEach((sentence) => appendUnique(result, "solution", sentence));
}

function generateProjectOutcome(result: StructuredProjectResult) {
  if (result.projectOutcome.trim() || !result.resultData.trim()) return;

  const hasAdoption = /采纳率|复制|成功获得|点击生成|获得结果/.test(result.resultData);
  const hasDemand = /访谈|超过|困难|痛点|体验|测试/.test(result.resultData);

  if (hasDemand && hasAdoption) {
    result.projectOutcome = "验证了该场景存在真实需求，生成内容具有较高采纳价值。";
    return;
  }

  result.projectOutcome = "通过测试数据验证了该方案具备一定用户采纳价值。";
}

export function normalizeStructuredProjectResult(
  result: StructuredProjectResult,
  source: string,
): StructuredProjectResult {
  const normalized = { ...result };

  moveMatchingSentences(normalized, "targetUser", "resultData", hasDataPollutionSignal);
  moveMatchingSentences(normalized, "projectBackground", "resultData", hasDataPollutionSignal);
  moveMatchingSentences(normalized, "userPainPoint", "resultData", hasResultDataSignal);
  moveMatchingSentences(normalized, "myRole", "projectOutcome", (sentence) => !/我(负责|使用|完成|设计|开发|接入|分析)|通过Codex|使用Figma|使用Stitch|接入PostHog|负责/.test(sentence) && /验证|采纳|价值|需求/.test(sentence));

  if (!normalized.resultData.trim() && hasNumberSignal(source)) {
    splitSentences(source)
      .filter((sentence) => hasResultDataSignal(sentence))
      .forEach((sentence) => appendUnique(normalized, "resultData", sentence));
  }

  extractTargetUserFromSource(normalized, source);
  extractPainPointFromSource(normalized, source);
  extractSolutionFromSource(normalized, source);
  generateProjectOutcome(normalized);

  removeDuplicateContent(normalized);
  trimOversizedFields(normalized, source);

  return normalized;
}

export function validateStructuredProjectResult(
  result: StructuredProjectResult,
  source: string,
): StructuredProjectValidation {
  const normalizedSource = normalizeText(source);
  const emptyCount = (Object.keys(result) as StructuredField[]).filter((field) => !result[field].trim()).length;
  const warnings: string[] = [];

  if (!result.projectName.trim()) {
    warnings.push("project_name_missing");
  }

  if (
    result.projectBackground.length > normalizedSource.length * 0.4 &&
    ["userPainPoint", "targetUser", "solution", "myRole", "resultData"].every((field) => !result[field as StructuredField].trim())
  ) {
    warnings.push("background_overfilled");
  }

  if (emptyCount > 5 && normalizedSource.length > 300) {
    warnings.push("too_many_empty_fields");
  }

  if (!result.resultData && hasNumberSignal(normalizedSource)) {
    warnings.push("result_data_missing");
  }

  if (!result.userPainPoint && /问题|困难|痛点|低效|不方便|讲不出来|遗漏|成本/.test(normalizedSource)) {
    warnings.push("pain_point_missing");
  }

  if (!result.targetUser && /用户|人群|学生|求职者|商家|玩家|应届生/.test(normalizedSource)) {
    warnings.push("target_user_missing");
  }

  return {
    isValid: !warnings.some((warning) => warning !== "project_name_missing"),
    warnings,
  };
}

export function parseStructuredProject(source: string) {
  const normalizedSource = normalizeText(source);
  let result = extractLabeledSections(normalizedSource);

  inferProjectName(normalizedSource, result);
  applySemanticCorrection(result, normalizedSource);
  result = normalizeStructuredProjectResult(result, normalizedSource);
  removeDuplicateContent(result);
  trimOversizedFields(result, normalizedSource);

  let validation = validateStructuredProjectResult(result, normalizedSource);
  if (!validation.isValid) {
    applySemanticCorrection(result, normalizedSource);
    result = normalizeStructuredProjectResult(result, normalizedSource);
    removeDuplicateContent(result);
    trimOversizedFields(result, normalizedSource);
    validation = validateStructuredProjectResult(result, normalizedSource);
  }

  return {
    result,
    validation,
  };
}

export function mapStructuredResultToProject(
  structured: StructuredProjectResult,
  baseProject: Project,
): Project {
  return {
    ...baseProject,
    name: structured.projectName,
    background: structured.projectBackground,
    targetUsers: structured.targetUser,
    painPoints: structured.userPainPoint,
    solution: structured.solution,
    responsibilities: structured.myRole,
    results: structured.projectOutcome,
    metrics: structured.resultData,
    review: structured.projectHighlight,
  };
}
