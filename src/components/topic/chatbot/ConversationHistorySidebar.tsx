import { useState, useMemo } from 'react';
import { 
  Trash2, Archive, Search, MoreHorizontal, X, 
  PanelLeftClose, SquarePen, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { isToday, isYesterday, isThisWeek } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationHistorySidebarProps {
  conversations: ChatConversation[];
  currentConversationId?: string;
  isLoading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onCollapse?: () => void;
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
  onCollapse,
  onClose,
  className,
}: ConversationHistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { user } = useAuth();

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

  const userName = user?.user_metadata?.full_name || user?.email || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const renderConversationItem = (conv: ChatConversation) => {
    const isActive = conv.id === currentConversationId;
    return (
      <div
        key={conv.id}
        className={cn(
          "group relative flex items-center rounded-lg transition-all duration-150 cursor-pointer",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50 text-foreground/80 hover:text-foreground"
        )}
      >
        <button
          className="flex-1 text-left py-2.5 pl-3 pr-8 min-w-0"
          onClick={() => onSelectConversation(conv.id)}
        >
          <span className="text-[13px] leading-5 truncate block font-normal">
            {conv.title || 'Cuộc hội thoại mới'}
          </span>
        </button>

        {/* Gradient fade for long titles */}
        <div className={cn(
          "absolute right-7 top-0 bottom-0 w-8 pointer-events-none transition-opacity",
          isActive
            ? "bg-gradient-to-l from-accent to-transparent"
            : "bg-gradient-to-l from-muted/30 to-transparent group-hover:from-accent/50"
        )} />

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md",
                "opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                "hover:bg-accent-foreground/10"
              )}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40" sideOffset={4}>
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
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={onCollapse || onClose}
            >
              <PanelLeftClose className="w-[18px] h-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Đóng sidebar</TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 gap-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent"
          onClick={onNewConversation}
        >
          <SquarePen className="w-4 h-4" />
          <span>Đoạn chat mới</span>
        </Button>
      </div>

      {/* Navigation items (ChatGPT-style) */}
      <div className="px-2 py-2 space-y-0.5">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span>Tìm kiếm đoạn chat</span>
        </button>
      </div>

      {/* Search (appears when typing) */}
      {searchQuery && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm bg-accent/50 border-0 focus-visible:ring-1 rounded-lg"
              autoFocus
            />
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Inline search trigger */}
      <div className="px-3 pb-1">
        <div 
          className="relative cursor-text"
          onClick={() => {
            const input = document.getElementById('sidebar-search-input');
            input?.focus();
          }}
        >
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="sidebar-search-input"
            placeholder="Tìm kiếm đoạn chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-[13px] bg-transparent border-0 text-muted-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:bg-accent/50 rounded-lg transition-colors"
          />
          {searchQuery && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearchQuery('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2.5">
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ))
          ) : groupedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc hội thoại nào'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Bắt đầu đoạn chat mới để bắt đầu
                </p>
              )}
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-px">
                  {group.conversations.map(renderConversationItem)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer: user profile */}
      <div className="border-t border-border/50 p-2">
        <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="h-8 w-8 ring-1 ring-border/50">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-[13px] font-medium truncate text-foreground">
              {userName}
            </div>
          </div>
        </button>
      </div>

      {/* Delete confirmation */}
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
