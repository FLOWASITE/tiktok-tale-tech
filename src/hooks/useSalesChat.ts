import { useState, useCallback, useRef, useEffect } from 'react';

export interface SalesChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  ctaActions?: Array<{ action: string; label: string }>;
}

interface UseSalesChatReturn {
  messages: SalesChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const STORAGE_KEY = 'flowa_sales_chat_messages';
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sales-chatbot`;

const WELCOME_MESSAGE: SalesChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Xin chào! 👋 Tôi là **Linh** - Tư vấn viên của Flowa.

Flowa là nền tảng AI Content Marketing giúp bạn **tạo 1 tuần content trong 1 giờ**, tiết kiệm 80% thời gian!

Bạn muốn tìm hiểu gì về Flowa hôm nay?`,
  timestamp: new Date(),
  suggestions: [
    'Flowa giúp gì cho tôi?',
    'Xem bảng giá',
    'Ngành của tôi có được hỗ trợ không?',
  ],
  ctaActions: [
    { action: 'REGISTER', label: 'Dùng thử miễn phí' },
  ],
};

// Parse CTA and suggestions from AI response
function parseAIResponse(content: string): {
  cleanContent: string;
  suggestions: string[];
  ctaActions: Array<{ action: string; label: string }>;
} {
  const suggestions: string[] = [];
  const ctaActions: Array<{ action: string; label: string }> = [];
  
  let cleanContent = content;
  
  // Parse [CTA:ACTION|Label]
  const ctaRegex = /\[CTA:(\w+)\|([^\]]+)\]/g;
  let ctaMatch;
  while ((ctaMatch = ctaRegex.exec(content)) !== null) {
    ctaActions.push({ action: ctaMatch[1], label: ctaMatch[2] });
  }
  cleanContent = cleanContent.replace(ctaRegex, '');
  
  // Parse [SUGGEST:Question]
  const suggestRegex = /\[SUGGEST:([^\]]+)\]/g;
  let suggestMatch;
  while ((suggestMatch = suggestRegex.exec(content)) !== null) {
    suggestions.push(suggestMatch[1]);
  }
  cleanContent = cleanContent.replace(suggestRegex, '');
  
  return {
    cleanContent: cleanContent.trim(),
    suggestions,
    ctaActions,
  };
}

export function useSalesChat(): UseSalesChatReturn {
  const [messages, setMessages] = useState<SalesChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (e) {
      console.error('[useSalesChat] Failed to load messages:', e);
    }
    return [WELCOME_MESSAGE];
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('[useSalesChat] Failed to save messages:', e);
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMessage: SalesChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Prepare messages for API (excluding welcome message metadata)
    const apiMessages = [...messages, userMessage]
      .filter(m => m.id !== 'welcome' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Create assistant message placeholder
      const assistantId = `assistant-${Date.now()}`;
      let fullContent = '';

      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              fullContent += deltaContent;
              
              // Update message with current content
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: fullContent }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, put back and wait
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final parse for suggestions and CTAs
      const { cleanContent, suggestions, ctaActions } = parseAIResponse(fullContent);
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: cleanContent, suggestions, ctaActions }
          : m
      ));

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('[useSalesChat] Error:', err);
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ support@flowa.vn nhé! 🙏',
        timestamp: new Date(),
        suggestions: ['Thử lại'],
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
