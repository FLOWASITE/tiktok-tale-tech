import { useState, useMemo } from 'react';
import { 
  Search, Star, TrendingUp, Filter, History, X, 
  Grid3X3, List, Play, Calendar, Trash2, MoreHorizontal, FileEdit, BookmarkCheck, Target, Link,
  ArrowUpDown, Loader2, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TopicHistoryCard } from './TopicHistoryCard';
import { LinkToCampaignDialog } from './LinkToCampaignDialog';
import { CampaignSelector } from '@/components/campaign/CampaignSelector';
import { useTopicHistory, TopicHistoryItem, FeedbackType } from '@/hooks/useTopicHistory';
import { useCampaigns } from '@/hooks/useCampaigns';
import { TopicCategory, TOPIC_CATEGORIES } from '@/types/topicDiscovery';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface TopicBankGridProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string, topicHistoryId?: string) => void;
}

type FilterView = 'all' | 'drafts' | 'favorites' | 'top-performers' | 'recent';
type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'score-high' | 'alphabetical';
type DateRange = 'all' | 'today' | 'week' | 'month' | '3months';

export function TopicBankGrid({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: TopicBankGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | 'all'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [linkCampaignTopic, setLinkCampaignTopic] = useState<TopicHistoryItem | null>(null);

  const { campaigns } = useCampaigns();

  const {
    history,
    drafts,
    favorites,
    topPerformers,
    recentlyUsed,
    stats,
    isLoading,
    isLoadingMore,
    hasMore,
    toggleFavorite,
    submitFeedback,
    deleteTopic,
    confirmDraft,
    linkToCampaign,
    loadMore,
  } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    campaignId: campaignFilter,
    enabled: true,
  });

  // Date range helper
  const getDateRangeStart = (range: DateRange): Date | null => {
    const now = new Date();
    switch (range) {
      case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
      case 'month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
      case '3months': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
      default: return null;
    }
  };

  // Filtered items based on view, search, date range, and sort
  const filteredItems = useMemo(() => {
    let items: TopicHistoryItem[] = [];

    switch (filterView) {
      case 'drafts':
        items = drafts;
        break;
      case 'favorites':
        items = favorites;
        break;
      case 'top-performers':
        items = topPerformers;
        break;
      case 'recent':
        items = recentlyUsed;
        break;
      default:
        items = history.filter(h => h.usageStatus !== 'draft');
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    // Apply date range filter
    const rangeStart = getDateRangeStart(dateRange);
    if (rangeStart) {
      items = items.filter(item => {
        const created = item.createdAt ? new Date(item.createdAt) : null;
        return created && created >= rangeStart;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.topic.toLowerCase().includes(query) ||
        item.pillar?.toLowerCase().includes(query) ||
        item.relatedKeywords?.some(k => k.toLowerCase().includes(query))
      );
    }

    // Apply sort
    items = [...items].sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        case 'score-high': {
          const scoreA = a.scores ? Math.round((a.scores.brandFit + a.scores.trend + a.scores.competition + a.scores.engagement) / 4) : 0;
          const scoreB = b.scores ? Math.round((b.scores.brandFit + b.scores.trend + b.scores.competition + b.scores.engagement) / 4) : 0;
          return scoreB - scoreA;
        }
        case 'alphabetical':
          return a.topic.localeCompare(b.topic, 'vi');
        case 'newest':
        default:
          return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
    });

    return items;
  }, [filterView, drafts, favorites, topPerformers, recentlyUsed, history, categoryFilter, searchQuery, dateRange, sortOption]);

  const handleReuse = (item: TopicHistoryItem) => {
    onSelectTopic(item.topic, item.id);
  };

  const handleFeedback = (id: string, feedback: FeedbackType) => {
    submitFeedback(id, feedback);
  };

  const handleConfirmDraft = async (item: TopicHistoryItem) => {
    await confirmDraft(item.id);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteTopic(deleteId);
      setDeleteId(null);
    }
  };

  const handleLinkToCampaign = async (campaignIdToLink: string | null) => {
    if (linkCampaignTopic) {
      await linkToCampaign(linkCampaignTopic.id, campaignIdToLink);
      setLinkCampaignTopic(null);
    }
  };

  // Helper to get campaign name
  const getCampaignName = (campaignIdValue?: string) => {
    if (!campaignIdValue) return null;
    return campaigns?.find(c => c.id === campaignIdValue)?.name;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="gradient-card border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.totalTopics}</p>
            <p className="text-xs text-muted-foreground">Tổng topics</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.suggestionToUsageRate}%</p>
            <p className="text-xs text-muted-foreground">Tỷ lệ sử dụng</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.averagePerformance || '-'}</p>
            <p className="text-xs text-muted-foreground">Điểm TB</p>
          </CardContent>
        </Card>
        <Card className="gradient-card border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.favoriteCount}</p>
            <p className="text-xs text-muted-foreground">Yêu thích</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filterView === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('all')}
        >
          <History className="h-4 w-4 mr-1" />
          Đã lưu
        </Button>
        <Button
          variant={filterView === 'drafts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('drafts')}
          className={filterView === 'drafts' ? '' : 'border-dashed'}
        >
          <FileEdit className="h-4 w-4 mr-1" />
          Nháp ({drafts.length})
        </Button>
        <Button
          variant={filterView === 'favorites' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('favorites')}
        >
          <Star className="h-4 w-4 mr-1" />
          Yêu thích ({favorites.length})
        </Button>
        <Button
          variant={filterView === 'top-performers' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('top-performers')}
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Hiệu suất cao ({topPerformers.length})
        </Button>
        <Button
          variant={filterView === 'recent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('recent')}
        >
          <Play className="h-4 w-4 mr-1" />
          Đã sử dụng ({recentlyUsed.length})
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)}>
            <ToggleGroupItem value="grid" size="sm">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" size="sm">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm topic, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TopicCategory | 'all')}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {TOPIC_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-36">
            <Clock className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi lúc</SelectItem>
            <SelectItem value="today">Hôm nay</SelectItem>
            <SelectItem value="week">7 ngày qua</SelectItem>
            <SelectItem value="month">30 ngày qua</SelectItem>
            <SelectItem value="3months">3 tháng qua</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-36">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
            <SelectItem value="score-high">Điểm cao nhất</SelectItem>
            <SelectItem value="alphabetical">A → Z</SelectItem>
          </SelectContent>
        </Select>
        <CampaignSelector
          value={campaignFilter}
          onValueChange={setCampaignFilter}
          placeholder="Chiến dịch"
          className="w-44"
        />
      </div>

      {/* Active filters summary */}
      {(dateRange !== 'all' || categoryFilter !== 'all' || campaignFilter || searchQuery) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Đang lọc:</span>
          {searchQuery && (
            <Badge variant="secondary" className="text-xs gap-1">
              "{searchQuery}"
              <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
            </Badge>
          )}
          {categoryFilter !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1">
              {TOPIC_CATEGORIES.find(c => c.value === categoryFilter)?.label}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter('all')} />
            </Badge>
          )}
          {dateRange !== 'all' && (
            <Badge variant="secondary" className="text-xs gap-1">
              {dateRange === 'today' ? 'Hôm nay' : dateRange === 'week' ? '7 ngày' : dateRange === 'month' ? '30 ngày' : '3 tháng'}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRange('all')} />
            </Badge>
          )}
          {campaignFilter && (
            <Badge variant="secondary" className="text-xs gap-1">
              Chiến dịch
              <X className="h-3 w-3 cursor-pointer" onClick={() => setCampaignFilter(undefined)} />
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
            setSearchQuery('');
            setCategoryFilter('all');
            setDateRange('all');
            setCampaignFilter(undefined);
          }}>
            Xóa bộ lọc
          </Button>
        </div>
      )}

      {/* Results */}
      {filteredItems.length === 0 ? (
        <Card className="gradient-card border-border/50">
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Không tìm thấy topic phù hợp' : 'Chưa có topic nào được lưu'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-muted-foreground mt-1">
                Chọn topic từ gợi ý AI để bắt đầu xây dựng ngân hàng ý tưởng
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <TopicHistoryCard
              key={item.id}
              item={item}
              onToggleFavorite={toggleFavorite}
              onFeedback={handleFeedback}
              onDelete={(id) => setDeleteId(id)}
              onReuse={handleReuse}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isDraft = item.usageStatus === 'draft';
            return (
              <Card 
                key={item.id} 
                className={cn(
                  'gradient-card hover:border-primary/30 transition-all cursor-pointer group',
                  isDraft ? 'border-dashed border-muted-foreground/30 opacity-80' : 'border-border/50',
                  item.isFavorite && 'ring-1 ring-amber-500/30'
                )}
                onClick={() => handleReuse(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      {isDraft && (
                        <Badge variant="outline" className="text-[10px] mb-1 border-dashed bg-muted/50">
                          <FileEdit className="h-2.5 w-2.5 mr-1" />
                          Nháp
                        </Badge>
                      )}
                      <h4 className={cn(
                        'font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors',
                        isDraft && 'text-muted-foreground'
                      )}>
                        {item.topic}
                      </h4>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isDraft && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConfirmDraft(item); }}>
                            <BookmarkCheck className="h-4 w-4 mr-2" />
                            Giữ lại
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReuse(item); }}>
                          <Play className="h-4 w-4 mr-2" />
                          Sử dụng
                        </DropdownMenuItem>
                        {!isDraft && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}>
                            <Star className={cn('h-4 w-4 mr-2', item.isFavorite && 'fill-amber-500 text-amber-500')} />
                            {item.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLinkCampaignTopic(item); }}>
                          <Target className="h-4 w-4 mr-2" />
                          {item.campaignId ? 'Đổi chiến dịch' : 'Liên kết chiến dịch'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className="text-[10px]">
                      {item.category}
                    </Badge>
                    {item.pillar && (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.pillar}
                      </Badge>
                    )}
                    {item.campaignId && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                        <Target className="h-2.5 w-2.5 mr-1" />
                        {getCampaignName(item.campaignId) || 'Chiến dịch'}
                      </Badge>
                    )}
                    {item.isFavorite && (
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    )}
                  </div>

                  {item.scores && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Điểm: {Math.round((item.scores.brandFit + item.scores.trend + item.scores.competition + item.scores.engagement) / 4)}</span>
                      {item.performanceScore && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600">Hiệu suất: {item.performanceScore}</span>
                        </>
                      )}
                    </div>
                  )}

                  {item.usedAt && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Đã dùng: {new Date(item.usedAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !searchQuery && categoryFilter === 'all' && dateRange === 'all' && filterView === 'all' && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMore()}
            disabled={isLoadingMore}
            className="w-full max-w-xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang tải...
              </>
            ) : (
              'Tải thêm ý tưởng'
            )}
          </Button>
        </div>
      )}

      {/* Results count */}
      {filteredItems.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Hiển thị {filteredItems.length} ý tưởng
        </p>
      )}
      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa topic này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Topic sẽ bị xóa khỏi ngân hàng ý tưởng của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link to Campaign Dialog */}
      {linkCampaignTopic && (
        <LinkToCampaignDialog
          open={!!linkCampaignTopic}
          onOpenChange={(open) => !open && setLinkCampaignTopic(null)}
          topicId={linkCampaignTopic.id}
          topicTitle={linkCampaignTopic.topic}
          currentCampaignId={linkCampaignTopic.campaignId}
          onLink={handleLinkToCampaign}
        />
      )}
    </div>
  );
}
