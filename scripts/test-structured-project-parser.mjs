import assert from "node:assert/strict";
import { parseStructuredProject } from "../lib/project/structuredProjectParser.ts";

const cases = [
  {
    name: "AI面试准备工具",
    source: `项目名称：AI面试准备工具
项目背景：求职者在准备面试时，常常缺少针对项目经历的追问练习场景，准备过程依赖零散笔记。
目标用户：正在准备实习、校招或转岗面试的求职者。
用户痛点：用户讲不清项目价值，容易遗漏关键数据，也很难判断回答是否完整。
解决方案：支持导入项目资料，自动生成面试问题、STAR回答建议和项目复盘清单。
我的职责：我负责需求分析、问题生成流程设计、回答结构设计和前端交互实现。
结果数据：内部测试覆盖30份项目经历，问题生成命中率达到82%，平均准备时间减少40%。
项目成果：验证了AI面试回答生成场景存在真实需求，用户对生成结果有较高采纳意愿。
项目亮点：形成从资料导入、问题生成、回答优化到复盘保存的完整闭环。`,
    expected: {
      projectName: "AI面试准备工具",
      projectBackground: "缺少针对项目经历的追问练习场景",
      userPainPoint: "讲不清项目价值",
      targetUser: "求职者",
      solution: "自动生成面试问题",
      myRole: "我负责需求分析",
      resultData: "82%",
      projectOutcome: "真实需求",
      projectHighlight: "完整闭环",
    },
  },
  {
    name: "校园二手交易平台",
    source: `项目名称：校园二手交易平台
业务背景：校园闲置物品交易主要发生在社群内，信息更新快但沉淀弱，买卖双方沟通成本高。
服务对象：校内学生、毕业生和需要低价购买教材或生活用品的新生。
核心问题：商品信息分散，价格不透明，交易状态容易遗漏，线下交付也缺少确认机制。
产品方案：提供商品发布、分类筛选、收藏、私信沟通、交易状态管理和线下交付确认流程。
负责内容：我完成用户调研、商品发布流程设计、筛选字段定义和交易状态原型。
验证数据：灰度测试期间发布商品120件，完成交易36单，用户查找商品时间降低35%。
成果总结：验证了校内闲置交易存在集中管理需求，交易状态管理能提升买卖双方效率。
创新点：把社群交易迁移为可检索、可管理、可追踪的校园轻量交易闭环。`,
    expected: {
      projectName: "校园二手交易平台",
      projectBackground: "校园闲置物品交易",
      userPainPoint: "商品信息分散",
      targetUser: "校内学生",
      solution: "商品发布",
      myRole: "我完成用户调研",
      resultData: "120件",
      projectOutcome: "集中管理需求",
      projectHighlight: "可检索",
    },
  },
  {
    name: "改枪码识别工具",
    source: `工具名称：改枪码识别工具
场景来源：游戏玩家在分享改枪配置时，经常用截图或短文本传播代码，新手需要手动辨认并复制。
适用人群：需要复用配置的玩家、内容作者和社区管理员。
痛点：截图里的代码不清晰，手动录入容易出错，多个配置版本也不方便管理。
核心功能：上传截图后自动识别改枪码，支持结果校验、复制、保存和历史记录管理。
参与内容：我负责OCR识别流程验证、异常字符校正规则、复制保存交互和测试用例整理。
数据结果：测试50张截图，识别成功率达到88%，人工录入时间从2分钟降到20秒。
项目成果：验证了截图识别配置码的效率提升价值，能降低玩家复用配置的操作门槛。
项目价值：降低配置复用门槛，让玩家从识别、校验到保存形成连续流程。`,
    expected: {
      projectName: "改枪码识别工具",
      projectBackground: "游戏玩家",
      userPainPoint: "手动录入容易出错",
      targetUser: "玩家",
      solution: "自动识别改枪码",
      myRole: "我负责OCR识别流程验证",
      resultData: "88%",
      projectOutcome: "效率提升价值",
      projectHighlight: "降低配置复用门槛",
    },
  },
  {
    name: "当前AI项目经历梳理测试文案",
    source: `项目名称：AI项目经历梳理与面试回答生成工具
项目背景：我在求职准备中发现，很多应届生和求职者有项目经历，但在面试中表达不清，难以组织STAR结构，也不容易提炼项目亮点。
前期访谈20名应届生，超过70%的用户存在面试回答组织困难和项目亮点提炼不清晰问题。
目标用户：应届生、求职者、有项目经历但表达不清的人群。
核心流程为：用户输入项目经历→AI自动提炼STAR结构→生成面试回答→支持复制和保存。
我负责需求调研、产品设计、原型制作、前端开发协同、PostHog埋点方案设计和数据分析。
73名用户参与体验，其中52人输入项目资料，41人点击生成，39人成功获得结果，28人复制生成内容，采纳率71.8%。
项目成果：验证了AI项目经历梳理和面试回答生成场景存在真实需求，生成内容具有较高采纳价值。`,
    expected: {
      projectName: "AI项目经历梳理与面试回答生成工具",
      projectBackground: "求职准备",
      userPainPoint: "表达不清",
      targetUser: "应届生、求职者",
      solution: "用户输入项目经历",
      myRole: "PostHog埋点方案设计",
      resultData: "73名用户参与体验",
      projectOutcome: "真实需求",
      projectHighlight: "",
    },
  },
];

