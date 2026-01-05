import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const HELP_CHAT_STORAGE_KEY = 'help-chat-messages';
const RECENT_PAGES_KEY = 'help-chat-recent-pages';
const MAX_RECENT_PAGES = 5;

export interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: HelpAction[];
  suggestions?: string[];
}

export interface HelpAction {
  type: 'navigate' | 'coachmark';
  payload: string;
  label: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-chatbot`;

// Parse action tags and suggestions from message content
function parseMessageContent(content: string): { 
  cleanContent: string; 
  actions: HelpAction[];
  suggestions: string[];
} {
  const actions: HelpAction[] = [];
  const suggestions: string[] = [];
  
  let cleanContent = content;
  
  // Parse action tags
  const actionPattern = /\[ACTION:(NAVIGATE|COACHMARK):([^\|]+)\|([^\]]+)\]/g;
  let match;
  
  while ((match = actionPattern.exec(content)) !== null) {
    const [fullMatch, type, payload, label] = match;
    actions.push({
      type: type.toLowerCase() as 'navigate' | 'coachmark',
      payload,
      label
    });
    cleanContent = cleanContent.replace(fullMatch, '');
  }
  
  // Parse suggestion tags
  const suggestPattern = /\[SUGGEST:([^\]]+)\]/g;
  while ((match = suggestPattern.exec(content)) !== null) {
    const [fullMatch, suggestion] = match;
    suggestions.push(suggestion.trim());
    cleanContent = cleanContent.replace(fullMatch, '');
  }
  
  return { cleanContent: cleanContent.trim(), actions, suggestions };
}

const WELCOME_MESSAGE: HelpMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! 👋 Tôi là trợ lý hướng dẫn. Bạn cần giúp gì về cách sử dụng hệ thống?',
  timestamp: new Date()
};

// Rich context for the help chatbot
interface HelpContext {
  currentRoute: string;
  userRole?: string;
  hasBrandSelected?: boolean;
  brandInfo?: {
    name: string;
    industry?: string;
  } | null;
  recentPages?: string[];
}

export function useHelpChat(onStartTour?: (tourId: string) => void) {
  const [messages, setMessages] = useState<HelpMessage[]>([WELCOME_MESSAGE]);
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const recentPagesRef = useRef<string[]>([]);

  // Track page visits for context
  useEffect(() => {
    const currentPath = location.pathname;
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    let pages: string[] = stored ? JSON.parse(stored) : [];
    
    // Add current page if different from last
    if (pages[0] !== currentPath) {
      pages = [currentPath, ...pages.slice(0, MAX_RECENT_PAGES - 1)];
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(pages));
    }
    recentPagesRef.current = pages;
  }, [location.pathname]);

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HELP_CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map((m: HelpMessage) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          })));
        }
      }
    } catch (e) {
      console.error('[useHelpChat] Failed to load messages:', e);
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 1 || messages[0]?.id !== 'welcome') {
      try {
        localStorage.setItem(HELP_CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('[useHelpChat] Failed to save messages:', e);
      }
    }
  }, [messages]);

  // Build rich context for the chatbot
  const buildContext = useCallback(async (): Promise<HelpContext> => {
    const context: HelpContext = {
      currentRoute: location.pathname,
      recentPages: recentPagesRef.current.slice(1, 4), // Exclude current, take last 3
    };

    try {
      // Get user session and role
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        context.userRole = roleData?.role || 'member';
      }

      // Get selected brand from localStorage
      const selectedBrandId = localStorage.getItem('selectedBrandId');
      if (selectedBrandId) {
        const { data: brand } = await supabase
          .from('brand_templates')
          .select('brand_name, industry')
          .eq('id', selectedBrandId)
          .maybeSingle();
        
        if (brand) {
          context.hasBrandSelected = true;
          context.brandInfo = {
            name: brand.brand_name,
            industry: brand.industry?.[0] || undefined
          };
        }
      }
    } catch (e) {
      console.error('[useHelpChat] Error building context:', e);
    }

    return context;
  }, [location.pathname]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming) return;

    const userMsg: HelpMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    let assistantContent = '';
    const assistantId = `assistant-${Date.now()}`;

    try {
      // Build rich context
      const context = await buildContext();

      // Prepare conversation history (exclude welcome message for API)
      const conversationHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...conversationHistory, { role: 'user', content: userMessage }],
          currentRoute: location.pathname,
          context
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể kết nối với trợ lý');
      }

      if (!resp.body) throw new Error('Không nhận được phản hồi');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      // Add initial assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

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
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Parse actions and suggestions from final content
      const { cleanContent, actions, suggestions } = parseMessageContent(assistantContent);
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: cleanContent, actions, suggestions }
          : m
      ));

    } catch (error) {
      console.error('[useHelpChat] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Đã xảy ra lỗi');
      
      // Remove failed assistant message
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  }, [messages, location.pathname, isStreaming, buildContext]);

  const handleAction = useCallback((action: HelpAction) => {
    if (action.type === 'navigate') {
      navigate(action.payload);
      setIsOpen(false);
    } else if (action.type === 'coachmark') {
      if (onStartTour) {
        onStartTour(action.payload);
        setIsOpen(false);
      }
    }
  }, [navigate, onStartTour]);

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(HELP_CHAT_STORAGE_KEY);
  }, []);

  return {
    messages,
    isOpen,
    setIsOpen,
    isStreaming,
    sendMessage,
    handleAction,
    clearMessages,
    currentRoute: location.pathname
  };
}
