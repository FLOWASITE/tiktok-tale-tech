import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { Loader2, Unlink, Users, AlertCircle, Check, ExternalLink, Send } from 'lucide-react';
import { TelegramConnectDialog } from '@/components/agents/TelegramConnectDialog';

interface TelegramLinkCardProps {
  botReady: boolean;
  isAdmin: boolean;
  botUsername?: string;
  usingDefaultBot?: boolean;
}

export function TelegramLinkCard({ botReady, isAdmin, botUsername, usingDefaultBot }: TelegramLinkCardProps) {
  const { binding, groupBinding, loading, unlink, unlinkGroup } = useTelegramBinding();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlinkingGroup, setUnlinkingGroup] = useState(false);

  const botDirectUrl = botUsername ? `https://t.me/${botUsername}` : null;

  const handleUnlinkGroup = async () => {
    setUnlinkingGroup(true);
    try { await unlinkGroup(); } finally { setUnlinkingGroup(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!botReady) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium text-sm">Chờ admin cấu hình bot</div>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {isAdmin
              ? 'Hoàn tất Bước 1 (Cấu hình Bot Telegram) ở trên trước khi link tài khoản.'
              : 'Tổ chức của bạn chưa có bot Telegram. Liên hệ admin để hoàn tất cấu hình.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personal binding */}
      {binding ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-md border p-3 bg-primary/5 gap-2 flex-wrap">
            <div className="space-y-0.5 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" /> Đã kết nối
                {usingDefaultBot && botUsername && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    via @{botUsername}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {binding.telegram_username ? `@${binding.telegram_username}` : `Chat ID: ${binding.telegram_chat_id}`}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={unlink}>
              <Unlink className="w-4 h-4 mr-1" /> Gỡ
            </Button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-1">
            ✨ Bạn có thể <span className="font-medium text-foreground">chat tự nhiên</span> với bot — không cần gõ lệnh.
            Ví dụ: "tạo campaign cho spa làm đẹp", "quota tháng này còn bao nhiêu?".
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <Send className="w-4 h-4 mr-2" /> Get started on Telegram
            </Button>
            {botDirectUrl && (
              <Button asChild variant="ghost" size="sm">
                <a href={botDirectUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Xem @{botUsername}
                </a>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Kết nối &lt; 1 phút: scan QR hoặc bấm "Continue in Telegram". Chỉ cần làm{' '}
            <span className="font-medium text-foreground">1 lần duy nhất</span>.
            {usingDefaultBot && botUsername ? ` Dùng bot mặc định @${botUsername}.` : ''}
          </p>
        </div>
      )}

      <TelegramConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        botUsername={botUsername}
        usingDefaultBot={usingDefaultBot}
      />

      {/* Group binding — collapsed by default */}
      <Accordion type="single" collapsible>
        <AccordionItem value="group" className="border rounded-md px-3">
          <AccordionTrigger className="py-2 text-sm hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>Group tổ chức</span>
              <span className="text-xs text-muted-foreground">(tùy chọn)</span>
              {groupBinding ? (
                <Badge variant="default" className="ml-auto mr-2">Đã link</Badge>
              ) : (
                <Badge variant="secondary" className="ml-auto mr-2">Chưa link</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {groupBinding ? (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">
                  Chat ID: <code className="text-foreground">{groupBinding.telegram_chat_id}</code>
                </p>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUnlinkGroup}
                    disabled={unlinkingGroup}
                    className="text-destructive hover:text-destructive"
                  >
                    {unlinkingGroup ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5 mr-1" />
                    )}
                    Gỡ group
                  </Button>
                )}
              </div>
            ) : (
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside pt-1">
                <li>Admin add bot vào group Telegram của team</li>
                <li>Gõ <code className="text-primary">/link_group</code> trong group để hoàn tất</li>
              </ol>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