function assertContains(actual, expected, label, caseName) {
  if (!expected) return;
  assert.ok(
    actual.includes(expected),
    `${caseName}: expected ${label} to include "${expected}", got "${actual}"`,
  );
}

function assertNoDataLeak(fieldValue, label, caseName) {
  assert.ok(
    !/\d+\s*(%|％|人|人次|次|分钟|秒|件|单|名)/.test(fieldValue) && !/(采纳率|点击生成|复制生成|成功获得结果)/.test(fieldValue),
    `${caseName}: ${label} should not contain result data, got "${fieldValue}"`,
  );
}

for (const testCase of cases) {
  const { result, validation } = parseStructuredProject(testCase.source);
  const sourceLength = testCase.source.replace(/\s/g, "").length;

  assert.equal(result.projectName, testCase.expected.projectName, `${testCase.name}: project name`);
  assert.ok(validation.isValid, `${testCase.name}: structured result should pass validation (${validation.warnings.join(", ")})`);

  assertContains(result.projectBackground, testCase.expected.projectBackground, "projectBackground", testCase.name);
  assert.ok(result.projectBackground.length < sourceLength * 0.4, `${testCase.name}: background should not contain oversized mixed content`);
  assertNoDataLeak(result.projectBackground, "projectBackground", testCase.name);

  assertContains(result.userPainPoint, testCase.expected.userPainPoint, "userPainPoint", testCase.name);
  assertContains(result.targetUser, testCase.expected.targetUser, "targetUser", testCase.name);
  assertNoDataLeak(result.targetUser, "targetUser", testCase.name);

  assertContains(result.solution, testCase.expected.solution, "solution", testCase.name);
  assertContains(result.myRole, testCase.expected.myRole, "myRole", testCase.name);
  assertContains(result.resultData, testCase.expected.resultData, "resultData", testCase.name);
  assertContains(result.projectOutcome, testCase.expected.projectOutcome, "projectOutcome", testCase.name);
  assertContains(result.projectHighlight, testCase.expected.projectHighlight, "projectHighlight", testCase.name);

  const values = Object.entries(result).filter(([, value]) => value.trim());
  for (let index = 0; index < values.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < values.length; nextIndex += 1) {
      assert.notEqual(values[index][1], values[nextIndex][1], `${testCase.name}: ${values[index][0]} duplicates ${values[nextIndex][0]}`);
    }
  }
}

console.log(`structured project parser passed ${cases.length} cases`);
