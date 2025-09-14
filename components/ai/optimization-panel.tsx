'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Settings,
  Zap,
  Users,
  Shield,
  BarChart3,
  TestTube,
  Layers,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  ChevronDown,
  ChevronRight,
  Sliders,
  Target,
  Clock,
  TrendingUp,
  Eye,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Share2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  OptimizationType,
  OptimizationResult,
  OptimizationRequest,
} from '@/lib/ai/step-optimizer';
import { Step, Project, UUID } from '@/lib/types';

// ============================================================================
// Types for UI Components
// ============================================================================

interface OptimizationPanelProps {
  project?: Project;
  steps: readonly Step[];
  onOptimizationStart: (request: OptimizationRequest) => void;
  onOptimizationApply: (result: OptimizationResult) => void;
  className?: string;
}

interface OptimizationState {
  isRunning: boolean;
  currentType?: OptimizationType;
  progress: number;
  result?: OptimizationResult;
  error?: string;
  history: OptimizationResult[];
}

interface OptimizationSettings {
  type: OptimizationType;
  priority: 'speed' | 'quality' | 'engagement' | 'accessibility';
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  deviceType: 'desktop' | 'mobile' | 'both';
  includeAnalytics: boolean;
  customGoals: string;
  constraints: string;
}

// ============================================================================
// Optimization Type Configurations
// ============================================================================

const OPTIMIZATION_TYPES: Record<
  OptimizationType,
  {
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    estimatedTime: string;
    complexity: 'low' | 'medium' | 'high';
    benefits: string[];
  }
> = {
  flow_optimization: {
    icon: Layers,
    title: 'Flow Optimization',
    description:
      'Optimize step sequence and logical flow for better user progression',
    color: 'bg-blue-500',
    estimatedTime: '2-3 minutes',
    complexity: 'medium',
    benefits: [
      'Better step order',
      'Reduced confusion',
      'Higher completion rates',
    ],
  },
  content_enhancement: {
    icon: Settings,
    title: 'Content Enhancement',
    description: 'Improve step titles, descriptions, and instructional clarity',
    color: 'bg-green-500',
    estimatedTime: '1-2 minutes',
    complexity: 'low',
    benefits: ['Clearer instructions', 'Better engagement', 'Reduced errors'],
  },
  user_journey: {
    icon: Users,
    title: 'User Journey',
    description: 'Holistic optimization of the entire user experience flow',
    color: 'bg-purple-500',
    estimatedTime: '3-5 minutes',
    complexity: 'high',
    benefits: ['Seamless experience', 'Better motivation', 'Reduced friction'],
  },
  accessibility: {
    icon: Shield,
    title: 'Accessibility',
    description: 'Enhance accessibility and ensure inclusive design compliance',
    color: 'bg-orange-500',
    estimatedTime: '2-3 minutes',
    complexity: 'medium',
    benefits: ['WCAG compliance', 'Inclusive design', 'Broader accessibility'],
  },
  performance: {
    icon: Zap,
    title: 'Performance',
    description: 'Optimize for speed, efficiency, and completion metrics',
    color: 'bg-yellow-500',
    estimatedTime: '2-4 minutes',
    complexity: 'medium',
    benefits: [
      'Faster completion',
      'Better efficiency',
      'Higher success rates',
    ],
  },
  ab_test_suggestions: {
    icon: TestTube,
    title: 'A/B Testing',
    description: 'Generate comprehensive A/B testing recommendations',
    color: 'bg-pink-500',
    estimatedTime: '3-4 minutes',
    complexity: 'high',
    benefits: [
      'Test strategies',
      'Data-driven insights',
      'Conversion optimization',
    ],
  },
  comprehensive: {
    icon: Brain,
    title: 'Comprehensive',
    description: 'Complete analysis covering all optimization aspects',
    color: 'bg-indigo-500',
    estimatedTime: '5-8 minutes',
    complexity: 'high',
    benefits: ['Complete analysis', 'Holistic improvements', 'Maximum impact'],
  },
};

// ============================================================================
// Main Optimization Panel Component
// ============================================================================

