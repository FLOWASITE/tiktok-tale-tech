import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, Send, Loader2, MessageSquare, Video, Images,
  Sparkles, Package, Rocket, Gift, Lightbulb, RefreshCw,
  Heart, Users, TrendingUp, BookOpen, Crown, Target, Megaphone,
  AlertTriangle, HelpCircle, Camera, Vote, Flame, Zap,
  Microscope, FileBarChart, Star, Square
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';
import { QUICK_START_TEMPLATES } from '@/types/quickStartTemplates';
import { toast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedTopics?: ExtractedTopic[];
  isError?: boolean;
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
  className?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-topics`;

const WELCOME_MESSAGE = `Xin chào! 👋 Tôi là AI trợ lý gợi ý ý tưởng content.

Bạn muốn tạo content về chủ đề gì? Hãy cho tôi biết về:
- Sản phẩm/dịch vụ bạn muốn quảng bá
- Đối tượng khách hàng mục tiêu
- Hoặc bất kỳ ý tưởng nào bạn đang nghĩ đến

Tôi sẽ giúp bạn tìm những topic phù hợp nhất! ✨`;

// Icon mapping for quick actions - comprehensive list
const iconMap: Record<string, React.ElementType> = {
  Package, Rocket, Gift, Lightbulb, Heart, Users, 
  TrendingUp, BookOpen, Crown, Target, Megaphone, Sparkles,
  AlertTriangle, HelpCircle, Camera, Vote, Flame, Zap,
  Microscope, FileBarChart, Star
};

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

// Quick action chips based on content goal
const getQuickActions = (contentGoal?: ContentGoal) => {
  const templates = QUICK_START_TEMPLATES[contentGoal || 'engagement'] || [];
  return templates.slice(0, 3).map(t => ({
    label: t.label,
    icon: t.icon,
    prompt: `Tôi muốn tạo content với mục đích "${t.label}". ${t.description || ''}`,
  }));
};

// Storage key for localStorage
const getStorageKey = (brandTemplateId?: string) => 
  `topic-chat-${brandTemplateId || 'default'}`;

export function TopicAIChatbot({
  brandTemplateId,
  contentGoal,
  onNavigate,
  className,
}: TopicAIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

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
  }, [messages, isLoading, brandTemplateId, contentGoal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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

  const quickActions = getQuickActions(contentGoal);

  return (
    <Card className={cn(
      'flex flex-col overflow-hidden border-2 border-primary/20',
      'h-[60vh] min-h-[400px] max-h-[700px]',
      className
    )}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3 border-b bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary via-violet-600 to-primary shadow-lg shadow-primary/25">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                AI Gợi Ý Ý Tưởng
                <Badge variant="secondary" className="text-xs">Smart Chat</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">
                Chat với AI để tìm topic phù hợp
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Bắt đầu lại</span>
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className={cn(
                'max-w-[85%] sm:max-w-[80%] space-y-3',
                message.role === 'user' && 'order-first'
              )}>
                <div className={cn(
                  'px-4 py-3 rounded-2xl',
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : 'bg-muted rounded-bl-md'
                )}>
                  {message.content ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    isLoading && message.role === 'assistant' && <TypingIndicator />
                  )}
                </div>

                {/* Extracted Topics with Action Buttons */}
                {message.extractedTopics && message.extractedTopics.length > 0 && (
                  <div className="space-y-2 pl-2">
                    {message.extractedTopics.map((topic, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20 space-y-2"
                      >
                        <p className="font-medium text-sm">{topic.topic}</p>
                        {topic.reason && (
                          <p className="text-xs text-muted-foreground">{topic.reason}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1 hover:bg-primary hover:text-primary-foreground"
                            onClick={() => handleTopicAction(topic, 'multichannel')}
                          >
                            <MessageSquare className="w-3 h-3" />
                            Multi-channel
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1 hover:bg-violet-600 hover:text-white"
                            onClick={() => handleTopicAction(topic, 'script')}
                          >
                            <Video className="w-3 h-3" />
                            Script
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs gap-1 hover:bg-orange-500 hover:text-white"
                            onClick={() => handleTopicAction(topic, 'carousel')}
                          >
                            <Images className="w-3 h-3" />
                            Carousel
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    👤
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 2 && quickActions.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Gợi ý nhanh:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => {
              const IconComponent = iconMap[action.icon] || Sparkles;
              return (
                <Button
                  key={index}
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs h-8"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 sm:p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button 
              type="button" 
              size="icon"
              variant="destructive"
              className="shrink-0 h-11 w-11"
              onClick={handleCancel}
              title="Dừng"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button 
              type="submit" 
              size="icon"
              className="shrink-0 h-11 w-11"
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
