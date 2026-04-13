// ============================================
// TopicAIChatbot - Refactored Main Component
// Uses modular hooks and sub-components
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ProgressStep } from './chatbot/ChatThinkingIndicator';
import { ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { useProfile } from '@/hooks/useProfile';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useAutoSaveLearnings } from '@/hooks/useAutoSaveLearnings';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatStreaming } from '@/hooks/useChatStreaming';
import { useChatInput } from '@/hooks/useChatInput';
import { useChatUI } from '@/hooks/useChatUI';
import { useChatArtifacts } from '@/hooks/useChatArtifacts';

import { QuickActionsPanel } from './QuickActionsPanel';
import { 
  ChatHeader, 
  ChatInputArea, 
  ChatOnboarding, 
  DiscoveryTab,
  ArtifactsPanel,
  AgentPipelineBar,
  AgentInsightsTab,
  type TopicAIChatbotProps,
  type TopicAIChatbotHandle,
  type ChatMessage,
  type ExtractedTopic,
  triggerHaptic,
  TOPIC_ACTION_PATHS,
} from './chatbot';
import { SimpleMessageList } from './chatbot/SimpleMessageList';
import { AgentSessionSummary } from './chatbot/AgentSessionSummary';

// Re-export handle type and props for consumers
export type { TopicAIChatbotHandle } from './chatbot';
export type { TopicAIChatbotProps } from './chatbot';

