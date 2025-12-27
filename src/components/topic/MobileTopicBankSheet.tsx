import { useState, useMemo } from 'react';
import { 
  Search, Star, TrendingUp, History, X, 
  Play, Trash2, MoreHorizontal, FileEdit, BookmarkCheck, ChevronLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { useTopicHistory, TopicHistoryItem, FeedbackType } from '@/hooks/useTopicHistory';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface MobileTopicBankSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string, topicHistoryId?: string) => void;
}

type FilterView = 'all' | 'drafts' | 'favorites' | 'top-performers' | 'recent';

export function MobileTopicBankSheet({
  open,
  onOpenChange,
  brandTemplateId,
  contentGoal,
  onSelectTopic,
}: MobileTopicBankSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    history,
    drafts,
    favorites,
    topPerformers,
    recentlyUsed,
    stats,
    isLoading,
    toggleFavorite,
    deleteTopic,
    confirmDraft,
  } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    enabled: open,
  });

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.topic.toLowerCase().includes(query) ||
        item.pillar?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [filterView, drafts, favorites, topPerformers, recentlyUsed, history, searchQuery]);

  const handleReuse = (item: TopicHistoryItem) => {
    onSelectTopic(item.topic, item.id);
    onOpenChange(false);
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

  const filterButtons: { value: FilterView; label: string; count: number; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Đã lưu', count: stats.totalTopics, icon: <History className="h-3.5 w-3.5" /> },
    { value: 'drafts', label: 'Nháp', count: drafts.length, icon: <FileEdit className="h-3.5 w-3.5" /> },
    { value: 'favorites', label: 'Yêu thích', count: favorites.length, icon: <Star className="h-3.5 w-3.5" /> },
    { value: 'top-performers', label: 'Hiệu suất', count: topPerformers.length, icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { value: 'recent', label: 'Đã dùng', count: recentlyUsed.length, icon: <Play className="h-3.5 w-3.5" /> },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
          {/* Header */}
          <SheetHeader className="sticky top-0 z-10 bg-background border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="text-base font-semibold">Kho Ý Tưởng</SheetTitle>
              <Badge variant="secondary" className="ml-auto text-xs">
                {stats.totalTopics} topics
              </Badge>
            </div>
          </SheetHeader>

          {/* Search - Sticky */}
          <div className="sticky top-[52px] z-10 bg-background border-b px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
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
          </div>

          {/* Filter Chips - Horizontal Scroll */}
          <div className="sticky top-[104px] z-10 bg-background border-b">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 px-4 py-2">
                {filterButtons.map((btn) => (
                  <Button
                    key={btn.value}
                    variant={filterView === btn.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterView(btn.value)}
                    className={cn(
                      'shrink-0 h-8 text-xs gap-1.5',
                      filterView !== btn.value && btn.value === 'drafts' && 'border-dashed'
                    )}
                  >
                    {btn.icon}
                    {btn.label}
                    <Badge 
                      variant={filterView === btn.value ? 'secondary' : 'outline'} 
                      className="h-4 px-1 text-[10px] ml-0.5"
                    >
                      {btn.count}
                    </Badge>
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Stats Summary - Compact */}
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{stats.totalTopics}</p>
                <p className="text-[10px] text-muted-foreground">Tổng</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{stats.suggestionToUsageRate}%</p>
                <p className="text-[10px] text-muted-foreground">Sử dụng</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{stats.averagePerformance || '-'}</p>
                <p className="text-[10px] text-muted-foreground">Điểm TB</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">{stats.favoriteCount}</p>
                <p className="text-[10px] text-muted-foreground">Yêu thích</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3 pb-safe">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <History className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'Không tìm thấy topic' : 'Chưa có topic nào'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredItems.map((item) => {
                  const isDraft = item.usageStatus === 'draft';
                  return (
                    <Card 
                      key={item.id}
                      className={cn(
                        'relative overflow-hidden transition-all active:scale-[0.98]',
                        isDraft ? 'border-dashed opacity-80' : '',
                        item.isFavorite && 'ring-1 ring-amber-500/30'
                      )}
                      onClick={() => handleReuse(item)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <div className="flex-1 min-w-0">
                            {isDraft && (
                              <Badge variant="outline" className="text-[9px] mb-1 border-dashed h-4 px-1">
                                Nháp
                              </Badge>
                            )}
                            <h4 className={cn(
                              'font-medium text-xs line-clamp-2 leading-tight',
                              isDraft && 'text-muted-foreground'
                            )}>
                              {item.topic}
                            </h4>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 shrink-0 -mr-1 -mt-1" 
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
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

                        <div className="flex items-center gap-1 flex-wrap">
                          {item.pillar && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1">
                              {item.pillar}
                            </Badge>
                          )}
                          {item.isFavorite && (
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          )}
                          {item.performanceScore && (
                            <span className="text-[10px] text-emerald-600 ml-auto">
                              {item.performanceScore}★
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa topic này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
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
    </>
  );
}
