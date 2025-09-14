'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ArrowUpDown,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Target,
  Zap,
  Users,
  Shield,
  BarChart3,
  Settings,
  ExternalLink,
  Copy,
  Play,
  Pause,
  RotateCcw,
  Eye,
  EyeOff,
  Star,
  Bookmark,
  Flag,
  MessageSquare,
  TrendingUp,
  Layers,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

import {
  OptimizationSuggestion,
  SuggestionType,
  SuggestionCategory,
} from '@/lib/ai/step-optimizer';
import { UUID } from '@/lib/types';

// ============================================================================
// Types for Suggestions UI
// ============================================================================

interface SuggestionsListProps {
  suggestions: readonly OptimizationSuggestion[];
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
  onApplyMultiple: (suggestions: readonly OptimizationSuggestion[]) => void;
  onFeedback?: (suggestionId: UUID, feedback: SuggestionFeedback) => void;
  className?: string;
  showFilters?: boolean;
  showBulkActions?: boolean;
  groupBy?: 'category' | 'priority' | 'impact' | 'effort' | 'type';
}

interface SuggestionFeedback {
  rating: 'positive' | 'negative';
  comment?: string;
  helpful: boolean;
}

interface FilterState {
  search: string;
  category: SuggestionCategory | 'all';
  priority: 'all' | 'critical' | 'high' | 'medium' | 'low';
  impact: 'all' | 'high' | 'medium' | 'low';
  effort: 'all' | 'high' | 'medium' | 'low';
  type: SuggestionType | 'all';
  showImplemented: boolean;
}

interface SuggestionWithState extends OptimizationSuggestion {
  isSelected: boolean;
  isApplied: boolean;
  isExpanded: boolean;
  feedback?: SuggestionFeedback;
}

// ============================================================================
// Suggestion Type Configurations
// ============================================================================

const SUGGESTION_ICONS: Record<SuggestionType, React.ElementType> = {
  reorder: ArrowUpDown,
  content_change: Settings,
  visual_enhancement: Eye,
  interaction_improvement: Users,
  accessibility_fix: Shield,
  performance_boost: Zap,
  engagement_increase: TrendingUp,
};

const CATEGORY_ICONS: Record<SuggestionCategory, React.ElementType> = {
  structure: Layers,
  content: Settings,
  design: Eye,
  interaction: Users,
  accessibility: Shield,
  performance: Zap,
  analytics: BarChart3,
};

const PRIORITY_COLORS = {
  critical: 'text-red-600 bg-red-50 border-red-200',
  high: 'text-orange-600 bg-orange-50 border-orange-200',
  medium: 'text-blue-600 bg-blue-50 border-blue-200',
  low: 'text-gray-600 bg-gray-50 border-gray-200',
};

const IMPACT_COLORS = {
  high: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-gray-600 bg-gray-50',
};

// ============================================================================
// Main Suggestions List Component
// ============================================================================

