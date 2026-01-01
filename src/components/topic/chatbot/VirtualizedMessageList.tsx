// Virtualized message list for performance optimization
import { useRef, useCallback, useEffect, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatThinkingIndicator, type ThinkingStatus } from './ChatThinkingIndicator';
import type { ChatMessage, ExtractedTopic } from './types';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';

interface VirtualizedMessageListProps {
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

// Memoized message row to prevent unnecessary re-renders
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
}, (prevProps, nextProps) => {
  // Custom comparison for memoization
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isAnimating === nextProps.isAnimating &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.searchQuery === nextProps.searchQuery
  );
});

export function VirtualizedMessageList({
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
}: VirtualizedMessageListProps) {
  // Use the parent-provided ref to avoid ref-sync side effects
  const scrollElRef = scrollContainerRef;
  
  // Estimate row height based on message content
  const estimateSize = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return 120;
    
    // Welcome message is typically larger
    if (message.id === 'welcome') return 300;
    
    // User messages are typically shorter
    if (message.role === 'user') {
      const lineCount = Math.ceil(message.content.length / 60);
      return Math.max(60, lineCount * 24 + 40);
    }
    
    // Assistant messages with topics are larger
    if (message.extractedTopics?.length) {
      return 200 + message.extractedTopics.length * 80;
    }
    
    // Regular assistant messages
    const lineCount = Math.ceil(message.content.length / 80);
    return Math.max(100, lineCount * 20 + 60);
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollElRef.current,
    estimateSize,
    overscan: 3,
    getItemKey: (index) => messages[index]?.id || index,
  });

  // Track previous message count for auto-scroll
  const prevMessageCountRef = useRef(messages.length);
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' });
      });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={scrollElRef}
      className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 scroll-smooth"
      onScroll={onScroll}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center py-2 text-xs text-muted-foreground"
          style={{ height: pullDistance }}
        >
          {isRefreshing ? 'Đang làm mới...' : pullDistance >= 80 ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
        </div>
      )}
      
      {/* Virtualized container */}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow) => {
          const message = messages[virtualRow.index];
          if (!message) return null;
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn(
                'absolute top-0 left-0 w-full',
                virtualRow.index > 0 && 'pt-4'
              )}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
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
          );
        })}
      </div>
      
      {/* Thinking indicator outside virtualization */}
      <AnimatePresence>
        {isLoading && (
          <div className="pt-4">
            <ChatThinkingIndicator 
              status={thinkingStatus}
              currentTool={currentExecutingTool}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
