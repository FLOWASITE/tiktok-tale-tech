import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, Sparkles, BookOpen, BarChart3, 
  TrendingUp, Star, Bookmark, RefreshCw,
  Zap, Target, Brain, CheckSquare, Layers, Grid3X3, LayoutList,
  Percent
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TopicIdeaCard } from '@/components/topic/TopicIdeaCard';
import { TopicMobileCard } from '@/components/topic/TopicMobileCard';
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
import { BrandSwitcherDialog } from '@/components/topic/BrandSwitcherDialog';
import { BrandSelectorDropdown } from '@/components/topic/BrandSelectorDropdown';
import { BrandInfoCard } from '@/components/topic/BrandInfoCard';
import { TopicsByPillarView } from '@/components/topic/TopicsByPillarView';
import { TopicAIHeroSection } from '@/components/topic/TopicAIHeroSection';
import { UpcomingEventsCard } from '@/components/topic/UpcomingEventsCard';
import { QuickAccessBank } from '@/components/topic/QuickAccessBank';
import { AILearningStatus } from '@/components/topic/AILearningStatus';
import { TopicComparisonMode } from '@/components/topic/TopicComparisonMode';
import { TopicComparisonBar } from '@/components/topic/TopicComparisonBar';
import { ContentPipelineView } from '@/components/topic/ContentPipelineView';
import { AILearningDashboard } from '@/components/topic/AILearningDashboard';
import { MobileSidebarDrawer } from '@/components/topic/MobileSidebarDrawer';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion, ContentPillar, SeasonalEvent } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CONTENT_GOALS: { value: ContentGoal; label: string }[] = [
  { value: 'engagement', label: 'Tăng tương tác' },
  { value: 'awareness', label: 'Nâng cao nhận diện' },
  { value: 'conversion', label: 'Chuyển đổi' },
  { value: 'education', label: 'Giáo dục' },
];

const STORAGE_KEY_BRAND = 'topics-selected-brand';
const STORAGE_KEY_GOAL = 'topics-selected-goal';