export default function SuggestionsList({
  suggestions,
  onApplySuggestion,
  onApplyMultiple,
  onFeedback,
  className = '',
  showFilters = true,
  showBulkActions = true,
  groupBy = 'priority',
}: SuggestionsListProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: 'all',
    priority: 'all',
    impact: 'all',
    effort: 'all',
    type: 'all',
    showImplemented: true,
  });

  const [suggestionsState, setSuggestionsState] = useState<
    Map<UUID, Partial<SuggestionWithState>>
  >(new Map());

  const [sortBy, setSortBy] = useState<
    'priority' | 'impact' | 'effort' | 'confidence'
  >('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Enhanced suggestions with state
  const enhancedSuggestions = useMemo(() => {
    return suggestions.map((suggestion) => {
      const state = suggestionsState.get(suggestion.id) || {};
      return {
        ...suggestion,
        isSelected: state.isSelected || false,
        isApplied: state.isApplied || false,
        isExpanded: state.isExpanded || false,
        feedback: state.feedback,
      } as SuggestionWithState;
    });
  }, [suggestions, suggestionsState]);

  // Filtered and sorted suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = enhancedSuggestions.filter((suggestion) => {
      if (!filters.showImplemented && suggestion.isApplied) return false;
      if (
        filters.search &&
        !suggestion.title
          .toLowerCase()
          .includes(filters.search.toLowerCase()) &&
        !suggestion.description
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      )
        return false;
      if (
        filters.category !== 'all' &&
        suggestion.category !== filters.category
      )
        return false;
      if (
        filters.priority !== 'all' &&
        suggestion.priority !== filters.priority
      )
        return false;
      if (filters.impact !== 'all' && suggestion.impact !== filters.impact)
        return false;
      if (filters.effort !== 'all' && suggestion.effort !== filters.effort)
        return false;
      if (filters.type !== 'all' && suggestion.type !== filters.type)
        return false;
      return true;
    });

    // Sort suggestions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'impact':
          const impactOrder = { high: 3, medium: 2, low: 1 };
          comparison = impactOrder[b.impact] - impactOrder[a.impact];
          break;
        case 'effort':
          const effortOrder = { low: 3, medium: 2, high: 1 };
          comparison = effortOrder[b.effort] - effortOrder[a.effort];
          break;
        case 'confidence':
          comparison = b.confidence - a.confidence;
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [enhancedSuggestions, filters, sortBy, sortOrder]);

  // Grouped suggestions
  const groupedSuggestions = useMemo(() => {
    if (groupBy === 'category') {
      return filteredSuggestions.reduce(
        (groups, suggestion) => {
          const key = suggestion.category;
          if (!groups[key]) groups[key] = [];
          groups[key].push(suggestion);
          return groups;
        },
        {} as Record<string, SuggestionWithState[]>
      );
    } else if (groupBy === 'priority') {
      return filteredSuggestions.reduce(
        (groups, suggestion) => {
          const key = suggestion.priority;
          if (!groups[key]) groups[key] = [];
          groups[key].push(suggestion);
          return groups;
        },
        {} as Record<string, SuggestionWithState[]>
      );
    } else if (groupBy === 'impact') {
      return filteredSuggestions.reduce(
        (groups, suggestion) => {
          const key = suggestion.impact;
          if (!groups[key]) groups[key] = [];
          groups[key].push(suggestion);
          return groups;
        },
        {} as Record<string, SuggestionWithState[]>
      );
    } else if (groupBy === 'effort') {
      return filteredSuggestions.reduce(
        (groups, suggestion) => {
          const key = suggestion.effort;
          if (!groups[key]) groups[key] = [];
          groups[key].push(suggestion);
          return groups;
        },
        {} as Record<string, SuggestionWithState[]>
      );
    } else {
      return filteredSuggestions.reduce(
        (groups, suggestion) => {
          const key = suggestion.type;
          if (!groups[key]) groups[key] = [];
          groups[key].push(suggestion);
          return groups;
        },
        {} as Record<string, SuggestionWithState[]>
      );
    }
  }, [filteredSuggestions, groupBy]);

  const selectedSuggestions = filteredSuggestions.filter((s) => s.isSelected);

  // Handlers
  const updateSuggestionState = useCallback(
    (id: UUID, updates: Partial<SuggestionWithState>) => {
      setSuggestionsState((prev) => {
        const newState = new Map(prev);
        newState.set(id, { ...newState.get(id), ...updates });
        return newState;
      });
    },
    []
  );

  const handleSelectSuggestion = useCallback(
    (id: UUID, selected: boolean) => {
      updateSuggestionState(id, { isSelected: selected });
    },
    [updateSuggestionState]
  );

  const handleExpandSuggestion = useCallback(
    (id: UUID, expanded: boolean) => {
      updateSuggestionState(id, { isExpanded: expanded });
    },
    [updateSuggestionState]
  );

  const handleApplySuggestion = useCallback(
    (suggestion: SuggestionWithState) => {
      updateSuggestionState(suggestion.id, {
        isApplied: true,
        isSelected: false,
      });
      onApplySuggestion(suggestion);
    },
    [updateSuggestionState, onApplySuggestion]
  );

  const handleApplySelected = useCallback(() => {
    if (selectedSuggestions.length > 0) {
      selectedSuggestions.forEach((suggestion) => {
        updateSuggestionState(suggestion.id, {
          isApplied: true,
          isSelected: false,
        });
      });
      onApplyMultiple(selectedSuggestions);
    }
  }, [selectedSuggestions, updateSuggestionState, onApplyMultiple]);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      filteredSuggestions.forEach((suggestion) => {
        if (!suggestion.isApplied) {
          updateSuggestionState(suggestion.id, { isSelected: selected });
        }
      });
    },
    [filteredSuggestions, updateSuggestionState]
  );

  const handleFeedback = useCallback(
    (suggestion: SuggestionWithState, feedback: SuggestionFeedback) => {
      updateSuggestionState(suggestion.id, { feedback });
      onFeedback?.(suggestion.id, feedback);
    },
    [updateSuggestionState, onFeedback]
  );

  if (suggestions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">
            No Suggestions Available
          </h3>
          <p className="text-muted-foreground">
            Run an optimization to get AI-powered suggestions for your tutorial.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI Suggestions</h2>
            <p className="text-sm text-muted-foreground">
              {filteredSuggestions.length} of {suggestions.length} suggestions
            </p>
          </div>

          {showBulkActions && selectedSuggestions.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedSuggestions.length} selected
              </Badge>
              <Button onClick={handleApplySelected} size="sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Selected
              </Button>
            </div>
          )}
        </div>

        {/* Filters and Controls */}
        {showFilters && (
          <SuggestionsFilters
            filters={filters}
            onFiltersChange={setFilters}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            groupBy={groupBy}
            showSelectAll={showBulkActions}
            onSelectAll={handleSelectAll}
            hasSelections={selectedSuggestions.length > 0}
          />
        )}

        {/* Suggestions List */}
        <div className="space-y-4">
          {Object.entries(groupedSuggestions).map(
            ([groupKey, groupSuggestions]) => (
              <SuggestionGroup
                key={groupKey}
                title={groupKey}
                suggestions={groupSuggestions}
                groupBy={groupBy}
                onSelectSuggestion={handleSelectSuggestion}
                onExpandSuggestion={handleExpandSuggestion}
                onApplySuggestion={handleApplySuggestion}
                onFeedback={handleFeedback}
                showSelection={showBulkActions}
              />
            )
          )}
        </div>

        {filteredSuggestions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/50 mb-3" />
              <h3 className="font-medium">No suggestions match your filters</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search criteria or clearing filters.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Suggestions Filters Component
// ============================================================================

interface SuggestionsFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: string;
  onSortByChange: (sortBy: any) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  groupBy: string;
  showSelectAll: boolean;
  onSelectAll: (selected: boolean) => void;
  hasSelections: boolean;
}

