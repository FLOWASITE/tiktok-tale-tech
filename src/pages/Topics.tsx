import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, Sparkles, BookOpen, BarChart3, 
  TrendingUp, Star, Bookmark, RefreshCw,
  ArrowRight, Zap, Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TopicIdeaCard } from '@/components/topic/TopicIdeaCard';
import { TopicBankGrid } from '@/components/topic/TopicBankGrid';
import { TopicAnalyticsDashboard } from '@/components/topic/TopicAnalyticsDashboard';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { ContentGoal } from '@/types/multichannel';
import { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
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
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [selectedGoal, setSelectedGoal] = useState<ContentGoal>('engagement');

  const { templates: brands, loading: brandsLoading } = useBrandTemplates();
  
  const { 
    suggestions, 
    source, 
    isLoading: suggestionsLoading, 
    refresh,
    stats: suggestionStats
  } = useEnhancedTopicSuggestions({
    brandTemplateId: selectedBrandId === 'all' ? undefined : selectedBrandId,
    contentGoal: selectedGoal,
    enabled: activeTab === 'discovery',
  });

  const { 
    history, 
    favorites, 
    topPerformers, 
    stats: historyStats, 
    isLoading: historyLoading,
    saveTopic,
  } = useTopicHistory({
    brandTemplateId: selectedBrandId === 'all' ? undefined : selectedBrandId,
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

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Chọn Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Brand</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.brand_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="discovery" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Khám phá
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {suggestions.length}
              </Badge>
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
          <TabsContent value="discovery" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={source === 'fallback' ? 'outline' : 'secondary'} 
                  className={cn(
                    'text-xs',
                    source === 'ai' && 'bg-primary/10 text-primary',
                    source === 'cache' && 'bg-amber-500/10 text-amber-600'
                  )}
                >
                  {source === 'ai' ? '✨ Tạo mới bởi AI' : source === 'cache' ? '⚡ Từ cache' : '📋 Mặc định'}
                </Badge>
                {suggestionStats && (
                  <Badge variant="outline" className="text-xs">
                    Điểm TB: {suggestionStats.averageScore}
                  </Badge>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refresh}
                disabled={suggestionsLoading}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', suggestionsLoading && 'animate-spin')} />
                Làm mới
              </Button>
            </div>

            {suggestionsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-[280px] rounded-lg" />
                ))}
              </div>
            ) : suggestions.length === 0 ? (
              <Card className="gradient-card border-border/50">
                <CardContent className="py-12 text-center">
                  <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">Chưa có gợi ý</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chọn Brand Template để nhận gợi ý AI tùy chỉnh
                  </p>
                  <Button variant="outline" onClick={() => navigate('/brands')}>
                    Quản lý Brand
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
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
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Topic Bank Tab */}
          <TabsContent value="bank">
            <TopicBankGrid
              brandTemplateId={selectedBrandId === 'all' ? undefined : selectedBrandId}
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
              brandTemplateId={selectedBrandId === 'all' ? undefined : selectedBrandId}
              contentGoal={selectedGoal}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Topics;
