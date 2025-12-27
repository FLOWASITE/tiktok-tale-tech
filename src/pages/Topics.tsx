import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Bookmark, BarChart3, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { MobileSidebarDrawer } from '@/components/topic/MobileSidebarDrawer';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion, ContentPillar, SEASONAL_EVENTS } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STORAGE_KEY_BRAND = 'topics-selected-brand';
const STORAGE_KEY_GOAL = 'topics-selected-goal';

const Topics = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('bank');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_BRAND);
    }
    return null;
  });
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
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Compact Header - Responsive */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          <BrandSelectorDropdown brand={selectedBrand} onOpen={() => setBrandDialogOpen(true)} />
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

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Context Bank (Desktop only) */}
        {!isMobile && selectedBrandId && (
          <div className={cn(
            'flex-shrink-0 transition-all duration-300',
            leftPanelCollapsed ? 'w-12' : 'w-64'
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
              {/* Chatbot - Main Focus - Responsive padding */}
              <div className="flex-1 p-2 sm:p-4 overflow-hidden">
                <TopicAIChatbot
                  brandTemplateId={selectedBrandId}
                  contentGoal={selectedGoal}
                  onNavigate={(path, state) => navigate(path, { state })}
                  isExpanded={isMobile || (leftPanelCollapsed && rightPanelCollapsed)}
                  className="h-full"
                />
              </div>

              {/* Bottom Tabs - Hidden on mobile, shown on desktop */}
              <div className="hidden sm:block flex-shrink-0 border-t bg-muted/30">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="w-full h-10 bg-transparent border-b rounded-none justify-start px-4 gap-1 overflow-x-auto">
                    <TabsTrigger value="bank" className="h-8 text-xs gap-1.5 data-[state=active]:bg-background px-3">
                      <Bookmark className="w-3.5 h-3.5" />
                      Ngân hàng
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">{combinedStats.totalTopics}</Badge>
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

                  <div className="max-h-[35vh] overflow-auto">
                    <TabsContent value="bank" className="m-0 p-4">
                      <TopicBankGrid
                        brandTemplateId={selectedBrandId}
                        contentGoal={selectedGoal}
                        onSelectTopic={(topic) => navigate('/multichannel', { state: { prefillTopic: topic, prefillGoal: selectedGoal, fromTopics: true } })}
                      />
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
            rightPanelCollapsed ? 'w-12' : 'w-64'
          )}>
            <DiscoveryFeedPanel
              brandTemplateId={selectedBrandId}
              aiLearningStats={aiLearningStats}
              onInjectPrompt={handleInjectPrompt}
              isCollapsed={rightPanelCollapsed}
              onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            />
          </div>
        )}
      </div>

      {/* Mobile Drawer */}
      {isMobile && selectedBrandId && (
        <MobileSidebarDrawer
          favorites={sidebarFavorites}
          recentTopics={sidebarRecentTopics}
          topPerformers={sidebarTopPerformers}
          onSelectTopic={(topic) => handleInjectPrompt(`Gợi ý content về: "${topic}"`)}
          onViewAllTopics={() => setActiveTab('bank')}
          aiLearningStats={aiLearningStats}
          isEnhancing={false}
          onChangeBrand={() => setBrandDialogOpen(true)}
          onGetEventSuggestions={(event) => handleInjectPrompt(`Gợi ý content cho sự kiện: ${event.name}`)}
          onScheduleTopic={(topic, date) => console.log('Schedule topic', topic, date)}
        />
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
