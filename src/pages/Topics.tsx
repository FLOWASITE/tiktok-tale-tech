import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Bookmark, BarChart3, Brain, MessageSquare, Compass, Sparkles, Menu, TrendingUp, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { TopicBankGrid } from '@/components/topic/TopicBankGrid';
import { TopicAnalyticsDashboard } from '@/components/topic/TopicAnalyticsDashboard';
import { TopicDiscoveryOnboarding } from '@/components/topic/TopicDiscoveryOnboarding';
import { TopicBulkActions } from '@/components/topic/TopicBulkActions';
import { BrandSwitcherDialog } from '@/components/topic/BrandSwitcherDialog';
import { BrandSelectorDropdown } from '@/components/topic/BrandSelectorDropdown';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { ContextBankPanel } from '@/components/topic/ContextBankPanel';
import { DiscoveryFeedPanel } from '@/components/topic/DiscoveryFeedPanel';
import { TopicComparisonMode } from '@/components/topic/TopicComparisonMode';
import { TopicComparisonBar } from '@/components/topic/TopicComparisonBar';
import { AILearningDashboard } from '@/components/topic/AILearningDashboard';
import { TopicPerformanceDashboard } from '@/components/topic/TopicPerformanceDashboard';
import { MobileTopicBankSheet } from '@/components/topic/MobileTopicBankSheet';
import { MobileDiscoverySheet } from '@/components/topic/MobileDiscoverySheet';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion, ContentPillar, SEASONAL_EVENTS } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_KEY_GOAL = 'topics-selected-goal';

