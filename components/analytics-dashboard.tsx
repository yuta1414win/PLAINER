'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  ArrowDown,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AnalyticsTracker, AnalyticsMetrics } from '@/lib/analytics/tracker';
import { generateInsights, type InsightsResult } from '@/lib/analytics/insights';

interface AnalyticsDashboardProps {
  projectId: string;
  className?: string;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type ChartType =
  | 'overview'
  | 'steps'
  | 'engagement'
  | 'performance'
  | 'insights'
  | 'onboarding';

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
];

const getDateRange = (
  range: DateRange
): { start: Date; end: Date } | undefined => {
  if (range === 'all') return undefined;

  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }

  return { start, end };
};

const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms <= 0) return '0秒';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}秒`;
  }
  return `${minutes}分${seconds}秒`;
};

export function AnalyticsDashboard({
  projectId,
  className,
}: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<ChartType>('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const insights: InsightsResult | null = useMemo(() => {
    if (!metrics) return null;
    return generateInsights(metrics);
  }, [metrics]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const tracker = AnalyticsTracker.getInstance(projectId);
      const range = getDateRange(dateRange);
      const data = await tracker.getMetrics(projectId, range);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, dateRange]);

  // データ取得
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // 自動更新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 30000); // 30秒ごと
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadMetrics]);

  // メトリクス計算

  // ステップファネルデータ
  const funnelData = useMemo(() => {
    if (!metrics) return [];

    const steps = [...metrics.stepMetrics].sort(
      (a, b) => a.stepIndex - b.stepIndex
    );
    let remaining = 100;

    return steps.map((step, index) => {
      const baseViews = steps[0]?.views ?? 1;
      const dropoff = index === 0 ? 0 : (1 - step.completions / baseViews) * 100;
      const value = remaining;
      remaining = remaining * (step.completions / step.views);

      return {
        name: `Step ${step.stepIndex + 1}`,
        value: Math.round(value),
        dropoff: Math.round(dropoff),
        views: step.views,
        completions: step.completions,
      };
    });
  }, [metrics]);

  // エンゲージメントデータ
  const engagementData = useMemo(() => {
    if (!metrics) return [];

    return metrics.stepMetrics.map((step) => ({
      name: `Step ${step.stepIndex + 1}`,
      clicks: step.hotspotClicks,
      duration: Math.round(step.averageDuration / 1000), // 秒に変換
      completionRate:
        step.views > 0 ? Math.round((step.completions / step.views) * 100) : 0,
    }));
  }, [metrics]);

  const onboardingStepData = useMemo(() => {
    if (!metrics?.onboardingMetrics) return [];
    return metrics.onboardingMetrics.stepProgression.map((step) => ({
      name: `Step ${step.stepIndex + 1}`,
      views: step.views,
      stepTitle: step.stepTitle,
    }));
  }, [metrics]);

  const onboardingSourceData = useMemo(() => {
    if (!metrics?.onboardingMetrics) return [];
    return Object.entries(metrics.onboardingMetrics.sourceBreakdown).map(
      ([source, count]) => ({
        name: source === 'auto' ? '自動起動' : source === 'manual' ? '手動' : source,
        value: count,
      })
    );
  }, [metrics]);

  // CSVエクスポート
  const exportToCSV = () => {
    if (!metrics) return;

    const headers = [
      'Date',
      'Views',
      'Unique Visitors',
      'Completions',
      'Avg Duration',
    ];
    const rows = metrics.timeSeriesData.map((data) => [
      data.date.toISOString().split('T')[0],
      data.views,
      data.uniqueVisitors,
      data.completions,
      Math.round(data.averageDuration / 1000),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join(
      '\n'
    );

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${projectId}_${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center h-96', className)}>
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600">データがありません</p>
      </div>
    );
  }

  const onboardingMetrics = metrics.onboardingMetrics;

  return (
    <div className={cn('space-y-6', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">アナリティクス</h2>
        <div className="flex items-center gap-2">
          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">過去7日間</SelectItem>
              <SelectItem value="30d">過去30日間</SelectItem>
              <SelectItem value="90d">過去90日間</SelectItem>
              <SelectItem value="all">全期間</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw
              className={cn('w-4 h-4', autoRefresh && 'animate-spin')}
            />
          </Button>

          <Button variant="outline" size="sm" onClick={loadMetrics}>
            更新
          </Button>

          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                総閲覧数
              </CardTitle>
              <Eye className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalViews.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">+12.5%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                ユニークユーザー
              </CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.uniqueVisitors.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-500">+8.3%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                完了率
              </CardTitle>
              <Target className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.completionRate * 100)}%
            </div>
            <Progress value={metrics.completionRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                平均滞在時間
              </CardTitle>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(metrics.averageDuration / 1000 / 60)}分
              {Math.round((metrics.averageDuration / 1000) % 60)}秒
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-500">-5.2%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインチャート */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ChartType)}
      >
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="steps">ステップ分析</TabsTrigger>
        <TabsTrigger value="engagement">エンゲージメント</TabsTrigger>
        <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
        <TabsTrigger value="insights">インサイト</TabsTrigger>
        {onboardingMetrics && (
          <TabsTrigger value="onboarding">初心者導線</TabsTrigger>
        )}
      </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 時系列グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>トレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string | number | Date) =>
                      new Date(date).toLocaleDateString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(date: string | number | Date) =>
                      new Date(date).toLocaleDateString()
                    }
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="閲覧数"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="uniqueVisitors"
                    name="ユニークユーザー"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    name="完了数"
                    stroke="#F59E0B"
                    fill="#F59E0B"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="space-y-4">
          {/* ファネルチャート */}
          <Card>
            <CardHeader>
              <CardTitle>ステップファネル</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{step.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{step.views} views</Badge>
                        {step.dropoff > 0 && (
                          <Badge variant="destructive">
                            <ArrowDown className="w-3 h-3 mr-1" />
                            {step.dropoff}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded">
                      <div
                        className="absolute left-0 top-0 h-full rounded transition-all"
                        style={{
                          width: `${step.value}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-sm font-medium">
                        {step.value}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ステップ詳細 */}
          <Card>
            <CardHeader>
              <CardTitle>ステップ別メトリクス</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.stepMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stepId" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="views" name="閲覧数" fill="#3B82F6" />
                  <Bar dataKey="completions" name="完了数" fill="#10B981" />
                  <Bar dataKey="dropoffs" name="離脱数" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {/* エンゲージメントチャート */}
          <Card>
            <CardHeader>
              <CardTitle>ホットスポットクリック</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clicks" name="クリック数" fill="#8B5CF6">
                    {engagementData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 滞在時間 */}
          <Card>
            <CardHeader>
              <CardTitle>ステップ別滞在時間</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    name="平均滞在時間（秒）"
                    stroke="#F59E0B"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* 完了率 */}
          <Card>
            <CardHeader>
              <CardTitle>ステップ別完了率</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number | string) => `${value}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    name="完了率"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* デバイス別統計 */}
          <Card>
            <CardHeader>
              <CardTitle>デバイス別アクセス</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'デスクトップ', value: 65 },
                      { name: 'モバイル', value: 30 },
                      { name: 'タブレット', value: 5 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2].map((index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {activeTab === 'onboarding' && onboardingMetrics && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>初心者ガイド サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">総セッション</p>
                  <p className="text-xl font-semibold">
                    {onboardingMetrics.totalSessions.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    完了 {onboardingMetrics.completedSessions.toLocaleString()} 件
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">完了率</p>
                  <p className="text-xl font-semibold">
                    {Math.round(onboardingMetrics.completionRate * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">平均所要時間</p>
                  <p className="text-xl font-semibold">
                    {formatDuration(onboardingMetrics.averageDurationMs)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">離脱セッション</p>
                  <p className="text-xl font-semibold">
                    {(onboardingMetrics.skipCount + onboardingMetrics.abandonCount).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    スキップ {onboardingMetrics.skipCount} / 離脱{' '}
                    {onboardingMetrics.abandonCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>ステップ到達状況</CardTitle>
              </CardHeader>
              <CardContent>
                {onboardingStepData.length === 0 ? (
                  <div className="text-sm text-gray-500">データがありません。</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={onboardingStepData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => `${value} 件`}
                        labelFormatter={(label: string, payload: any[]) => {
                          const first = payload?.[0]?.payload as {
                            stepTitle?: string;
                          } | undefined;
                          return first?.stepTitle || label;
                        }}
                      />
                      <Bar dataKey="views" name="閲覧数" fill="#3B82F6">
                        {onboardingStepData.map((_, index) => (
                          <Cell
                            key={`onboarding-step-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>起動チャネル</CardTitle>
              </CardHeader>
              <CardContent>
                {onboardingSourceData.length === 0 ? (
                  <div className="text-sm text-gray-500">データがありません。</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={onboardingSourceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }: { name: string; percent: number }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {onboardingSourceData.map((_, index) => (
                          <Cell
                            key={`onboarding-source-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value} 件`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>用語ガイドとフィードバック</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">用語ガイド</p>
                  <p className="text-sm text-gray-600">
                    開封 {onboardingMetrics.glossary.openCount.toLocaleString()} 件 / 検索{' '}
                    {onboardingMetrics.glossary.searchCount.toLocaleString()} 件
                  </p>
                  {onboardingMetrics.glossary.topQueries.length === 0 ? (
                    <p className="text-sm text-gray-500">検索クエリの記録はありません。</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {onboardingMetrics.glossary.topQueries.map((query) => (
                        <li
                          key={query.query}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate" title={query.query}>
                            {query.query}
                          </span>
                          <span className="text-gray-500">
                            {query.count} 件 / 平均 {query.averageResults.toFixed(1)} 件
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-500">フィードバック</p>
                  <p className="text-sm text-gray-600">
                    提出 {onboardingMetrics.feedback.submissions.toLocaleString()} 件 / 平均評価{' '}
                    {onboardingMetrics.feedback.averageRating.toFixed(1)} 点
                  </p>
                  {onboardingMetrics.feedback.recentComments.length === 0 ? (
                    <p className="text-sm text-gray-500">最新コメントはまだありません。</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {onboardingMetrics.feedback.recentComments.map((comment, index) => (
                        <li key={`${comment.submittedAt}-${index}`} className="rounded-md border border-gray-200 p-3">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>評価 {comment.rating}</span>
                            <span>{new Date(comment.submittedAt).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-gray-700 whitespace-pre-line">
                            {comment.comment}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Insights Tab (outside to keep file manageable) */}
      {activeTab === 'insights' && insights && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自動問題検出</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.problems.length === 0 ? (
                <div className="text-sm text-gray-600">問題は検出されませんでした。</div>
              ) : (
                <ul className="space-y-3">
                  {insights.problems.map((p) => (
                    <li key={p.id} className="flex items-start gap-3">
                      <span
                        className={
                          'mt-1 inline-block w-2 h-2 rounded-full ' +
                          (p.severity === 'high'
                            ? 'bg-red-500'
                            : p.severity === 'medium'
                              ? 'bg-yellow-500'
                              : 'bg-gray-400')
                        }
                        aria-label={p.severity}
                        title={p.severity}
                      />
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-sm text-gray-600">{p.description}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>改善提案</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.suggestions.length === 0 ? (
                <div className="text-sm text-gray-600">現在のデータに基づく提案はありません。</div>
              ) : (
                <ul className="space-y-3 list-disc pl-5">
                  {insights.suggestions.map((s) => (
                    <li key={s.id}>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-sm text-gray-600">{s.description}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>A/Bテスト提案</CardTitle>
            </CardHeader>
            <CardContent>
              {insights.abTests.length === 0 ? (
                <div className="text-sm text-gray-600">推奨されるA/Bテストはありません。</div>
              ) : (
                <div className="space-y-4">
                  {insights.abTests.map((ab) => (
                    <div key={ab.id} className="border rounded-md p-3">
                      <div className="font-medium">仮説: {ab.hypothesis}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        モニタリング指標: {ab.primaryMetric}
                        {typeof ab.targetStepIndex === 'number' &&
                          `（ステップ${ab.targetStepIndex + 1}）`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        期待効果: {ab.expectedOutcome}
                      </div>
                      <div className="text-sm mt-2">
                        バリアント: {ab.variants.join(' / ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
