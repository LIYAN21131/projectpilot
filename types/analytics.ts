export type AnalyticsEventName =
  | "project_created"
  | "project_updated"
  | "project_deleted"
  | "resume_optimized"
  | "interview_generated"
  | "result_copied"
  | "input_empty_error"
  | "input_too_short_error"
  | "generate_failed"
  | "generate_empty_result"
  | "generate_format_error"
  | "copy_failed"
  | "save_failed"
  | "page_error";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: Record<string, string | number | boolean | undefined>;
  timestamp: string;
};
