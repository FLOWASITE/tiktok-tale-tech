import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Bot, Send, MessageSquare, Video, Images,
  Sparkles, RefreshCw, Square, Plus, Shuffle, Search as SearchIcon,
  ArrowDown, Copy, Check, AlertCircle, RotateCcw, Volume2, VolumeX,
  X, Loader2, HelpCircle, Eye, EyeOff, Keyboard, Mic, MicOff, User,
  PanelRightOpen, PanelRightClose
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './chatbot/CodeBlock';
import { MessageFeedback } from './chatbot/MessageFeedback';
import { ArtifactsPanel, type ArtifactTopic } from './chatbot/ArtifactsPanel';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ContentGoal } from '@/types/multichannel';
import { toast } from '@/hooks/use-toast';
import { QuickActionsPanel } from './QuickActionsPanel';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useProfile } from '@/hooks/useProfile';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Character limit
const MAX_CHARS = 500;

// Pull-to-refresh threshold
const PULL_THRESHOLD = 80;

// Onboarding storage key
const getOnboardingKey = () => 'topic-chat-onboarding-seen';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedTopics?: ExtractedTopic[];
  isError?: boolean;
  reactions?: string[];
  feedback?: 'up' | 'down';
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

// Skeleton loading component - simulates text about to appear
function MessageSkeleton() {
  return (
    <div className="space-y-2 py-1 animate-pulse">
      <Skeleton className="h-3 w-[85%] bg-primary/10" />
      <Skeleton className="h-3 w-[70%] bg-primary/10" />
      <Skeleton className="h-3 w-[60%] bg-primary/10" />
      <div className="flex items-center gap-1 pt-1">
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
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

// Storage key for artifacts
const getArtifactsStorageKey = (brandTemplateId?: string) => 
  `topic-artifacts-${brandTemplateId || 'default'}`;

export function TopicAIChatbot({
  brandTemplateId,
  contentGoal,
  onNavigate,
  onInjectPrompt,
  className,
  isExpanded = false,
}: TopicAIChatbotProps) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Markdown preview state
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  
  // Keyboard shortcuts hint
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  
  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastFinalIndexRef = useRef(0);
  
  // Dynamic width state - based on content
  const [dynamicWidth, setDynamicWidth] = useState<'compact' | 'normal' | 'wide' | 'full'>('normal');
  
  // Artifacts Panel state
  const [showArtifactsPanel, setShowArtifactsPanel] = useState(false);
  const [artifactTopics, setArtifactTopics] = useState<ArtifactTopic[]>([]);
  const [isSavingToBank, setIsSavingToBank] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isNearBottomRef = useRef(true);
  const documentVisibleRef = useRef(true);
  
  // Sound effects
  const { playSend, playReceive, playNotification } = useSoundEffects(soundEnabled);
  
  // User profile for avatar
  const { profile } = useProfile();
  
  // Check voice input support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Only process NEW results (from lastFinalIndex onwards)
        for (let i = lastFinalIndexRef.current; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            lastFinalIndexRef.current = i + 1; // Track what we've processed
          } else {
            interimTranscript = transcript;
          }
        }
        
        // Show interim text (placeholder - not committed yet)
        setInterimText(interimTranscript);
        
        // Only append final transcript ONCE
        if (finalTranscript) {
          setInput(prev => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return (prev + separator + finalTranscript.trim()).slice(0, MAX_CHARS);
          });
          // Clear interim text when we have final
          setInterimText('');
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setInterimText('');
        lastFinalIndexRef.current = 0;
        if (event.error === 'not-allowed') {
          toast({
            title: 'Không có quyền truy cập microphone',
            description: 'Vui lòng cho phép truy cập microphone trong cài đặt trình duyệt.',
            variant: 'destructive',
          });
        }
      };
      
      recognition.onend = () => {
        setIsRecording(false);
        setInterimText('');
        // Don't reset lastFinalIndexRef here - it will be reset on next start
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);
  
  // Toggle voice recording
  const toggleVoiceInput = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setInterimText('');
      lastFinalIndexRef.current = 0; // Reset tracker
      triggerHaptic('light');
    } else {
      try {
        // Reset tracker before starting new session
        lastFinalIndexRef.current = 0;
        setInterimText('');
        recognitionRef.current.start();
        setIsRecording(true);
        triggerHaptic('medium');
        toast({
          title: 'Đang ghi âm...',
          description: 'Nói để nhập văn bản. Nhấn lại để dừng.',
        });
      } catch (error) {
        console.error('Failed to start recognition:', error);
        lastFinalIndexRef.current = 0;
      }
    }
  }, [isRecording]);
  
  // Check if user has seen onboarding
  useEffect(() => {
    const seen = localStorage.getItem(getOnboardingKey());
    if (!seen) {
      setShowOnboarding(true);
    }
  }, []);
  
  // Track document visibility for notification sounds
  useEffect(() => {
    const handleVisibility = () => {
      documentVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
  
  // Search messages when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = messages
        .filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()) && !m.isError)
        .map(m => m.id);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, messages]);
  
  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(getOnboardingKey(), 'true');
  }, []);
  
  // Handle pull-to-refresh touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollContainerRef.current?.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    
    if (diff > 0 && scrollContainerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, PULL_THRESHOLD * 1.5));
    }
  }, [isPulling, isRefreshing]);
  
  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('medium');
      
      // Perform refresh (reset chat)
      setTimeout(() => {
        handleReset();
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
        toast({
          title: 'Đã làm mới',
          description: 'Lịch sử chat đã được xóa.',
        });
      }, 600);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [pullDistance, isRefreshing]);
  
  // Highlight search term in text
  const highlightSearchTerm = useCallback((text: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">$1</mark>');
  }, [searchQuery]);

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
    // Only save if there are messages beyond just the welcome message
    const hasRealMessages = messages.length > 1 || (messages.length === 1 && messages[0].id !== 'welcome');
    if (hasRealMessages) {
      const storageKey = getStorageKey(brandTemplateId);
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, brandTemplateId]);

  // Load artifacts from localStorage on mount
  useEffect(() => {
    const artifactsKey = getArtifactsStorageKey(brandTemplateId);
    const saved = localStorage.getItem(artifactsKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setArtifactTopics(parsed);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, [brandTemplateId]);

  // Save artifacts to localStorage when changed
  useEffect(() => {
    if (artifactTopics.length > 0) {
      const artifactsKey = getArtifactsStorageKey(brandTemplateId);
      localStorage.setItem(artifactsKey, JSON.stringify(artifactTopics));
    }
  }, [artifactTopics, brandTemplateId]);
  
  // Calculate dynamic width based on content
  useEffect(() => {
    if (messages.length <= 1) {
      setDynamicWidth('normal');
      return;
    }
    
    // Analyze message content to determine optimal width
    const recentMessages = messages.slice(-5); // Last 5 messages
    let maxContentLength = 0;
    let hasCodeBlocks = false;
    let hasLongLines = false;
    let hasTables = false;
    
    recentMessages.forEach(msg => {
      if (msg.content) {
        maxContentLength = Math.max(maxContentLength, msg.content.length);
        // Check for code blocks
        if (msg.content.includes('```') || msg.content.includes('`')) {
          hasCodeBlocks = true;
        }
        // Check for tables (markdown tables)
        if (msg.content.includes('|---') || msg.content.includes('| ---')) {
          hasTables = true;
        }
        // Check for long lines (lines > 80 chars)
        const lines = msg.content.split('\n');
        if (lines.some(line => line.length > 80)) {
          hasLongLines = true;
        }
      }
    });
    
    // Determine width based on content analysis
    if (hasTables || hasCodeBlocks || maxContentLength > 1500) {
      setDynamicWidth('full');
    } else if (hasLongLines || maxContentLength > 800) {
      setDynamicWidth('wide');
    } else if (maxContentLength < 200 && messages.length <= 3) {
      setDynamicWidth('compact');
    } else {
      setDynamicWidth('normal');
    }
  }, [messages]);

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
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + K to focus input
      if (modKey && e.key === 'k') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
      
      // Escape to cancel loading
      if (e.key === 'Escape' && isLoading) {
        e.preventDefault();
        handleCancel();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoading, handleCancel]);

  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;
    if (messageText.length > MAX_CHARS) return;

    // Haptic feedback and sound when sending
    triggerHaptic('medium');
    playSend();

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
      
      // Haptic feedback and sound when receiving complete message
      triggerHaptic('light');
      if (!documentVisibleRef.current) {
        playNotification();
      } else {
        playReceive();
      }

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
  }, [messages, isLoading, brandTemplateId, contentGoal, scrollToBottom, playSend, playReceive, playNotification]);

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

  // Handle thumbs up/down feedback
  const handleFeedback = useCallback(async (messageId: string, feedback: 'up' | 'down') => {
    // Update message with feedback in UI
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, feedback } 
        : m
    ));
    
    // Find the message and the previous user message for context
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const message = messages.find(m => m.id === messageId);
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find(m => m.role === 'user');
    
    // Save to database if user is logged in
    if (user?.id) {
      const { error } = await supabase.from('chat_feedback').insert({
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        message_id: messageId,
        conversation_id: getStorageKey(brandTemplateId),
        feedback_type: feedback,
        message_content: message?.content?.slice(0, 5000) || null, // Limit content size
        user_message: previousUserMessage?.content?.slice(0, 2000) || null,
        brand_template_id: brandTemplateId || null,
      });
      
      if (error) {
        console.error('Failed to save feedback:', error);
      }
    }
    
    // Show toast
    toast({
      title: feedback === 'up' ? '👍 Cảm ơn phản hồi!' : '👎 Cảm ơn phản hồi!',
      description: feedback === 'up' 
        ? 'Phản hồi của bạn giúp AI cải thiện.' 
        : 'Chúng tôi sẽ cố gắng cải thiện.',
    });
  }, [messages, user, currentOrganization, brandTemplateId]);

  // Handle regenerate response
  const handleRegenerate = useCallback(async (assistantMessage: ChatMessage) => {
    if (isLoading || regeneratingMessageId) return;
    
    setRegeneratingMessageId(assistantMessage.id);
    
    // Find the user message before this assistant message
    const messageIndex = messages.findIndex(m => m.id === assistantMessage.id);
    if (messageIndex <= 0) {
      setRegeneratingMessageId(null);
      return;
    }
    
    // Get the previous user message
    const previousUserMessage = messages
      .slice(0, messageIndex)
      .reverse()
      .find(m => m.role === 'user');
    
    if (!previousUserMessage) {
      setRegeneratingMessageId(null);
      return;
    }
    
    // Remove the current assistant message
    setMessages(prev => prev.filter(m => m.id !== assistantMessage.id));
    
    // Send again with enhanced prompt
    const regeneratePrompt = previousUserMessage.content + '\n\n(Hãy trả lời theo cách khác, sáng tạo hơn)';
    
    // Use sendMessage to regenerate
    await sendMessage(regeneratePrompt);
    
    setRegeneratingMessageId(null);
  }, [messages, isLoading, regeneratingMessageId, sendMessage]);

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
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    
    // Cmd/Ctrl + Enter to send (alternative)
    if (modKey && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
      return;
    }
    
    // Enter without shift to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
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
    // Clear localStorage for messages
    const storageKey = getStorageKey(brandTemplateId);
    localStorage.removeItem(storageKey);
    
    // Clear localStorage for artifacts
    const artifactsKey = getArtifactsStorageKey(brandTemplateId);
    localStorage.removeItem(artifactsKey);
    
    // Reset messages
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    }]);
    
    // Clear artifacts
    setArtifactTopics([]);
    setShowArtifactsPanel(false);
  };

  // Save topic to database (topic_history table)
  const handleSaveToBank = useCallback(async (topic: ArtifactTopic) => {
    if (!user?.id) {
      toast({
        title: 'Cần đăng nhập',
        description: 'Vui lòng đăng nhập để lưu topic vào bank.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingToBank(true);

    try {
      // Map tag to category
      const categoryMap: Record<string, string> = {
        awareness: 'awareness',
        engagement: 'engagement', 
        conversion: 'conversion',
        education: 'educational',
        entertainment: 'entertainment',
        trust: 'thought-leadership',
      };

      const { error } = await supabase.from('topic_history').insert({
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        brand_template_id: brandTemplateId || null,
        topic: topic.topic,
        reasoning: topic.reason || null,
        format: topic.format || 'post',
        category: categoryMap[topic.tag || ''] || 'general',
        content_goal: contentGoal || 'engagement',
        is_favorite: topic.isStarred || false,
        usage_status: 'saved',
      });

      if (error) {
        console.error('Failed to save topic:', error);
        toast({
          title: 'Lỗi lưu topic',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      // Update artifact topic with saved status
      setArtifactTopics(prev => 
        prev.map(t => t.id === topic.id ? { ...t, isSaved: true } : t)
      );

      toast({
        title: 'Đã lưu vào Topic Bank!',
        description: 'Topic đã được thêm vào danh sách của bạn.',
      });
    } catch (err) {
      console.error('Save to bank error:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu topic. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingToBank(false);
    }
  }, [user, currentOrganization, brandTemplateId, contentGoal]);

  // Collect all extracted topics from messages for artifacts panel
  const allExtractedTopics = useMemo<ArtifactTopic[]>(() => {
    const topics: ArtifactTopic[] = [];
    const seenTopics = new Set<string>();
    
    messages.forEach(msg => {
      if (msg.extractedTopics) {
        msg.extractedTopics.forEach((t, idx) => {
          const topicKey = t.topic.toLowerCase().trim();
          if (!seenTopics.has(topicKey)) {
            seenTopics.add(topicKey);
            topics.push({
              id: `${msg.id}-topic-${idx}`,
              topic: t.topic,
              reason: t.reason,
              format: t.format,
            });
          }
        });
      }
    });
    
    return topics;
  }, [messages]);

  // Sync artifact topics with extracted topics (only if not loaded from localStorage)
  useEffect(() => {
    // Skip sync if artifacts were loaded from localStorage
    const artifactsKey = getArtifactsStorageKey(brandTemplateId);
    const hasPersistedArtifacts = localStorage.getItem(artifactsKey);
    
    if (hasPersistedArtifacts) {
      // If we have persisted artifacts, only add NEW topics from messages
      if (allExtractedTopics.length > 0) {
        const existingTopicTexts = new Set(artifactTopics.map(t => t.topic.toLowerCase().trim()));
        const newTopics = allExtractedTopics.filter(t => !existingTopicTexts.has(t.topic.toLowerCase().trim()));
        if (newTopics.length > 0) {
          setArtifactTopics(prev => [...prev, ...newTopics]);
          if (!showArtifactsPanel && newTopics.length >= 2) {
            setShowArtifactsPanel(true);
          }
        }
      }
    } else {
      // First time - sync from extracted topics
      if (allExtractedTopics.length > 0 && artifactTopics.length === 0) {
        setArtifactTopics(allExtractedTopics);
      } else if (allExtractedTopics.length > artifactTopics.length) {
        const existingIds = new Set(artifactTopics.map(t => t.id));
        const newTopics = allExtractedTopics.filter(t => !existingIds.has(t.id));
        if (newTopics.length > 0) {
          setArtifactTopics(prev => [...prev, ...newTopics]);
          if (!showArtifactsPanel && newTopics.length >= 2) {
            setShowArtifactsPanel(true);
          }
        }
      }
    }
  }, [allExtractedTopics, artifactTopics, showArtifactsPanel, brandTemplateId]);

  // Handle artifact topic action
  const handleArtifactTopicAction = useCallback((topic: ArtifactTopic, format: 'multichannel' | 'script' | 'carousel') => {
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
  }, [onNavigate, contentGoal]);

  // Expose sendMessage for external injection
  useEffect(() => {
    // Store ref for parent access
    (window as any).__topicChatSendMessage = sendMessage;
    return () => {
      delete (window as any).__topicChatSendMessage;
    };
  }, [sendMessage]);

  const isMobileFullscreen = className?.includes('border-0') || className?.includes('rounded-none');
  
  // Dynamic width classes
  const widthClasses = {
    compact: 'w-full max-w-sm',
    normal: 'w-full max-w-lg',
    wide: 'w-full max-w-2xl',
    full: 'w-full max-w-4xl',
  };

  return (
    <TooltipProvider>
    <div className={cn(
      'flex h-full max-h-full transition-all duration-300 ease-in-out',
      // Dynamic width based on content and artifacts panel
      !isMobileFullscreen && !showArtifactsPanel && widthClasses[dynamicWidth],
      showArtifactsPanel && 'w-full max-w-5xl',
      className
    )}>
      {/* Main Chat Card */}
      <Card className={cn(
        'flex flex-col h-full max-h-full flex-1 min-w-0 transition-all duration-300',
        // On mobile fullscreen: no border, no shadow for seamless look
        isMobileFullscreen ? 'border-0 shadow-none rounded-none bg-background' : 'border-2 border-primary/20',
        showArtifactsPanel && 'rounded-r-none border-r-0'
      )}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-xl p-4 max-w-xs space-y-3 shadow-xl animate-in zoom-in-95 fade-in-0 duration-300">
            {onboardingStep === 0 && (
              <>
                <div className="flex items-center gap-2 text-primary">
                  <Bot className="w-5 h-5" />
                  <h4 className="font-semibold">Chào mừng đến Flowa Mind!</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tôi là AI trợ lý giúp bạn tìm ý tưởng content. Hãy mô tả sản phẩm hoặc chủ đề bạn muốn tạo content!
                </p>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={dismissOnboarding}>Bỏ qua</Button>
                  <Button size="sm" onClick={() => setOnboardingStep(1)}>Tiếp theo</Button>
                </div>
              </>
            )}
            {onboardingStep === 1 && (
              <>
                <div className="flex items-center gap-2 text-primary">
                  <SearchIcon className="w-5 h-5" />
                  <h4 className="font-semibold">Tìm kiếm & Tính năng</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dùng nút 🔍 để tìm trong lịch sử chat. Kéo xuống ở đầu chat để làm mới (trên mobile).
                </p>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setOnboardingStep(0)}>Quay lại</Button>
                  <Button size="sm" onClick={() => setOnboardingStep(2)}>Tiếp theo</Button>
                </div>
              </>
            )}
            {onboardingStep === 2 && (
              <>
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="font-semibold">Topic thành Content</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Khi AI gợi ý topic, bạn có thể nhấn để tạo ngay Multichannel, Script hoặc Carousel!
                </p>
                <div className="flex justify-end">
                  <Button size="sm" onClick={dismissOnboarding}>Bắt đầu!</Button>
                </div>
              </>
            )}
            {/* Step indicators */}
            <div className="flex justify-center gap-1 pt-1">
              {[0, 1, 2].map(step => (
                <div 
                  key={step} 
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    onboardingStep === step ? 'bg-primary' : 'bg-muted'
                  )} 
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-0.5">
            {/* Search toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={cn("h-6 w-6 sm:h-7 sm:w-7", isSearchOpen && "bg-primary/10")}
                >
                  <SearchIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Tìm trong chat</TooltipContent>
            </Tooltip>
            
            {/* Sound toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  ) : (
                    <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              </TooltipContent>
            </Tooltip>
            
            {/* Help/onboarding */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setOnboardingStep(0); setShowOnboarding(true); }}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                >
                  <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Hướng dẫn</TooltipContent>
            </Tooltip>
            
            {/* Artifacts Panel toggle */}
            {artifactTopics.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowArtifactsPanel(!showArtifactsPanel)}
                    className={cn(
                      "h-6 w-6 sm:h-7 sm:w-7 relative",
                      showArtifactsPanel && "bg-primary/10 text-primary"
                    )}
                  >
                    {showArtifactsPanel ? (
                      <PanelRightClose className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <PanelRightOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                    {!showArtifactsPanel && artifactTopics.length > 0 && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-primary text-primary-foreground"
                      >
                        {artifactTopics.length}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {showArtifactsPanel ? 'Đóng panel Topics' : `Mở panel Topics (${artifactTopics.length})`}
                </TooltipContent>
              </Tooltip>
            )}
            
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
        </div>
        
        {/* Search bar - expandable */}
        {isSearchOpen && (
          <div className="mt-2 flex gap-1.5 animate-in slide-in-from-top-2 duration-200">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="h-7 pl-7 pr-7 text-xs"
                autoFocus
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
            {searchResults.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-7 px-2 shrink-0">
                {searchResults.length} kết quả
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {/* Messages - Scrollable area with pull-to-refresh */}
      <div className="relative flex-1 min-h-0">
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div 
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-10 transition-all"
            style={{ height: Math.min(pullDistance, PULL_THRESHOLD * 1.5) }}
          >
            <div className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground transition-transform",
              pullDistance >= PULL_THRESHOLD && "text-primary"
            )}>
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  pullDistance >= PULL_THRESHOLD && "rotate-180"
                )} />
              )}
              <span>{isRefreshing ? 'Đang làm mới...' : pullDistance >= PULL_THRESHOLD ? 'Thả để làm mới' : 'Kéo để làm mới'}</span>
            </div>
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="absolute inset-0 overflow-y-auto p-2 sm:p-4 transition-transform"
          style={{ transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, PULL_THRESHOLD * 1.5)}px)` : undefined }}
        >
          <div ref={scrollRef} className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={cn(
                'flex gap-2.5',
                message.role === 'user' ? 'justify-end' : 'justify-start',
                // Animation for new messages
                animatingMessageId === message.id && 'animate-in fade-in-0 duration-300',
                animatingMessageId === message.id && message.role === 'user' && 'slide-in-from-right-4',
                animatingMessageId === message.id && message.role === 'assistant' && 'slide-in-from-left-4',
                // Highlight search results
                searchResults.includes(message.id) && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background rounded-xl'
              )}
            >
              {message.role === 'assistant' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              
              <div className={cn(
                'max-w-[85%] sm:max-w-[80%] space-y-2.5'
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
                          {searchQuery && searchResults.includes(message.id) ? (
                            <div dangerouslySetInnerHTML={{ __html: highlightSearchTerm(message.content) }} />
                          ) : (
                            <ReactMarkdown
                              components={{
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  
                                  if (!inline && (match || codeString.includes('\n'))) {
                                    return <CodeBlock language={match?.[1]}>{codeString}</CodeBlock>;
                                  }
                                  
                                  // Inline code
                                  return (
                                    <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono" {...props}>
                                      {children}
                                    </code>
                                  );
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      ) : (
                        <p 
                          className="text-sm whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={searchQuery && searchResults.includes(message.id) 
                            ? { __html: highlightSearchTerm(message.content) }
                            : undefined
                          }
                        >
                          {!(searchQuery && searchResults.includes(message.id)) && message.content}
                        </p>
                      )
                    ) : (
                      isLoading && message.role === 'assistant' && <MessageSkeleton />
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
                    
                    {/* Message Feedback - Thumbs up/down and Regenerate for assistant messages */}
                    {message.role === 'assistant' && message.content && !isLoading && message.id !== 'welcome' && (
                      <MessageFeedback 
                        messageId={message.id}
                        initialFeedback={message.feedback}
                        onFeedback={handleFeedback}
                        onRegenerate={() => handleRegenerate(message)}
                        isRegenerating={regeneratingMessageId === message.id}
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
                <Avatar className="shrink-0 w-7 h-7">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'User'} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                  </AvatarFallback>
                </Avatar>
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
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-1.5 sm:p-3 border-t bg-background space-y-1.5">
        {/* Markdown preview */}
        {showMarkdownPreview && input.trim() && (
          <div className="p-2 rounded-lg bg-muted/50 border text-xs animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Preview
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5">
              <ReactMarkdown>{input}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Input toolbar */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1">
            {/* Markdown preview toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-6 w-6", showMarkdownPreview && "bg-primary/10 text-primary")}
                  onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
                >
                  {showMarkdownPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {showMarkdownPreview ? 'Ẩn preview' : 'Xem preview Markdown'}
              </TooltipContent>
            </Tooltip>
            
            {/* Keyboard shortcuts hint */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-6 w-6", showShortcutsHint && "bg-primary/10")}
                  onClick={() => setShowShortcutsHint(!showShortcutsHint)}
                >
                  <Keyboard className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Phím tắt
              </TooltipContent>
            </Tooltip>
          </div>
          
          {/* Shortcuts hint panel */}
          {showShortcutsHint && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-in fade-in-0 duration-150">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+Enter</kbd>
              <span>Gửi</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd>
              <span>Dừng</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">⌘/Ctrl+K</kbd>
              <span>Focus</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-1.5 sm:gap-2 items-end">
          <div className="flex-1 relative">
            {/* Interim text indicator */}
            {interimText && (
              <div className="absolute -top-6 left-0 right-0 text-[10px] text-muted-foreground italic truncate animate-pulse">
                <span className="inline-flex items-center gap-1">
                  <Mic className="w-2.5 h-2.5" />
                  {interimText}
                </span>
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= MAX_CHARS) {
                  setInput(value);
                }
                // Auto-resize textarea
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Đang nghe..." : "Nhập tin nhắn... (hỗ trợ Markdown)"}
              className={cn(
                "min-h-[36px] max-h-[120px] resize-none text-xs sm:text-sm py-2 pr-14 transition-all",
                input.length > MAX_CHARS * 0.95 && "border-destructive focus-visible:ring-destructive",
                isRecording && "ring-2 ring-primary/30"
              )}
              disabled={isLoading}
              style={{ height: '36px' }}
            />
            {/* Character counter */}
            <span className={cn(
              "absolute bottom-1.5 right-2 text-[10px] transition-colors pointer-events-none",
              input.length === 0 && "text-transparent",
              input.length > 0 && input.length <= MAX_CHARS * 0.8 && "text-muted-foreground/50",
              input.length > MAX_CHARS * 0.8 && input.length <= MAX_CHARS * 0.95 && "text-amber-500",
              input.length > MAX_CHARS * 0.95 && "text-destructive font-medium"
            )}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          {/* Voice input button */}
          {voiceSupported && !isLoading && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  className={cn(
                    "shrink-0 h-9 w-9 transition-all",
                    isRecording && "animate-pulse ring-2 ring-destructive/50"
                  )}
                  onClick={toggleVoiceInput}
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isRecording ? 'Dừng ghi âm' : 'Nhập giọng nói'}
              </TooltipContent>
            </Tooltip>
          )}
          
          {isLoading ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  size="icon"
                  variant="destructive"
                  className="shrink-0 h-9 w-9 animate-pulse ring-2 ring-destructive/30"
                  onClick={handleCancel}
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Dừng (Esc)
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="submit" 
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  disabled={!input.trim() || input.length > MAX_CHARS}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Gửi (Enter hoặc ⌘/Ctrl+Enter)
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </form>
      </Card>

      {/* Artifacts Panel - Split screen */}
      {showArtifactsPanel && (
        <ArtifactsPanel
          topics={artifactTopics}
          onTopicsChange={setArtifactTopics}
          onClose={() => setShowArtifactsPanel(false)}
          onCreateContent={handleArtifactTopicAction}
          onSaveToBank={handleSaveToBank}
          onRefine={handleTopicRefinement}
          className="w-80 shrink-0 animate-in slide-in-from-right-4 duration-300"
        />
      )}
    </div>
    </TooltipProvider>
  );
}
