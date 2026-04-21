import { useState } from 'react';
import { TelegramBotConfigCard } from '@/components/agents/TelegramBotConfigCard';
import { TelegramLinkCard } from '@/components/agents/TelegramLinkCard';
import { ChatPreview } from '@/components/agents/ChatPreview';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { canManageMembers } from '@/types/organization';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { useDefaultTelegramBot } from '@/hooks/useDefaultTelegramBot';
import { Send, Loader2, Sparkles } from 'lucide-react';

export default function AgentTelegramPage() {
  const { currentRole } = useOrganizationContext();
  const isAdmin = currentRole ? canManageMembers(currentRole) : false;
  const { config, loading: configLoading } = useTelegramBotConfig();
  const { defaultBot, loading: defaultLoading } = useDefaultTelegramBot();
  const { binding, loading: bindingLoading } = useTelegramBinding();
  const [byobOpen, setByobOpen] = useState(false);

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
  const showWhiteLabelLink = isAdmin && botReady; // admin always sees option to switch / manage own bot

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
            {showOnboarding && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Chat AI Agent ngay trong Telegram. Setup &lt; 1 phút.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showWhiteLabelLink && (
            <Dialog open={byobOpen} onOpenChange={setByobOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground hover:text-primary"
                >
                  {orgBotReady ? 'Quản lý bot riêng' : 'Dùng bot riêng'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Bot Telegram của tổ chức (white-label)</DialogTitle>
                  <DialogDescription>
                    Dùng bot riêng để giữ thương hiệu. Gỡ để quay về bot mặc định.
                  </DialogDescription>
                </DialogHeader>
                <TelegramBotConfigCard />
              </DialogContent>
            </Dialog>
          )}
          <Badge variant={overallStatus.variant} className="whitespace-nowrap">
            {loadingAny && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {overallStatus.label}
          </Badge>
        </div>
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
