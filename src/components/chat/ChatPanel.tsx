import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ChatMessageItem } from './ChatMessage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MessageCircle, Send, X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';

function DateDivider({ date }: { date: Date }) {
  let label = format(date, 'EEEE, dd MMMM yyyy', { locale: vi });
  if (isToday(date)) label = 'Hôm nay';
  else if (isYesterday(date)) label = 'Hôm qua';

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function ChatPanel() {
  const { currentOrganization } = useOrganizationContext();
  const { messages, loading, sending, sendMessage, editMessage, deleteMessage } = useChat();
  const { isOnline, onlineCount } = usePresence(currentOrganization?.id);
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const success = await sendMessage(inputValue, replyTo?.id);
    if (success) {
      setInputValue('');
      setReplyTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: ChatMessage[] }[] = [];
    let currentDate: string | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toDateString();
      if (msgDate !== currentDate) {
        groups.push({ date: new Date(msg.created_at), messages: [msg] });
        currentDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  }, [messages]);

  // Find reply-to message
  const replyToMessageMap = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    messages.forEach((msg) => map.set(msg.id, msg));
    return map;
  }, [messages]);

  if (!currentOrganization) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground z-50"
        >
          <MessageCircle className="h-6 w-6" />
          {onlineCount > 1 && (
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-emerald-500 text-white border-2 border-background"
            >
              {onlineCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat nhóm
            </SheetTitle>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {onlineCount}
                  </span>
                )}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentOrganization.name}
          </p>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="py-2">
            {loading ? (
              <div className="space-y-4 px-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-48 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Chưa có tin nhắn nào</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bắt đầu cuộc trò chuyện với nhóm của bạn
                </p>
              </div>
            ) : (
              groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <DateDivider date={group.date} />
                  {group.messages.map((msg) => (
                    <ChatMessageItem
                      key={msg.id}
                      message={msg}
                      isOnline={isOnline(msg.sender_id)}
                      onEdit={editMessage}
                      onDelete={deleteMessage}
                      onReply={setReplyTo}
                      replyToMessage={msg.reply_to_id ? replyToMessageMap.get(msg.reply_to_id) : null}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-4 py-2 bg-muted/50 border-t flex items-center justify-between">
            <div className="text-xs truncate">
              <span className="text-muted-foreground">Trả lời </span>
              <span className="font-medium">
                {replyTo.sender_profile?.full_name || 'Unknown'}
              </span>
              <span className="text-muted-foreground">: {replyTo.content.slice(0, 30)}...</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setReplyTo(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !inputValue.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
