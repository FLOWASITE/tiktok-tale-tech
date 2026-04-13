// ============================================
// useChatStreaming Hook
// Handles SSE streaming, abort control, agentic events
// ============================================

import { useState, useRef, useCallback } from 'react';
import type { ChatMessage, RealtimeContextBadge, ReviewScores, AgentContribution, ContextSources, SuggestedTopic } from '@/components/topic/chatbot/types';
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
  subLabel?: string;
  progress?: number;
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
  forceWebSearch?: boolean;
  
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
    forceWebSearch,
    
    onMessageCreate,
    onMessageUpdate,
    onComplete,
    onError,
  } = options;
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contentFallbackRef = useRef<NodeJS.Timeout | null>(null);
  
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
    if (contentFallbackRef.current) {
      clearInterval(contentFallbackRef.current);
      contentFallbackRef.current = null;
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
      // Get user access token for proper auth propagation
      const { data: sessionData } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('AUTH_SESSION_MISSING');
      }
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: apiMessages,
          brandTemplateId,
          contentGoal,
          organizationId,
          userId,
          forceWebSearch,
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
      let pendingReviewScores: ReviewScores | undefined = undefined;
      let pendingAgentContributions: AgentContribution[] = [];
      let pendingContextSources: ContextSources | undefined = undefined;
      let pendingSuggestedFollowUps: string[] | undefined = undefined;
      let pendingSuggestedTopics: SuggestedTopic[] | undefined = undefined;
      let pendingSelectedTopic: string | undefined = undefined;
      let pendingSelectedTopicReason: string | undefined = undefined;
      let pendingRefinedVariants: import('@/components/topic/chatbot/types').RefinedVariant[] | undefined = undefined;
      let hasStepResults = false;
      let finalContentStarted = false;
      let isGraphEngineMode = false;
      
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
      
      // Error Recovery: SSE reconnect tracking
      let sseRetryCount = 0;
      const MAX_SSE_RETRIES = 3;
      let continuationToken: string | null = null;
      let receivedFinalResponse = false;
      let receivedDone = false;

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch (networkError) {
          // SSE Connection Drop — auto-reconnect with exponential backoff
          sseRetryCount++;
          if (sseRetryCount <= MAX_SSE_RETRIES) {
            const backoffMs = Math.pow(2, sseRetryCount - 1) * 1000; // 1s, 2s, 4s
            console.warn(`[useChatStreaming] SSE read error, retry ${sseRetryCount}/${MAX_SSE_RETRIES} in ${backoffMs}ms`);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          // After max retries, show specific error
          const errorMessage: ChatMessage = {
            id: createMessageId('error'),
            role: 'assistant',
            content: assistantContent
              ? `${assistantContent}\n\n---\n⚠️ Kết nối bị gián đoạn. Nội dung trên chưa hoàn chỉnh.`
              : '❌ Kết nối bị gián đoạn sau nhiều lần thử. Vui lòng thử lại.',
            timestamp: new Date(),
            isError: !assistantContent,
            isRetryable: true,
          } as ChatMessage;
          onMessageCreate(errorMessage);
          return null;
        }
        const { done, value } = readResult;
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
          if (jsonStr === '[DONE]') { receivedDone = true; continue; }
          
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Topic suggestions from Research Agent
            if (parsed.type === 'topic_suggestions' && parsed.data?.topics) {
              console.log('[Chat] Received topic_suggestions:', parsed.data.topics.length, 'topics');
              pendingSuggestedTopics = parsed.data.topics;
              // Don't auto-select: store as AI recommendation only
              pendingSelectedTopic = undefined;
              pendingRefinedVariants = parsed.data.refined_variants || undefined;
              pendingSelectedTopicReason = parsed.data.best_topic_reason || undefined;
              // Store AI recommendation separately
              const aiRecommended = parsed.data.best_topic || parsed.data.topics?.[0]?.topic || undefined;

              // Render ngay cả khi chưa có content_chunk để tránh mất TopicSuggestionsCard
              if (messageCreated) {
                onMessageUpdate(assistantId, {
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: undefined,
                  aiRecommendedTopic: aiRecommended,
                  selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                });
              } else {
                const topicOnlyMessage: ChatMessage = {
                  id: assistantId,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: undefined,
                  aiRecommendedTopic: aiRecommended,
                  selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                };
                onMessageCreate(topicOnlyMessage);
                messageCreated = true;
              }
              continue;
            }

            // ---- Graph Engine events ----
            if (parsed.type === 'graph_plan' && parsed.data?.steps) {
              // 5-Agent Pipeline grouping: map backend nodes → 5 pipeline agents
              const NODE_TO_GROUP: Record<string, string> = {
                'orchestrator': 'strategy',
                'research': 'strategy',
                'brand_memory': 'strategy',
                'strategy': 'strategy',
                'content': 'creator',
                'image': 'creator',
                'visual': 'creator',
                'compliance': 'quality',
                'reviewer': 'quality',
                'governor': 'quality',
                'quality': 'quality',
                'approval': 'approval',
                'publisher': 'publisher',
                'publish': 'publisher',
              };
              const GROUP_META: Record<string, { label: string; order: number }> = {
                'strategy': { label: '💡 Chiến lược', order: 0 },
                'creator': { label: '✍️ Sáng tạo', order: 1 },
                'quality': { label: '🛡️ Chất lượng', order: 2 },
                'approval': { label: '✅ Phê duyệt', order: 3 },
                'publisher': { label: '📤 Xuất bản', order: 4 },
              };

              // Collect all unique nodes from plan
              const allNodes = new Set<string>();
              for (const step of parsed.data.steps) {
                allNodes.add(step.node);
                if (step.parallelWith) step.parallelWith.forEach((n: string) => allNodes.add(n));
              }

              // Group nodes and create one step per group
              const groupsSeen = new Set<string>();
              const planSteps: ProgressStep[] = [];
              // Track which backend nodes belong to each group for later lookup
              const groupNodeMap: Record<string, string[]> = {};

              for (const node of allNodes) {
                const group = NODE_TO_GROUP[node] || 'strategy';
                if (!groupNodeMap[group]) groupNodeMap[group] = [];
                groupNodeMap[group].push(node);
                if (groupsSeen.has(group)) continue;
                groupsSeen.add(group);
                const meta = GROUP_META[group] || { label: group, order: 99 };
                const isFirstGroup = group === 'strategy';
                planSteps.push({
                  id: group,
                  label: meta.label,
                  status: isFirstGroup && parsed.data.orchestratorDurationMs ? 'active' : 'pending',
                  duration: isFirstGroup ? parsed.data.orchestratorDurationMs : undefined,
                });
              }

              // Sort by pipeline order
              planSteps.sort((a, b) => {
                const oa = GROUP_META[a.id]?.order ?? 99;
                const ob = GROUP_META[b.id]?.order ?? 99;
                return oa - ob;
              });

              isGraphEngineMode = true;
              // Store group→nodes mapping for node_start/end/progress lookups
              (window as any).__agentGroupNodeMap = groupNodeMap;
              (window as any).__agentNodeToGroup = NODE_TO_GROUP;
              setState(prev => ({ ...prev, progressSteps: planSteps }));
              continue;
            }

            if (parsed.type === 'node_start' && parsed.data?.node) {
              const nodeName = parsed.data.node;
              const nodeToGroup = (window as any).__agentNodeToGroup || {};
              const groupId = nodeToGroup[nodeName] || nodeName;
              const NODE_SUB_LABELS: Record<string, string> = {
                'orchestrator': 'Đang điều phối...',
                'research': 'Đang nghiên cứu...',
                'brand_memory': 'Đang tải Brand Memory...',
                'strategy': 'Đang lập chiến lược...',
                'content': 'Đang tạo nội dung...',
                'image': 'Đang tạo hình ảnh...',
                'visual': 'Đang xử lý visual...',
                'compliance': 'Đang kiểm tra tuân thủ...',
                'reviewer': 'Đang kiểm duyệt...',
                'governor': 'Đang kiểm soát chất lượng...',
              };
              setState(prev => ({
                ...prev,
                thinkingStatus: 'executing_tools',
                currentExecutingTool: groupId,
                progressSteps: prev.progressSteps.map(step =>
                  step.id === groupId
                    ? { ...step, status: 'active' as const, startTime: step.startTime || Date.now(), subLabel: NODE_SUB_LABELS[nodeName] || `Đang xử lý ${nodeName}...`, progress: undefined }
                    : step
                ),
              }));

              // Fallback timer for creator group (content node)
              if (nodeName === 'content') {
                if (contentFallbackRef.current) clearInterval(contentFallbackRef.current);
                const contentStartTime = Date.now();
                contentFallbackRef.current = setInterval(() => {
                  const elapsed = (Date.now() - contentStartTime) / 1000;
                  let subLabel: string;
                  let progress: number;
                  if (elapsed < 5) { subLabel = 'Chuẩn bị nội dung...'; progress = 20; }
                  else if (elapsed < 15) { subLabel = 'Đang tạo nội dung...'; progress = 55; }
                  else if (elapsed < 25) { subLabel = 'Đang hoàn thiện...'; progress = 80; }
                  else { subLabel = 'Sắp xong...'; progress = 92; }
                  setState(prev => {
                    const step = prev.progressSteps.find(s => s.id === 'creator');
                    if (step?.status !== 'active') return prev;
                    return {
                      ...prev,
                      progressSteps: prev.progressSteps.map(s =>
                        s.id === 'creator' && s.status === 'active'
                          ? { ...s, subLabel, progress }
                          : s
                      ),
                    };
                  });
                }, 2000);
              }
              continue;
            }

            // Handle node_progress for sub-step updates
            if (parsed.type === 'node_progress' && parsed.data?.node) {
              const { node, subStep, label, progress } = parsed.data;
              const nodeToGroup = (window as any).__agentNodeToGroup || {};
              const groupId = nodeToGroup[node] || node;
              setState(prev => ({
                ...prev,
                progressSteps: prev.progressSteps.map(step =>
                  step.id === groupId && step.status === 'active'
                    ? { ...step, subLabel: label, progress }
                    : step
                ),
              }));
              continue;
            }

            if (parsed.type === 'node_complete' && parsed.data?.node) {
              const nodeName = parsed.data.node;
              const durationMs = parsed.data.durationMs;
              const nodeToGroup = (window as any).__agentNodeToGroup || {};
              const groupNodeMap = (window as any).__agentGroupNodeMap || {};
              const groupId = nodeToGroup[nodeName] || nodeName;
              // Clear content fallback timer
              if (nodeName === 'content' && contentFallbackRef.current) {
                clearInterval(contentFallbackRef.current);
                contentFallbackRef.current = null;
              }
              // Check if ALL nodes in this group are now complete
              const groupNodes = groupNodeMap[groupId] || [nodeName];
              setState(prev => {
                // Check completed nodes in this group: a node is complete if it's not in progressSteps (old system) or tracked via contributions
                const completedNodesInGroup = groupNodes.filter((n: string) =>
                  n === nodeName || pendingAgentContributions.some(c => c.agentName === n)
                );
                const allGroupDone = completedNodesInGroup.length >= groupNodes.length;
                const step = prev.progressSteps.find(s => s.id === groupId);
                const accumulatedDuration = (step?.duration || 0) + (durationMs || 0);

                return {
                  ...prev,
                  currentExecutingTool: allGroupDone ? null : groupId,
                  thinkingStatus: allGroupDone ? 'generating' : prev.thinkingStatus,
                  progressSteps: prev.progressSteps.map(s =>
                    s.id === groupId
                      ? {
                          ...s,
                          status: allGroupDone ? 'complete' as const : 'active' as const,
                          duration: allGroupDone ? accumulatedDuration : s.duration,
                          subLabel: allGroupDone ? undefined : s.subLabel,
                          progress: allGroupDone ? undefined : s.progress,
                        }
                      : s
                  ),
                };
              });
              // Track as agent contribution
              pendingAgentContributions.push({
                agentName: nodeName,
                phase: 'graph_engine',
                duration: durationMs,
              });

              // Quality warning: Governor completed but content didn't meet optimal quality
              if (nodeName === 'governor' && parsed.data.exitReason === 'quality_warning') {
                toast({
                  variant: 'default',
                  title: '⚠️ Cảnh báo chất lượng',
                  description: `Nội dung chưa đạt tiêu chuẩn tối ưu sau ${parsed.data.revisionRound || 'nhiều'} vòng revision (score: ${parsed.data.reviewScore || 'N/A'}). Bạn có thể yêu cầu chỉnh sửa thêm.`,
                  className: 'border-amber-500/50 bg-amber-500/5',
                });
              }
              continue;
            }

            if (parsed.type === 'node_error' && parsed.data?.node) {
              const nodeName = parsed.data.node;
              const nodeToGroup = (window as any).__agentNodeToGroup || {};
              const groupId = nodeToGroup[nodeName] || nodeName;
              const isCritical = parsed.data.critical === true ||
                ['content', 'reviewer'].includes(nodeName);
              setState(prev => ({
                ...prev,
                currentExecutingTool: null,
                progressSteps: prev.progressSteps.map(step =>
                  step.id === nodeName
                    ? { ...step, status: 'error' as const }
                    : step
                ),
              }));
              // Critical Node Error — show specific message instead of generic
              if (isCritical) {
                const errorDetail = parsed.data.error || 'Unknown error';
                const criticalMsg: ChatMessage = {
                  id: createMessageId('error'),
                  role: 'assistant',
                  content: `⚠️ Node **${nodeName}** gặp lỗi: ${errorDetail}.\nBạn có muốn thử lại?`,
                  timestamp: new Date(),
                  isError: true,
                  isRetryable: true,
                } as ChatMessage;
                onMessageCreate(criticalMsg);
                return null;
              }
              continue;
            }

            // Continuation pattern - auto-resume long-running workflows
            if (parsed.type === 'continuation_required' && parsed.data?.continuationToken) {
              console.log('[useChatStreaming] Continuation required, token:', parsed.data.continuationToken);
              continuationToken = parsed.data.continuationToken;
              continue;
            }
            if (parsed.type === 'context_metadata' && parsed.badges) {
              pendingContextBadges = parsed.badges;
              contextRichness = parsed.context_richness_score;
              if (parsed.context_sources) {
                pendingContextSources = parsed.context_sources;
              }
              continue;
            }
            
            // Review scores from reviewer agent
            if (parsed.type === 'review_scores' && parsed.data) {
              pendingReviewScores = parsed.data;
              continue;
            }
            
            // Agent completion event
            if (parsed.type === 'agent_complete' && parsed.data) {
              pendingAgentContributions.push({
                agentName: parsed.data.agent_name,
                phase: parsed.data.phase || '',
                duration: parsed.data.duration,
                summary: parsed.data.summary,
              });
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
              const agentDisplayName = parsed.data?.agent_name;
              const phase = parsed.data?.phase;
              setState(prev => {
                // Update dynamic progress steps: mark current agent as active, previous as complete
                const updatedSteps = prev.progressSteps.map(step => {
                  if (step.id === toolName) {
                    return { ...step, status: 'active' as const, startTime: Date.now() };
                  }
                  if (step.status === 'active' && step.id !== toolName) {
                    return { ...step, status: 'complete' as const, duration: Date.now() - (step.startTime || Date.now()) };
                  }
                  return step;
                });

                return {
                  ...prev,
                  currentExecutingTool: toolName,
                  thinkingStatus: 'executing_tools',
                  progressSteps: updatedSteps,
                  agentTurnInfo: prev.agentTurnInfo ? {
                    ...prev.agentTurnInfo,
                    toolsExecuted: [...prev.agentTurnInfo.toolsExecuted, toolName],
                    agentName: agentDisplayName || prev.agentTurnInfo.agentName,
                    phase: phase || prev.agentTurnInfo.phase,
                  } : {
                    currentTurn: parsed.data?.turn || 1,
                    maxTurns: 5,
                    toolsExecuted: [toolName],
                    isComplete: false,
                    agentName: agentDisplayName,
                    phase: phase,
                  },
                };
              });
              continue;
            }
            
            // Agent step result — realtime streaming of each agent's output
            if (parsed.type === 'agent_step_result' && parsed.data?.content) {
              const agentName = parsed.data.agent_name || parsed.data.agent || 'Agent';
              const durationSec = parsed.data.duration_ms ? (parsed.data.duration_ms / 1000).toFixed(1) : null;
              const stepHeader = durationSec
                ? `\n\n---\n\n**${agentName}** *(${durationSec}s)*\n\n`
                : `\n\n---\n\n**${agentName}**\n\n`;
              assistantContent += stepHeader + parsed.data.content;
              hasStepResults = true;

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
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                };
                onMessageCreate(newMessage);
              } else {
                onMessageUpdate(assistantId, {
                  content: assistantContent,
                  extractedTopics: extractTopicsFromMessage(assistantContent),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                });
              }
              continue;
            }
            
            // Agentic content_chunk event (from agentic-loop.ts)
            if (parsed.type === 'content_chunk' && parsed.data?.chunk) {
              // If we already have step results AND not in graph engine mode, skip to avoid duplicate/flicker
              // Graph Engine always sends content_chunk as final output, so we must render it
              if (hasStepResults && !isGraphEngineMode) {
                continue;
              }
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
                      // Mark any remaining active/pending agent steps as complete
                      : (step.status === 'active' || step.status === 'pending') && step.id !== 'response'
                      ? { ...step, status: 'complete' as const, duration: step.startTime ? Date.now() - step.startTime : undefined }
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
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                };
                onMessageCreate(newMessage);
              } else {
                onMessageUpdate(assistantId, {
                  content: assistantContent,
                  extractedTopics: extractTopicsFromMessage(assistantContent),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                });
              }
              continue;
            }
            
            // Agentic final_response event
            if (parsed.type === 'final_response') {
              receivedFinalResponse = true;
              if (parsed.data?.content && !assistantContent) {
                assistantContent = parsed.data.content;
              }
              if (parsed.data?.suggested_followups) {
                pendingSuggestedFollowUps = parsed.data.suggested_followups;
              }
              continue;
            }
            
            // Agentic tool_result event (can be classification or actual tool result)
            if (parsed.type === 'tool_result' && parsed.data) {
              // Handle classification event from supervisor — build dynamic progress steps
              if (parsed.data.type === 'classification' && parsed.data.suggestedAgents) {
                const agentLabels: Record<string, string> = {
                  'research-agent': '🔍 Nghiên cứu xu hướng',
                  'strategy-agent': '📋 Lập kế hoạch',
                  'content-agent': '✍️ Tạo nội dung',
                  'reviewer-agent': '✅ Kiểm tra chất lượng',
                  'image-agent': '🎨 Tạo hình ảnh',
                  'brand-memory-agent': '🧠 Cập nhật thương hiệu',
                };
                const dynamicSteps: ProgressStep[] = parsed.data.suggestedAgents.map((agent: string) => ({
                  id: agent,
                  label: agentLabels[agent] || agent,
                  status: 'pending' as const,
                }));
                setState(prev => ({
                  ...prev,
                  progressSteps: dynamicSteps,
                }));
                continue;
              }

              receivedToolResults = receivedToolResults || [];
              receivedToolResults.push({
                tool_name: parsed.data.tool || parsed.data.agent || 'unknown',
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
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                };
                onMessageCreate(newMessage);
              } else {
                onMessageUpdate(assistantId, {
                  content: assistantContent,
                  extractedTopics: extractTopicsFromMessage(assistantContent),
                  toolResults: receivedToolResults || undefined,
                  contextBadges: pendingContextBadges || undefined,
                  contextRichness,
                  reviewScores: pendingReviewScores,
                  agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
                  contextSources: pendingContextSources,
                  suggestedFollowUps: pendingSuggestedFollowUps,
                  suggestedTopics: pendingSuggestedTopics,
                  selectedTopic: pendingSelectedTopic,
                   selectedTopicReason: pendingSelectedTopicReason,
                  refinedVariants: pendingRefinedVariants,
                });
              }
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
      
      // Timeout with Partial Result detection
      const isPartialResult = assistantContent && !receivedFinalResponse && !receivedDone;
      
      // If continuation token was received, auto-resume
      if (continuationToken && assistantContent) {
        const partialContent = assistantContent + '\n\n⏳ *Đang hoàn thiện...*';
        if (messageCreated) {
          onMessageUpdate(assistantId, { content: partialContent });
        } else {
          onMessageCreate({
            id: assistantId,
            role: 'assistant',
            content: partialContent,
            timestamp: new Date(),
          });
          messageCreated = true;
        }

        // Auto-trigger continuation with the token
        console.log('[useChatStreaming] Auto-resuming with continuation token:', continuationToken);
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;
          if (accessToken) {
            const resumeResponse = await fetch(CHAT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                messages: apiMessages,
                brandTemplateId,
                contentGoal,
                organizationId,
                userId,
                continuationToken,
              }),
            });

            if (resumeResponse.ok && resumeResponse.body) {
              const resumeReader = resumeResponse.body.getReader();
              // Read continuation stream and append content
              while (true) {
                const { done: rDone, value: rValue } = await resumeReader.read();
                if (rDone) break;
                const rText = decoder.decode(rValue, { stream: true });
                // Parse SSE lines for content_chunk
                for (const rLine of rText.split('\n')) {
                  if (!rLine.startsWith('data: ') || rLine.includes('[DONE]')) continue;
                  try {
                    const rParsed = JSON.parse(rLine.slice(6));
                    if (rParsed.type === 'content_chunk' && rParsed.data?.chunk) {
                      assistantContent += rParsed.data.chunk;
                      onMessageUpdate(assistantId, { content: assistantContent });
                    }
                  } catch { /* skip invalid JSON */ }
                }
              }
              console.log('[useChatStreaming] Continuation completed successfully');
            }
          }
        } catch (resumeErr) {
          console.warn('[useChatStreaming] Auto-resume failed:', resumeErr);
          // Keep partial content with warning
          assistantContent += '\n\n---\n⚠️ Không thể tiếp tục tự động. Vui lòng thử lại.';
          onMessageUpdate(assistantId, { content: assistantContent });
        }
      }

      // Final message
      const finalMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: isPartialResult && !continuationToken
          ? assistantContent + '\n\n---\n⚠️ **Nội dung chưa hoàn chỉnh** — kết nối kết thúc trước khi hoàn tất.'
          : assistantContent,
        timestamp: new Date(),
        extractedTopics: extractTopicsFromMessage(assistantContent),
        toolResults: receivedToolResults || undefined,
        contextBadges: pendingContextBadges || undefined,
        contextRichness,
        reviewScores: pendingReviewScores,
        agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
        contextSources: pendingContextSources,
        suggestedFollowUps: pendingSuggestedFollowUps,
        suggestedTopics: pendingSuggestedTopics,
        selectedTopic: pendingSelectedTopic,
        selectedTopicReason: pendingSelectedTopicReason,
        refinedVariants: pendingRefinedVariants,
      };
      
      if (!messageCreated && (assistantContent || receivedToolResults || (pendingSuggestedTopics && pendingSuggestedTopics.length > 0))) {
        onMessageCreate(finalMessage);
      } else if (messageCreated) {
        onMessageUpdate(assistantId, {
          content: finalMessage.content,
          extractedTopics: extractTopicsFromMessage(assistantContent),
          toolResults: receivedToolResults || undefined,
          contextBadges: pendingContextBadges || undefined,
          contextRichness,
          reviewScores: pendingReviewScores,
          agentContributions: pendingAgentContributions.length > 0 ? pendingAgentContributions : undefined,
          contextSources: pendingContextSources,
          suggestedFollowUps: pendingSuggestedFollowUps,
          suggestedTopics: pendingSuggestedTopics,
          selectedTopic: pendingSelectedTopic,
           selectedTopicReason: pendingSelectedTopicReason,
          refinedVariants: pendingRefinedVariants,
        });
      }
      
      onComplete?.();
      return finalMessage;
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      
      if (error instanceof Error && error.message === 'AUTH_SESSION_MISSING') {
        const errorMessage: ChatMessage = {
          id: createMessageId('error'),
          role: 'assistant',
          content: '🔒 Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tạo nội dung.',
          timestamp: new Date(),
          isError: true,
        };
        onMessageCreate(errorMessage);
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
