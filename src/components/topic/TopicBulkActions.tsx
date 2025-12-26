import { useState } from 'react';
import { 
  X, BookmarkPlus, CalendarPlus, Trash2, CheckSquare, 
  Square, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import { toast } from 'sonner';

interface TopicBulkActionsProps {
  selectedTopics: EnhancedTopicSuggestion[];
  onSaveAll: (topics: EnhancedTopicSuggestion[]) => Promise<void>;
  onScheduleAll: (topics: EnhancedTopicSuggestion[]) => void;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  totalCount?: number;
  className?: string;
}

export function TopicBulkActions({
  selectedTopics,
  onSaveAll,
  onScheduleAll,
  onClearSelection,
  onSelectAll,
  totalCount = 0,
  className,
}: TopicBulkActionsProps) {
  const [isSaving, setIsSaving] = useState(false);

  if (selectedTopics.length === 0) return null;

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveAll(selectedTopics);
      toast.success(`Đã lưu ${selectedTopics.length} topics vào ngân hàng`);
      onClearSelection();
    } catch (error) {
      toast.error('Có lỗi khi lưu topics');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScheduleAll = () => {
    onScheduleAll(selectedTopics);
    toast.success(`Chuyển ${selectedTopics.length} topics đến Calendar`);
  };

  const allSelected = totalCount > 0 && selectedTopics.length === totalCount;

  return (
    <div 
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-background/95 backdrop-blur-sm border shadow-lg',
        'animate-slide-up',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {selectedTopics.length}
        </Badge>
        <span className="text-sm text-muted-foreground">đã chọn</span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Select all / Deselect all */}
      {onSelectAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={allSelected ? onClearSelection : onSelectAll}
          className="gap-1.5 text-xs"
        >
          {allSelected ? (
            <>
              <Square className="w-3.5 h-3.5" />
              Bỏ chọn tất cả
            </>
          ) : (
            <>
              <CheckSquare className="w-3.5 h-3.5" />
              Chọn tất cả ({totalCount})
            </>
          )}
        </Button>
      )}

      <div className="w-px h-6 bg-border" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="gap-1.5"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <BookmarkPlus className="w-3.5 h-3.5" />
          )}
          Lưu tất cả
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleScheduleAll}
          className="gap-1.5"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Lên lịch
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Clear */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
