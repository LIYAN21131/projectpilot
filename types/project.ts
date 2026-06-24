import type { ResumeQualityAssessment } from "./resume-quality";

export type Project = {
  id: string;
  name: string;
  summary?: string;
  background: string;
  targetUsers: string;
  painPoints: string;
  solution: string;
  responsibilities: string;
  results: string;
  metrics: string;
  tools?: string;
  review: string;
  createdAt: string;
  updatedAt: string;
  editorState?: ProjectEditorState;
  originalResumeText?: string;
  recognizedResumeFields?: ResumeProjectFields;
  confirmedResumeFields?: ResumeProjectFields;
  optimizedResumeBullets?: string[];
  interviewPreparations?: InterviewPreparationItem[];
  rawProjectText?: string;
  recognizedProjectFields?: RecognizedProjectFields;
  confirmedProjectFields?: ConfirmedProjectFields;
  isProjectFieldsConfirmed?: boolean;
  resumeQualityAssessment?: ResumeQualityAssessment;
};

export type RecognizedProjectFields = {
  projectName: string;
  projectSummary: string;
  background: string;
  targetUsersCandidates: string[];
  targetUsers: string;
  painPoint: string;
  responsibility: string;
  actions: string;
  result: string;
  metrics: string;
  tools: string[];
  reflection: string;
  uncertainFields: string[];
};

export type ConfirmedProjectFields = Omit<RecognizedProjectFields, "targetUsersCandidates" | "uncertainFields">;

export type ResumeProjectFields = {
  projectName: string;
  background: string;
  painPoint: string;
  responsibility: string;
  actions: string;
  result: string;
  metrics: string;
  tools: string;
};

export type InterviewPreparationItem = {
  question: string;
  answerPoints: string[];
  script: string;
};

export type RecognitionStatus = "idle" | "recognizing" | "pendingConfirm" | "confirmed" | "error";

export type ProjectEditorState = {
  activeSection:
    | "project-info"
    | "material-import"
    | "raw-material"
    | "structured-content"
    | "resume-optimization"
    | "interview-preparation"
    | "save-status"
    | "basic-info"
    | "future-flow";
  scrollY: number;
  lastSavedAt: string;
  lastEditedAt: string;
  hasUnsavedDraft: boolean;
  rawMaterial?: string;
  targetRole?: string;
  status?: string;
  recognitionStatus?: RecognitionStatus;
  recognitionConfirmedAt?: string;
  lastRecognizedAt?: string;
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