const Topics = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('discovery');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(() => {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_BRAND);
    }
    return null;
  });
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_GOAL);
      if (saved && ['engagement', 'awareness', 'conversion', 'education'].includes(saved)) {
        return saved as ContentGoal;
      }
    }
    return 'engagement';
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<EnhancedTopicSuggestion[]>([]);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'pillar'>('grid');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [aiDashboardOpen, setAiDashboardOpen] = useState(false);

  const { templates: brands, loading: brandsLoading } = useBrandTemplates();

  // Persist selected brand to localStorage
  useEffect(() => {
    if (selectedBrandId) {
      localStorage.setItem(STORAGE_KEY_BRAND, selectedBrandId);
    } else {
      localStorage.removeItem(STORAGE_KEY_BRAND);
    }
  }, [selectedBrandId]);

  // Persist selected goal to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GOAL, selectedGoal);
  }, [selectedGoal]);

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
  
  // Keep suggestions in memory across tabs - only fetch when on discovery tab
  // but preserve data when switching to other tabs
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
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
    // Only enable fetching when on discovery tab AND has brand selected
    // But the hook internally preserves suggestions when disabled
    enabled: !!selectedBrandId && (activeTab === 'discovery' || !hasLoadedOnce),
  });

  // Track if we've loaded suggestions at least once
  useEffect(() => {
    if (suggestions.length > 0 && source !== 'fallback') {
      setHasLoadedOnce(true);
    }
  }, [suggestions, source]);

  const { 
    history, 
    drafts,
    favorites, 
    topPerformers, 
    stats: historyStats, 
    isLoading: historyLoading,
    saveTopic,
    saveBulkTopics,
    checkExistingTopics,
    confirmDraft,
    deleteTopic,
  } = useTopicHistory({
    brandTemplateId: selectedBrandId || undefined,
    contentGoal: selectedGoal,
    enabled: true,
  });

  // Auto-save new suggestions as drafts
  const [lastSavedSuggestions, setLastSavedSuggestions] = useState<string[]>([]);
  
  useEffect(() => {
    const autoSaveDrafts = async () => {
      if (!suggestions.length || suggestionsLoading || !selectedBrandId) return;
      
      // Get suggestion topics that haven't been saved yet
      const suggestionTopicTexts = suggestions.map(s => s.topic);
      const alreadySaved = suggestionTopicTexts.every(t => lastSavedSuggestions.includes(t));
      
      if (alreadySaved) return;
      
      // Filter out topics that already exist in history
      const newTopics = checkExistingTopics(suggestions);
      
      if (newTopics.length > 0) {
        await saveBulkTopics(newTopics, 'draft');
      }
      
      // Mark these as saved
      setLastSavedSuggestions(suggestionTopicTexts);
    };
    
    autoSaveDrafts();
  }, [suggestions, suggestionsLoading, selectedBrandId, checkExistingTopics, saveBulkTopics, lastSavedSuggestions]);

  // Reset lastSavedSuggestions when brand or goal changes
  useEffect(() => {
    setLastSavedSuggestions([]);
  }, [selectedBrandId, selectedGoal]);

  // Combined stats
  const combinedStats = useMemo(() => {
    const usageRate = historyStats.totalTopics > 0 
      ? Math.round((historyStats.usedTopics / historyStats.totalTopics) * 100) 
      : 0;
    return {
      totalTopics: historyStats.totalTopics,
      draftsCount: drafts.length,
      favorites: historyStats.favoriteCount,
      usedTopics: historyStats.usedTopics,
      avgPerformance: historyStats.averagePerformance || 0,
      suggestionCount: suggestions.length,
      topPerformersCount: topPerformers.length,
      usageRate,
    };
  }, [historyStats, drafts.length, suggestions, topPerformers]);

  // Sidebar data transformations
  const sidebarFavorites = useMemo(() => 
    favorites.map(f => ({
      id: f.id,
      topic: f.topic,
      pillar: f.pillar || undefined,
      performanceScore: f.performanceScore || undefined,
      isFavorite: true,
    })), [favorites]);

  const sidebarRecentTopics = useMemo(() => 
    history.slice(0, 10).map(h => ({
      id: h.id,
      topic: h.topic,
      pillar: h.pillar || undefined,
      createdAt: h.createdAt,
    })), [history]);

  const sidebarTopPerformers = useMemo(() => 
    topPerformers.map(t => ({
      id: t.id,
      topic: t.topic,
      pillar: t.pillar || undefined,
      performanceScore: t.performanceScore || undefined,
    })), [topPerformers]);

  // AI Learning stats
  const aiLearningStats = useMemo(() => {
    const positiveFeedback = history.filter(h => h.feedback === 'positive').length;
    const negativeFeedback = history.filter(h => h.feedback === 'negative').length;
    const totalFeedback = positiveFeedback + negativeFeedback;
    
    // Calculate personalization level based on data richness
    const dataPoints = [
      history.length > 0 ? 20 : 0,
      favorites.length > 0 ? 15 : 0,
      topPerformers.length > 0 ? 20 : 0,
      totalFeedback > 5 ? 25 : totalFeedback * 5,
      combinedStats.usedTopics > 5 ? 20 : combinedStats.usedTopics * 4,
    ];
    const personalizationLevel = Math.min(100, dataPoints.reduce((a, b) => a + b, 0));
    
    // Extract patterns from top performers
    const topPatterns = [...new Set(topPerformers.slice(0, 4).map(t => t.pillar).filter(Boolean))] as string[];
    
    return {
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      personalizationLevel,
      topPatterns,
    };
  }, [history, favorites, topPerformers, combinedStats.usedTopics]);

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
    // Find if this topic already exists as a draft
    const existingDraft = drafts.find(d => d.topic.toLowerCase().trim() === topic.topic.toLowerCase().trim());
    if (existingDraft) {
      await confirmDraft(existingDraft.id);
    } else {
      await saveTopic(topic, 'suggested');
      toast.success('Đã lưu vào ngân hàng ý tưởng');
    }
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
        {/* Header - Compact with Brand Selector */}
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

          {/* Right: Brand + Goal Selectors */}
          <div className="flex items-center gap-3">
            <BrandSelectorDropdown
              brand={selectedBrand}
              onOpen={() => setBrandDialogOpen(true)}
            />
            <div className="h-6 w-px bg-border hidden sm:block" />
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
        </div>

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

        {/* Two-Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Main Content - 8 cols */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* AI Hero Section - Compact */}
            {selectedBrandId && (
              <TopicAIHeroSection
                brandTemplateId={selectedBrandId}
                contentGoal={selectedGoal}
                onNavigate={(path, state) => navigate(path, { state })}
                variant="compact"
              />
            )}

            {/* AI Suggestions Grid - Always visible when brand selected */}
            {selectedBrandId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Gợi ý AI khác
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
                    {/* View Mode Toggle */}
                    {contentPillars.length > 0 && suggestions.length > 0 && (
                      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                        <Button
                          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode('grid')}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'pillar' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode('pillar')}
                        >
                          <LayoutList className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
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
                        <Skeleton className="h-6 w-full" />
                      </Card>
                    ))}
                  </div>
                ) : viewMode === 'pillar' && contentPillars.length > 0 ? (
                  <TopicsByPillarView
                    topics={suggestions}
                    contentPillars={contentPillars}
                    onSelectTopic={handleSelectTopic}
                    onSaveTopic={handleSaveTopic}
                    onScheduleTopic={handleScheduleTopic}
                    selectable={selectionMode}
                    selectedTopics={selectedTopics}
                    onToggleSelection={handleToggleTopicSelection}
                  />
                ) : isMobile ? (
                  // Mobile: Single column with TopicMobileCard
                  <div className="grid gap-3">
                    {suggestions.slice(0, 6).map((topic, index) => (
                      <div
                        key={`${topic.topic}-${index}`}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TopicMobileCard
                          topic={topic}
                          onSelect={handleSelectTopic}
                          onSave={handleSaveTopic}
                          onSchedule={handleScheduleTopic}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {suggestions.slice(0, 6).map((topic, index) => (
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
            ) : (
              <TopicEmptyState 
                type="no-brand-selected" 
                onAction={() => setBrandDialogOpen(true)} 
              />
            )}

            {/* Compact Stats Row - 3 key metrics */}
            {selectedBrandId && (
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{combinedStats.suggestionCount}</p>
                    <p className="text-xs text-muted-foreground">Gợi ý AI</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Bookmark className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{combinedStats.totalTopics}</p>
                    <p className="text-xs text-muted-foreground">Đã lưu</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-border" />

                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Percent className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{combinedStats.usageRate}%</p>
                    <p className="text-xs text-muted-foreground">Tỷ lệ sử dụng</p>
                  </div>
                </div>

                {contentPillars.length > 0 && (
                  <>
                    <div className="h-8 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-500/10">
                        <Layers className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{contentPillars.length}</p>
                        <p className="text-xs text-muted-foreground">Pillars</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Main Tabs - Reduced */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Mobile: Horizontal scrollable tabs */}
              {isMobile ? (
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList className="bg-muted/50 p-1 inline-flex w-auto gap-1">
                    <TabsTrigger value="discovery" className="gap-1.5 text-xs px-3">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gợi ý
                      <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                        {suggestions.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="smart" className="gap-1.5 text-xs px-3">
                      <Zap className="w-3.5 h-3.5" />
                      Smart
                    </TabsTrigger>
                    <TabsTrigger value="bank" className="gap-1.5 text-xs px-3">
                      <BookOpen className="w-3.5 h-3.5" />
                      Ngân hàng
                      <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">
                        {combinedStats.totalTopics}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="gap-1.5 text-xs px-3">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Hiệu suất
                    </TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
              ) : (
                <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
                  <TabsTrigger value="discovery" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Tất cả gợi ý
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {suggestions.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="smart" className="gap-2">
                    <Zap className="w-4 h-4" />
                    Smart
                  </TabsTrigger>
                  <TabsTrigger value="bank" className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    Ngân hàng
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {combinedStats.totalTopics}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Hiệu suất
                  </TabsTrigger>
                </TabsList>
              )}

          {/* Discovery Tab - All AI Suggestions */}
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

            {/* All AI Suggestions Grid */}
            {!selectedBrandId ? (
              <TopicEmptyState 
                type="no-brand-selected" 
                onAction={() => setBrandDialogOpen(true)} 
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Tất cả gợi ý AI ({suggestions.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    {contentPillars.length > 0 && suggestions.length > 0 && (
                      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                        <Button
                          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode('grid')}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={viewMode === 'pillar' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setViewMode('pillar')}
                        >
                          <LayoutList className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="p-4 space-y-3">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-full" />
                      </Card>
                    ))}
                  </div>
                ) : viewMode === 'pillar' && contentPillars.length > 0 ? (
                  <TopicsByPillarView
                    topics={suggestions}
                    contentPillars={contentPillars}
                    onSelectTopic={handleSelectTopic}
                    onSaveTopic={handleSaveTopic}
                    onScheduleTopic={handleScheduleTopic}
                    selectable={selectionMode}
                    selectedTopics={selectedTopics}
                    onToggleSelection={handleToggleTopicSelection}
                  />
                ) : isMobile ? (
                  // Mobile: Single column with TopicMobileCard
                  <div className="grid gap-3">
                    {suggestions.map((topic, index) => (
                      <div
                        key={`${topic.topic}-${index}`}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TopicMobileCard
                          topic={topic}
                          onSelect={handleSelectTopic}
                          onSave={handleSaveTopic}
                          onSchedule={handleScheduleTopic}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
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
              onSelectTopic={(topic, topicHistoryId) => {
                navigate('/multichannel', { 
                  state: { 
                    prefillTopic: topic,
                    prefillGoal: selectedGoal,
                    topicHistoryId,
                    fromTopics: true 
                  } 
                });
              }}
            />
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline">
            <ContentPipelineView
              brandTemplateId={selectedBrandId || undefined}
              contentGoal={selectedGoal}
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

          {/* Right: Sidebar - 4 cols - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              {/* Brand Info Card */}
              <BrandInfoCard
                brand={selectedBrand}
                onChangeBrand={() => setBrandDialogOpen(true)}
                onEditBrand={selectedBrand ? () => navigate(`/brands/${selectedBrand.id}`) : undefined}
              />

              {/* Upcoming Events */}
              <UpcomingEventsCard
                onGetSuggestions={(event) => {
                  toast.info(`Đang lấy gợi ý cho ${event.name}...`);
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

              {/* Quick Access Bank */}
              <QuickAccessBank
                favorites={sidebarFavorites}
                recentTopics={sidebarRecentTopics}
                topPerformers={sidebarTopPerformers}
                onSelectTopic={(topic) => {
                  navigate('/multichannel', { 
                    state: { 
                      prefillTopic: topic,
                      prefillGoal: selectedGoal,
                      fromTopics: true 
                    } 
                  });
                }}
                onViewAll={() => setActiveTab('bank')}
              />

              {/* AI Learning Status */}
              <AILearningStatus
                totalFeedback={aiLearningStats.totalFeedback}
                positiveFeedback={aiLearningStats.positiveFeedback}
                negativeFeedback={aiLearningStats.negativeFeedback}
                topPatterns={aiLearningStats.topPatterns}
                personalizationLevel={aiLearningStats.personalizationLevel}
                isLearning={isEnhancing}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebarDrawer
        brand={selectedBrand}
        onChangeBrand={() => setBrandDialogOpen(true)}
        onEditBrand={selectedBrand ? () => navigate(`/brands/${selectedBrand.id}`) : undefined}
        onGetEventSuggestions={(event) => {
          toast.info(`Đang lấy gợi ý cho ${event.name}...`);
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
        favorites={sidebarFavorites}
        recentTopics={sidebarRecentTopics}
        topPerformers={sidebarTopPerformers}
        onSelectTopic={(topic) => {
          navigate('/multichannel', { 
            state: { 
              prefillTopic: topic,
              prefillGoal: selectedGoal,
              fromTopics: true 
            } 
          });
        }}
        onViewAllTopics={() => setActiveTab('bank')}
        aiLearningStats={aiLearningStats}
        isEnhancing={isEnhancing}
      />

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

      {/* Topic Comparison Mode */}
      <TopicComparisonMode
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        topics={selectedTopics}
        onSelectBest={(topic) => {
          handleSelectTopic(topic);
          setComparisonOpen(false);
          handleClearSelection();
        }}
        onClearSelection={handleClearSelection}
      />

      {/* Topic Comparison Bar */}
      <TopicComparisonBar
        selectedTopics={selectedTopics}
        onRemoveTopic={(topic) => handleToggleTopicSelection(topic, false)}
        onCompare={() => setComparisonOpen(true)}
        onClearAll={handleClearSelection}
      />

      {/* AI Learning Dashboard */}
      <AILearningDashboard
        open={aiDashboardOpen}
        onOpenChange={setAiDashboardOpen}
        brandTemplateId={selectedBrandId || undefined}
        contentGoal={selectedGoal}
      />
    </div>
  );
};

export default Topics;
