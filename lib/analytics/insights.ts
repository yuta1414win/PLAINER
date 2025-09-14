import type { AnalyticsMetrics, StepMetric } from './tracker';

export type Severity = 'low' | 'medium' | 'high';

export interface ProblemInsight {
  id: string;
  type:
    | 'high_dropoff'
    | 'low_engagement'
    | 'long_duration'
    | 'funnel_break'
    | 'overall_low_completion';
  title: string;
  description: string;
  severity: Severity;
  stepIndex?: number;
  metric?: number;
}

export interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  relatedProblemId?: string;
  stepIndex?: number;
}

export interface ABTestProposal {
  id: string;
  hypothesis: string;
  variants: string[];
  primaryMetric: 'completionRate' | 'dropoffRate' | 'hotspotClicks' | 'duration';
  targetStepIndex?: number;
  expectedOutcome: string;
}

export interface InsightsResult {
  problems: ProblemInsight[];
  suggestions: ImprovementSuggestion[];
  abTests: ABTestProposal[];
}

export interface InsightOptions {
  dropoffThreshold?: number; // e.g., 0.4 (40%)
  engagementThreshold?: number; // clicks per view, e.g., 0.05
  longDurationMs?: number; // e.g., 45_000 ms
}

const defaultOptions: Required<InsightOptions> = {
  dropoffThreshold: 0.4,
  engagementThreshold: 0.05,
  longDurationMs: 45_000,
};

export function generateInsights(
  metrics: AnalyticsMetrics,
  options: InsightOptions = {}
): InsightsResult {
  const cfg = { ...defaultOptions, ...options };
  const problems: ProblemInsight[] = [];
  const suggestions: ImprovementSuggestion[] = [];
  const abTests: ABTestProposal[] = [];

  const steps = [...metrics.stepMetrics].sort(
    (a, b) => a.stepIndex - b.stepIndex
  );

  // Overall completion
  if (metrics.completionRate < 0.4) {
    problems.push({
      id: 'overall_low_completion',
      type: 'overall_low_completion',
      title: '全体の完了率が低い',
      description: `全体の完了率が${Math.round(metrics.completionRate * 100)}%です。ファネル全体の改善余地があります。`,
      severity: metrics.completionRate < 0.25 ? 'high' : 'medium',
    });

    suggestions.push({
      id: 'overall_progress_indicators',
      title: '進捗表示と導入の改善',
      description:
        'プログレスインジケーター、期待時間の明示、最初の数ステップの簡素化で離脱を抑制します。',
      relatedProblemId: 'overall_low_completion',
    });
  }

  // Step-specific issues
  steps.forEach((s, idx) => {
    if (s.views <= 0) return;
    const completionRate = s.completions / s.views;
    const dropoffRate = 1 - completionRate;
    const engagement = s.hotspotClicks / s.views;

    // High dropoff
    if (dropoffRate >= cfg.dropoffThreshold) {
      const id = `high_dropoff_${idx}`;
      problems.push({
        id,
        type: 'high_dropoff',
        title: `ステップ${idx + 1}で離脱率が高い`,
        description: `離脱率が${Math.round(dropoffRate * 100)}%です。`,
        severity: dropoffRate > 0.6 ? 'high' : 'medium',
        stepIndex: idx,
        metric: dropoffRate,
      });

      suggestions.push({
        id: `suggest_split_${idx}`,
        title: `ステップ${idx + 1}の簡素化または分割`,
        description:
          'テキストを短くし、アクションを1つに絞る、もしくは2つのステップに分割して負荷を下げます。',
        relatedProblemId: id,
        stepIndex: idx,
      });
      suggestions.push({
        id: `suggest_visual_${idx}`,
        title: `視覚的ガイドの追加（ハイライト/吹き出し）`,
        description:
          '操作箇所を強調し、次のアクションを明確化することで離脱を低減します。',
        relatedProblemId: id,
        stepIndex: idx,
      });

      abTests.push({
        id: `ab_dropoff_${idx}`,
        hypothesis:
          'ステップの分割とCTA文言変更により完了率が向上する',
        variants: ['現行', '分割+簡素化', 'CTA文言変更'],
        primaryMetric: 'completionRate',
        targetStepIndex: idx,
        expectedOutcome: '完了率の有意な改善',
      });
    }

    // Low engagement
    if (engagement < cfg.engagementThreshold) {
      const id = `low_engagement_${idx}`;
      problems.push({
        id,
        type: 'low_engagement',
        title: `ステップ${idx + 1}のエンゲージメントが低い`,
        description: `ホットスポットのクリック率が低い（${(engagement * 100).toFixed(1)}%）。`,
        severity: 'low',
        stepIndex: idx,
        metric: engagement,
      });

      suggestions.push({
        id: `suggest_cta_${idx}`,
        title: `CTAの強化/位置の最適化`,
        description:
          'CTAの配置、サイズ、文言、コントラストを見直し、折り返し位置より上に配置します。',
        relatedProblemId: id,
        stepIndex: idx,
      });
    }

    // Long duration
    if (s.averageDuration > cfg.longDurationMs) {
      const id = `long_duration_${idx}`;
      problems.push({
        id,
        type: 'long_duration',
        title: `ステップ${idx + 1}の滞在時間が長い`,
        description: `平均滞在時間が${Math.round(
          s.averageDuration / 1000
        )}秒です。迷いが生じている可能性があります。`,
        severity: 'medium',
        stepIndex: idx,
        metric: s.averageDuration,
      });

      suggestions.push({
        id: `suggest_tooltips_${idx}`,
        title: `補助テキスト/ツールチップの追加`,
        description:
          '不明瞭な用語や手順に補足を追加し、必要に応じて音声ナレーションで補強します。',
        relatedProblemId: id,
        stepIndex: idx,
      });
    }
  });

  // Funnel break detection (spike in dropoff from previous step)
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const cur = steps[i];
    if (prev.views <= 0 || cur.views <= 0) continue;
    const prevDrop = 1 - prev.completions / prev.views;
    const curDrop = 1 - cur.completions / cur.views;
    if (curDrop - prevDrop >= 0.2) {
      const id = `funnel_break_${i}`;
      problems.push({
        id,
        type: 'funnel_break',
        title: `ステップ${i}→${i + 1}でファネルが大きく崩れています`,
        description: `離脱率が前ステップより${Math.round(
          (curDrop - prevDrop) * 100
        )}%悪化しています。`,
        severity: 'high',
        stepIndex: i,
      });

      abTests.push({
        id: `ab_funnel_${i}`,
        hypothesis:
          '問題のあるUI要素の文言/配置変更で離脱が改善する',
        variants: ['現行', '文言変更', '配置変更'],
        primaryMetric: 'dropoffRate',
        targetStepIndex: i,
        expectedOutcome: '離脱率の有意な低下',
      });
    }
  }

  return { problems, suggestions, abTests };
}

