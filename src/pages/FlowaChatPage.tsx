import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ConversationHistorySidebar } from '@/components/topic/chatbot/ConversationHistorySidebar';
import type { ConversationState } from '@/components/topic/chatbot/types';

export default function FlowaChatPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { templates } = useBrandTemplates();
  const { currentOrganization } = useOrganizationContext();
  const defaultBrand = templates?.find(t => t.is_default) || templates?.[0];

  // Single shared instance of useChatConversations
  const chatConv = useChatConversations({
    brandTemplateId: defaultBrand?.id,
    organizationId: currentOrganization?.id,
    autoLoad: true,
  });

  // Build ConversationState to pass to chatbot
  const conversationState: ConversationState = useMemo(() => ({
    conversations: chatConv.conversations,
    currentConversation: chatConv.currentConversation,
    conversationMessages: chatConv.messages,
    isLoading: chatConv.isLoading,
    isSaving: chatConv.isSaving,
    loadConversation: chatConv.loadConversation,
    createConversation: chatConv.createConversation,
    addMessageToDB: chatConv.addMessage,
    deleteConversation: chatConv.deleteConversation,
    archiveConversation: chatConv.archiveConversation,
    clearCurrentConversation: chatConv.clearCurrentConversation,
    summarizeConversation: chatConv.summarizeConversation,
    loadConversations: chatConv.loadConversations,
  }), [chatConv]);

  const handleNewConversation = () => {
    chatConv.clearCurrentConversation();
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full flex">
      {/* Desktop: persistent history sidebar */}
      {!isMobile && (
        <aside className="w-[280px] shrink-0 border-r bg-muted/30 hidden lg:block">
          <ConversationHistorySidebar
            conversations={chatConv.conversations}
            currentConversationId={chatConv.currentConversation?.id}
            isLoading={chatConv.isLoading}
            onSelectConversation={chatConv.loadConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={chatConv.deleteConversation}
            onArchiveConversation={chatConv.archiveConversation}
            className="h-full"
          />
        </aside>
      )}

      <div className="flex-1 min-w-0">
        <TopicAIChatbot
          brandTemplateId={defaultBrand?.id}
          onNavigate={(path, state) => navigate(path, { state })}
          mode="standalone"
          isExpanded
          className="h-full"
          desktopLayout={!isMobile}
          conversationState={conversationState}
        />
      </div>
    </div>
  );
}
