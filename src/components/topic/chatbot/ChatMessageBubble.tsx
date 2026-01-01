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
import { MessageFeedback } from './MessageFeedback';
import { ToolResultCard, type ToolResult } from './ToolResultCard';
import { ContextBadges, parseContextBadges, removeContextLine } from './ContextBadges';
import { CopyButton } from './CopyButton';
import { MessageSkeleton } from './MessageSkeleton';
import { formatTimestamp } from './utils';
import { PersonalizedWelcome } from './PersonalizedWelcome';
import type { PersonalizedWelcomeData } from '@/hooks/usePersonalizedWelcome';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isAnimating: boolean;
  isHighlighted: boolean;
  isRegenerating: boolean;
  isLoading: boolean;
  // User profile
  userProfile?: { avatar_url?: string; full_name?: string };
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
  isAnimating,
  isHighlighted,
  isRegenerating,
  isLoading,
  userProfile,
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
                      {/* Context Badges - displayed at top of message */}
                      {contextBadges.length > 0 && message.id !== 'welcome' && (
                        <div className="mb-2 pb-2 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <ContextBadges badges={contextBadges} />
                            {message.contextRichness !== undefined && message.contextRichness >= 50 && (
                              <span className="text-[9px] text-muted-foreground/60 ml-auto">
                                {message.contextRichness}% context
                              </span>
                            )}
                          </div>
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
            
            {/* Copy button - shown on hover for assistant messages */}
            {message.role === 'assistant' && message.content && !isLoading && (
              <CopyButton content={message.content} />
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
            
            {/* Message Feedback */}
            {message.role === 'assistant' && message.content && !isLoading && message.id !== 'welcome' && (
              <MessageFeedback 
                messageId={message.id}
                initialFeedback={message.feedback}
                onFeedback={onFeedback}
                onRegenerate={() => onRegenerate(message)}
                isRegenerating={isRegenerating}
              />
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

        {/* Follow-up Suggestions - hidden in embedded mode */}
        {mode !== 'embedded' &&
         message.role === 'assistant' && 
         message.id !== 'welcome' && 
         !message.isError && 
         message.content && 
         !isLoading && (
          <div className="flex flex-wrap gap-1 pl-1 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 border-dashed"
              onClick={() => onSendFollowUp('Gợi ý thêm các topic khác')}
              disabled={isLoading}
            >
              <Plus className="w-2.5 h-2.5" />
              Thêm
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 border-dashed"
              onClick={() => onSendFollowUp('Thay đổi format content khác')}
              disabled={isLoading}
            >
              <Shuffle className="w-2.5 h-2.5" />
              Format
            </Button>
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
