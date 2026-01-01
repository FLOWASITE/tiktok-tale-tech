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

export interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  duration?: number;
  startTime?: number;
}

interface StreamingState {
  isLoading: boolean;
  thinkingStatus: ThinkingStatus;
  currentExecutingTool: string | null;
  agentTurnInfo: AgentTurnInfo | null;
  progressSteps: ProgressStep[];
  elapsedSeconds: number;
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
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<StreamingState>({
    isLoading: false,
    thinkingStatus: 'thinking',
    currentExecutingTool: null,
    agentTurnInfo: null,
    progressSteps: [],
    elapsedSeconds: 0,
  });
  
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      thinkingStatus: 'thinking',
      currentExecutingTool: null,
      agentTurnInfo: null,
      progressSteps: [],
      elapsedSeconds: 0,
    }));
  }, []);
  
  const streamChat = useCallback(async (messages: ChatMessage[]): Promise<ChatMessage | null> => {
    // Clear any existing interval
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
    }
    
    // Initialize progress steps
    const initialSteps: ProgressStep[] = [
      { id: 'context', label: 'Tải ngữ cảnh', status: 'active', startTime: Date.now() },
      { id: 'thinking', label: 'AI xử lý', status: 'pending' },
      { id: 'response', label: 'Tạo phản hồi', status: 'pending' },
    ];
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      thinkingStatus: 'thinking',
      currentExecutingTool: null,
      agentTurnInfo: null,
      progressSteps: initialSteps,
      elapsedSeconds: 0,
    }));
    
    // Start elapsed timer
    const startTime = Date.now();
    elapsedIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
      }));
    }, 1000);
    
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
      
      // Handle rate limit and payment/quota errors
      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const retryAfter = errorData.retryAfter || 60;
        toast({
          variant: 'destructive',
          title: 'Quá giới hạn request',
          description: `Vui lòng thử lại sau ${retryAfter} giây.`,
        });
        const error = new Error('RATE_LIMIT');
        (error as any).retryAfter = retryAfter;
        throw error;
      }
      
      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({}));
        const isQuota = errorData.error === 'QUOTA_EXCEEDED';
        toast({
          variant: 'destructive',
          title: isQuota ? 'Hết lượt sử dụng' : 'Hết credits',
          description: isQuota 
            ? `Bạn đã dùng hết ${errorData.limit || ''} lượt ${errorData.usageType || 'AI'} tháng này. Nâng cấp gói để tiếp tục.`
            : 'Vui lòng nạp thêm credits để tiếp tục sử dụng.',
        });
        const error = new Error(isQuota ? 'QUOTA_EXCEEDED' : 'PAYMENT_REQUIRED');
        (error as any).quotaInfo = errorData;
        throw error;
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
      
      // Update progress: context loaded, move to thinking
      setState(prev => ({ 
        ...prev, 
        thinkingStatus: 'generating',
        progressSteps: prev.progressSteps.map(step => 
          step.id === 'context' 
            ? { ...step, status: 'complete' as const, duration: Date.now() - (step.startTime || Date.now()) }
            : step.id === 'thinking'
            ? { ...step, status: 'active' as const, startTime: Date.now() }
            : step
        ),
      }));
      
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
            
            // Agentic events - parse from data object
            if (parsed.type === 'turn_start') {
              setState(prev => ({
                ...prev,
                agentTurnInfo: {
                  currentTurn: parsed.data?.turn || parsed.turn_number || 1,
                  maxTurns: parsed.data?.max_turns || parsed.max_turns || 5,
                  toolsExecuted: [],
                  isComplete: false,
                },
              }));
              continue;
            }
            
            if (parsed.type === 'tool_executing') {
              const toolName = parsed.data?.tool || parsed.tool_name;
              setState(prev => ({
                ...prev,
                currentExecutingTool: toolName,
                thinkingStatus: 'executing_tools',
                agentTurnInfo: prev.agentTurnInfo ? {
                  ...prev.agentTurnInfo,
                  toolsExecuted: [...prev.agentTurnInfo.toolsExecuted, toolName],
                } : null,
              }));
              continue;
            }
            
            // Agentic content_chunk event (from agentic-loop.ts)
            if (parsed.type === 'content_chunk' && parsed.data?.chunk) {
              assistantContent += parsed.data.chunk;
              
              // Update progress: move to response step when content starts
              if (!messageCreated) {
                messageCreated = true;
                setState(prev => ({
                  ...prev,
                  progressSteps: prev.progressSteps.map(step => 
                    step.id === 'thinking' 
                      ? { ...step, status: 'complete' as const, duration: Date.now() - (step.startTime || Date.now()) }
                      : step.id === 'response'
                      ? { ...step, status: 'active' as const, startTime: Date.now() }
                      : step
                  ),
                }));
                
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
              continue;
            }
            
            // Agentic final_response event
            if (parsed.type === 'final_response') {
              // Extract final content if available
              if (parsed.data?.content && !assistantContent) {
                assistantContent = parsed.data.content;
              }
              continue;
            }
            
            // Agentic tool_result event
            if (parsed.type === 'tool_result' && parsed.data) {
              receivedToolResults = receivedToolResults || [];
              receivedToolResults.push({
                tool_name: parsed.data.tool || 'unknown',
                success: parsed.data.success !== false,
                result: parsed.data.result,
              });
              continue;
            }
            
            // Agentic loop_complete event
            if (parsed.type === 'loop_complete') {
              setState(prev => ({
                ...prev,
                agentTurnInfo: prev.agentTurnInfo ? {
                  ...prev.agentTurnInfo,
                  isComplete: true,
                } : null,
              }));
              continue;
            }
            
            // Regular content streaming (OpenAI format)
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              
              // Update progress when content starts
              if (!messageCreated) {
                messageCreated = true;
                setState(prev => ({
                  ...prev,
                  progressSteps: prev.progressSteps.map(step => 
                    step.id === 'thinking' 
                      ? { ...step, status: 'complete' as const, duration: Date.now() - (step.startTime || Date.now()) }
                      : step.id === 'response'
                      ? { ...step, status: 'active' as const, startTime: Date.now() }
                      : step
                  ),
                }));
                
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
      
      if (error instanceof Error && (error.message === 'RATE_LIMIT' || error.message === 'PAYMENT_REQUIRED' || error.message === 'QUOTA_EXCEEDED')) {
        const isRateLimit = error.message === 'RATE_LIMIT';
        const isQuota = error.message === 'QUOTA_EXCEEDED';
        const retryAfter = (error as any).retryAfter;
        
        const errorMessage: ChatMessage = {
          id: createMessageId('error'),
          role: 'assistant',
          content: isRateLimit 
            ? `⏱️ Quá nhiều request. Thử lại sau ${retryAfter || 60} giây.`
            : isQuota
            ? '🚫 Bạn đã hết lượt sử dụng tháng này. Vui lòng nâng cấp gói.'
            : '💳 Hết credits. Vui lòng nạp thêm để tiếp tục.',
          timestamp: new Date(),
          isError: true,
        };
        // @ts-ignore - errorCode and retryAfter are added in Phase 5
        errorMessage.errorCode = error.message;
        if (isRateLimit) errorMessage.retryAfter = retryAfter;
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
      // Clear elapsed timer
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      setState(prev => ({
        ...prev,
        isLoading: false,
        thinkingStatus: 'thinking',
        currentExecutingTool: null,
        agentTurnInfo: null,
        progressSteps: [],
        elapsedSeconds: 0,
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