function SuggestionsFilters({
  filters,
  onFiltersChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  groupBy,
  showSelectAll,
  onSelectAll,
  hasSelections,
}: SuggestionsFiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Controls Row */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search suggestions..."
                  value={filters.search}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {showSelectAll && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={hasSelections}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                />
                <Label className="text-sm">Select All</Label>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Show Applied:</Label>
              <Switch
                checked={filters.showImplemented}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, showImplemented: checked })
                }
              />
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Select
              value={filters.category}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, category: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="structure">Structure</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="interaction">Interaction</SelectItem>
                <SelectItem value="accessibility">Accessibility</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, priority: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.impact}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, impact: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.effort}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, effort: value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Effort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Effort</SelectItem>
                <SelectItem value="low">Low Effort</SelectItem>
                <SelectItem value="medium">Medium Effort</SelectItem>
                <SelectItem value="high">High Effort</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={onSortByChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Sort by Priority</SelectItem>
                <SelectItem value="impact">Sort by Impact</SelectItem>
                <SelectItem value="effort">Sort by Effort</SelectItem>
                <SelectItem value="confidence">Sort by Confidence</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
              }
              className="w-full"
            >
              <ArrowUpDown className="w-4 h-4 mr-2" />
              {sortOrder === 'desc' ? 'Desc' : 'Asc'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Suggestion Group Component
// ============================================================================

interface SuggestionGroupProps {
  title: string;
  suggestions: SuggestionWithState[];
  groupBy: string;
  onSelectSuggestion: (id: UUID, selected: boolean) => void;
  onExpandSuggestion: (id: UUID, expanded: boolean) => void;
  onApplySuggestion: (suggestion: SuggestionWithState) => void;
  onFeedback: (
    suggestion: SuggestionWithState,
    feedback: SuggestionFeedback
  ) => void;
  showSelection: boolean;
}

function SuggestionGroup({
  title,
  suggestions,
  groupBy,
  onSelectSuggestion,
  onExpandSuggestion,
  onApplySuggestion,
  onFeedback,
  showSelection,
}: SuggestionGroupProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getGroupIcon = () => {
    if (groupBy === 'category') {
      return CATEGORY_ICONS[title as SuggestionCategory] || Settings;
    } else if (groupBy === 'priority') {
      return title === 'critical'
        ? AlertTriangle
        : title === 'high'
          ? Flag
          : Info;
    }
    return Settings;
  };

  const getGroupColor = () => {
    if (groupBy === 'priority') {
      return (
        PRIORITY_COLORS[title as keyof typeof PRIORITY_COLORS] ||
        PRIORITY_COLORS.low
      );
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const Icon = getGroupIcon();

  return (
    <Card>
      <Collapsible open={!isCollapsed} onOpenChange={setIsCollapsed}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getGroupColor()}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-lg capitalize">
                    {title.replace('_', ' ')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {suggestions.length} suggestions
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onSelect={onSelectSuggestion}
                  onExpand={onExpandSuggestion}
                  onApply={onApplySuggestion}
                  onFeedback={onFeedback}
                  showSelection={showSelection}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// Suggestion Card Component
// ============================================================================

interface SuggestionCardProps {
  suggestion: SuggestionWithState;
  onSelect: (id: UUID, selected: boolean) => void;
  onExpand: (id: UUID, expanded: boolean) => void;
  onApply: (suggestion: SuggestionWithState) => void;
  onFeedback: (
    suggestion: SuggestionWithState,
    feedback: SuggestionFeedback
  ) => void;
  showSelection: boolean;
}

function SuggestionCard({
  suggestion,
  onSelect,
  onExpand,
  onApply,
  onFeedback,
  showSelection,
}: SuggestionCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const Icon = SUGGESTION_ICONS[suggestion.type] || Settings;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`transition-all ${
          suggestion.isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
        } ${suggestion.isApplied ? 'opacity-60 bg-green-50/50' : 'hover:shadow-md'}`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            {showSelection && !suggestion.isApplied && (
              <Checkbox
                checked={suggestion.isSelected}
                onCheckedChange={(checked) =>
                  onSelect(suggestion.id, !!checked)
                }
                className="mt-1"
              />
            )}

            <div className="p-2 rounded-lg bg-gray-100">
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-sm leading-5">
                    {suggestion.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {suggestion.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 ml-3">
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
                  <Badge
                    variant="outline"
                    className={`text-xs ${IMPACT_COLORS[suggestion.impact]}`}
                  >
                    {suggestion.impact}
                  </Badge>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{suggestion.effort} effort</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </span>
                </div>
                {suggestion.targetStepId && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>Step specific</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onExpand(suggestion.id, !suggestion.isExpanded)
                    }
                    className="h-7 px-2 text-xs"
                  >
                    {suggestion.isExpanded ? (
                      <EyeOff className="w-3 h-3 mr-1" />
                    ) : (
                      <Eye className="w-3 h-3 mr-1" />
                    )}
                    {suggestion.isExpanded ? 'Less' : 'More'}
                  </Button>

                  {suggestion.isApplied ? (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Applied
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onApply(suggestion)}
                      className="h-7 px-3 text-xs"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Apply
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {suggestion.feedback && (
                    <Badge variant="outline" className="text-xs">
                      {suggestion.feedback.rating === 'positive' ? (
                        <ThumbsUp className="w-3 h-3" />
                      ) : (
                        <ThumbsDown className="w-3 h-3" />
                      )}
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedback(!showFeedback)}
                    className="h-7 w-7 p-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {suggestion.isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="space-y-3">
                  {/* Implementation Guide */}
                  {suggestion.implementation && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Implementation
                      </h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {suggestion.implementation.steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-xs bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center font-mono">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* A/B Test Recommendation */}
                  {suggestion.abTestRecommendation && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">A/B Testing</h4>
                      <div className="text-xs text-muted-foreground">
                        <p className="mb-2">Recommended test variants:</p>
                        {suggestion.abTestRecommendation.variants.map(
                          (variant, index) => (
                            <div key={index} className="mb-1">
                              <span className="font-medium">
                                {variant.name}:
                              </span>{' '}
                              {variant.description}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Before/After Comparison */}
                  {suggestion.beforeAfter && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Before vs After
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="font-medium">Before:</span>
                          <p className="text-muted-foreground mt-1">
                            {typeof suggestion.beforeAfter.before === 'string'
                              ? suggestion.beforeAfter.before
                              : 'Current implementation'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium">After:</span>
                          <p className="text-muted-foreground mt-1">
                            {typeof suggestion.beforeAfter.after === 'string'
                              ? suggestion.beforeAfter.after
                              : 'Optimized implementation'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback Section */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <SuggestionFeedbackForm
                  suggestion={suggestion}
                  onSubmit={(feedback) => {
                    onFeedback(suggestion, feedback);
                    setShowFeedback(false);
                  }}
                  onCancel={() => setShowFeedback(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Suggestion Feedback Form
// ============================================================================

interface SuggestionFeedbackFormProps {
  suggestion: SuggestionWithState;
  onSubmit: (feedback: SuggestionFeedback) => void;
  onCancel: () => void;
}

function SuggestionFeedbackForm({
  suggestion,
  onSubmit,
  onCancel,
}: SuggestionFeedbackFormProps) {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(
    suggestion.feedback?.rating || null
  );
  const [comment, setComment] = useState(suggestion.feedback?.comment || '');
  const [helpful, setHelpful] = useState(suggestion.feedback?.helpful || false);

  const handleSubmit = () => {
    if (rating) {
      onSubmit({ rating, comment: comment.trim() || undefined, helpful });
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Feedback</h4>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          Was this suggestion helpful?
        </span>
        <div className="flex gap-2">
          <Button
            variant={rating === 'positive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRating('positive')}
            className="h-7 px-2"
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            Yes
          </Button>
          <Button
            variant={rating === 'negative' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRating('negative')}
            className="h-7 px-2"
          >
            <ThumbsDown className="w-3 h-3 mr-1" />
            No
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="helpful"
          checked={helpful}
          onCheckedChange={(checked) => setHelpful(!!checked)}
        />
        <Label htmlFor="helpful" className="text-xs">
          This suggestion will improve user experience
        </Label>
      </div>

      <div>
        <Textarea
          placeholder="Additional comments (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="text-xs"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={!rating}>
          Submit
        </Button>
      </div>
    </div>
  );
}