export default function OptimizationPanel({
  project,
  steps,
  onOptimizationStart,
  onOptimizationApply,
  className = '',
}: OptimizationPanelProps) {
  const [state, setState] = useState<OptimizationState>({
    isRunning: false,
    progress: 0,
    history: [],
  });

  const [settings, setSettings] = useState<OptimizationSettings>({
    type: 'comprehensive',
    priority: 'quality',
    targetAudience: 'intermediate',
    deviceType: 'both',
    includeAnalytics: true,
    customGoals: '',
    constraints: '',
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');

  // Simulate optimization progress
  useEffect(() => {
    if (state.isRunning) {
      const interval = setInterval(() => {
        setState((prev) => {
          const newProgress = Math.min(prev.progress + Math.random() * 15, 95);
          return { ...prev, progress: newProgress };
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [state.isRunning]);

  const handleOptimizationStart = useCallback(
    async (type: OptimizationType) => {
      setState((prev) => ({
        ...prev,
        isRunning: true,
        currentType: type,
        progress: 0,
        error: undefined,
      }));

      try {
        const request: OptimizationRequest = {
          type,
          steps,
          project,
          preferences: {
            priority: settings.priority,
            targetAudience: settings.targetAudience,
            deviceType: settings.deviceType,
            language: 'en',
            brandTone: 'professional',
          },
        };

        await onOptimizationStart(request);

        // Simulate completion
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            isRunning: false,
            progress: 100,
          }));
        }, 3000);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: error instanceof Error ? error.message : 'Optimization failed',
        }));
      }
    },
    [steps, project, settings, onOptimizationStart]
  );

  const handleApplyResult = useCallback(
    (result: OptimizationResult) => {
      onOptimizationApply(result);
      setState((prev) => ({
        ...prev,
        history: [result, ...prev.history.slice(0, 9)], // Keep last 10 results
      }));
    },
    [onOptimizationApply]
  );

  return (
    <TooltipProvider>
      <Card
        className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-2 ${className}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  AI Step Optimizer
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Enhance your tutorial with AI-powered optimization
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-blue-500" />
              <span className="font-medium">{steps.length}</span>
              <span className="text-muted-foreground">steps</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-medium">{state.history.length}</span>
              <span className="text-muted-foreground">optimizations</span>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="quick">Quick</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    <TabsTrigger value="results">Results</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="quick" className="space-y-4">
                    <QuickOptimizationPanel
                      settings={settings}
                      onSettingsChange={setSettings}
                      state={state}
                      onOptimizationStart={handleOptimizationStart}
                    />
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4">
                    <AdvancedOptimizationPanel
                      settings={settings}
                      onSettingsChange={setSettings}
                      state={state}
                      onOptimizationStart={handleOptimizationStart}
                    />
                  </TabsContent>

                  <TabsContent value="results" className="space-y-4">
                    <OptimizationResults
                      result={state.result}
                      onApply={handleApplyResult}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <OptimizationHistory
                      history={state.history}
                      onApply={handleApplyResult}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </TooltipProvider>
  );
}

// ============================================================================
// Quick Optimization Panel
// ============================================================================

interface QuickOptimizationPanelProps {
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
  state: OptimizationState;
  onOptimizationStart: (type: OptimizationType) => void;
}

