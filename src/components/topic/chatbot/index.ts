// ============================================
// Chatbot Components Index
// ============================================

// Types & Constants & Utils
export * from './types';
export * from './constants';
export * from './utils';

// Core Components
export { CodeBlock } from './CodeBlock';
export { MessageFeedback } from './MessageFeedback';
export { ArtifactsPanel, type ArtifactTopic } from './ArtifactsPanel';
export { DiscoveryTab } from './DiscoveryTab';
export { DiscoveryChips } from './DiscoveryChips';
export { 
  ContextBadges, 
  ContextSummary, 
  parseContextBadges, 
  removeContextLine,
  type ContextBadgeType,
  type ParsedContextBadge
} from './ContextBadges';
export { ConversationHistorySidebar } from './ConversationHistorySidebar';
export { ToolResultCard, ToolExecutionLoading, type ToolResult } from './ToolResultCard';
export { ChatThinkingIndicator, type ThinkingStatus, type AgentTurnInfo } from './ChatThinkingIndicator';

// Refactored Sub-Components
export { MessageSkeleton } from './MessageSkeleton';
export { CopyButton } from './CopyButton';
export { EmojiReactions } from './EmojiReactions';
export { ChatHeader } from './ChatHeader';
export { ChatInputArea } from './ChatInputArea';
export { ChatOnboarding } from './ChatOnboarding';
export { ChatMessageBubble } from './ChatMessageBubble';
export { VirtualizedMessageList } from './VirtualizedMessageList';
export { LazyMessageContent, MessageContentSkeleton, LazyMarkdown } from './LazyMessageContent';
