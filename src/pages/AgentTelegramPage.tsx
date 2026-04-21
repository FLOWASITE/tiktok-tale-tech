import { TelegramBotConfigCard } from '@/components/agents/TelegramBotConfigCard';
import { TelegramLinkCard } from '@/components/agents/TelegramLinkCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { canManageMembers } from '@/types/organization';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { useDefaultTelegramBot } from '@/hooks/useDefaultTelegramBot';
import { Send, CheckCircle2, Loader2, Settings2, Sparkles } from 'lucide-react';

interface CommandRow {
  cmd: string;
  desc: string;
  perm?: string;
}

const COMMAND_GROUPS: { label: string; items: CommandRow[] }[] = [
  {
    label: 'Cá nhân',
    items: [
      { cmd: '/start <token>', desc: 'Kết nối tài khoản (link từ app)' },
      { cmd: '/status', desc: 'Xem quota pipeline tháng này' },
      { cmd: '/help', desc: 'Xem danh sách lệnh' },
    ],
  },
  {
    label: 'Tạo nội dung',
    items: [
      { cmd: '/generate <mô tả>', desc: 'Tạo campaign mới từ chat', perm: 'can_create_goals' },
    ],
  },
  {
    label: 'Quản trị',
    items: [
      { cmd: '/link_group', desc: 'Admin link group vào tổ chức', perm: 'admin' },
    ],
  },
];

function StepSection({
  index,
  title,
  description,
  done,
  children,
}: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
            done
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/30 bg-muted/30'
          }`}
        >
          {done ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">{index}</span>
          )}
        </div>
        <div className="flex-1 pt-1 min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="pl-0 sm:pl-11">{children}</div>
    </section>
  );
}

export default function AgentTelegramPage() {
  const { currentRole } = useOrganizationContext();
  const isAdmin = currentRole ? canManageMembers(currentRole) : false;
  const { config, loading: configLoading } = useTelegramBotConfig();
  const { defaultBot, loading: defaultLoading } = useDefaultTelegramBot();
  const { binding, loading: bindingLoading } = useTelegramBinding();

  // Effective bot: org's own config if present, else Flowa default bot
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Telegram Agent</CardTitle>
                <CardDescription className="mt-1">
                  Chat tự nhiên với AI Agent từ Telegram — không cần gõ lệnh, bot tự hiểu để tạo campaign, báo quota, tư vấn marketing.
                </CardDescription>
              </div>
            </div>
            <Badge variant={overallStatus.variant}>
              {loadingAny && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {overallStatus.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Default-bot status banner (when in use) */}
      {usingDefaultBot && (
        <div className="rounded-lg border bg-primary/5 px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium">
              Đang dùng bot mặc định của Flowa
              {defaultBot?.bot_username && (
                <code className="ml-1 text-xs bg-background border rounded px-1.5 py-0.5">
                  @{defaultBot.bot_username}
                </code>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Không cần BotFather. Bạn có thể kết nối ngay — hoặc nếu muốn bot white-label riêng, xem{' '}
              <span className="font-medium">Cấu hình bot tùy chỉnh</span> bên dưới.
            </p>
          </div>
        </div>
      )}

      {/* Step 1 — Admin BYOB bot config (collapsed when default bot is in use) */}
      {isAdmin && usingDefaultBot && !orgBotReady && (
        <Accordion type="single" collapsible>
          <AccordionItem value="byob" className="border rounded-lg px-4">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Bot tùy chỉnh (nâng cao)</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Bring your own bot — giữ branding riêng của tổ chức
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

      {/* Step 1 — Admin bot config (visible when BYOB already set up) */}
      {isAdmin && orgBotReady && (
        <>
          <StepSection
            index={1}
            title="Cấu hình Bot Telegram (tùy chỉnh)"
            description="Bot riêng của tổ chức. Gỡ cấu hình để quay về dùng bot mặc định của Flowa."
            done={orgBotReady}
          >
            <TelegramBotConfigCard />
          </StepSection>
          <div className="border-t" />
        </>
      )}

      {/* Step 2 — Personal link */}
      <StepSection
        index={isAdmin && orgBotReady ? 2 : 1}
        title="Kết nối tài khoản Telegram cá nhân"
        description="Scan QR hoặc bấm 'Continue in Telegram' — kết nối < 1 phút."
        done={botReady && userLinked}
      >
        <TelegramLinkCard
          botReady={botReady}
          isAdmin={isAdmin}
          botUsername={effectiveBotUsername}
          usingDefaultBot={usingDefaultBot}
        />
      </StepSection>

      {/* Bot commands */}
      <Card>
        <CardContent className="pt-6">
          <Accordion type="single" collapsible>
            <AccordionItem value="commands" className="border-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Danh sách lệnh bot</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {COMMAND_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {group.label}
                      </div>
                      <div className="space-y-1.5">
                        {group.items.map((item) => (
                          <div key={item.cmd} className="flex items-start gap-3 text-sm flex-wrap">
                            <code className="text-primary font-mono text-xs bg-primary/5 px-2 py-0.5 rounded shrink-0">
                              {item.cmd}
                            </code>
                            <span className="text-muted-foreground flex-1 min-w-0">{item.desc}</span>
                            {item.perm && (
                              <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                                {item.perm}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
