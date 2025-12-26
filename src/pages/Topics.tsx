import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, Sparkles, BookOpen, BarChart3, 
  TrendingUp, Star, Bookmark, RefreshCw,
  Zap, Target, Brain, CheckSquare, Layers
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TopicIdeaCard } from '@/components/topic/TopicIdeaCard';
import { TopicBankGrid } from '@/components/topic/TopicBankGrid';
import { TopicAnalyticsDashboard } from '@/components/topic/TopicAnalyticsDashboard';
import { SeasonalTopicsSection } from '@/components/topic/SeasonalTopicsSection';
import { SimilarSuccessTopics } from '@/components/topic/SimilarSuccessTopics';
import { TopicGapAnalysis } from '@/components/topic/TopicGapAnalysis';
import { TopicClusterView } from '@/components/topic/TopicClusterView';
import { KeywordExpansionPanel } from '@/components/topic/KeywordExpansionPanel';
import { TopicRefiner } from '@/components/topic/TopicRefiner';
import { NextBestTopicCard } from '@/components/topic/NextBestTopicCard';
import { WeeklySuggestionsPanel } from '@/components/topic/WeeklySuggestionsPanel';
import { TopicConflictChecker } from '@/components/topic/TopicConflictChecker';
import { TopicAILearningBadge } from '@/components/topic/TopicAILearningBadge';
import { TopicEmptyState } from '@/components/topic/TopicEmptyState';
import { TopicDiscoveryOnboarding } from '@/components/topic/TopicDiscoveryOnboarding';
import { TopicBulkActions } from '@/components/topic/TopicBulkActions';
import { BrandSpotlightHeader } from '@/components/topic/BrandSpotlightHeader';
import { BrandSwitcherDialog } from '@/components/topic/BrandSwitcherDialog';
import { TopicsByPillarView } from '@/components/topic/TopicsByPillarView';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion, ContentPillar } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CONTENT_GOALS: { value: ContentGoal; label: string }[] = [
  { value: 'engagement', label: 'Tăng tương tác' },
  { value: 'awareness', label: 'Nâng cao nhận diện' },
  { value: 'conversion', label: 'Chuyển đổi' },
  { value: 'education', label: 'Giáo dục' },
];

