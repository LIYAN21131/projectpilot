import type { Project } from "@/types/project";

const metricPattern = /([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z0-9/（）()·\- ]{0,28}?)(\d+(?:\.\d+)?)(万元|小时|次|%|人|个|天|倍|条|份)/g;

function cleanMetricName(value: string) {
  return value
    .replace(/^[\s\-*•、，。；;:：]+/, "")
    .replace(/[，。；;:：、\s]+$/g, "")
    .trim();
}

function collectMetricsFromText(text: string, seen: Set<string>) {
  const metrics: string[] = [];
  const normalizedText = text.replace(/\r\n?/g, "\n");
  let match: RegExpExecArray | null;

  while ((match = metricPattern.exec(normalizedText)) !== null) {
    const name = cleanMetricName(match[1]);
    const value = `${match[2]}${match[3]}`;

    if (!name) continue;

    const metric = `${name}：${value}`;
    if (seen.has(metric)) continue;

    seen.add(metric);
    metrics.push(metric);
  }

  return metrics;
}

export function extractProjectMetricsFromText(parts: string[]) {
  const seen = new Set<string>();

  return parts
    .filter((part) => part.trim() && part.trim() !== "未识别到内容")
    .flatMap((part) => collectMetricsFromText(part, seen));
}

export function extractProjectMetrics(project: Project, originalContent = "") {
  return extractProjectMetricsFromText([
    project.results,
    project.solution,
    project.background,
    project.responsibilities,
    originalContent,
    project.metrics,
  ]);
}

export function formatProjectMetrics(project: Project, originalContent = "") {
  const metrics = extractProjectMetrics(project, originalContent);

  return metrics.length ? metrics.join("\n") : "未识别到内容";
}
