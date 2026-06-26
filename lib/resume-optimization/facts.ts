import type {
  ResumeFact,
  ResumeFactSource,
} from "../../types/resume-optimization.ts";
import type { ResumeProjectFields } from "../../types/project.ts";

const SOURCES: ResumeFactSource[] = [
  "projectName",
  "background",
  "painPoint",
  "responsibility",
  "actions",
  "result",
  "metrics",
  "tools",
];

const CORE_SOURCES = new Set<ResumeFactSource>([
  "responsibility",
  "actions",
  "result",
  "metrics",
]);

function splitFacts(value: string) {
  return value
    .split(/[\n。；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildResumeFactList(fields: ResumeProjectFields): ResumeFact[] {
  return SOURCES.flatMap((source) =>
    splitFacts(fields[source]).map((text, index) => ({
      id: `${source}-${index + 1}`,
      source,
      text,
      core: CORE_SOURCES.has(source),
    })),
  );
}