const Topics = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discovery');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal>('engagement');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<EnhancedTopicSuggestion[]>([]);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'pillar'>('grid');

  const { templates: brands, loading: brandsLoading } = useBrandTemplates();

  // Get selected brand object
  const selectedBrand = useMemo(() => {
    if (!selectedBrandId) return undefined;
    return brands.find(b => b.id === selectedBrandId);
  }, [selectedBrandId, brands]);

  // Get content pillars from selected brand
  const contentPillars = useMemo(() => {
    if (!selectedBrand?.content_pillars) return [];
    return selectedBrand.content_pillars as ContentPillar[];
  }, [selectedBrand]);
  
  const { 
    suggestions, 
    source, 
    isLoading: suggestionsLoading,
    isEnhancing,
    refresh,
    stats: suggestionStats
  } = useEnhancedTopicSuggestions({
    brandTemplateId: selectedBrandId || undefined,
    contentGoal: selectedGoal,
    enabled: activeTab === 'discovery' && !!selectedBrandId,
  });

  const { 
    history, 
    favorites, 
    topPerformers, 
    stats: historyStats, 
    isLoading: historyLoading,
    saveTopic,
  } = useTopicHistory({
    brandTemplateId: selectedBrandId || undefined,
    contentGoal: selectedGoal,
    enabled: true,
  });

  // Combined stats
  const combinedStats = useMemo(() => ({
    totalTopics: historyStats.totalTopics,
    favorites: historyStats.favoriteCount,
    usedTopics: historyStats.usedTopics,
    avgPerformance: historyStats.averagePerformance || 0,
    suggestionCount: suggestions.length,
    topPerformersCount: topPerformers.length,
  }), [historyStats, suggestions, topPerformers]);

  const handleSelectTopic = async (topic: EnhancedTopicSuggestion) => {
    await saveTopic(topic, 'selected');
    // Navigate to multichannel with prefilled topic
    navigate('/multichannel', { 
      state: { 
        prefillTopic: topic.topic,
        prefillGoal: selectedGoal,
        fromTopics: true 
      } 
    });
  };

  const handleSaveTopic = async (topic: EnhancedTopicSuggestion) => {
    await saveTopic(topic, 'suggested');
    toast.success('Đã lưu vào ngân hàng ý tưởng');
  };

  const handleScheduleTopic = (topic: EnhancedTopicSuggestion) => {
    navigate('/calendar', { 
      state: { 
        scheduleTopic: topic.topic,
        scheduleGoal: selectedGoal,
      } 
    });
  };

  // Bulk actions handlers
  const handleToggleTopicSelection = useCallback((topic: EnhancedTopicSuggestion, checked: boolean) => {
    if (checked) {
      setSelectedTopics(prev => [...prev, topic]);
    } else {
      setSelectedTopics(prev => prev.filter(t => t.topic !== topic.topic));
    }
  }, []);

  const handleSelectAllTopics = useCallback(() => {
    setSelectedTopics([...suggestions]);
  }, [suggestions]);

  const handleClearSelection = useCallback(() => {
    setSelectedTopics([]);
    setSelectionMode(false);
  }, []);

  const handleSaveAllTopics = useCallback(async (topics: EnhancedTopicSuggestion[]) => {
    for (const topic of topics) {
      await saveTopic(topic, 'suggested');
    }
  }, [saveTopic]);

  const handleScheduleAllTopics = useCallback((topics: EnhancedTopicSuggestion[]) => {
    navigate('/calendar', { 
      state: { 
        bulkSchedule: topics.map(t => ({ topic: t.topic, goal: selectedGoal })),
      } 
    });
  }, [navigate, selectedGoal]);

  const isTopicSelected = useCallback((topic: EnhancedTopicSuggestion) => {
    return selectedTopics.some(t => t.topic === topic.topic);
  }, [selectedTopics]);

  return (
    <div className="relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/6 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="px-4 sm:container py-6 lg:py-8 relative space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary shadow-lg">
              <Lightbulb className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Kho Ý Tưởng</h1>
              <p className="text-sm text-muted-foreground">
                Khám phá & quản lý chủ đề content
              </p>
            </div>
          </div>

          {/* Content Goal Filter */}
          <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as ContentGoal)}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_GOALS.map((goal) => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Brand Spotlight Header - Central Focus */}
        <BrandSpotlightHeader
          selectedBrand={selectedBrand}
          onChangeBrand={() => setBrandDialogOpen(true)}
          onEditBrand={selectedBrand ? () => navigate(`/brands/${selectedBrand.id}`) : undefined}
        />

        {/* Brand Switcher Dialog */}
        <BrandSwitcherDialog
          open={brandDialogOpen}
          onOpenChange={setBrandDialogOpen}
          brands={brands}
          selectedBrandId={selectedBrandId || undefined}
          onSelectBrand={(id) => setSelectedBrandId(id)}
          onCreateBrand={() => navigate('/brands/new')}
          onViewBrand={(id) => navigate(`/brands/${id}`)}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.suggestionCount}</p>
                <p className="text-xs text-muted-foreground">Gợi ý AI</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Bookmark className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.totalTopics}</p>
                <p className="text-xs text-muted-foreground">Đã lưu</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <Star className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.favorites}</p>
                <p className="text-xs text-muted-foreground">Yêu thích</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.usedTopics}</p>
                <p className="text-xs text-muted-foreground">Đã dùng</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <TrendingUp className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.topPerformersCount}</p>
                <p className="text-xs text-muted-foreground">Hiệu suất cao</p>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Target className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{combinedStats.avgPerformance || '-'}</p>
                <p className="text-xs text-muted-foreground">Điểm TB</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="discovery" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Khám phá
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {suggestions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="smart" className="gap-2">
              <Zap className="w-4 h-4" />
              Smart
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2">
              <Brain className="w-4 h-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Ngân hàng ý tưởng
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {combinedStats.totalTopics}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Hiệu suất
            </TabsTrigger>
          </TabsList>

          {/* Discovery Tab */}
          <TabsContent value="discovery" className="space-y-6">
            {/* Seasonal Topics Section */}
            <SeasonalTopicsSection
              onSelectTopic={(topic, goal) => {
                navigate('/multichannel', { 
                  state: { 
                    prefillTopic: topic,
                    prefillGoal: goal || selectedGoal,
                    fromTopics: true 
                  } 
                });
              }}
              onScheduleTopic={(topic, eventDate) => {
                navigate('/calendar', { 
                  state: { 
                    scheduleTopic: topic,
                    scheduleGoal: selectedGoal,
                    suggestedDate: eventDate.toISOString(),
                  } 
                });
              }}
            />

            {/* Similar Success Topics */}
            <SimilarSuccessTopics
              brandTemplateId={selectedBrandId || undefined}
              contentGoal={selectedGoal}
              onSelectTopic={(topic, goal) => {
                navigate('/multichannel', { 
                  state: { 
                    prefillTopic: topic,
                    prefillGoal: goal || selectedGoal,
                    fromTopics: true 
                  } 
                });
              }}
              limit={5}
            />

            {/* AI Suggestions - Show empty state if no brand selected */}
            {!selectedBrandId ? (
              <TopicEmptyState 
                type="no-brand-selected" 
                onAction={() => setBrandDialogOpen(true)} 
              />
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Gợi ý AI
                  </h3>
                  <TopicAILearningBadge
                    isPersonalized={!!selectedBrandId}
                    isEnhancing={isEnhancing}
                    source={source}
                    usedCount={combinedStats.usedTopics}
                    favoritesCount={combinedStats.favorites}
                    learningCount={topPerformers.length}
                  />
                  {suggestionStats && !isEnhancing && (
                    <Badge variant="outline" className="text-xs">
                      Điểm TB: {suggestionStats.averageScore}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {suggestions.length > 0 && (
                    <Button
                      variant={selectionMode ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) setSelectedTopics([]);
                      }}
                      className="gap-1.5"
                    >
                      <CheckSquare className="w-4 h-4" />
                      {selectionMode ? 'Hủy chọn' : 'Chọn nhiều'}
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refresh}
                    disabled={suggestionsLoading || isEnhancing}
                  >
                    <RefreshCw className={cn('w-4 h-4 mr-2', (suggestionsLoading || isEnhancing) && 'animate-spin')} />
                    Làm mới
                  </Button>
                </div>
              </div>

              {suggestionsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <div className="flex gap-1.5">
                            <Skeleton className="h-4 w-16 rounded-full" />
                            <Skeleton className="h-4 w-12 rounded-full" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="flex items-center gap-2">
                            <Skeleton className="w-3 h-3 rounded" />
                            <Skeleton className="h-2 flex-1 rounded-full" />
                            <Skeleton className="w-6 h-3" />
                          </div>
                        ))}
                      </div>
                      <Skeleton className="h-6 w-full" />
                    </Card>
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <TopicEmptyState 
                  type="ai-suggestions" 
                  onAction={() => navigate('/brands')} 
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map((topic, index) => (
                    <div
                      key={`${topic.topic}-${index}`}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TopicIdeaCard
                        topic={topic}
                        onSelect={handleSelectTopic}
                        onSave={handleSaveTopic}
                        onSchedule={handleScheduleTopic}
                        selectable={selectionMode}
                        checked={isTopicSelected(topic)}
                        onCheckedChange={(checked) => handleToggleTopicSelection(topic, checked)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </TabsContent>

          {/* Smart Recommendations Tab */}
          <TabsContent value="smart" className="space-y-6">
            {/* Next Best Topic - Featured */}
            <NextBestTopicCard
              brandTemplateId={selectedBrandId || undefined}
              contentGoal={selectedGoal}
              onSelectTopic={(topic) => {
                navigate('/multichannel', { 
                  state: { 
                    prefillTopic: topic,
                    prefillGoal: selectedGoal,
                    fromTopics: true 
                  } 
                });
              }}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Weekly Plan */}
              <WeeklySuggestionsPanel
                brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
                onSelectTopic={(topic) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: topic,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
                onScheduleTopic={(topic, day) => {
                  navigate('/calendar', { 
                    state: { 
                      scheduleTopic: topic,
                      scheduleGoal: selectedGoal,
                    } 
                  });
                }}
              />

              {/* Conflict Checker */}
              <TopicConflictChecker
                brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
              />
            </div>
          </TabsContent>

          {/* AI Intelligence Tab */}
          <TabsContent value="intelligence" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gap Analysis */}
              <TopicGapAnalysis
              brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
                onSelectTopic={(topic) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: topic,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
              />

              {/* Topic Clusters */}
              <TopicClusterView
              brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
                onSelectTopic={(topic) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: topic,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Keyword Expansion */}
              <KeywordExpansionPanel
              brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
                onSelectKeyword={(keyword) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: keyword,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
              />

              {/* Topic Refiner */}
              <TopicRefiner
              brandTemplateId={selectedBrandId || undefined}
                contentGoal={selectedGoal}
                onSelectRefinedTopic={(topic) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: topic,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
              />
            </div>
          </TabsContent>

          {/* Topic Bank Tab */}
          <TabsContent value="bank">
            <TopicBankGrid
              brandTemplateId={selectedBrandId || undefined}
              contentGoal={selectedGoal}
              onSelectTopic={(topic) => {
                navigate('/multichannel', { 
                  state: { 
                    prefillTopic: topic,
                    prefillGoal: selectedGoal,
                    fromTopics: true 
                  } 
                });
              }}
            />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <TopicAnalyticsDashboard
              brandTemplateId={selectedBrandId || undefined}
              contentGoal={selectedGoal}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Onboarding for first-time users */}
      <TopicDiscoveryOnboarding />

      {/* Bulk actions bar */}
      <TopicBulkActions
        selectedTopics={selectedTopics}
        onSaveAll={handleSaveAllTopics}
        onScheduleAll={handleScheduleAllTopics}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAllTopics}
        totalCount={suggestions.length}
      />
    </div>
  );
};

export default Topics;