function QuickOptimizationPanel({
  settings,
  onSettingsChange,
  state,
  onOptimizationStart,
}: QuickOptimizationPanelProps) {
  const popularTypes: OptimizationType[] = [
    'comprehensive',
    'flow_optimization',
    'content_enhancement',
  ];

  return (
    <div className="space-y-6">
      {/* Priority Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Optimization Priority</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['speed', 'quality', 'engagement', 'accessibility'] as const).map(
            (priority) => (
              <Button
                key={priority}
                variant={settings.priority === priority ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSettingsChange({ ...settings, priority })}
                className="justify-start capitalize"
              >
                {priority}
              </Button>
            )
          )}
        </div>
      </div>

      {/* Popular Optimizations */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Popular Optimizations</Label>
        <div className="space-y-3">
          {popularTypes.map((type) => {
            const config = OPTIMIZATION_TYPES[type];
            const Icon = config.icon;

            return (
              <motion.div
                key={type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${config.color} text-white`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-medium">{config.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {config.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {config.estimatedTime}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => onOptimizationStart(type)}
                          disabled={state.isRunning}
                        >
                          {state.isRunning && state.currentType === type ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar for running optimization */}
                    {state.isRunning && state.currentType === type && (
                      <div className="mt-3 space-y-2">
                        <Progress value={state.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Analyzing and optimizing...{' '}
                          {Math.round(state.progress)}%
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Settings */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Quick Settings</Label>
        <div className="flex items-center justify-between">
          <span className="text-sm">Include Analytics Data</span>
          <Switch
            checked={settings.includeAnalytics}
            onCheckedChange={(checked) =>
              onSettingsChange({ ...settings, includeAnalytics: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Advanced Optimization Panel
// ============================================================================

interface AdvancedOptimizationPanelProps {
  settings: OptimizationSettings;
  onSettingsChange: (settings: OptimizationSettings) => void;
  state: OptimizationState;
  onOptimizationStart: (type: OptimizationType) => void;
}

function AdvancedOptimizationPanel({
  settings,
  onSettingsChange,
  state,
  onOptimizationStart,
}: AdvancedOptimizationPanelProps) {
  return (
    <div className="space-y-6">
      {/* Optimization Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Optimization Type</Label>
        <Select
          value={settings.type}
          onValueChange={(value) =>
            onSettingsChange({ ...settings, type: value as OptimizationType })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OPTIMIZATION_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <SelectItem key={type} value={type}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.title}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Target Audience</Label>
          <Select
            value={settings.targetAudience}
            onValueChange={(value) =>
              onSettingsChange({
                ...settings,
                targetAudience: value as typeof settings.targetAudience,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Device Type</Label>
          <Select
            value={settings.deviceType}
            onValueChange={(value) =>
              onSettingsChange({
                ...settings,
                deviceType: value as typeof settings.deviceType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Goals */}
      <div className="space-y-2">
        <Label className="text-sm">Custom Goals (Optional)</Label>
        <Textarea
          placeholder="Describe specific goals or requirements for optimization..."
          value={settings.customGoals}
          onChange={(e) =>
            onSettingsChange({ ...settings, customGoals: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Constraints */}
      <div className="space-y-2">
        <Label className="text-sm">Constraints (Optional)</Label>
        <Textarea
          placeholder="Describe any constraints or limitations to consider..."
          value={settings.constraints}
          onChange={(e) =>
            onSettingsChange({ ...settings, constraints: e.target.value })
          }
          rows={3}
        />
      </div>

      {/* Run Optimization */}
      <div className="pt-4">
        <Button
          onClick={() => onOptimizationStart(settings.type)}
          disabled={state.isRunning}
          className="w-full"
          size="lg"
        >
          {state.isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Run {OPTIMIZATION_TYPES[settings.type].title}
            </>
          )}
        </Button>

        {state.isRunning && (
          <div className="mt-4 space-y-2">
            <Progress value={state.progress} />
            <p className="text-sm text-muted-foreground text-center">
              {Math.round(state.progress)}% complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Optimization Results Component
// ============================================================================

interface OptimizationResultsProps {
  result?: OptimizationResult;
  onApply: (result: OptimizationResult) => void;
}

function OptimizationResults({ result, onApply }: OptimizationResultsProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-muted-foreground">No Results Yet</h3>
        <p className="text-sm text-muted-foreground/70">
          Run an optimization to see detailed results and recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Result Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium">Confidence</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {Math.round(result.confidence * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Suggestions</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {result.suggestions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Predicted Improvement */}
      {result.predictedImprovement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Predicted Improvements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.predictedImprovement.conversionRate && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-medium text-green-600">
                  +
                  {Math.round(
                    (result.predictedImprovement.conversionRate.predicted -
                      result.predictedImprovement.conversionRate.current) *
                      100
                  )}
                  %
                </span>
              </div>
            )}
            {result.predictedImprovement.completionRate && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Completion Rate</span>
                <span className="font-medium text-green-600">
                  +
                  {Math.round(
                    (result.predictedImprovement.completionRate.predicted -
                      result.predictedImprovement.completionRate.current) *
                      100
                  )}
                  %
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {result.suggestions.slice(0, 5).map((suggestion, index) => (
                <div key={suggestion.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">
                        {suggestion.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Badge
                        variant={
                          suggestion.priority === 'critical'
                            ? 'destructive'
                            : suggestion.priority === 'high'
                              ? 'default'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.impact}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => onApply(result)} className="flex-1">
          <CheckCircle className="w-4 h-4 mr-2" />
          Apply Recommendations
        </Button>
        <Button variant="outline" size="icon">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Share2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Optimization History Component
// ============================================================================

interface OptimizationHistoryProps {
  history: OptimizationResult[];
  onApply: (result: OptimizationResult) => void;
}

function OptimizationHistory({ history, onApply }: OptimizationHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Clock className="w-12 h-12 text-muted-foreground/50 mb-3" />
        <h3 className="font-medium text-muted-foreground">No History</h3>
        <p className="text-sm text-muted-foreground/70">
          Your optimization history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((result, index) => (
        <Card
          key={index}
          className="cursor-pointer hover:shadow-md transition-shadow"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium capitalize">
                  {result.type.replace('_', ' ')} Optimization
                </h4>
                <p className="text-sm text-muted-foreground">
                  {result.suggestions.length} suggestions •{' '}
                  {Math.round(result.confidence * 100)}% confidence
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.metadata.timestamp.toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {result.implementationDifficulty}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApply(result)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
