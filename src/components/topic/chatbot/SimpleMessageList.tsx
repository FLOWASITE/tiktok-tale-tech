// ============================================
// SimpleMessageList
// Non-virtualized fallback to avoid render-loop issues
// ============================================

import { memo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatThinkingIndicator, type ThinkingStatus, type ProgressStep, type AgentTurnInfo } from './ChatThinkingIndicator';
import type { ChatMessage, ExtractedTopic, ReviewScores } from './types';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';

interface SimpleMessageListProps {
  messages: ChatMessage[];
  animatingMessageId: string | null;
  searchResults: string[];
  searchQuery: string;
  isLoading: boolean;
  thinkingStatus: ThinkingStatus;
  currentExecutingTool?: string;
  agentTurnInfo?: AgentTurnInfo | null;
  progressSteps?: ProgressStep[];
  elapsedSeconds?: number;
  userProfile: any;
  personalizedWelcome: PersonalizedWelcomeData | null;
  streamingAgentName?: string;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onRegenerate: (message: ChatMessage) => void;
  onTopicAction: (topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => void;
  onTopicRefinement: (topicTitle: string) => void;
  onSendFollowUp: (message: string) => void;
  onNavigate: (path: string, state?: any) => void;
  highlightSearchTerm: (text: string) => string;
  // Scroll handlers
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  pullDistance: number;
  isRefreshing: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  // Embedded mode
  mode?: 'standalone' | 'embedded';
  onTopicSelect?: (topic: string) => void;
}

const MessageRow = memo(function MessageRow({
  message,
  previousReviewScores,
  isAnimating,
  isHighlighted,
  isLoading,
  userProfile,
  personalizedWelcome,
  searchQuery,
  searchResults,
  streamingAgentName,
  onFeedback,
  onRegenerate,
  onTopicAction,
  onTopicRefinement,
  onSendFollowUp,
  onNavigate,
  highlightSearchTerm,
  mode,
  onTopicSelect,
}: {
  message: ChatMessage;
  previousReviewScores?: ReviewScores;
  isAnimating: boolean;
  isHighlighted: boolean;
  isLoading: boolean;
  userProfile: any;
  personalizedWelcome: PersonalizedWelcomeData | null;
  searchQuery: string;
  searchResults: string[];
  streamingAgentName?: string;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onRegenerate: (message: ChatMessage) => void;
  onTopicAction: (topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => void;
  onTopicRefinement: (topicTitle: string) => void;
  onSendFollowUp: (message: string) => void;
  onNavigate: (path: string, state?: any) => void;
  highlightSearchTerm: (text: string) => string;
  mode?: 'standalone' | 'embedded';
  onTopicSelect?: (topic: string) => void;
}) {
  return (
    <ChatMessageBubble
      message={message}
      previousReviewScores={previousReviewScores}
      isAnimating={isAnimating}
      isHighlighted={isHighlighted}
      isRegenerating={false}
      isLoading={isLoading}
      userProfile={userProfile}
      streamingAgentName={streamingAgentName}
      onFeedback={onFeedback}
      onRegenerate={onRegenerate}
      onTopicAction={onTopicAction}
      onTopicRefinement={onTopicRefinement}
      onSendFollowUp={onSendFollowUp}
      onNavigate={onNavigate}
      searchQuery={searchQuery}
      searchResults={searchResults}
      highlightSearchTerm={highlightSearchTerm}
      personalizedWelcome={personalizedWelcome}
      mode={mode}
      onTopicSelect={onTopicSelect}
    />
  );
});

export function SimpleMessageList({
  messages,
  animatingMessageId,
  searchResults,
  searchQuery,
  isLoading,
  thinkingStatus,
  currentExecutingTool,
  agentTurnInfo,
  progressSteps,
  elapsedSeconds,
  userProfile,
  personalizedWelcome,
  streamingAgentName,
  onFeedback,
  onRegenerate,
  onTopicAction,
  onTopicRefinement,
  onSendFollowUp,
  onNavigate,
  highlightSearchTerm,
  onScroll,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  pullDistance,
  isRefreshing,
  scrollContainerRef,
  mode,
  onTopicSelect,
}: SimpleMessageListProps) {
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll when new messages arrive and user is near bottom
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (messages.length > prevMessageCountRef.current) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 200) {
        requestAnimationFrame(() => {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        });
      }
    }

    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollContainerRef]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto px-2 sm:px-4 lg:px-6 py-3 lg:py-6 scroll-smooth"
      onScroll={onScroll}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center py-2 text-xs text-muted-foreground"
          style={{ height: pullDistance }}
        >
          {isRefreshing ? 'Đang làm mới...' : pullDistance >= 80 ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
        </div>
      )}

      <div className="space-y-4 lg:space-y-6 max-w-3xl mx-auto">
        {messages.map((message, idx) => {
          const isLastAssistant = isLoading && message.role === 'assistant' && idx === messages.length - 1;
          // Find previous assistant message's review scores for delta tracking
          let prevReviewScores: ReviewScores | undefined;
          if (message.role === 'assistant' && message.reviewScores) {
            for (let i = idx - 1; i >= 0; i--) {
              if (messages[i].role === 'assistant' && messages[i].reviewScores) {
                prevReviewScores = messages[i].reviewScores;
                break;
              }
            }
          }
          return (
            <div key={message.id} className={cn(idx > 0 && 'pt-0')}>
              <MessageRow
                message={message}
                previousReviewScores={prevReviewScores}
                isAnimating={animatingMessageId === message.id}
                isHighlighted={searchResults.includes(message.id)}
                isLoading={isLoading}
                userProfile={userProfile}
                personalizedWelcome={personalizedWelcome}
                searchQuery={searchQuery}
                searchResults={searchResults}
                streamingAgentName={isLastAssistant ? streamingAgentName : undefined}
                onFeedback={onFeedback}
                onRegenerate={onRegenerate}
                onTopicAction={onTopicAction}
                onTopicRefinement={onTopicRefinement}
                onSendFollowUp={onSendFollowUp}
                onNavigate={onNavigate}
                highlightSearchTerm={highlightSearchTerm}
                mode={mode}
                onTopicSelect={onTopicSelect}
              />
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {isLoading && (
          <div className="pt-4">
            <ChatThinkingIndicator 
              status={thinkingStatus} 
              currentTool={currentExecutingTool}
              agentTurn={agentTurnInfo}
              progressSteps={progressSteps}
              elapsedSeconds={elapsedSeconds}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
