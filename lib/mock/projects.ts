import type { UserProfile } from "@/types/user";

export const defaultUserProfile: UserProfile = {
  name: "用户名称",
  targetRole: "产品经理",
  projectCount: 0,
  resumeOptimizationCount: 0,
  interviewPrepCount: 0,
  apiKeyConfigured: false,
};

export const targetRoles = [
  "产品经理",
  "产品运营",
  "数据分析",
  "UI设计",
  "开发工程师",
];
