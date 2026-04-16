import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Star, 
  TrendingUp, 
  Filter,
  BarChart3,
  History,
  X,
  Loader2
} from 'lucide-react';
import { TopicHistoryCard } from './TopicHistoryCard';
import { useTopicHistory, TopicHistoryItem, FeedbackType } from '@/hooks/useTopicHistory';
import { TopicCategory, TOPIC_CATEGORIES } from '@/types/topicDiscovery';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
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

interface TopicHistoryTabProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string, topicHistoryId?: string) => void;
}

type FilterView = 'all' | 'favorites' | 'top-performers' | 'recent';

export function TopicHistoryTab({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: TopicHistoryTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | 'all'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    history,
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
    loadMore,
  } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    enabled: true,
  });

  // Filtered items based on view and search
  const filteredItems = useMemo(() => {
    let items: TopicHistoryItem[] = [];

    switch (filterView) {
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
        items = history;
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.topic.toLowerCase().includes(query) ||
        item.pillar?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [filterView, favorites, topPerformers, recentlyUsed, history, categoryFilter, searchQuery]);

  const handleReuse = (item: TopicHistoryItem) => {
    onSelectTopic(item.topic, item.id);
  };

  const handleFeedback = (id: string, feedback: FeedbackType) => {
    submitFeedback(id, feedback);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      deleteTopic(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalTopics}</p>
          <p className="text-xs text-muted-foreground">Tổng topics</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.suggestionToUsageRate}%</p>
          <p className="text-xs text-muted-foreground">Tỷ lệ sử dụng</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.averagePerformance || '-'}</p>
          <p className="text-xs text-muted-foreground">Điểm TB</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.favoriteCount}</p>
          <p className="text-xs text-muted-foreground">Yêu thích</p>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterView === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterView('all')}
        >
          <History className="h-4 w-4 mr-1" />
          Tất cả
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
          <BarChart3 className="h-4 w-4 mr-1" />
          Đã sử dụng ({recentlyUsed.length})
        </Button>
      </div>

      {/* Search and category filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm topic..."
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
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {searchQuery ? 'Không tìm thấy topic phù hợp' : 'Chưa có lịch sử topic'}
          </p>
          {!searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">
              Chọn topic từ gợi ý để bắt đầu theo dõi
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
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
          {hasMore && filterView === 'all' && !searchQuery && categoryFilter === 'all' && (
            <div className="flex justify-center pt-2 pb-1">
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
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa topic này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Topic sẽ bị xóa khỏi lịch sử của bạn.
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
    </div>
  );
}
