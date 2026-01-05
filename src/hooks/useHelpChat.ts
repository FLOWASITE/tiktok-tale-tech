import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface HelpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: HelpAction[];
}

export interface HelpAction {
  type: 'navigate' | 'coachmark';
  payload: string;
  label: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/help-chatbot`;

// Parse action tags from message content
function parseActions(content: string): { cleanContent: string; actions: HelpAction[] } {
  const actions: HelpAction[] = [];
  const actionPattern = /\[ACTION:(NAVIGATE|COACHMARK):([^\|]+)\|([^\]]+)\]/g;
  
  let cleanContent = content;
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
  
  return { cleanContent: cleanContent.trim(), actions };
}

export function useHelpChat() {
  const [messages, setMessages] = useState<HelpMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! 👋 Tôi là trợ lý hướng dẫn. Bạn cần giúp gì về cách sử dụng hệ thống?',
      timestamp: new Date()
    }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
          currentRoute: location.pathname
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

      // Parse actions from final content
      const { cleanContent, actions } = parseActions(assistantContent);
      
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: cleanContent, actions }
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
  }, [messages, location.pathname, isStreaming]);

  const handleAction = useCallback((action: HelpAction) => {
    if (action.type === 'navigate') {
      navigate(action.payload);
      setIsOpen(false);
    } else if (action.type === 'coachmark') {
      // Will be handled by parent component
      console.log('Coachmark action:', action.payload);
    }
  }, [navigate]);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! 👋 Tôi là trợ lý hướng dẫn. Bạn cần giúp gì về cách sử dụng hệ thống?',
      timestamp: new Date()
    }]);
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
