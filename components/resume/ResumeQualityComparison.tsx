import { RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";
import {
  describeResumeOptimizationOutcome,
  formatResumeQualityChange,
} from "@/lib/resume-quality/presentation";
import {
  isResumeQualityAssessmentV2,
  type ResumeContentScore,
  type ResumeExpressionChange,
  type ResumeQualityAssessment,
  type ResumeQualityAssessmentV2,
} from "@/types/resume-quality";

export type ResumeQualityViewState =
  | "idle"
  | "loading"
  | "ready"
  | "technical-error";

type Props = {
  assessment?: ResumeQualityAssessment;
  state: ResumeQualityViewState;
  onRetry: () => void;
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
      aria-label={`${score} points out of 20`}
    >
      <div
        className="h-full rounded-full bg-[var(--primary)]"
        style={{ width: `${Math.max(0, Math.min(100, score * 5))}%` }}
      />
    </div>
  );
}

function MetricTile({
  label,
  value,
  denominator,
  note,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  denominator?: number;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${
        emphasis
          ? "border border-blue-100 bg-[var(--primary-soft)]"
          : "bg-[var(--surface-panel)]"
      }`}
    >
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          emphasis ? "text-[var(--primary)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
        {denominator ? (
          <span className="ml-1 text-sm font-medium text-[var(--text-subtle)]">
            /{denominator}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xs leading-5 text-[var(--text-subtle)]">{note}</p>
    </div>
  );
}

function DimensionList({ changes }: { changes: ResumeExpressionChange[] }) {
  return (
    <div className="divide-y divide-[var(--border-soft)] rounded-lg border border-[var(--border)]">
      {changes.map((dimension) => (
        <div
          key={dimension.key}
          className="grid gap-3 px-4 py-3 sm:grid-cols-[128px_1fr_1fr_64px] sm:items-center"
        >
          <span className="text-sm font-semibold">{dimension.name}</span>
          <div className="grid grid-cols-[44px_1fr] items-center gap-2 text-xs text-[var(--text-muted)]">
            {dimension.before}/20
            <ScoreBar score={dimension.before} />
          </div>
          <div className="grid grid-cols-[44px_1fr] items-center gap-2 text-xs text-[var(--text-muted)]">
            {dimension.after}/20
            <ScoreBar score={dimension.after} />
          </div>
          <span
            className={`text-right text-sm font-semibold ${
              dimension.change > 0
                ? "text-[var(--primary)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {formatResumeQualityChange(dimension.change)}
          </span>
          <p className="text-sm leading-6 text-[var(--text-muted)] sm:col-span-4">
            {dimension.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

function ContentBreakdown({ content }: { content: ResumeContentScore }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {content.dimensions.map((dimension) => (
        <div
          key={dimension.key}
          className="rounded-lg border border-[var(--border)] bg-white p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {dimension.name}
            </span>
            <span className="text-sm font-semibold">{dimension.score}/20</span>
          </div>
          <div className="mt-2">
            <ScoreBar score={dimension.score} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--text-subtle)]">
            {dimension.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

function OptimizedOutcome({
  assessment,
}: {
  assessment: Extract<ResumeQualityAssessmentV2, { outcome: "optimized" }>;
}) {
  const totalChange = assessment.optimizedTotal - assessment.originalTotal;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-4 sm:grid-cols-2">
        <MetricTile
          label="内容基础"
          value={assessment.content.total}
          denominator={40}
          note="所有版本共享"
        />
        <MetricTile
          label="原始表达"
          value={assessment.originalExpression.total}
          denominator={60}
          note="优化前表达分"
        />
        <MetricTile
          label="优化表达"
          value={assessment.optimizedExpression.total}
          denominator={60}
          note="通过门槛版本"
        />
        <MetricTile
          label="总分变化"
          value={formatResumeQualityChange(totalChange)}
          note="内容分不因改写变化"
          emphasis
        />
      </div>

      <p className="rounded-lg bg-[var(--surface-panel)] px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
        内容基础分只依据已确认字段计算，候选改写只比较表达效果，不提升内容分。
      </p>

      <div>
        <h4 className="mb-3 text-sm font-semibold">表达维度变化</h4>
        <DimensionList changes={assessment.expressionChanges} />
      </div>

      {assessment.highlights.length ? (
        <div className="rounded-lg bg-[var(--surface-panel)] p-4">
          <h4 className="text-sm font-semibold">主要提升</h4>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {assessment.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function FallbackOutcome({
  assessment,
  onRetry,
}: {
  assessment: Exclude<ResumeQualityAssessmentV2, { outcome: "optimized" }>;
  onRetry: () => void;
}) {
  const needsInformation = assessment.outcome === "needs-information";
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label="内容基础"
          value={assessment.content.total}
          denominator={40}
          note="基于已确认字段"
        />
        <MetricTile
          label="原始表达"
          value={assessment.originalExpression.total}
          denominator={60}
          note="当前版本表达分"
        />
      </div>

      <ContentBreakdown content={assessment.content} />

      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4">
        <p className="text-sm font-semibold">
          {describeResumeOptimizationOutcome(assessment.outcome)}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          {needsInformation
            ? "已保留当前内容。补充项目资料后，可以重新生成候选版本。"
            : "当前版本已较完整，本次没有找到更适合替换的候选版本。"}
        </p>
        {needsInformation && assessment.suggestions.length ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {assessment.suggestions.slice(0, 3).map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={onRetry}
          className="mt-4"
        >
          <RotateCcw size={15} />
          重新优化
        </Button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div
      role="status"
      className="rounded-lg bg-[var(--surface-panel)] px-4 py-5 text-sm leading-6 text-[var(--text-muted)]"
    >
      正在生成并评估 3 个候选版本...
    </div>
  );
}

function TechnicalErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">优化暂时失败，请重试</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
          这是技术错误，不代表当前内容信息不足。
        </p>
      </div>
      <Button type="button" variant="secondary" onClick={onRetry}>
        <RotateCcw size={15} />
        重试
      </Button>
    </div>
  );
}

function IdleState() {
  return (
    <p className="rounded-lg bg-[var(--surface-panel)] px-4 py-4 text-sm leading-6 text-[var(--text-muted)]">
      优化会一次生成 3 个候选版本，并只返回通过事实与评分门槛的版本。
    </p>
  );
}

function LegacyState() {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4">
      <p className="text-sm font-semibold">评分标准已更新，请重新优化</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        旧版评分不会作为当前质量判断展示。
      </p>
    </div>
  );
}

export function ResumeQualityComparison({
  assessment,
  state,
  onRetry,
}: Props) {
  const v2Assessment = isResumeQualityAssessmentV2(assessment)
    ? assessment
    : undefined;

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">表达质量对比</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            内容基础按 /40 展示，表达效果按 /60 展示。
          </p>
        </div>
        {v2Assessment ? (
          <span className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-panel)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
            {describeResumeOptimizationOutcome(v2Assessment.outcome)}
          </span>
        ) : null}
        {v2Assessment?.status === "stale" ? (
          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            内容已更新，建议重新优化
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {state === "loading" ? <LoadingState /> : null}
        {state === "technical-error" ? (
          <TechnicalErrorState onRetry={onRetry} />
        ) : null}
        {state === "idle" && !assessment ? <IdleState /> : null}
        {assessment && !v2Assessment ? <LegacyState /> : null}
        {state !== "loading" &&
        state !== "technical-error" &&
        v2Assessment?.outcome === "optimized" ? (
          <OptimizedOutcome assessment={v2Assessment} />
        ) : null}
        {state !== "loading" &&
        state !== "technical-error" &&
        v2Assessment &&
        v2Assessment.outcome !== "optimized" ? (
          <FallbackOutcome assessment={v2Assessment} onRetry={onRetry} />
        ) : null}
      </div>
    </section>
  );
}
