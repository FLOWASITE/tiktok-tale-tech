// ============================================
// useChatStreaming Hook
// Handles SSE streaming, abort control, agentic events
// ============================================

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage, RealtimeContextBadge } from '@/components/topic/chatbot/types';
import type { ThinkingStatus, AgentTurnInfo } from '@/components/topic/chatbot/ChatThinkingIndicator';
import type { ToolResult } from '@/components/topic/chatbot/ToolResultCard';
import { CHAT_URL } from '@/components/topic/chatbot/constants';
import { 
  extractTopicsFromMessage, 
  createMessageId,
  serializeMessagesForAPI,
} from '@/components/topic/chatbot/utils';
import { toast } from '@/hooks/use-toast';
import { ContentGoal } from '@/types/multichannel';

interface StreamingState {
  isLoading: boolean;
  thinkingStatus: ThinkingStatus;
  currentExecutingTool: string | null;
  agentTurnInfo: AgentTurnInfo | null;
}

interface UseChatStreamingOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  organizationId?: string;
  userId?: string;
  onMessageCreate: (message: ChatMessage) => void;
  onMessageUpdate: (id: string, updates: Partial<ChatMessage>) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseChatStreamingReturn extends StreamingState {
  streamChat: (messages: ChatMessage[]) => Promise<ChatMessage | null>;
  cancelStream: () => void;
}

export function useChatStreaming(options: UseChatStreamingOptions): UseChatStreamingReturn {
  const {
    brandTemplateId,
    contentGoal,
    organizationId,
    userId,
    onMessageCreate,
    onMessageUpdate,
    onComplete,
    onError,
  } = options;
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    thinkingStatus: 'thinking',
    currentExecutingTool: null,
    agentTurnInfo: null,
  });
  
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      thinkingStatus: 'thinking',
      currentExecutingTool: null,
      agentTurnInfo: null,
    }));
  }, []);
  
  const streamChat = useCallback(async (messages: ChatMessage[]): Promise<ChatMessage | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      thinkingStatus: 'thinking',
      currentExecutingTool: null,
      agentTurnInfo: null,
    }));
    
    // Create abort controller
    abortControllerRef.current = new AbortController();
    
    const apiMessages = serializeMessagesForAPI(messages);
    const assistantId = createMessageId('assistant');
    
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
          organizationId,
          userId,
          enableTools: true,
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
      let assistantContent = '';
      let receivedToolResults: ToolResult[] | null = null;
      let messageCreated = false;
      let pendingContextBadges: RealtimeContextBadge[] | null = null;
      let contextRichness: number | undefined = undefined;
      
      // Update status to generating
      setState(prev => ({ ...prev, thinkingStatus: 'generating' }));
      
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
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Context metadata event
            if (parsed.type === 'context_metadata' && parsed.badges) {
              pendingContextBadges = parsed.badges;
              contextRichness = parsed.context_richness_score;
              continue;
            }
            
            // Tool results event
            if (parsed.type === 'tool_results' && parsed.tool_results) {
              receivedToolResults = parsed.tool_results;
              
              setState(prev => ({ 
                ...prev, 
                thinkingStatus: 'executing_tools',
                currentExecutingTool: receivedToolResults?.[0]?.tool_name || null,
              }));
              
              const successTools = receivedToolResults?.filter(t => t.success) || [];
              if (successTools.length > 0) {
                toast({
                  title: `✅ ${successTools.length} hành động hoàn thành`,
                  description: successTools.map(t => t.result?.message || t.tool_name).join(' → '),
                });
              }
              
              setState(prev => ({ ...prev, thinkingStatus: 'generating' }));
              continue;
            }
            
            // Agentic events
            if (parsed.type === 'turn_start') {
              setState(prev => ({
                ...prev,
                agentTurnInfo: {
                  currentTurn: parsed.turn_number || 1,
                  maxTurns: parsed.max_turns || 5,
                  toolsExecuted: [],
                  isComplete: false,
                },
              }));
              continue;
            }
            
            if (parsed.type === 'tool_executing') {
              setState(prev => ({
                ...prev,
                currentExecutingTool: parsed.tool_name,
                thinkingStatus: 'executing_tools',
                agentTurnInfo: prev.agentTurnInfo ? {
                  ...prev.agentTurnInfo,
                  toolsExecuted: [...prev.agentTurnInfo.toolsExecuted, parsed.tool_name],
                } : null,
              }));
              continue;
            }
            
            // Regular content streaming
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              
              if (!messageCreated) {
                messageCreated = true;
                const newMessage: ChatMessage = {
                  id: assistantId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                  extractedTopics: extractTopicsFromMessage(assistantContent),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                };
                onMessageCreate(newMessage);
              } else {
                onMessageUpdate(assistantId, {
                  content: assistantContent,
                  extractedTopics: extractTopicsFromMessage(assistantContent),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                });
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
      
      // Final message
      const finalMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
        extractedTopics: extractTopicsFromMessage(assistantContent),
        toolResults: receivedToolResults || undefined,
        contextBadges: pendingContextBadges || undefined,
        contextRichness,
      };
      
      if (!messageCreated && (assistantContent || receivedToolResults)) {
        onMessageCreate(finalMessage);
      }
      
      onComplete?.();
      return finalMessage;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      
      if (error instanceof Error && (error.message === 'RATE_LIMIT' || error.message === 'PAYMENT_REQUIRED')) {
        const errorMessage: ChatMessage = {
          id: createMessageId('error'),
          role: 'assistant',
          content: '❌ Không thể tạo phản hồi. Vui lòng thử lại sau.',
          timestamp: new Date(),
          isError: true,
        };
        onMessageCreate(errorMessage);
        return null;
      }
      
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: createMessageId('error'),
        role: 'assistant',
        content: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date(),
        isError: true,
      };
      onMessageCreate(errorMessage);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
      return null;
      
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
        thinkingStatus: 'thinking',
        currentExecutingTool: null,
        agentTurnInfo: null,
      }));
      abortControllerRef.current = null;
    }
  }, [brandTemplateId, contentGoal, organizationId, userId, onMessageCreate, onMessageUpdate, onComplete, onError]);
  
  return {
    ...state,
    streamChat,
    cancelStream,
  };
}
