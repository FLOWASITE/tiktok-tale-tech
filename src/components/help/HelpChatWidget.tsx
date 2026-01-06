import { useState, useRef, useEffect, useCallback, useContext } from 'react';
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
import { HelpTypingIndicator } from './HelpTypingIndicator';
import { getTourById } from '@/data/coachmark-tours';

// Safe hook that returns null if not in provider
function useSafeCoachmark() {
  try {
    // Dynamic import to avoid hard dependency
    const { useCoachmark } = require('@/components/onboarding/CoachmarkContext');
    return useCoachmark();
  } catch {
    return null;
  }
}

export function HelpChatWidget() {
  const coachmark = useSafeCoachmark();
  
  const startTour = useCallback((tourId: string) => {
    const steps = getTourById(tourId);
    if (steps && steps.length > 0 && coachmark) {
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

  // Listen for open-help-chat event from header button
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-help-chat', handleOpenChat);
    return () => window.removeEventListener('open-help-chat', handleOpenChat);
  }, [setIsOpen]);

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
      {/* Premium FAB Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            {/* Outer glow ring */}
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary blur-xl"
            />
            
            {/* Glass border ring */}
            <div className="relative p-[2px] rounded-full bg-gradient-to-br from-primary/60 via-primary to-primary/60">
              <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative h-14 w-14 rounded-full",
                  "bg-gradient-to-br from-primary via-primary to-primary/80",
                  "shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.5)]",
                  "hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.6)]",
                  "transition-shadow duration-300",
                  "flex items-center justify-center",
                  "text-primary-foreground"
                )}
              >
                {/* Inner shine */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
                
                {/* Icon with float animation */}
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <MessageCircleQuestion className="h-6 w-6 relative z-10" />
                </motion.div>
                
                {/* Premium notification badge */}
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-br from-destructive to-destructive/80 border-2 border-background shadow-lg" />
                  </span>
                )}
              </motion.button>
            </div>
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

                    {/* Typing Indicator - show when streaming starts but no content yet */}
                    <AnimatePresence>
                      {isStreaming && messages[messages.length - 1]?.role === 'user' && (
                        <HelpTypingIndicator />
                      )}
                    </AnimatePresence>

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
