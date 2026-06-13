import type { Project } from "@/types/project";

export type ProjectType =
  | "AI工具类"
  | "产品设计类"
  | "运营增长类"
  | "数据分析类"
  | "其他";

type ProjectTypeResult = {
  projectType: ProjectType;
};

export type ProjectRequiredField =
  | "项目背景"
  | "用户痛点"
  | "目标用户"
  | "解决方案"
  | "个人职责"
  | "项目成果"
  | "数据指标";

type MissingFieldsResult = {
  missingFields: ProjectRequiredField[];
};

type SuggestedMetricsResult = {
  metrics: string[];
};

const requiredFieldMap: Array<{
  label: ProjectRequiredField;
  key: keyof Pick<
    Project,
    | "background"
    | "painPoints"
    | "targetUsers"
    | "solution"
    | "responsibilities"
    | "results"
    | "metrics"
  >;
}> = [
  { label: "项目背景", key: "background" },
  { label: "用户痛点", key: "painPoints" },
  { label: "目标用户", key: "targetUsers" },
  { label: "解决方案", key: "solution" },
  { label: "个人职责", key: "responsibilities" },
  { label: "项目成果", key: "results" },
  { label: "数据指标", key: "metrics" },
];

const projectTypeKeywords: Record<ProjectType, string[]> = {
  AI工具类: [
    "ai",
    "gpt",
    "llm",
    "大模型",
    "智能",
    "自动生成",
    "自动识别",
    "助手",
    "工具",
    "生成式",
    "prompt",
  ],
  产品设计类: [
    "产品设计",
    "原型",
    "prd",
    "交互",
    "体验",
    "用户流程",
    "信息架构",
    "需求",
    "功能设计",
    "mvp",
  ],
  运营增长类: [
    "运营",
    "增长",
    "拉新",
    "转化",
    "留存",
    "活动",
    "裂变",
    "私域",
    "增长漏斗",
    "用户增长",
  ],
  数据分析类: [
    "数据",
    "分析",
    "指标",
    "看板",
    "报表",
    "埋点",
    "漏斗",
    "留存分析",
    "转化率",
    "可视化",
  ],
  其他: [],
};

const suggestedMetricsByProjectType: Record<ProjectType, string[]> = {
  AI工具类: [
    "项目创建数",
    "简历优化次数",
    "优化内容复制率",
    "面试题生成率",
    "STAR回答使用率",
  ],
  产品设计类: [
    "核心流程完成率",
    "任务完成时长",
    "功能使用率",
    "用户满意度",
    "需求采纳率",
  ],
  运营增长类: [
    "新增用户数",
    "转化率",
    "留存率",
    "活动参与率",
    "获客成本",
  ],
  数据分析类: [
    "报表使用次数",
    "指标覆盖率",
    "分析结论采纳率",
    "决策响应时长",
    "异常发现率",
  ],
  其他: [
    "使用人数",
    "完成率",
    "转化率",
    "满意度",
    "效率提升比例",
  ],
};

function buildProjectText(project: Pick<Project, "name" | "background" | "painPoints" | "solution">) {
  return [
    project.name,
    project.background,
    project.painPoints,
    project.solution,
  ]
    .join(" ")
    .toLowerCase();
}

export function identifyProjectType(
  project: Pick<Project, "name" | "background" | "painPoints" | "solution">,
): ProjectTypeResult {
  const text = buildProjectText(project);
  const scores = Object.entries(projectTypeKeywords)
    .filter(([type]) => type !== "其他")
    .map(([type, keywords]) => ({
      projectType: type as ProjectType,
      score: keywords.reduce((total, keyword) => {
        return text.includes(keyword.toLowerCase()) ? total + 1 : total;
      }, 0),
    }))
    .sort((a, b) => b.score - a.score);

  const bestMatch = scores[0];

  return {
    projectType: bestMatch && bestMatch.score > 0 ? bestMatch.projectType : "其他",
  };
}

export function checkProjectMissingFields(
  project: Pick<
    Project,
    | "background"
    | "painPoints"
    | "targetUsers"
    | "solution"
    | "responsibilities"
    | "results"
    | "metrics"
  >,
): MissingFieldsResult {
  return {
    missingFields: requiredFieldMap
      .filter(({ key }) => !project[key]?.trim())
      .map(({ label }) => label),
  };
}

export function suggestProjectMetrics(projectType: ProjectType): SuggestedMetricsResult {
  return {
    metrics: suggestedMetricsByProjectType[projectType] ?? suggestedMetricsByProjectType["其他"],
  };
}