export function TopicAIChatbot({
  brandTemplateId,
  contentGoal,
  onNavigate,
  className,
  isExpanded = false,
  mode = 'standalone',
  onTopicSelect,
  onReady,
  initialPrompt,
  desktopLayout = false,
}: TopicAIChatbotProps) {
  const isEmbedded = mode === 'embedded';
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const { profile } = useProfile();
  
  // === CUSTOM HOOKS ===
  const messagesHook = useChatMessages({ brandTemplateId });
  const uiHook = useChatUI({ messages: messagesHook.messages, onReset: messagesHook.resetMessages });
  const artifactsHook = useChatArtifacts({
    brandTemplateId,
    allExtractedTopics: messagesHook.allExtractedTopics,
    userId: user?.id,
    organizationId: currentOrganization?.id,
  });
  
  // Sound effects
  const { playSend, playReceive } = useSoundEffects(uiHook.soundEnabled);
  
  // Conversation persistence
  const {
    conversations,
    currentConversation,
    isLoading: isLoadingConversations,
    loadConversation,
    deleteConversation,
    archiveConversation,
  } = useChatConversations({
    brandTemplateId,
    organizationId: currentOrganization?.id,
    autoLoad: true,
  });
  
  // Auto-save learnings
  const { autoExtractOnIdle } = useAutoSaveLearnings();
  
  // Streaming hook - force web search in embedded mode for real-time brainstorming
  const streamingHook = useChatStreaming({
    brandTemplateId,
    contentGoal,
    organizationId: currentOrganization?.id,
    userId: user?.id,
    forceWebSearch: isEmbedded,
    
    onMessageCreate: (msg) => messagesHook.setMessages(prev => [...prev, msg]),
    onMessageUpdate: messagesHook.updateMessage,
    onComplete: () => playReceive(),
  });
  
  // Persist pipeline steps so bar remains visible after streaming ends
  const [lastPipelineSteps, setLastPipelineSteps] = useState<ProgressStep[]>([]);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  
  useEffect(() => {
    if (streamingHook.progressSteps.length > 0) {
      setLastPipelineSteps(streamingHook.progressSteps);
    }
  }, [streamingHook.progressSteps]);

  // Show summary only when pipeline completes, hide on next send
  useEffect(() => {
    const steps = streamingHook.progressSteps.length > 0 ? streamingHook.progressSteps : lastPipelineSteps;
    if (!streamingHook.isLoading && steps.length > 0 && steps.every(s => s.status === 'complete')) {
      setShowSessionSummary(true);
    }
  }, [streamingHook.isLoading, streamingHook.progressSteps, lastPipelineSteps]);
  
  const displayPipelineSteps = streamingHook.progressSteps.length > 0
    ? streamingHook.progressSteps
    : lastPipelineSteps;
  
  // Send message handler
  const handleSend = useCallback(async (messageText: string) => {
    if (!messageText.trim() || streamingHook.isLoading) return;
    setShowSessionSummary(false);
    
    triggerHaptic('medium');
    playSend();
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };
    
    messagesHook.addMessage(userMessage);
    uiHook.scrollToBottom();
    
    await streamingHook.streamChat([...messagesHook.messages, userMessage]);
  }, [messagesHook, streamingHook, uiHook, playSend]);
  
  // Input hook
  const inputHook = useChatInput({
    onSend: handleSend,
    isLoading: streamingHook.isLoading,
  });
  
  // Expose focusInput to parent via onReady callback
  const handleRef = useRef<TopicAIChatbotHandle | null>(null);
  useEffect(() => {
    if (!handleRef.current) {
      handleRef.current = { focusInput: inputHook.focusInput };
      onReady?.(handleRef.current);
    }
  }, [inputHook.focusInput, onReady]);
  
  // Auto-send initialPrompt when provided (from intent detection)
  const initialPromptSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && !initialPromptSentRef.current && !streamingHook.isLoading) {
      initialPromptSentRef.current = true;
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        handleSend(initialPrompt);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, handleSend, streamingHook.isLoading]);
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        e.preventDefault();
        inputHook.focusInput();
      }
      
      if (e.key === 'Escape' && streamingHook.isLoading) {
        e.preventDefault();
        streamingHook.cancelStream();
        toast({ title: 'Đã dừng', description: 'Đã dừng tạo phản hồi.' });
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [streamingHook.isLoading, streamingHook.cancelStream, inputHook]);
  
  // Auto-extract learnings on unmount
  useEffect(() => {
    return () => {
      if (currentConversation?.id && messagesHook.messages.length >= 6) {
        autoExtractOnIdle(currentConversation.id, messagesHook.messages.length);
      }
    };
  }, [currentConversation?.id, messagesHook.messages.length, autoExtractOnIdle]);
  
  // === HANDLERS ===
  const handleTopicAction = useCallback((topic: ExtractedTopic, format: 'multichannel' | 'script' | 'carousel') => {
    // In embedded mode, use onTopicSelect callback instead of navigation
    if (isEmbedded && onTopicSelect) {
      onTopicSelect(topic.topic);
      return;
    }
    onNavigate(TOPIC_ACTION_PATHS[format], {
      prefillTopic: topic.topic,
      prefillGoal: contentGoal,
      fromTopics: true,
    });
  }, [onNavigate, contentGoal, isEmbedded, onTopicSelect]);
  
  const handleTopicRefinement = useCallback((topicTitle: string) => {
    handleSend(`Làm chi tiết hơn về topic: "${topicTitle}". Hãy cho tôi biết thêm về các góc độ tiếp cận, ý tưởng cụ thể và cách triển khai.`);
  }, [handleSend]);
  
  const handleFeedback = useCallback((messageId: string, feedback: 'up' | 'down') => {
    messagesHook.updateMessage(messageId, { feedback });
  }, [messagesHook]);
  
  const handleRegenerate = useCallback((message: ChatMessage) => {
    // Find the user message before this assistant message and resend
    const idx = messagesHook.messages.findIndex(m => m.id === message.id);
    if (idx > 0) {
      const userMsg = messagesHook.messages[idx - 1];
      if (userMsg.role === 'user') {
        handleSend(userMsg.content);
      }
    }
  }, [messagesHook.messages, handleSend]);
  
  const handleReset = useCallback(() => {
    messagesHook.resetMessages();
    artifactsHook.clearArtifacts();
    setLastPipelineSteps([]);
    toast({ title: 'Đã làm mới', description: 'Lịch sử chat đã được xóa.' });
  }, [messagesHook, artifactsHook]);
  
  // Compute smart suggestions from last assistant message
  const smartSuggestions = useMemo(() => {
    const lastAssistant = [...messagesHook.messages].reverse().find(m => m.role === 'assistant' && m.suggestedFollowUps?.length);
    return lastAssistant?.suggestedFollowUps || [];
  }, [messagesHook.messages]);

  // Get last context sources
  const lastContextSources = useMemo(() => {
    const lastAssistant = [...messagesHook.messages].reverse().find(m => m.role === 'assistant' && m.contextSources);
    return lastAssistant?.contextSources;
  }, [messagesHook.messages]);

  const isMobileFullscreen = className?.includes('border-0') || className?.includes('rounded-none');
  const widthClasses = {
    compact: 'w-full max-w-xl',
    normal: 'w-full max-w-2xl',
    wide: 'w-full max-w-3xl',
    full: 'w-full max-w-5xl',
  };

  const Wrapper = desktopLayout ? 'div' : Card;
  const wrapperClass = cn(
    'relative flex flex-col h-full max-h-full flex-1 min-w-0 transition-all duration-300',
    desktopLayout
      ? 'bg-background'
      : isMobileFullscreen
        ? 'border-0 shadow-none rounded-none bg-background'
        : 'border-2 border-primary/20',
    artifactsHook.showArtifactsPanel && !desktopLayout && 'rounded-r-none border-r-0'
  );

  return (
    <TooltipProvider>
      <div className={cn(
        'flex h-full max-h-full transition-all duration-300 ease-in-out',
        !isMobileFullscreen && !artifactsHook.showArtifactsPanel && !desktopLayout && widthClasses[uiHook.dynamicWidth],
        desktopLayout && 'w-full',
        artifactsHook.showArtifactsPanel && 'w-full max-w-5xl',
        className
      )}>
        <Wrapper className={wrapperClass}>
          <ChatOnboarding
            show={uiHook.showOnboarding}
            step={uiHook.onboardingStep}
            onStepChange={uiHook.setOnboardingStep}
            onDismiss={uiHook.dismissOnboarding}
          />
          
          {/* Hide header in embedded mode for cleaner UI */}
          {!isEmbedded && (
            <ChatHeader
              activeView={uiHook.activeView}
              onActiveViewChange={uiHook.setActiveView}
              isSearchOpen={uiHook.isSearchOpen}
              onSearchToggle={() => uiHook.setIsSearchOpen(!uiHook.isSearchOpen)}
              searchQuery={uiHook.searchQuery}
              onSearchChange={uiHook.setSearchQuery}
              searchResultsCount={uiHook.searchResults.length}
              soundEnabled={uiHook.soundEnabled}
              onSoundToggle={() => uiHook.setSoundEnabled(!uiHook.soundEnabled)}
              onReset={handleReset}
              onShowOnboarding={() => uiHook.setShowOnboarding(true)}
              artifactsCount={artifactsHook.artifactTopics.length}
              showArtifactsPanel={artifactsHook.showArtifactsPanel}
              onArtifactsPanelToggle={() => artifactsHook.setShowArtifactsPanel(!artifactsHook.showArtifactsPanel)}
              supervisorEnabled={uiHook.supervisorEnabled}
              onSupervisorToggle={() => uiHook.setSupervisorEnabled(!uiHook.supervisorEnabled)}
              showHistorySidebar={uiHook.showHistorySidebar}
              onHistorySidebarChange={uiHook.setShowHistorySidebar}
              conversations={conversations}
              currentConversationId={currentConversation?.id}
              isLoadingConversations={isLoadingConversations}
              onSelectConversation={loadConversation}
              onNewConversation={handleReset}
              onDeleteConversation={deleteConversation}
              onArchiveConversation={archiveConversation}
              desktopLayout={desktopLayout}
            />
          )}
          
          {uiHook.activeView === 'discovery' ? (
            <AgentInsightsTab
              progressSteps={displayPipelineSteps}
              suggestions={smartSuggestions}
              contextSources={lastContextSources}
              messageCount={messagesHook.messages.length}
              onSendSuggestion={(s) => { handleSend(s); uiHook.setActiveView('chat'); }}
            />
          ) : (
            <>
              {/* Agent Pipeline Bar - persistent after streaming */}
               {displayPipelineSteps.length > 0 && (
                 <AgentPipelineBar steps={displayPipelineSteps} />
               )}
               
               {/* Session Summary - shows after all agents complete, hides on new send */}
               {showSessionSummary && !streamingHook.isLoading && displayPipelineSteps.length > 0 && (
                 <AgentSessionSummary
                   steps={displayPipelineSteps}
                   contextSources={lastContextSources}
                   onViewDetails={() => uiHook.setActiveView('discovery')}
                 />
               )}
              
              <SimpleMessageList
                messages={messagesHook.messages}
                animatingMessageId={messagesHook.animatingMessageId}
                searchResults={uiHook.searchResults}
                searchQuery={uiHook.searchQuery}
                isLoading={streamingHook.isLoading}
                thinkingStatus={streamingHook.thinkingStatus}
                currentExecutingTool={streamingHook.currentExecutingTool || undefined}
                agentTurnInfo={streamingHook.agentTurnInfo}
                progressSteps={streamingHook.progressSteps}
                elapsedSeconds={streamingHook.elapsedSeconds}
                userProfile={profile}
                personalizedWelcome={messagesHook.personalizedWelcome}
                streamingAgentName={streamingHook.agentTurnInfo?.agentName}
                onFeedback={handleFeedback}
                onRegenerate={handleRegenerate}
                onTopicAction={handleTopicAction}
                onTopicRefinement={handleTopicRefinement}
                onSendFollowUp={handleSend}
                onNavigate={onNavigate}
                highlightSearchTerm={uiHook.highlightSearchTerm}
                onScroll={uiHook.handleScroll}
                onTouchStart={uiHook.handleTouchStart}
                onTouchMove={uiHook.handleTouchMove}
                onTouchEnd={uiHook.handleTouchEnd}
                pullDistance={uiHook.pullDistance}
                isRefreshing={uiHook.isRefreshing}
                scrollContainerRef={uiHook.scrollContainerRef}
                mode={mode}
                onTopicSelect={onTopicSelect}
              />
              
              {/* Scroll to bottom button */}
              {uiHook.showScrollButton && (
                <Button
                  size="icon"
                  variant="default"
                  className="absolute bottom-32 right-4 h-10 w-10 rounded-full shadow-xl z-20 bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-105"
                  onClick={uiHook.scrollToBottom}
                >
                  <ArrowDown className="w-4 h-4 text-primary-foreground" />
                  {uiHook.unreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground">
                      {uiHook.unreadCount > 9 ? '9+' : uiHook.unreadCount}
                    </Badge>
                  )}
                </Button>
              )}
              
              <div className={cn(
                "flex-shrink-0 border-t bg-muted/30",
                desktopLayout ? "px-6 py-2" : "px-1.5 sm:px-3 py-1 sm:py-2"
              )}>
                <div className={cn(desktopLayout && "max-w-3xl mx-auto")}>
                  <QuickActionsPanel
                    contentGoal={contentGoal}
                    onAction={handleSend}
                    isLoading={streamingHook.isLoading}
                    variant="compact"
                  />
                </div>
              </div>
              
              <ChatInputArea
                input={inputHook.input}
                onInputChange={inputHook.setInput}
                onSubmit={inputHook.handleSubmit}
                onKeyDown={inputHook.handleKeyDown}
                isLoading={streamingHook.isLoading}
                onCancel={streamingHook.cancelStream}
                isRecording={inputHook.isRecording}
                interimText={inputHook.interimText}
                onToggleVoice={inputHook.toggleVoiceInput}
                voiceSupported={inputHook.voiceSupported}
                showMarkdownPreview={inputHook.showMarkdownPreview}
                onToggleMarkdownPreview={() => inputHook.setShowMarkdownPreview(!inputHook.showMarkdownPreview)}
                showShortcutsHint={inputHook.showShortcutsHint}
                onToggleShortcutsHint={() => inputHook.setShowShortcutsHint(!inputHook.showShortcutsHint)}
                textareaRef={inputHook.textareaRef}
                supervisorEnabled={uiHook.supervisorEnabled}
                smartSuggestions={smartSuggestions}
                desktopLayout={desktopLayout}
              />
            </>
          )}
        </Wrapper>
        
        {artifactsHook.showArtifactsPanel && (
          <ArtifactsPanel
            topics={artifactsHook.artifactTopics}
            onTopicsChange={artifactsHook.setArtifactTopics}
            onClose={() => artifactsHook.setShowArtifactsPanel(false)}
            onCreateContent={(topic, format) => onNavigate(TOPIC_ACTION_PATHS[format], { prefillTopic: topic.topic, fromTopics: true })}
            onSaveToBank={artifactsHook.saveToBank}
            onRefine={handleTopicRefinement}
            className="w-80 shrink-0 animate-in slide-in-from-right-4 duration-300"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
