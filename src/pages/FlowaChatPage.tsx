import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ConversationHistorySidebar } from '@/components/topic/chatbot/ConversationHistorySidebar';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ConversationState } from '@/components/topic/chatbot/types';

export default function FlowaChatPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { templates } = useBrandTemplates();
  const { currentOrganization } = useOrganizationContext();
  const defaultBrand = templates?.find(t => t.is_default) || templates?.[0];
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatConv = useChatConversations({
    brandTemplateId: defaultBrand?.id,
    organizationId: currentOrganization?.id,
    autoLoad: true,
  });

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
      {/* Desktop: collapsible history sidebar */}
      {!isMobile && (
        <aside className={cn(
          "shrink-0 border-r border-border/50 bg-sidebar hidden lg:block transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-[260px]" : "w-0 border-r-0"
        )}>
          <ConversationHistorySidebar
            conversations={chatConv.conversations}
            currentConversationId={chatConv.currentConversation?.id}
            isLoading={chatConv.isLoading}
            onSelectConversation={chatConv.loadConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={chatConv.deleteConversation}
            onArchiveConversation={chatConv.archiveConversation}
            onCollapse={() => setSidebarOpen(false)}
            className="h-full w-[260px]"
          />
        </aside>
      )}

      <div className="flex-1 min-w-0 relative">
        {/* Sidebar open button when collapsed */}
        {!isMobile && !sidebarOpen && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="absolute left-3 top-3 z-10 h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">Mở lịch sử chat</TooltipContent>
          </Tooltip>
        )}

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
