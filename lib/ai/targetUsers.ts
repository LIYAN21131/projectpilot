const TARGET_USER_BANNED_KEYWORDS = [
  "产品流程",
  "核心流程",
  "用户输入",
  "AI自动提炼",
  "AI 自动提炼",
  "AI自动",
  "AI 自动",
  "STAR结构",
  "STAR 结构",
  "STAR",
  "生成面试回答",
  "生成",
  "复制",
  "保存",
  "PostHog",
  "数据埋点",
  "埋点",
  "转化漏斗",
  "漏斗",
  "验证产品效果",
  "验证产品",
  "后续优化方向",
  "后续优化",
  "行业场景细分",
  "行业场景",
  "回答真实性增强",
  "回答真实性",
  "项目亮点自动挖掘",
  "项目亮点",
  "工具",
  "功能",
  "方案",
  "设计一款",
  "完成",
  "支持",
  "监测",
  "优化",
];

const TARGET_USER_ALLOWED_KEYWORDS = [
  "应届生",
  "大学生",
  "求职者",
  "产品经理求职者",
  "实习生",
  "职场新人",
  "学生",
  "候选人",
  "面试者",
  "毕业生",
  "新生",
  "玩家",
  "内容作者",
  "社区管理员",
  "用户群体",
  "人群",
];

const PAIN_USER_GROUP_PATTERN = /(?:表达|准备|简历|面试|项目经历|回答|求职|录入|复用|购买|交易|沟通|查找|管理)[^、，。；;\n]{0,12}(?:困难|不清|不清晰|出错|成本高|低效|受阻|有需求)的用户/;
const GENERIC_USER_PATTERN = /^(?:用户|目标用户|核心用户|普通用户|使用用户)$/;
const EXPLICIT_TARGET_USER_PATTERN = /(?:目标用户|服务对象|用户群体|面向人群|调研对象|适用人群|典型用户|使用人群|面向用户)(?:是|为|包括|主要是|主要为|：|:)\s*([^。；;\n]+)/;
const TARGET_CONTEXT_PATTERN = /(?:目标用户|服务对象|用户群体|面向人群|调研对象|适用人群|典型用户|使用人群|面向用户)/;
const HUMAN_GROUP_PATTERN = /(?:应届生|大学生|产品经理求职者|求职者|实习生|职场新人|学生|候选人|面试者|毕业生|新生|玩家|内容作者|社区管理员)/g;
const PAIN_POINT_PATTERN = /(?:痛点|困难|无法|很难|难以|表达不清|不清晰|讲不清|讲不出来|出错|成本高|低效|准备|面试|简历|项目经历|求职)/;

function splitCandidateText(value: string) {
  return value
    .split(/[、,，;；和与及]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanCandidate(item: string) {
  return item
    .replace(/["“”]/g, "")
    .replace(/^(?:目标用户|服务对象|用户群体|面向人群|调研对象|适用人群|典型用户|使用人群|面向用户)\s*(?:是|为|包括|主要是|主要为|：|:)?\s*/, "")
    .split(/[。；;\n]/)[0]
    .trim();
}

function isAllowedTargetUser(item: string) {
  if (GENERIC_USER_PATTERN.test(item)) return false;
  return TARGET_USER_ALLOWED_KEYWORDS.some((keyword) => item.includes(keyword)) || PAIN_USER_GROUP_PATTERN.test(item);
}

function hasBannedTargetUserContent(value: string) {
  return TARGET_USER_BANNED_KEYWORDS.some((keyword) => value.includes(keyword));
}

function hasTargetUserContext(rawMaterial: string) {
  return TARGET_CONTEXT_PATTERN.test(rawMaterial) || PAIN_POINT_PATTERN.test(rawMaterial);
}

export function normalizeTargetUsersCandidates(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .flatMap(splitCandidateText)
      .map(cleanCandidate)
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return splitCandidateText(value).map(cleanCandidate).filter(Boolean);
  }

  return [];
}

export function extractTargetUsersCandidates(rawMaterial: string) {
  const explicitMatch = rawMaterial.match(EXPLICIT_TARGET_USER_PATTERN);
  if (explicitMatch?.[1]) {
    return normalizeTargetUsersCandidates(explicitMatch[1]);
  }

  const candidates: string[] = [];
  const sentences = rawMaterial
    .split(/[。；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    if (!PAIN_POINT_PATTERN.test(sentence)) continue;

    const groups = sentence.match(HUMAN_GROUP_PATTERN) || [];
    const hasSpecificRoleGroup = groups.some((group) => !["应届生", "大学生", "学生", "求职者", "候选人", "面试者"].includes(group));
    candidates.push(...groups);

    if (!hasSpecificRoleGroup && /项目经历/.test(sentence) && /表达不清|无法.*表达|讲不清|讲不出来|难以.*表达/.test(sentence)) {
      if (/学生/.test(sentence) || /应届生|大学生/.test(sentence)) {
        candidates.push("项目经历表达困难的学生");
      } else if (/求职者|面试/.test(sentence)) {
        candidates.push("项目经历表达困难的求职者");
      }
    }

    if (/面试/.test(sentence) && /准备|回答/.test(sentence) && /困难|难以|不清/.test(sentence)) {
      candidates.push("面试准备困难的求职者");
    }

    if (/简历/.test(sentence) && /表达|撰写|优化/.test(sentence) && /困难|难以|不清/.test(sentence)) {
      candidates.push("简历表达困难的用户");
    }
  }

  return Array.from(new Set(candidates));
}

export function cleanTargetUsersCandidates(rawMaterial: string, candidates: string[]) {
  if (!hasTargetUserContext(rawMaterial)) return [];

  return Array.from(new Set(candidates
    .map(cleanCandidate)
    .filter(Boolean)
    .filter((item) => item.length <= 25)
    .filter((item) => !hasBannedTargetUserContent(item))
    .filter(isAllowedTargetUser)));
}

export function normalizeTargetUsers(rawMaterial: string, candidates: string[]) {
  const cleaned = cleanTargetUsersCandidates(rawMaterial, candidates);

  const result = Array.from(new Set(cleaned)).join("、");

  if (!result) return "";
  if (hasBannedTargetUserContent(result)) return "";

  return result;
}
