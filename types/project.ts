export type Project = {
  id: string;
  name: string;
  background: string;
  targetUsers: string;
  painPoints: string;
  solution: string;
  responsibilities: string;
  results: string;
  metrics: string;
  review: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectAssetType =
  | "PRD"
  | "原型图"
  | "流程图"
  | "竞品分析"
  | "用户调研"
  | "项目截图"
  | "GitHub 链接"
  | "线上作品链接";

export type ProjectAsset = {
  id: string;
  projectId: string;
  name: string;
  type: ProjectAssetType;
  url?: string;
  createdAt: string;
};
