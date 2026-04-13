import { useState, useMemo } from 'react';
import { 
  Trash2, Archive, Search, MoreHorizontal, X, 
  PanelLeftClose, SquarePen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { getPlanBadge } from '@/lib/plan-badge';
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
  const { profile } = useAuth();

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

  const planBadge = getPlanBadge(profile?.plan_type);
  const userInitial = (profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase();

  const renderConversationItem = (conv: ChatConversation) => (
    <div
      key={conv.id}
      className={cn(
        "group relative rounded-lg transition-colors cursor-pointer",
        conv.id === currentConversationId
          ? "bg-primary/10"
          : "hover:bg-muted/50"
      )}
    >
      <button
        className="w-full text-left py-2 px-3 pr-8"
        onClick={() => onSelectConversation(conv.id)}
      >
        <span className="text-sm truncate block">
          {conv.title || 'Cuộc hội thoại mới'}
        </span>
      </button>

      {/* Actions dropdown - visible on hover */}
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
      "flex flex-col h-full",
      className
    )}>
      {/* Header: collapse + new chat */}
      <div className="flex items-center justify-between p-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onCollapse || onClose}
            >
              <PanelLeftClose className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Đóng sidebar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onNewConversation}
            >
              <SquarePen className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Đoạn chat mới</TooltipContent>
        </Tooltip>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm đoạn chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2">
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          ) : groupedConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchQuery ? 'Không tìm thấy kết quả' : 'Chưa có cuộc hội thoại nào'}
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {group.conversations.map(renderConversationItem)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer: user info + plan */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {profile?.full_name || profile?.email || 'User'}
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 shrink-0", planBadge.className)}>
            {planBadge.label}
          </Badge>
        </div>
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
