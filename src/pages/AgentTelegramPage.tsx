import { TelegramBotConfigCard } from '@/components/agents/TelegramBotConfigCard';
import { TelegramLinkCard } from '@/components/agents/TelegramLinkCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { canManageMembers } from '@/types/organization';
import { useTelegramBotConfig } from '@/hooks/useTelegramBotConfig';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { Send, CheckCircle2, Loader2, Settings2 } from 'lucide-react';

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
  const { binding, loading: bindingLoading } = useTelegramBinding();

  const botReady = !!config && config.is_active;
  const userLinked = !!binding;

  const overallStatus = configLoading || bindingLoading
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
                  Điều khiển AI Agent từ Telegram — tạo campaign, xem quota, duyệt nội dung qua chat.
                </CardDescription>
              </div>
            </div>
            <Badge variant={overallStatus.variant}>
              {configLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {overallStatus.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Step 1 — Admin bot config */}
      {isAdmin && (
        <>
          <StepSection
            index={1}
            title="Cấu hình Bot Telegram"
            description="Tạo bot qua @BotFather rồi nhập token. Mỗi tổ chức 1 bot riêng."
            done={botReady}
          >
            <TelegramBotConfigCard />
          </StepSection>
          <div className="border-t" />
        </>
      )}

      {/* Step 2 — Personal link */}
      <StepSection
        index={isAdmin ? 2 : 1}
        title="Kết nối tài khoản Telegram cá nhân"
        description="Gõ /generate trực tiếp từ Telegram để trigger campaign."
        done={botReady && userLinked}
      >
        <TelegramLinkCard botReady={botReady} isAdmin={isAdmin} botUsername={config?.bot_username} />
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
