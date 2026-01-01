// ============================================
// SimpleMessageList
// Non-virtualized fallback to avoid render-loop issues
// ============================================

import { memo, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatThinkingIndicator, type ThinkingStatus } from './ChatThinkingIndicator';
import type { ChatMessage, ExtractedTopic } from './types';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';

interface SimpleMessageListProps {
  messages: ChatMessage[];
  animatingMessageId: string | null;
  searchResults: string[];
  searchQuery: string;
  isLoading: boolean;
  thinkingStatus: ThinkingStatus;
  currentExecutingTool?: string;
  userProfile: any;
  personalizedWelcome: PersonalizedWelcomeData | null;
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
}

const MessageRow = memo(function MessageRow({
  message,
  isAnimating,
  isHighlighted,
  isLoading,
  userProfile,
  personalizedWelcome,
  searchQuery,
  searchResults,
  onFeedback,
  onRegenerate,
  onTopicAction,
  onTopicRefinement,
  onSendFollowUp,
  onNavigate,
  highlightSearchTerm,
}: {
  message: ChatMessage;
  isAnimating: boolean;
  isHighlighted: boolean;
  isLoading: boolean;
  userProfile: any;
  personalizedWelcome: PersonalizedWelcomeData | null;
  searchQuery: string;
  searchResults: string[];
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onRegenerate: (message: ChatMessage) => void;
  onTopicAction: (topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => void;
  onTopicRefinement: (topicTitle: string) => void;
  onSendFollowUp: (message: string) => void;
  onNavigate: (path: string, state?: any) => void;
  highlightSearchTerm: (text: string) => string;
}) {
  return (
    <ChatMessageBubble
      message={message}
      isAnimating={isAnimating}
      isHighlighted={isHighlighted}
      isRegenerating={false}
      isLoading={isLoading}
      userProfile={userProfile}
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
  userProfile,
  personalizedWelcome,
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
      className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 scroll-smooth"
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

      <div className="space-y-4">
        {messages.map((message, idx) => (
          <div key={message.id} className={cn(idx > 0 && 'pt-0')}>
            <MessageRow
              message={message}
              isAnimating={animatingMessageId === message.id}
              isHighlighted={searchResults.includes(message.id)}
              isLoading={isLoading}
              userProfile={userProfile}
              personalizedWelcome={personalizedWelcome}
              searchQuery={searchQuery}
              searchResults={searchResults}
              onFeedback={onFeedback}
              onRegenerate={onRegenerate}
              onTopicAction={onTopicAction}
              onTopicRefinement={onTopicRefinement}
              onSendFollowUp={onSendFollowUp}
              onNavigate={onNavigate}
              highlightSearchTerm={highlightSearchTerm}
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isLoading && (
          <div className="pt-4">
            <ChatThinkingIndicator status={thinkingStatus} currentTool={currentExecutingTool} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
