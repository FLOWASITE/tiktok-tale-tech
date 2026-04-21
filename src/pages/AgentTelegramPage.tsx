import { TelegramBotConfigCard } from '@/components/agents/TelegramBotConfigCard';
import { TelegramLinkCard } from '@/components/agents/TelegramLinkCard';
import { ChatPreview } from '@/components/agents/ChatPreview';
import { TelegramUseCases } from '@/components/agents/TelegramUseCases';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { canManageMembers } from '@/types/organization';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { useDefaultTelegramBot } from '@/hooks/useDefaultTelegramBot';
import { Send, Loader2, Settings2, Sparkles } from 'lucide-react';

export default function AgentTelegramPage() {
  const { currentRole } = useOrganizationContext();
  const isAdmin = currentRole ? canManageMembers(currentRole) : false;
  const { config, loading: configLoading } = useTelegramBotConfig();
  const { defaultBot, loading: defaultLoading } = useDefaultTelegramBot();
  const { binding, loading: bindingLoading } = useTelegramBinding();

  const orgBotReady = !!config && config.is_active;
  const defaultBotReady = !!defaultBot && defaultBot.is_active;
  const effectiveBotUsername = orgBotReady ? config?.bot_username : defaultBot?.bot_username;
  const usingDefaultBot = !orgBotReady && defaultBotReady;
  const botReady = orgBotReady || defaultBotReady;
  const userLinked = !!binding;

  const loadingAny = configLoading || defaultLoading || bindingLoading;
  const overallStatus = loadingAny
    ? { label: 'Đang tải…', variant: 'secondary' as const }
    : !botReady
    ? { label: 'Chưa cấu hình', variant: 'secondary' as const }
    : userLinked
    ? { label: 'Đã kết nối', variant: 'default' as const }
    : { label: 'Sẵn sàng kết nối', variant: 'outline' as const };

  const showOnboarding = !loadingAny && botReady && !userLinked;

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Compact header */}
      <header className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold leading-tight truncate">Telegram Agent</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Chat AI Agent ngay trong Telegram. Setup &lt; 1 phút.
            </p>
          </div>
        </div>
        <Badge variant={overallStatus.variant} className="shrink-0 whitespace-nowrap">
          {loadingAny && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {overallStatus.label}
        </Badge>
      </header>

      {/* Onboarding (first-time only) */}
      {showOnboarding && (
        <section className="rounded-xl border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-4 sm:p-5 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-primary">
              <Sparkles className="w-3 h-3" />
              3 bước để bắt đầu
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { n: 1, label: 'Bấm "Mở Telegram"' },
                { n: 2, label: 'Bấm Start trong bot' },
                { n: 3, label: 'Chat tự nhiên với AI' },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <div className="text-sm font-medium truncate">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <ChatPreview />
        </section>
      )}

      {/* Default-bot banner (compact 1-line) */}
      {usingDefaultBot && (
        <div className="rounded-lg border bg-primary/5 px-3 py-2.5 flex items-center gap-2 flex-wrap text-sm">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <span>
            Đang dùng bot mặc định{' '}
            <code className="text-xs bg-background border rounded px-1.5 py-0.5">
              @{defaultBot?.bot_username}
            </code>
          </span>
          {isAdmin && (
            <Accordion type="single" collapsible className="w-full sm:w-auto sm:ml-auto">
              <AccordionItem value="byob" className="border-0">
                <AccordionTrigger className="py-0 text-xs text-primary hover:no-underline justify-end gap-1">
                  Đổi bot riêng (white-label)
                </AccordionTrigger>
                <AccordionContent className="pt-3">
                  <TelegramBotConfigCard />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      )}

      {/* Admin BYOB visible when org bot already configured */}
      {isAdmin && orgBotReady && (
        <Accordion type="single" collapsible>
          <AccordionItem value="byob-active" className="border rounded-lg px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Bot riêng của tổ chức (white-label)</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    @{config?.bot_username} · gỡ để quay về bot mặc định
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <TelegramBotConfigCard />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Link card — main action */}
      <TelegramLinkCard
        botReady={botReady}
        isAdmin={isAdmin}
        botUsername={effectiveBotUsername}
        usingDefaultBot={usingDefaultBot}
      />

      {/* Use cases + full command list */}
      <TelegramUseCases />
    </div>
  );
}
