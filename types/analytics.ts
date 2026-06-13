export type AnalyticsEventName =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "resume_optimized"
  | "interview_generated"
  | "result_copied";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean | undefined>;
  timestamp: string;
};
