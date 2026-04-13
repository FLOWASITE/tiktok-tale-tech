import { useState, useMemo } from 'react';
import { 
  MessageSquare, Plus, Trash2, Archive, Clock, 
  Search, MoreHorizontal, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
import { cn } from '@/lib/utils';
import { ChatConversation } from '@/hooks/useChatConversations';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ConversationHistorySidebarProps {
  conversations: ChatConversation[];
  currentConversationId?: string;
  isLoading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onClose?: () => void;
  className?: string;
}

interface ConversationGroup {
  label: string;
  conversations: ChatConversation[];
}

function groupConversationsByDate(conversations: ChatConversation[]): ConversationGroup[] {
  const groups: Record<string, ChatConversation[]> = {
    'Hôm nay': [],
    'Hôm qua': [],
    'Tuần này': [],
    'Cũ hơn': [],
  };

  conversations.forEach(conv => {
    const date = new Date(conv.last_message_at || conv.created_at);
    if (isToday(date)) {
      groups['Hôm nay'].push(conv);
    } else if (isYesterday(date)) {
      groups['Hôm qua'].push(conv);
    } else if (isThisWeek(date)) {
      groups['Tuần này'].push(conv);
    } else {
      groups['Cũ hơn'].push(conv);
    }
  });

  return Object.entries(groups)
    .filter(([, convs]) => convs.length > 0)
    .map(([label, convs]) => ({ label, conversations: convs }));
}

export function ConversationHistorySidebar({
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onArchiveConversation,
  onClose,
  className,
}: ConversationHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv =>
      conv.title?.toLowerCase().includes(query) ||
      conv.summary?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: vi });
    } catch {
      return '';
    }
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const renderConversationItem = (conv: ChatConversation) => (
    <div
      key={conv.id}
      className={cn(
        "group relative rounded-lg transition-colors cursor-pointer",
        conv.id === currentConversationId
          ? "bg-primary/10 border border-primary/20 shadow-sm"
          : "hover:bg-muted/50"
      )}
    >
      <button
        className="w-full text-left p-2.5 pr-8"
        onClick={() => onSelectConversation(conv.id)}
      >
        <div className="flex items-start gap-2">
          <MessageSquare className={cn(
            "w-3.5 h-3.5 mt-0.5 shrink-0",
            conv.id === currentConversationId ? "text-primary" : "text-muted-foreground"
          )} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {conv.title || 'Cuộc hội thoại mới'}
            </div>
            {conv.summary && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {conv.summary}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatTime(conv.last_message_at || conv.created_at)}</span>
              <span>•</span>
              <span>{conv.message_count} tin nhắn</span>
            </div>
          </div>
        </div>
      </button>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onArchiveConversation(conv.id)}>
            <Archive className="w-3.5 h-3.5 mr-2" />
            Lưu trữ
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleDeleteClick(conv.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col h-full bg-card border-r",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Lịch sử chat</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNewConversation}
            title="Cuộc hội thoại mới"
          >
            <Plus className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Conversations List with Date Groups */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-2 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : groupedConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc hội thoại nào'}
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.conversations.map(renderConversationItem)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa cuộc hội thoại?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Tất cả tin nhắn trong cuộc hội thoại sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
