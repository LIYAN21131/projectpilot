import type {
  ResumeCandidate,
  ResumeCandidateEvaluation,
  ResumeCandidateGeneration,
  ResumeCandidateRejectionReason,
  ResumeFact,
  ResumeOptimizationResponse,
  ResumeUnifiedEvaluation,
} from "../../types/resume-optimization.ts";
import type { ResumeProjectFields } from "../../types/project.ts";
import type {
  ResumeExpressionChange,
  ResumeExpressionDimensionKey,
  ResumeExpressionScore,
  ResumeQualityAssessmentV2Base,
} from "../../types/resume-quality.ts";
import { createResumeOptimizationFingerprint } from "./fingerprint.ts";

type GateInput = {
  fields: ResumeProjectFields;
  targetRole: string;
  facts: ResumeFact[];
  generation: ResumeCandidateGeneration;
  evaluation: ResumeUnifiedEvaluation;
  now: Date;
};

type QualifiedCandidate = {
  candidate: ResumeCandidate;
  evaluation: ResumeCandidateEvaluation;
  total: number;
  changes: ResumeExpressionChange[];
};

const EXPRESSION_KEYS: ResumeExpressionDimensionKey[] = [
  "logic",
  "roleFit",
  "professionalism",
];

function scoreFor(
  score: ResumeExpressionScore,
  key: ResumeExpressionDimensionKey,
) {
  return score.dimensions.find((dimension) => dimension.key === key)!;
}

function buildChanges(
  original: ResumeExpressionScore,
  candidate: ResumeExpressionScore,
): ResumeExpressionChange[] {
  return EXPRESSION_KEYS.map((key) => {
    const before = scoreFor(original, key);
    const after = scoreFor(candidate, key);
    return {
      key,
      name: after.name,
      before: before.score,
      after: after.score,
      change: after.score - before.score,
      reason: after.reason,
    };
  });
}

function incrementRejections(
  counts: Partial<Record<ResumeCandidateRejectionReason, number>>,
  reasons: ResumeCandidateRejectionReason[],
) {
  for (const reason of reasons) {
    counts[reason] = (counts[reason] ?? 0) + 1;
  }
}

function rejectionReasons(
  candidate: ResumeCandidateEvaluation,
  factsById: Map<string, ResumeFact>,
  originalTotal: number,
  contentTotal: number,
  originalExpression: ResumeExpressionScore,
) {
  const unknownMissingId = candidate.missingCoreFactIds.some(
    (id) => !factsById.has(id),
  );
  if (unknownMissingId) {
    return {
      reasons: ["invalid_candidate"] as ResumeCandidateRejectionReason[],
      changes: buildChanges(originalExpression, candidate.expression),
      total: contentTotal + candidate.expression.total,
    };
  }

  const factualReasons: ResumeCandidateRejectionReason[] = [];
  if (candidate.introducedFacts.length > 0) {
    factualReasons.push("introduced_fact");
  }
  if (candidate.missingCoreFactIds.length > 0) {
    factualReasons.push("missing_core_fact");
  }

  const total = contentTotal + candidate.expression.total;
  const changes = buildChanges(originalExpression, candidate.expression);
  if (factualReasons.length > 0) {
    return { reasons: factualReasons, changes, total };
  }

  const scoreReasons: ResumeCandidateRejectionReason[] = [];
  if (total < originalTotal) {
    scoreReasons.push("total_score_decreased");
  }
  if (!changes.some(({ change }) => change >= 1)) {
    scoreReasons.push("no_expression_improvement");
  }
  if (changes.some(({ change }) => change < -2)) {
    scoreReasons.push("dimension_regressed");
  }
  return { reasons: scoreReasons, changes, total };
}

function createBaseAssessment(
  input: GateInput,
  rejectionCounts: Partial<Record<ResumeCandidateRejectionReason, number>>,
  winnerBullets: string[],
): ResumeQualityAssessmentV2Base {
  const timestamp = input.now.toISOString();
  return {
    version: 2,
    rubricVersion: 2,
    targetRole: input.targetRole.trim(),
    content: input.evaluation.content,
    originalExpression: input.evaluation.originalExpression,
    originalTotal:
      input.evaluation.content.total + input.evaluation.originalExpression.total,
    expressionChanges: [],
    highlights: [],
    suggestions: [],
    rejectionCounts,
    status: "current",
    sourceFingerprint: createResumeOptimizationFingerprint(
      input.fields,
      input.targetRole,
      winnerBullets,
    ),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function compareQualified(left: QualifiedCandidate, right: QualifiedCandidate) {
  return (
    right.total - left.total ||
    scoreFor(right.evaluation.expression, "roleFit").score -
      scoreFor(left.evaluation.expression, "roleFit").score ||
    scoreFor(right.evaluation.expression, "professionalism").score -
      scoreFor(left.evaluation.expression, "professionalism").score ||
    scoreFor(right.evaluation.expression, "logic").score -
      scoreFor(left.evaluation.expression, "logic").score
  );
}

export function selectResumeOptimization(
  input: GateInput,
): ResumeOptimizationResponse {
  const candidatesByStyle = new Map(
    input.generation.candidates.map((candidate) => [candidate.style, candidate]),
  );
  const factsById = new Map(input.facts.map((fact) => [fact.id, fact]));
  const originalTotal =
    input.evaluation.content.total + input.evaluation.originalExpression.total;
  const rejectionCounts: Partial<
    Record<ResumeCandidateRejectionReason, number>
  > = {};
  const qualified: QualifiedCandidate[] = [];

  for (const evaluation of input.evaluation.candidates) {
    const candidate = candidatesByStyle.get(evaluation.style);
    if (!candidate) {
      incrementRejections(rejectionCounts, ["invalid_candidate"]);
      continue;
    }

    const result = rejectionReasons(
      evaluation,
      factsById,
      originalTotal,
      input.evaluation.content.total,
      input.evaluation.originalExpression,
    );
    if (result.reasons.length > 0) {
      incrementRejections(rejectionCounts, result.reasons);
      continue;
    }
    qualified.push({
      candidate,
      evaluation,
      total: result.total,
      changes: result.changes,
    });
  }

  const winner = qualified.sort(compareQualified)[0];
  if (winner) {
    const base = createBaseAssessment(
      input,
      rejectionCounts,
      winner.candidate.bullets,
    );
    const positiveChanges = winner.changes.filter(({ change }) => change > 0);
    return {
      status: "optimized",
      bullets: winner.candidate.bullets,
      assessment: {
        ...base,
        outcome: "optimized",
        optimizedExpression: winner.evaluation.expression,
        optimizedTotal: winner.total,
        expressionChanges: winner.changes,
        highlights: positiveChanges
          .map(({ reason }) => reason)
          .filter(Boolean)
          .slice(0, 3),
      },
    };
  }

  const base = createBaseAssessment(input, rejectionCounts, []);
  const needsInformation =
    input.evaluation.content.dimensions.some(({ score }) => score <= 12) &&
    input.evaluation.contentGaps.length > 0;
  if (needsInformation) {
    return {
      status: "needs-information",
      assessment: {
        ...base,
        outcome: "needs-information",
        suggestions: input.evaluation.contentGaps.slice(0, 3),
      },
    };
  }
  return {
    status: "no-improvement",
    assessment: {
      ...base,
      outcome: "no-improvement",
    },
  };
}
