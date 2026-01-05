import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, X, Minimize2, Send, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useHelpChat } from '@/hooks/useHelpChat';
import { HelpMessageBubble } from './HelpMessageBubble';
import { HelpQuickActions } from './HelpQuickActions';
import { HelpSuggestions } from './HelpSuggestions';
import { getTourById } from '@/data/coachmark-tours';
import { useCoachmark } from '@/components/onboarding/CoachmarkContext';

export function HelpChatWidget() {
  const coachmark = useCoachmark();
  
  const startTour = useCallback((tourId: string) => {
    const steps = getTourById(tourId);
    if (steps && steps.length > 0) {
      coachmark.start();
    }
  }, [coachmark]);

  const {
    messages,
    isOpen,
    setIsOpen,
    isStreaming,
    sendMessage,
    handleAction,
    clearMessages,
    currentRoute
  } = useHelpChat(startTour);

  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Clear unread when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
    }
  }, [isOpen]);

  // Set unread when new message arrives and widget is closed
  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.id !== 'welcome') {
        setHasUnread(true);
      }
    }
  }, [messages, isOpen]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  const handleQuickAction = (question: string) => {
    sendMessage(question);
  };

  // Get suggestions from the last assistant message
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const suggestions = lastAssistantMessage?.suggestions || [];

  // Only show welcome message
  const showQuickActions = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <>
      {/* FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground relative"
            >
              <MessageCircleQuestion className="h-6 w-6" />
              {hasUnread && (
                <span className="absolute top-0 right-0 h-3 w-3 bg-destructive rounded-full animate-pulse" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : 500
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]",
              "bg-card border border-border rounded-2xl shadow-2xl overflow-hidden",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Trợ lý Hướng dẫn</h3>
                  <p className="text-xs text-muted-foreground">Hỏi bất cứ điều gì về hệ thống</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearMessages}
                  title="Xoá lịch sử"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <HelpMessageBubble
                        key={message.id}
                        message={message}
                        onAction={handleAction}
                        isStreaming={isStreaming && message.id === messages[messages.length - 1]?.id && message.role === 'assistant'}
                      />
                    ))}

                    {/* Quick Actions */}
                    {showQuickActions && (
                      <HelpQuickActions
                        currentRoute={currentRoute}
                        onSelect={handleQuickAction}
                      />
                    )}
                  </div>
                </ScrollArea>

                {/* Suggestions */}
                {suggestions.length > 0 && !isStreaming && (
                  <HelpSuggestions 
                    suggestions={suggestions} 
                    onSelect={handleQuickAction} 
                  />
                )}

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Nhập câu hỏi của bạn..."
                      disabled={isStreaming}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      size="icon"
                      disabled={isStreaming || !input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