const Topics = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('bank');
  
  // Use global brand from header context
  const { currentBrand, brands, loading: brandsLoading, switchBrand } = useCurrentBrand();
  const selectedBrandId = currentBrand?.id || null;
  
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_GOAL);
      if (saved && ['engagement', 'awareness', 'conversion', 'education', 'expertise'].includes(saved)) {
        return saved as ContentGoal;
      }
    }
    return 'engagement';
  });
  const [selectedTopics, setSelectedTopics] = useState<EnhancedTopicSuggestion[]>([]);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [aiDashboardOpen, setAiDashboardOpen] = useState(false);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  // Mobile states
  const [mobileTab, setMobileTab] = useState<'chat' | 'bank' | 'discovery' | 'analytics' | 'performance' | 'learning'>('chat');
  const [mobileBankOpen, setMobileBankOpen] = useState(false);
  const [mobileDiscoveryOpen, setMobileDiscoveryOpen] = useState(false);

  const { templates: brandTemplates } = useBrandTemplates();

  // Persist selected goal to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GOAL, selectedGoal);
  }, [selectedGoal]);

  const selectedBrand = currentBrand || undefined;
  
  const { 
    suggestions, 
    source, 
    isLoading: suggestionsLoading,
    isEnhancing,
    refresh,
  } = useEnhancedTopicSuggestions({
    brandTemplateId: selectedBrandId || undefined,
    contentGoal: selectedGoal,
    enabled: !!selectedBrandId,
  });

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
      const suggestionTopicTexts = suggestions.map(s => s.topic);
      const alreadySaved = suggestionTopicTexts.every(t => lastSavedSuggestions.includes(t));
      if (alreadySaved) return;
      const newTopics = checkExistingTopics(suggestions);
      if (newTopics.length > 0) {
        await saveBulkTopics(newTopics, 'draft');
      }
      setLastSavedSuggestions(suggestionTopicTexts);
    };
    autoSaveDrafts();
  }, [suggestions, suggestionsLoading, selectedBrandId, checkExistingTopics, saveBulkTopics, lastSavedSuggestions]);

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
    const dataPoints = [
      history.length > 0 ? 20 : 0,
      favorites.length > 0 ? 15 : 0,
      topPerformers.length > 0 ? 20 : 0,
      totalFeedback > 5 ? 25 : totalFeedback * 5,
      combinedStats.usedTopics > 5 ? 20 : combinedStats.usedTopics * 4,
    ];
    const personalizationLevel = Math.min(100, dataPoints.reduce((a, b) => a + b, 0));
    const topPatterns = [...new Set(topPerformers.slice(0, 4).map(t => t.pillar).filter(Boolean))] as string[];
    return { totalFeedback, positiveFeedback, negativeFeedback, personalizationLevel, topPatterns };
  }, [history, favorites, topPerformers, combinedStats.usedTopics]);

  // Upcoming events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return SEASONAL_EVENTS.filter(e => e.date > now).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);
  }, []);

  // Handler for injecting prompts from panels
  const handleInjectPrompt = useCallback((prompt: string) => {
    const sendFn = (window as any).__topicChatSendMessage;
    if (sendFn) sendFn(prompt);
  }, []);

  const handleSaveTopic = async (topic: EnhancedTopicSuggestion) => {
    const existingDraft = drafts.find(d => d.topic.toLowerCase().trim() === topic.topic.toLowerCase().trim());
    if (existingDraft) {
      await confirmDraft(existingDraft.id);
    } else {
      await saveTopic(topic, 'suggested');
      toast.success('Đã lưu vào ngân hàng ý tưởng');
    }
  };

  const handleClearSelection = useCallback(() => {
    setSelectedTopics([]);
  }, []);

  const handleSaveAllTopics = useCallback(async (topics: EnhancedTopicSuggestion[]) => {
    for (const topic of topics) {
      await saveTopic(topic, 'suggested');
    }
  }, [saveTopic]);

  const handleScheduleAllTopics = useCallback((topics: EnhancedTopicSuggestion[]) => {
    navigate('/calendar', { state: { bulkSchedule: topics.map(t => ({ topic: t.topic, goal: selectedGoal })) } });
  }, [navigate, selectedGoal]);

  return (
    <div className={cn(
      "flex flex-col overflow-hidden",
      isMobile ? "h-[100dvh] fixed inset-0 z-40" : "h-[calc(100vh-64px)]"
    )}>
      {/* Compact Header - Hidden on mobile when chat is active */}
      {!(isMobile && mobileTab === 'chat') && (
        <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Sidebar Toggle Button - Mobile only */}
              {isMobile && (
                <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
              )}
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg flex-shrink-0">
                <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-foreground truncate">Kho Ý Tưởng</h1>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{combinedStats.suggestionCount} gợi ý</span>
                  <span>•</span>
                  <span>{combinedStats.totalTopics} đã lưu</span>
                  <span>•</span>
                  <span>{combinedStats.usageRate}% sử dụng</span>
                </div>
                {/* Mobile mini stats */}
                <div className="flex sm:hidden items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{combinedStats.suggestionCount} gợi ý</span>
                  <span>•</span>
                  <span>{combinedStats.totalTopics} lưu</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2"
                onClick={() => refresh()}
                disabled={!selectedBrandId || suggestionsLoading || isEnhancing}
              >
                <RefreshCw className={cn('h-4 w-4', (suggestionsLoading || isEnhancing) && 'animate-spin')} />
                Làm mới gợi ý
              </Button>
              <BrandSelectorDropdown brand={selectedBrand} onOpen={() => setBrandDialogOpen(true)} />
            </div>
          </div>
        </div>
      )}

      {/* Mobile header for chat tab - with sidebar toggle */}
      {isMobile && mobileTab === 'chat' && (
        <div className="flex-shrink-0 px-3 py-2 border-b bg-background/95 backdrop-blur flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-violet-600 shadow-lg flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-sm font-bold text-foreground truncate">Kho Ý Tưởng</h1>
          </div>
          <BrandSelectorDropdown brand={selectedBrand} onOpen={() => setBrandDialogOpen(true)} />
        </div>
      )}

      {/* Brand Switcher Dialog */}
      <BrandSwitcherDialog
        open={brandDialogOpen}
        onOpenChange={setBrandDialogOpen}
        brands={brands}
        selectedBrandId={selectedBrandId || undefined}
        onSelectBrand={(id) => switchBrand(id)}
        onCreateBrand={() => navigate('/brands/new')}
        onViewBrand={(id) => navigate(`/brands/${id}`)}
      />

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Context Bank (Desktop only) */}
        {!isMobile && selectedBrandId && (
          <div className={cn(
            'flex-shrink-0 transition-all duration-300',
            leftPanelCollapsed ? 'w-12' : 'w-60'
          )}>
            <ContextBankPanel
              favorites={sidebarFavorites}
              recentTopics={sidebarRecentTopics}
              topPerformers={sidebarTopPerformers}
              upcomingEvents={upcomingEvents}
              onInjectPrompt={handleInjectPrompt}
              isCollapsed={leftPanelCollapsed}
              onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
            />
          </div>
        )}

        {/* Center - Chatbot + Bottom Tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedBrandId ? (
            <>
              {/* Mobile content based on tab */}
              {isMobile ? (
                <div className="flex-1 flex flex-col min-h-0 pb-14 overflow-hidden">
                  {mobileTab === 'chat' && (
                    <TopicAIChatbot
                      brandTemplateId={selectedBrandId}
                      contentGoal={selectedGoal}
                      onNavigate={(path, state) => navigate(path, { state })}
                      isExpanded={true}
                      className="flex-1 min-h-0 h-full rounded-none border-0"
                    />
                  )}
                  {mobileTab === 'performance' && (
                    <div className="flex-1 overflow-auto p-4">
                      <TopicPerformanceDashboard brandTemplateId={selectedBrandId} />
                    </div>
                  )}
                  {mobileTab === 'analytics' && (
                    <div className="flex-1 overflow-auto p-4">
                      <TopicAnalyticsDashboard brandTemplateId={selectedBrandId} />
                    </div>
                  )}
                  {mobileTab === 'learning' && (
                    <div className="flex-1 overflow-auto p-4">
                      <AILearningDashboard
                        brandTemplateId={selectedBrandId}
                        open={true}
                        onOpenChange={() => setMobileTab('chat')}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Chatbot - Desktop */}
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-2 sm:p-4 lg:p-6">
                    <TopicAIChatbot
                      brandTemplateId={selectedBrandId}
                      contentGoal={selectedGoal}
                      onNavigate={(path, state) => navigate(path, { state })}
                      isExpanded={leftPanelCollapsed && rightPanelCollapsed}
                      className="flex-1 min-h-0 w-full"
                    />
                  </div>

                  {/* Bottom Tabs - Desktop only */}
                  <div className="flex-shrink-0 border-t bg-muted/30">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full h-10 bg-transparent border-b rounded-none justify-start px-4 gap-1 overflow-x-auto">
                        <TabsTrigger value="bank" className="h-8 text-xs gap-1.5 data-[state=active]:bg-background px-3">
                          <Bookmark className="w-3.5 h-3.5" />
                          Ngân hàng
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">{combinedStats.totalTopics}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="h-8 text-xs gap-1.5 data-[state=active]:bg-background px-3">
                          <TrendingUp className="w-3.5 h-3.5" />
                          Hiệu suất
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="h-8 text-xs gap-1.5 data-[state=active]:bg-background px-3">
                          <BarChart3 className="w-3.5 h-3.5" />
                          Phân tích
                        </TabsTrigger>
                        <TabsTrigger value="learning" className="h-8 text-xs gap-1.5 data-[state=active]:bg-background px-3">
                          <Brain className="w-3.5 h-3.5" />
                          AI Learning
                        </TabsTrigger>
                      </TabsList>

                      <div className="max-h-[28vh] overflow-auto">
                        <TabsContent value="bank" className="m-0 p-4">
                          <TopicBankGrid
                            brandTemplateId={selectedBrandId}
                            contentGoal={selectedGoal}
                            onSelectTopic={(topic) => navigate('/multichannel', { state: { prefillTopic: topic, prefillGoal: selectedGoal, fromTopics: true } })}
                          />
                        </TabsContent>
                        <TabsContent value="performance" className="m-0 p-4">
                          <TopicPerformanceDashboard brandTemplateId={selectedBrandId} />
                        </TabsContent>
                        <TabsContent value="analytics" className="m-0 p-4">
                          <TopicAnalyticsDashboard brandTemplateId={selectedBrandId} />
                        </TabsContent>
                        <TabsContent value="learning" className="m-0 p-4">
                          <AILearningDashboard
                            brandTemplateId={selectedBrandId}
                            open={activeTab === 'learning'}
                            onOpenChange={(open) => !open && setActiveTab('bank')}
                          />
                        </TabsContent>
                      </div>
                    </Tabs>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 rounded-2xl bg-primary/10 inline-block">
                  <Lightbulb className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold">Chọn thương hiệu để bắt đầu</h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md px-4">
                  Chọn một thương hiệu để AI có thể gợi ý các ý tưởng content phù hợp với brand voice của bạn.
                </p>
                <Button onClick={() => setBrandDialogOpen(true)} className="gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Chọn thương hiệu
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Discovery Feed (Desktop only) */}
        {!isMobile && selectedBrandId && (
          <div className={cn(
            'flex-shrink-0 transition-all duration-300',
            rightPanelCollapsed ? 'w-12' : 'w-60'
          )}>
            <DiscoveryFeedPanel
              brandTemplateId={selectedBrandId}
              contentGoal={selectedGoal}
              aiLearningStats={aiLearningStats}
              onInjectPrompt={handleInjectPrompt}
              isCollapsed={rightPanelCollapsed}
              onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Tabs */}
      {isMobile && selectedBrandId && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-inset-bottom">
          <div className="flex items-center justify-around h-14">
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'chat' && 'text-primary bg-primary/5'
              )}
              onClick={() => setMobileTab('chat')}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-[10px]">Chat</span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'bank' && 'text-primary bg-primary/5'
              )}
              onClick={() => {
                setMobileTab('bank');
                setMobileBankOpen(true);
              }}
            >
              <Bookmark className="h-5 w-5" />
              <span className="text-[10px]">Kho</span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'analytics' && 'text-primary bg-primary/5'
              )}
              onClick={() => setMobileTab('analytics')}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-[10px]">Phân tích</span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'performance' && 'text-primary bg-primary/5'
              )}
              onClick={() => setMobileTab('performance')}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-[10px]">Hiệu suất</span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'learning' && 'text-primary bg-primary/5'
              )}
              onClick={() => setMobileTab('learning')}
            >
              <Brain className="h-5 w-5" />
              <span className="text-[10px]">AI</span>
            </Button>
            <Button
              variant="ghost"
              className={cn(
                'flex-1 h-full flex-col gap-0.5 rounded-none px-1',
                mobileTab === 'discovery' && 'text-primary bg-primary/5'
              )}
              onClick={() => {
                setMobileTab('discovery');
                setMobileDiscoveryOpen(true);
              }}
            >
              <Compass className="h-5 w-5" />
              <span className="text-[10px]">Khám phá</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Sheets */}
      {isMobile && (
        <>
          <MobileTopicBankSheet
            open={mobileBankOpen}
            onOpenChange={setMobileBankOpen}
            brandTemplateId={selectedBrandId || undefined}
            contentGoal={selectedGoal}
            onSelectTopic={(topic, topicHistoryId) => {
              navigate('/multichannel', { state: { prefillTopic: topic, prefillGoal: selectedGoal, fromTopics: true } });
            }}
          />
          <MobileDiscoverySheet
            open={mobileDiscoveryOpen}
            onOpenChange={setMobileDiscoveryOpen}
            brandTemplateId={selectedBrandId || undefined}
            contentGoal={selectedGoal}
            onInjectPrompt={handleInjectPrompt}
            onNavigate={(path, state) => navigate(path, { state })}
          />
        </>
      )}

      {/* Onboarding */}
      <TopicDiscoveryOnboarding />

      {/* Bulk Actions */}
      <TopicBulkActions
        selectedTopics={selectedTopics}
        onClearSelection={handleClearSelection}
        onSaveAll={handleSaveAllTopics}
        onScheduleAll={handleScheduleAllTopics}
      />

      {/* Comparison Mode */}
      <TopicComparisonMode
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        topics={selectedTopics}
        onSelectBest={(topic) => {
          handleInjectPrompt(`Gợi ý content về: "${topic.topic}"`);
          setComparisonOpen(false);
        }}
        onClearSelection={handleClearSelection}
      />
      <TopicComparisonBar
        selectedCount={selectedTopics.length}
        onCompare={() => setComparisonOpen(true)}
        onClear={handleClearSelection}
      />
    </div>
  );
};

export default Topics;
