// ============================================
// TopicAIChatbot Types
// Updated: Phase 5 - Rate Limiting & Quotas + initialPrompt support
// ============================================

import { ContentGoal } from '@/types/multichannel';

// Web Speech API types
export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechRecognition extends EventTarget {
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

// Context badge from backend metadata
export interface RealtimeContextBadge {
  type: string; // includes 'conversation-memory' for conversation RAG
  label: string;
  detail?: string;
  confidence?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedTopics?: ExtractedTopic[];
  isError?: boolean;
  /** Error code for rate limit or quota errors */
  errorCode?: string;
  /** Seconds until retry is allowed (for rate limit errors) */
  retryAfter?: number;
  reactions?: string[];
  feedback?: 'up' | 'down';
  toolResults?: import('./ToolResultCard').ToolResult[];
  isToolExecuting?: boolean;
  contextBadges?: RealtimeContextBadge[];
  contextRichness?: number;
  reviewScores?: ReviewScores;
  agentContributions?: AgentContribution[];
  contextSources?: ContextSources;
  suggestedFollowUps?: string[];
  /** Topics suggested by Research Agent via discover_topics */
  suggestedTopics?: SuggestedTopic[];
  /** The best topic selected by Research Agent (user-confirmed) */
  selectedTopic?: string;
  /** Reason why this topic was selected */
  selectedTopicReason?: string;
  /** AI-recommended topic (auto from backend, not user-confirmed) */
  aiRecommendedTopic?: string;
  /** Refined variants from topic refinement step */
  refinedVariants?: RefinedVariant[];
  /** Conversation ID for feedback tracking */
  conversationId?: string;
  /** Trace ID for distributed tracing */
  traceId?: string;
}

export interface SuggestedTopic {
  topic: string;
  category: string;
  score: number | null;
  reasoning: string | null;
}

export interface RefinedVariant {
  topic: string;
  angle: string;
  hook?: string;
}

export interface ExtractedTopic {
  topic: string;
  reason?: string;
  format?: string;
}

// Handle interface for imperative methods
export interface TopicAIChatbotHandle {
  focusInput: () => void;
}


export interface TopicAIChatbotProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onNavigate: (path: string, state?: any) => void;
  onInjectPrompt?: (prompt: string) => void;
  className?: string;
  isExpanded?: boolean;
  /** Embedded mode hides header navigation and uses onTopicSelect callback */
  mode?: 'standalone' | 'embedded';
  /** Callback when user selects a topic in embedded mode */
  onTopicSelect?: (topic: string) => void;
  /** Callback when chatbot is ready with imperative handle */
  onReady?: (handle: TopicAIChatbotHandle) => void;
  /** Auto-send this prompt when chatbot mounts (used by intent detection) */
  initialPrompt?: string;
  /** Desktop layout mode — removes Card wrapper, uses larger sizing */
  desktopLayout?: boolean;
  /** Shared conversation state from parent (FlowaChatPage) */
  conversationState?: ConversationState;
}

// Agent turn events for multi-turn agentic loop
export interface AgentTurnEvent {
  type: 'turn_start' | 'tool_executing' | 'tool_result' | 'turn_complete' | 'loop_complete';
  turn_number?: number;
  max_turns?: number;
  tool_name?: string;
  tool_result?: any;
  exit_reason?: string;
  total_turns?: number;
  agent_name?: string;
  phase?: string;
}

// Review scores from Reviewer Agent
export interface ReviewScores {
  relevance: number;      // 0-100
  creativity: number;     // 0-100
  brandAlignment: number; // 0-100
  platformFit: number;    // 0-100
  overall: number;        // 0-100
  approved: boolean;
  feedback?: string;
}

// Agent contribution tracking
export interface AgentContribution {
  agentName: string;
  phase: string;
  duration?: number;
  summary?: string;
}

// Context source breakdown
export interface ContextSources {
  brandMemory: number;        // 0-100
  webSearch: number;
  conversationHistory: number;
  industryPack: number;
}

// Shared conversation state passed from parent
export interface ConversationState {
  conversations: import('@/hooks/useChatConversations').ChatConversation[];
  currentConversation: import('@/hooks/useChatConversations').ChatConversation | null;
  conversationMessages: import('@/hooks/useChatConversations').ChatConversationMessage[];
  isLoading: boolean;
  isSaving: boolean;
  loadConversation: (id: string) => Promise<void>;
  createConversation: (contentGoal?: string) => Promise<import('@/hooks/useChatConversations').ChatConversation | null>;
  addMessageToDB: (role: 'user' | 'assistant', content: string, metadata?: Record<string, any>) => Promise<import('@/hooks/useChatConversations').ChatConversationMessage | null>;
  deleteConversation: (id: string) => Promise<boolean>;
  archiveConversation: (id: string) => Promise<void>;
  clearCurrentConversation: () => void;
  summarizeConversation: (id: string, force?: boolean) => Promise<any>;
  loadConversations: () => Promise<void>;
}

// Dynamic width type
export type DynamicWidth = 'compact' | 'normal' | 'wide' | 'full';

// Active view type
export type ActiveView = 'chat' | 'discovery';
