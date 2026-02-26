// ============================================
// ChatMessageBubble Component
// Individual message rendering with all features
// ============================================

import { Bot, MessageSquare, Video, Images, Plus, Shuffle, Search as SearchIcon, User, AlertCircle, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import type { ChatMessage, ExtractedTopic } from './types';
import type { ParsedContextBadge } from './ContextBadges';
import { CodeBlock } from './CodeBlock';
import { Loader2, RefreshCcw } from 'lucide-react';
import { ToolResultCard, type ToolResult } from './ToolResultCard';
import { ContextBadges, ContextQualityMeter, MobileContextBadges, parseContextBadges, removeContextLine } from './ContextBadges';
import { CopyButton } from './CopyButton';
import { MessageSkeleton } from './MessageSkeleton';
import { formatTimestamp } from './utils';
import { PersonalizedWelcome } from './PersonalizedWelcome';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';
import { ReviewScoreCard } from './ReviewScoreCard';
import { AgentAttributionBar } from './AgentAttributionBar';
import { TopicSuggestionsCard } from './TopicSuggestionsCard';
import { ContentFeedback } from '@/components/chat/ContentFeedback';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  previousReviewScores?: import('./types').ReviewScores;
  isAnimating: boolean;
  isHighlighted: boolean;
  isRegenerating: boolean;
  isLoading: boolean;
  // User profile
  userProfile?: { avatar_url?: string; full_name?: string };
  // Streaming agent name
  streamingAgentName?: string;
  // Handlers
  onReaction?: (messageId: string, emoji: string) => void;
  onFeedback: (messageId: string, feedback: 'up' | 'down') => void;
  onRegenerate: (message: ChatMessage) => void;
  onTopicAction: (topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => void;
  onTopicRefinement: (topic: string) => void;
  onSendFollowUp: (message: string) => void;
  onNavigate: (path: string, state?: any) => void;
  // Search
  searchQuery?: string;
  searchResults?: string[];
  highlightSearchTerm?: (text: string) => string;
  // Personalized welcome
  personalizedWelcome?: PersonalizedWelcomeData;
  // Embedded mode
  mode?: 'standalone' | 'embedded';
  onTopicSelect?: (topic: string) => void;
}

export function ChatMessageBubble({
  message,
  previousReviewScores,
  isAnimating,
  isHighlighted,
  isRegenerating,
  isLoading,
  userProfile,
  streamingAgentName,
  onFeedback,
  onRegenerate,
  onTopicAction,
  onTopicRefinement,
  onSendFollowUp,
  onNavigate,
  searchQuery,
  searchResults = [],
  highlightSearchTerm,
  personalizedWelcome,
  mode = 'standalone',
  onTopicSelect,
}: ChatMessageBubbleProps) {
  // Check if this is a personalized welcome message
  const isPersonalizedWelcome = message.id === 'welcome' && 
    (message.content === '__PERSONALIZED_WELCOME__' || message.content.includes('AI Content Strategist'));

  // Get context badges - prefer realtime badges from backend
  const contextBadges: ParsedContextBadge[] = message.contextBadges 
    ? message.contextBadges.map(b => ({
        type: b.type as ParsedContextBadge['type'],
        label: b.label,
        detail: b.detail,
      }))
    : parseContextBadges(message.content);

  // Clean content (remove context line for display)
  const cleanContent = removeContextLine(message.content);

  // Render personalized welcome
  if (isPersonalizedWelcome && personalizedWelcome) {
    return (
      <div
        id={`message-${message.id}`}
        className="flex gap-2 animate-in fade-in-0 duration-300"
      >
        <div className="flex-1 min-w-0">
          <PersonalizedWelcome
            data={personalizedWelcome}
            onSuggestionClick={onSendFollowUp}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'flex gap-2.5 message-entrance',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
        isAnimating && 'animate-in slide-in-from-bottom-4 duration-400',
        isHighlighted && 'bg-amber-500/10 dark:bg-amber-500/5 -mx-2 px-2 py-1.5 rounded-xl ring-1 ring-amber-500/20',
        isRegenerating && 'opacity-50'
      )}
    >
      {message.role === 'assistant' && (
        <div className="shrink-0 relative ai-avatar-pulse">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/20">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      )}
      
      <div className={cn(
        'flex-1 space-y-1.5 min-w-0',
        message.role === 'user' && 'flex flex-col items-end'
      )}>
        {/* Error message */}
        {message.isError ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-xs flex-1">{message.content}</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-[10px] hover:bg-destructive/20"
              onClick={() => onRegenerate(message)}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Thử lại
            </Button>
          </div>
        ) : (
          <div className={cn(
            'relative group/message rounded-2xl px-3.5 py-2.5 max-w-[90%] text-sm transition-all duration-200',
            message.role === 'user' 
              ? 'bg-gradient-to-br from-primary to-violet-600 text-primary-foreground ml-auto rounded-br-sm shadow-lg shadow-primary/20' 
              : 'glass-chat-bubble rounded-bl-sm'
          )}>
            {message.content ? (
              message.role === 'assistant' ? (
                (() => {
                  return (
                    <>
                      {/* Agent Attribution Bar */}
                      {message.agentContributions && message.agentContributions.length > 0 && (
                        <div className="mb-2 pb-2 border-b border-border/30">
                          <AgentAttributionBar
                            contributions={message.agentContributions}
                            approved={message.reviewScores?.approved}
                          />
                        </div>
                      )}

                      {/* Context Badges + Quality Meter */}
                      {contextBadges.length > 0 && message.id !== 'welcome' && (
                        <div className="mb-2 pb-2 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            {/* Desktop: full badges, Mobile: truncated */}
                            <div className="hidden sm:block">
                              <ContextBadges badges={contextBadges} />
                            </div>
                            <div className="sm:hidden">
                              <MobileContextBadges badges={contextBadges} maxVisible={3} />
                            </div>
                            {message.contextRichness !== undefined && message.contextRichness >= 30 && (
                              <ContextQualityMeter
                                richness={message.contextRichness}
                                sources={message.contextSources}
                                className="ml-auto"
                              />
                            )}
                          </div>
                        </div>
                      )}
                      {/* Streaming agent indicator */}
                      {streamingAgentName && isLoading && (
                        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-border/20">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            {streamingAgentName} đang viết
                            <span className="inline-flex gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
                        {searchQuery && searchResults.includes(message.id) && highlightSearchTerm ? (
                          <div dangerouslySetInnerHTML={{ __html: highlightSearchTerm(cleanContent) }} />
                        ) : (
                          <ReactMarkdown
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');
                                
                                if (!inline && (match || codeString.includes('\n'))) {
                                  return <CodeBlock language={match?.[1]}>{codeString}</CodeBlock>;
                                }
                                
                                return (
                                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {cleanContent}
                          </ReactMarkdown>
                        )}
                      </div>
                    </>
                  );
                })()
              ) : (
                <p 
                  className="text-sm whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={searchQuery && searchResults.includes(message.id) && highlightSearchTerm
                    ? { __html: highlightSearchTerm(message.content) }
                    : undefined
                  }
                >
                  {!(searchQuery && searchResults.includes(message.id)) && message.content}
                </p>
              )
            ) : (
              isLoading && message.role === 'assistant' && <MessageSkeleton />
            )}
            
            {/* Copy button */}
            {message.role === 'assistant' && message.content && !isLoading && (
              <CopyButton content={message.content} />
            )}

            {/* Topic Suggestions Card */}
            {message.role === 'assistant' && message.suggestedTopics && message.suggestedTopics.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <TopicSuggestionsCard
                  topics={message.suggestedTopics}
                  selectedTopic={message.selectedTopic}
                  refinedVariants={message.refinedVariants}
                />
              </div>
            )}

            {/* Review Score Card */}
            {message.role === 'assistant' && message.reviewScores && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <ReviewScoreCard
                  scores={message.reviewScores}
                  previousScores={previousReviewScores}
                  onRequestImprove={message.reviewScores.overall < 70
                    ? () => onSendFollowUp('Hãy cải thiện nội dung dựa trên review feedback')
                    : undefined
                  }
                />
              </div>
            )}

            {/* Content Feedback (thumbs + tags) */}
            {message.role === 'assistant' && message.content && !isLoading && message.id !== 'welcome' && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <ContentFeedback
                  messageId={message.id}
                  conversationId={message.conversationId}
                  traceId={message.traceId}
                  governorScore={message.reviewScores?.overall}
                  className="px-0.5"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Timestamp and Reactions */}
        {!message.isError && (
          <div className={cn(
            'flex items-center gap-2 px-1 mt-0.5',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}>
            <span className="text-[10px] text-muted-foreground/70">
              {formatTimestamp(message.timestamp)}
            </span>
            
            {/* Regenerate button */}
            {message.role === 'assistant' && message.content && !isLoading && message.id !== 'welcome' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary"
                onClick={() => onRegenerate(message)}
                disabled={isRegenerating}
                title="Tạo lại phản hồi"
              >
                {isRegenerating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">Tạo lại</span>
              </Button>
            )}
          </div>
        )}

        {/* Tool Results Cards */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="space-y-2 pl-1 mt-2">
            {message.toolResults.map((toolResult, index) => (
              <ToolResultCard 
                key={index}
                toolResult={toolResult}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}

        {/* Extracted Topics with Action Buttons */}
        {message.extractedTopics && message.extractedTopics.length > 0 && (
          <div className="space-y-1.5 pl-1">
            {message.extractedTopics.map((topic, index) => (
              <div 
                key={index}
                className="p-2.5 rounded-xl bg-gradient-to-r from-primary/5 to-violet-500/5 border border-primary/20 space-y-1.5 group"
              >
                <button
                  className="font-medium text-xs text-left w-full hover:text-primary transition-colors flex items-center gap-1.5 group/title"
                  onClick={() => onTopicRefinement(topic.topic)}
                  disabled={isLoading}
                  title="Click để xem chi tiết"
                >
                  <span className="flex-1 line-clamp-2">{topic.topic}</span>
                  <SearchIcon className="w-3 h-3 opacity-0 group-hover/title:opacity-100 transition-opacity text-primary shrink-0" />
                </button>
                {topic.reason && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{topic.reason}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {mode === 'embedded' && onTopicSelect ? (
                    <Button
                      size="sm"
                      className="h-7 text-[10px] gap-1.5 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => onTopicSelect(topic.topic)}
                    >
                      <Check className="w-3 h-3" />
                      Chọn topic này
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] gap-1 px-2 hover:bg-primary hover:text-primary-foreground"
                        onClick={() => onTopicAction(topic, 'multichannel')}
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        Multi
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] gap-1 px-2 hover:bg-violet-600 hover:text-white"
                        onClick={() => onTopicAction(topic, 'script')}
                      >
                        <Video className="w-2.5 h-2.5" />
                        Script
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] gap-1 px-2 hover:bg-orange-500 hover:text-white"
                        onClick={() => onTopicAction(topic, 'carousel')}
                      >
                        <Images className="w-2.5 h-2.5" />
                        Carousel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Follow-up Suggestions - dynamic or fallback */}
        {mode !== 'embedded' &&
         message.role === 'assistant' && 
         message.id !== 'welcome' && 
         !message.isError && 
         message.content && 
         !isLoading && (
          <div className="flex gap-1 pl-1 pt-0.5 overflow-x-auto scrollbar-none">
            {message.suggestedFollowUps && message.suggestedFollowUps.length > 0 ? (
              message.suggestedFollowUps.map((suggestion, i) => (
                <Button
                  key={i}
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 border-dashed shrink-0 max-w-[200px] truncate"
                  onClick={() => onSendFollowUp(suggestion)}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 border-dashed shrink-0"
                  onClick={() => onSendFollowUp('Gợi ý thêm các topic khác')}
                  disabled={isLoading}
                >
                  <Plus className="w-2.5 h-2.5" />
                  Thêm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1 border-dashed shrink-0"
                  onClick={() => onSendFollowUp('Thay đổi format content khác')}
                  disabled={isLoading}
                >
                  <Shuffle className="w-2.5 h-2.5" />
                  Format
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <Avatar className="shrink-0 w-7 h-7">
          {userProfile?.avatar_url ? (
            <AvatarImage src={userProfile.avatar_url} alt={userProfile.full_name || 'User'} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userProfile?.full_name?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5" />}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
