import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/common/Button";
import { formatResumeQualityChange } from "@/lib/resume-quality/presentation";
import type {
  ResumeQualityAssessment,
  ResumeQualityDimensionScore,
} from "@/types/resume-quality";

export type ResumeQualityViewState =
  | "idle"
  | "loading-before"
  | "loading-after"
  | "ready"
  | "error-before"
  | "error-after";

type Props = {
  assessment?: ResumeQualityAssessment;
  state: ResumeQualityViewState;
  onRetryBefore: () => void;
  onRetryAfter: () => void;
};

function ScoreBar({ score }: { score: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"
      aria-label={`${score} 分，共 20 分`}
    >
      <div
        className="h-full rounded-full bg-[var(--primary)]"
        style={{ width: `${Math.max(0, Math.min(100, score * 5))}%` }}
      />
    </div>
  );
}

function BeforeOnly({ dimensions }: { dimensions: ResumeQualityDimensionScore[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {dimensions.map((dimension) => (
        <div key={dimension.key} className="rounded-lg border border-[var(--border)] bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--text-muted)]">{dimension.name}</span>
            <span className="text-sm font-semibold">{dimension.score}/20</span>
          </div>
          <div className="mt-2">
            <ScoreBar score={dimension.score} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResumeQualityComparison({
  assessment,
  state,
  onRetryBefore,
  onRetryAfter,
}: Props) {
  const before = assessment?.before;
  const after = assessment?.after;
  const comparison = assessment?.comparison;

  return (
    <section className="mt-5 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">表达质量对比</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
            使用同一评分标准，比较原始内容与优化后的简历表述。
          </p>
        </div>
        {assessment?.status === "stale" ? (
          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
            内容已更新，建议重新评分
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {state === "idle" && !before ? (
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            确认识别结果后，系统会评估原始简历表达质量。
          </p>
        ) : null}

        {state === "loading-before" ? (
          <div role="status" className="rounded-lg bg-[var(--surface-panel)] px-4 py-5 text-sm text-[var(--text-muted)]">
            正在评估原始表达质量…
          </div>
        ) : null}

        {state === "error-before" && !before ? (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">原始评分暂未生成</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">不影响简历优化，可稍后重试。</p>
            </div>
            <Button variant="secondary" onClick={onRetryBefore}>
              <RotateCcw size={15} />
              重新评分
            </Button>
          </div>
        ) : null}

        {before ? (
          <>
            <div className={`grid gap-3 ${after ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <div className="rounded-lg bg-[var(--surface-panel)] p-4">
                <p className="text-xs font-medium text-[var(--text-muted)]">优化前</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{before.total}</p>
                <p className="mt-1 text-xs text-[var(--text-subtle)]">原始表达质量</p>
              </div>
              {after ? (
                <>
                  <div className="rounded-lg bg-[var(--surface-panel)] p-4">
                    <p className="text-xs font-medium text-[var(--text-muted)]">优化后</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">{after.total}</p>
                    <p className="mt-1 text-xs text-[var(--text-subtle)]">当前表达质量</p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-[var(--primary-soft)] p-4">
                    <p className="text-xs font-medium text-blue-800">变化</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--primary)]">
                      {formatResumeQualityChange(comparison?.improvement ?? after.total - before.total)}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">总分变化</p>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4">
                  <p className="text-sm font-semibold">完成简历优化后查看对比</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                    优化结果生成后，会显示五个维度的前后变化。
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              {after && comparison ? (
                <div className="divide-y divide-[var(--border-soft)] rounded-lg border border-[var(--border)]">
                  {comparison.dimensionChanges.map((dimension) => (
                    <details key={dimension.key} className="group px-4 py-3">
                      <summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[140px_1fr_1fr_48px] sm:items-center">
                        <span className="text-sm font-semibold">{dimension.name}</span>
                        <div className="grid grid-cols-[44px_1fr] items-center gap-2 text-xs text-[var(--text-muted)]">
                          {dimension.before}/20
                          <ScoreBar score={dimension.before} />
                        </div>
                        <div className="grid grid-cols-[44px_1fr] items-center gap-2 text-xs text-[var(--text-muted)]">
                          {dimension.after}/20
                          <ScoreBar score={dimension.after} />
                        </div>
                        <span className="inline-flex items-center justify-end gap-1 text-sm font-semibold text-[var(--primary)]">
                          {formatResumeQualityChange(dimension.change)}
                          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{dimension.reason}</p>
                    </details>
                  ))}
                </div>
              ) : (
                <BeforeOnly dimensions={before.dimensions} />
              )}
            </div>

            {state === "loading-after" ? (
              <p role="status" className="mt-4 rounded-lg bg-[var(--surface-panel)] px-4 py-3 text-sm text-[var(--text-muted)]">
                优化结果已生成，正在整理前后评分对比…
              </p>
            ) : null}

            {state === "error-after" ? (
              <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-panel)] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--text-muted)]">优化结果可正常使用，评分对比暂未生成。</p>
                <Button variant="secondary" onClick={onRetryAfter}>
                  <RotateCcw size={15} />
                  重试对比评分
                </Button>
              </div>
            ) : null}

            {comparison ? (
              <div className="mt-4 rounded-lg bg-[var(--surface-panel)] p-4">
                <h4 className="text-sm font-semibold">主要提升</h4>
                {comparison.highlights.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--foreground)]">
                    {comparison.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{comparison.summary}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">{before.summary}</p>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
