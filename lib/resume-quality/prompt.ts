import type { ResumeProjectFields } from "../../types/project.ts";

const RUBRIC = `评分维度（每项 0 到 20 分，必须返回整数）：
1. completeness / 信息完整度：项目背景、目标或任务、关键行动、结果是否完整。
2. impact / 成果表达力：项目产出或价值是否清楚；没有数字时评价定性结果，不强制要求量化。
3. logic / 逻辑清晰度：顺序、因果关系和“背景—行动—结果”结构是否明确。
4. roleFit / 岗位匹配度：是否体现目标岗位所需能力。产品经理重点关注需求分析、用户研究、产品设计、数据意识、协作推动、落地执行和复盘。
5. professionalism / 表达专业度：是否简洁、具体、专业，避免口语化、流水账、重复和空泛表达。

评分区间：
- 0 到 7：信息严重不足或难以理解。
- 8 到 12：基本可读，但缺项或表达松散。
- 13 到 16：内容较完整，达到简历可用水平。
- 17 到 18：结构清楚且岗位表达较强。
- 19 到 20：只用于信息充分、逻辑严密且表达成熟的内容。`;

const CONSTRAINTS = `必须遵守：
1. 不得虚构用户未提供的数据、指标、人数、金额、比例、转化率或业务结果。
2. 不得编造不存在的公司、项目、岗位、工具、职责、行动或经历。
3. 可以评价或优化表达方式、结构和信息顺序，但不能改变事实。
4. 原始内容缺少数据时，只能评价表达清晰度，不得添加百分比、人数、金额或转化率。
5. 只能评估表达质量，不能判断经历真实性，不输出真实性结论。
6. 评分必须结合目标岗位要求。
7. 输出必须是合法 JSON，不输出 Markdown、代码围栏或解释性废话。
8. 分数必须有区分度，不能给所有内容高分。
9. 所有评分理由必须能从输入文本中找到依据。
10. 不能为了展示效果强行给高分或满分。
11. 不输出风险等级、真实性风险提示或引发焦虑的措辞。
12. reason、summary 和 highlight 必须简洁、专业、中性。`;

const SCORE_SHAPE = `只返回以下 JSON 结构：
{
  "dimensions": [
    { "key": "completeness", "score": 0, "reason": "一句话依据" },
    { "key": "impact", "score": 0, "reason": "一句话依据" },
    { "key": "logic", "score": 0, "reason": "一句话依据" },
    { "key": "roleFit", "score": 0, "reason": "一句话依据" },
    { "key": "professionalism", "score": 0, "reason": "一句话依据" }
  ],
  "summary": "一句话总结"
}`;

function serializeFields(fields: ResumeProjectFields) {
  return JSON.stringify(fields, null, 2);
}

export function buildBeforeResumeQualityPrompt(
  fields: ResumeProjectFields,
  targetRole: string,
) {
  return `你是中文简历表达质量评估器。评估用户已确认的项目内容。

${CONSTRAINTS}

${RUBRIC}

目标岗位：${targetRole}

待评估内容：
${serializeFields(fields)}

${SCORE_SHAPE}`;
}

export function buildAfterResumeQualityPrompt(
  fields: ResumeProjectFields,
  optimizedBullets: string[],
  targetRole: string,
) {
  return `你是中文简历表达质量评估器。请使用与原始评分完全一致的标准，评估优化文本并总结真实存在的文本变化。

${CONSTRAINTS}
13. 优化后评分允许持平或下降，不得保证提升。
14. 对比总结只能描述原始内容与优化内容之间真实存在的变化。
15. 如果优化文本出现原始内容没有的新事实，不得将该内容作为加分依据。

${RUBRIC}

目标岗位：${targetRole}

原始内容：
${serializeFields(fields)}

优化内容：
${JSON.stringify(optimizedBullets, null, 2)}

只返回以下合法 JSON：
{
  "dimensions": [
    { "key": "completeness", "score": 0, "reason": "一句话依据" },
    { "key": "impact", "score": 0, "reason": "一句话依据" },
    { "key": "logic", "score": 0, "reason": "一句话依据" },
    { "key": "roleFit", "score": 0, "reason": "一句话依据" },
    { "key": "professionalism", "score": 0, "reason": "一句话依据" }
  ],
  "summary": "一句话总结",
  "comparison": {
    "dimensionReasons": [
      { "key": "completeness", "reason": "一句话变化依据" },
      { "key": "impact", "reason": "一句话变化依据" },
      { "key": "logic", "reason": "一句话变化依据" },
      { "key": "roleFit", "reason": "一句话变化依据" },
      { "key": "professionalism", "reason": "一句话变化依据" }
    ],
    "highlights": ["主要变化 1", "主要变化 2", "主要变化 3"],
    "summary": "一句话对比总结"
  }
}`;
}
