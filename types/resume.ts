export type ResumeOptimizationResult = {
  id: string;
  projectId: string;
  targetRole: string;
  suggestions: string[];
  optimizedContent: string;
  formatWarning?: boolean;
  createdAt: string;
};
