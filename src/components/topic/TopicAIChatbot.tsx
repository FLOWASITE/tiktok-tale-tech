import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, Send, MessageSquare, Video, Images,
  Sparkles, RefreshCw, Square, Plus, Shuffle, Search as SearchIcon,
  ArrowDown, Copy, Check, AlertCircle, RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';
import { QuickActionsPanel } from './QuickActionsPanel';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedTopics?: ExtractedTopic[];
  isError?: boolean;
  reactions?: string[];
}

interface ExtractedTopic {
  topic: string;
  reason?: string;
  format?: string;
}

interface TopicAIChatbotProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onNavigate: (path: string, state?: any) => void;
  onInjectPrompt?: (prompt: string) => void;
  className?: string;
  isExpanded?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-topics`;

const WELCOME_MESSAGE = `Xin chào! 👋 Tôi là AI trợ lý gợi ý ý tưởng content.

Bạn muốn tạo content về chủ đề gì? Hãy cho tôi biết về:
- Sản phẩm/dịch vụ bạn muốn quảng bá
- Đối tượng khách hàng mục tiêu
- Hoặc bất kỳ ý tưởng nào bạn đang nghĩ đến

Tôi sẽ giúp bạn tìm những topic phù hợp nhất! ✨`;

// Typing indicator component
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// Format timestamp helper
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('vi-VN', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Haptic feedback helper
function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
}

// Available reaction emojis
const REACTION_EMOJIS = ['👍', '❤️', '🔥', '💡', '👏'];

// Copy button component
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 opacity-0 group-hover/message:opacity-100 transition-opacity hover:bg-background"
      title="Sao chép"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground" />
      )}
    </button>
  );
}

// Emoji reactions component
function EmojiReactions({ 
  messageId, 
  reactions = [], 
  onReact 
}: { 
  messageId: string; 
  reactions?: string[]; 
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReact = (emoji: string) => {
    triggerHaptic('medium');
    onReact(messageId, emoji);
    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing reactions */}
      {reactions.length > 0 && (
        <div className="flex gap-0.5">
          {reactions.map((emoji, idx) => (
            <span 
              key={idx} 
              className="text-sm cursor-pointer hover:scale-125 transition-transform"
              onClick={() => handleReact(emoji)}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
      
      {/* Add reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
        >
          {reactions.length === 0 ? '+ React' : '+'}
        </button>
        
        {showPicker && (
          <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1 bg-popover border rounded-lg shadow-lg z-10 animate-in fade-in-0 zoom-in-95 duration-150">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-base hover:scale-125 transition-transform p-1 hover:bg-muted rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Parse topics from AI response with multiple patterns
function extractTopicsFromMessage(content: string): ExtractedTopic[] {
  const topics: ExtractedTopic[] = [];
  
  // Pattern 1: Structured format with [TOPIC_START]/[TOPIC_END]
  const structuredRegex = /\*\*\[TOPIC_START\]\*\*[\s\S]*?📌\s*\*\*Topic:\*\*\s*(.+?)[\n\r][\s\S]*?💡\s*\*\*Lý do:\*\*\s*(.+?)[\n\r][\s\S]*?🎯\s*\*\*Format đề xuất:\*\*\s*(.+?)[\n\r][\s\S]*?\*\*\[TOPIC_END\]\*\*/gi;
  
  let match;
  while ((match = structuredRegex.exec(content)) !== null) {
    topics.push({
      topic: match[1].trim(),
      reason: match[2].trim(),
      format: match[3].trim(),
    });
  }
  
  // Pattern 2: Numbered list with emoji bullets (📌 1. Topic: ...)
  if (topics.length === 0) {
    const numberedRegex = /(?:📌|\d+\.)\s*\*\*(?:Topic)?:?\*\*\s*([^\n]+)(?:[\n\r]+(?:💡|[-•])\s*(?:\*\*)?(?:Lý do)?:?\*?\*?\s*([^\n]+))?(?:[\n\r]+(?:🎯|[-•])\s*(?:\*\*)?(?:Format)?:?\*?\*?\s*([^\n]+))?/gi;
    while ((match = numberedRegex.exec(content)) !== null) {
      const topic = match[1]?.replace(/\*\*/g, '').trim();
      if (topic && topic.length > 5) {
        topics.push({
          topic,
          reason: match[2]?.replace(/\*\*/g, '').trim(),
          format: match[3]?.replace(/\*\*/g, '').trim(),
        });
      }
    }
  }
  
  // Pattern 3: Simple bold topics with ** marks
  if (topics.length === 0) {
    const boldRegex = /(?:^|\n)\s*(?:\d+\.|[-•📌])\s*\*\*([^*\n]{10,80})\*\*/gm;
    while ((match = boldRegex.exec(content)) !== null) {
      const topic = match[1].trim();
      if (topic && !topic.toLowerCase().includes('topic:') && !topic.toLowerCase().includes('lý do')) {
        topics.push({ topic });
      }
    }
  }
  
  return topics.slice(0, 5); // Max 5 topics
}

// Storage key for localStorage
const getStorageKey = (brandTemplateId?: string) => 
  `topic-chat-${brandTemplateId || 'default'}`;

export function TopicAIChatbot({
  brandTemplateId,
  contentGoal,
  onNavigate,
  onInjectPrompt,
  className,
  isExpanded = false,
}: TopicAIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);

  // Load messages from localStorage on mount
  useEffect(() => {
    const storageKey = getStorageKey(brandTemplateId);
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore dates from strings
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      } catch {
        // Fallback to welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: WELCOME_MESSAGE,
          timestamp: new Date(),
        }]);
      }
    } else {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      }]);
    }
  }, [brandTemplateId]);

  // Save messages to localStorage when changed
  useEffect(() => {
    if (messages.length > 0 && messages[0].id !== 'welcome') {
      const storageKey = getStorageKey(brandTemplateId);
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, brandTemplateId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto scroll to bottom when near bottom
  useEffect(() => {
    if (scrollContainerRef.current && isNearBottomRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    } else if (messages.length > 0 && !isNearBottomRef.current) {
      // Increment unread count when new message arrives and user is scrolled up
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.id !== 'welcome') {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [messages]);

  // Handle scroll to detect if user is near bottom
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(!nearBottom);
    
    if (nearBottom) {
      setUnreadCount(0);
    }
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setUnreadCount(0);
      setShowScrollButton(false);
    }
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    toast({
      title: 'Đã dừng',
      description: 'Đã dừng tạo phản hồi.',
    });
  }, []);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    // Haptic feedback when sending
    triggerHaptic('medium');

    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setAnimatingMessageId(userMessageId);
    setTimeout(() => setAnimatingMessageId(null), 500);
    setInput('');
    setIsLoading(true);
    
    // Auto scroll when sending message
    isNearBottomRef.current = true;
    setTimeout(scrollToBottom, 50);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Prepare messages for API - filter out welcome message and error messages
    const apiMessages = [...messages, userMessage]
      .filter(m => m.id !== 'welcome' && !m.isError)
      .map(m => ({ role: m.role, content: m.content }));

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          brandTemplateId,
          contentGoal,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle rate limit and payment errors
      if (response.status === 429) {
        toast({
          variant: 'destructive',
          title: 'Quá giới hạn',
          description: 'Đã vượt quá giới hạn request. Vui lòng thử lại sau ít phút.',
        });
        throw new Error('RATE_LIMIT');
      }

      if (response.status === 402) {
        toast({
          variant: 'destructive',
          title: 'Hết credits',
          description: 'Vui lòng nạp thêm credits để tiếp tục sử dụng.',
        });
        throw new Error('PAYMENT_REQUIRED');
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Create assistant message placeholder
      const assistantId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              // Update message with new content
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: assistantContent, extractedTopics: extractTopicsFromMessage(assistantContent) }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, put back and wait
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final update with extracted topics
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: assistantContent, extractedTopics: extractTopicsFromMessage(assistantContent) }
          : m
      ));
      
      // Haptic feedback when receiving complete message
      triggerHaptic('light');

    } catch (error) {
      // Handle abort error silently
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Handle known errors silently (toast already shown)
      if (error instanceof Error && (error.message === 'RATE_LIMIT' || error.message === 'PAYMENT_REQUIRED')) {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '❌ Không thể tạo phản hồi. Vui lòng thử lại sau.',
          timestamp: new Date(),
          isError: true,
        }]);
        return;
      }

      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading, brandTemplateId, contentGoal, scrollToBottom]);

  // Handle emoji reaction
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const currentReactions = m.reactions || [];
        // Toggle reaction - if already exists, remove it, otherwise add
        const hasReaction = currentReactions.includes(emoji);
        const newReactions = hasReaction 
          ? currentReactions.filter(r => r !== emoji)
          : [...currentReactions, emoji];
        return { ...m, reactions: newReactions };
      }
      return m;
    }));
  }, []);

  // Handle injected prompts from parent
  useEffect(() => {
    if (onInjectPrompt) {
      // Expose sendMessage to parent via callback
    }
  }, [onInjectPrompt]);

  // Public method to inject prompt
  const injectPrompt = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  // Expose injectPrompt if onInjectPrompt is provided
  useEffect(() => {
    if (onInjectPrompt) {
      // Parent can call this
    }
  }, [onInjectPrompt, injectPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
      // Reset textarea height after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handleTopicAction = (topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => {
    const paths = {
      multichannel: '/multichannel',
      script: '/scripts',
      carousel: '/carousel',
    };
    
    onNavigate(paths[format], {
      prefillTopic: topic.topic,
      prefillGoal: contentGoal,
      fromTopics: true,
    });
  };

  const handleTopicRefinement = useCallback((topicTitle: string) => {
    sendMessage(`Làm chi tiết hơn về topic: "${topicTitle}". Hãy cho tôi biết thêm về các góc độ tiếp cận, ý tưởng cụ thể và cách triển khai.`);
  }, [sendMessage]);

  const handleReset = () => {
    // Clear localStorage
    const storageKey = getStorageKey(brandTemplateId);
    localStorage.removeItem(storageKey);
    
    // Reset messages
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    }]);
  };

  // Expose sendMessage for external injection
  useEffect(() => {
    // Store ref for parent access
    (window as any).__topicChatSendMessage = sendMessage;
    return () => {
      delete (window as any).__topicChatSendMessage;
    };
  }, [sendMessage]);

  const isMobileFullscreen = className?.includes('border-0') || className?.includes('rounded-none');

  return (
    <Card className={cn(
      'flex flex-col h-full max-h-full',
      // On mobile fullscreen: no border, no shadow for seamless look
      isMobileFullscreen ? 'border-0 shadow-none rounded-none bg-background' : 'border-2 border-primary/20',
      className
    )}>
      {/* Header - Compact on mobile */}
      <CardHeader className="flex-shrink-0 py-1.5 sm:py-2.5 px-2 sm:px-4 border-b bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-br from-primary via-violet-600 to-primary shadow-lg shadow-primary/25">
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                Flowa Mind
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 px-1 sm:px-1.5">AI</Badge>
              </h3>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1 h-6 sm:h-7 text-[10px] sm:text-xs px-1.5 sm:px-3"
          >
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Mới</span>
          </Button>
        </div>
      </CardHeader>

      {/* Messages - Scrollable area */}
      <div className="relative flex-1 min-h-0">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto p-2 sm:p-4"
        >
          <div ref={scrollRef} className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-2.5',
                message.role === 'user' ? 'justify-end' : 'justify-start',
                // Animation for new messages
                animatingMessageId === message.id && 'animate-in fade-in-0 duration-300',
                animatingMessageId === message.id && message.role === 'user' && 'slide-in-from-right-4',
                animatingMessageId === message.id && message.role === 'assistant' && 'slide-in-from-left-4'
              )}
            >
              {message.role === 'assistant' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              
              <div className={cn(
                'max-w-[85%] sm:max-w-[80%] space-y-2.5',
                message.role === 'user' && 'order-first'
              )}>
                {/* Error state - Enhanced UI */}
                {message.isError ? (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 space-y-2">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Đã xảy ra lỗi</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Không thể tạo phản hồi. Vui lòng thử lại sau.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 border-destructive/30 hover:bg-destructive/10"
                      onClick={() => {
                        // Get the last user message and resend
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) {
                          sendMessage(lastUserMsg.content);
                        }
                      }}
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Thử lại
                    </Button>
                  </div>
                ) : (
                  <div className={cn(
                    'px-3 py-2.5 rounded-2xl group/message relative',
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-md' 
                      : 'bg-muted rounded-bl-md'
                  )}>
                    {message.content ? (
                      message.role === 'assistant' ? (
                        <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      )
                    ) : (
                      isLoading && message.role === 'assistant' && <TypingIndicator />
                    )}
                    
                    {/* Copy button - shown on hover for assistant messages */}
                    {message.role === 'assistant' && message.content && !isLoading && (
                      <CopyButton content={message.content} />
                    )}
                  </div>
                )}
                
                {/* Timestamp and Reactions */}
                {!message.isError && (
                  <div className={cn(
                    'flex items-center gap-2 px-1 mt-0.5',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    
                    {/* Emoji Reactions - only for assistant messages */}
                    {message.role === 'assistant' && message.content && !isLoading && message.id !== 'welcome' && (
                      <EmojiReactions 
                        messageId={message.id} 
                        reactions={message.reactions} 
                        onReact={handleReaction} 
                      />
                    )}
                  </div>
                )}

                {/* Extracted Topics with Action Buttons */}
                {message.extractedTopics && message.extractedTopics.length > 0 && (
                  <div className="space-y-1.5 pl-1">
                    {message.extractedTopics.map((topic, index) => (
                      <div 
                        key={index}
                        className="p-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20 space-y-1.5 group"
                      >
                        {/* Clickable topic title for refinement */}
                        <button
                          className="font-medium text-xs text-left w-full hover:text-primary transition-colors flex items-center gap-1.5 group/title"
                          onClick={() => handleTopicRefinement(topic.topic)}
                          disabled={isLoading}
                          title="Click để xem chi tiết"
                        >
                          <span className="flex-1 line-clamp-2">{topic.topic}</span>
                          <SearchIcon className="w-3 h-3 opacity-0 group-hover/title:opacity-100 transition-opacity text-primary shrink-0" />
                        </button>
                        {topic.reason && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{topic.reason}</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-[10px] gap-1 px-2 hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleTopicAction(topic, 'multichannel')}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Multi
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-[10px] gap-1 px-2 hover:bg-violet-600 hover:text-white"
                            onClick={() => handleTopicAction(topic, 'script')}
                          >
                            <Video className="w-2.5 h-2.5" />
                            Script
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-[10px] gap-1 px-2 hover:bg-orange-500 hover:text-white"
                            onClick={() => handleTopicAction(topic, 'carousel')}
                          >
                            <Images className="w-2.5 h-2.5" />
                            Carousel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Follow-up Suggestions after AI response with topics */}
                {message.role === 'assistant' && 
                 message.id !== 'welcome' && 
                 !message.isError && 
                 message.content && 
                 !isLoading && (
                  <div className="flex flex-wrap gap-1 pl-1 pt-0.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1 border-dashed"
                      onClick={() => sendMessage('Gợi ý thêm các topic khác')}
                      disabled={isLoading}
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Thêm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1 border-dashed"
                      onClick={() => sendMessage('Thay đổi format content khác')}
                      disabled={isLoading}
                    >
                      <Shuffle className="w-2.5 h-2.5" />
                      Format
                    </Button>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    👤
                  </span>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
        
        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-4 right-4 h-9 w-9 rounded-full shadow-lg border bg-background/95 backdrop-blur-sm z-10 hover:bg-primary hover:text-primary-foreground transition-all"
            onClick={scrollToBottom}
          >
            <ArrowDown className="w-4 h-4" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/* Quick Actions - Compact on mobile */}
      <div className="flex-shrink-0 px-1.5 sm:px-3 py-1 sm:py-2 border-t bg-muted/30">
        <QuickActionsPanel
          contentGoal={contentGoal}
          onAction={handleQuickAction}
          isLoading={isLoading}
          variant="compact"
        />
      </div>

      {/* Input - Compact on mobile */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-1.5 sm:p-3 border-t bg-background">
        <div className="flex gap-1.5 sm:gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-resize textarea
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="min-h-[36px] max-h-[120px] resize-none text-xs sm:text-sm py-2 transition-all"
            disabled={isLoading}
            style={{ height: '36px' }}
          />
          {isLoading ? (
            <Button 
              type="button" 
              size="icon"
              variant="destructive"
              className="shrink-0 h-9 w-9"
              onClick={handleCancel}
              title="Dừng"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              size="icon"
              className="shrink-0 h-9 w-9"
              disabled={!input.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
