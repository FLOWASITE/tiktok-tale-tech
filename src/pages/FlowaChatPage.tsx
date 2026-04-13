import { useNavigate } from 'react-router-dom';
import { TopicAIChatbot } from '@/components/topic/TopicAIChatbot';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { useIsMobile } from '@/hooks/use-mobile';
import { useChatConversations } from '@/hooks/useChatConversations';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ConversationHistorySidebar } from '@/components/topic/chatbot/ConversationHistorySidebar';
import { cn } from '@/lib/utils';

export default function FlowaChatPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { templates } = useBrandTemplates();
  const { currentOrganization } = useOrganizationContext();
  const defaultBrand = templates?.find(t => t.is_default) || templates?.[0];

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full flex">
      {/* Desktop: persistent history sidebar */}
      {!isMobile && (
        <aside className="w-[280px] shrink-0 border-r bg-muted/30 hidden lg:block">
          <DesktopHistorySidebar
            brandTemplateId={defaultBrand?.id}
            organizationId={currentOrganization?.id}
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
        />
      </div>
    </div>
  );
}

/** Thin wrapper so sidebar loads its own conversations */
function DesktopHistorySidebar({
  brandTemplateId,
  organizationId,
}: {
  brandTemplateId?: string;
  organizationId?: string;
}) {
  const {
    conversations,
    currentConversation,
    isLoading,
    loadConversation,
    deleteConversation,
    archiveConversation,
  } = useChatConversations({
    brandTemplateId,
    organizationId,
    autoLoad: true,
  });

  return (
    <ConversationHistorySidebar
      conversations={conversations}
      currentConversationId={currentConversation?.id}
      isLoading={isLoading}
      onSelectConversation={loadConversation}
      onNewConversation={() => {/* handled by chatbot reset */}}
      onDeleteConversation={deleteConversation}
      onArchiveConversation={archiveConversation}
      onClose={() => {}}
      className="h-full"
    />
  );
}
