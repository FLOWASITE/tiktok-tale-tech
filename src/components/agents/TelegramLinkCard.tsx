import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { Loader2, Unlink, Users, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TelegramLinkCardProps {
  botReady: boolean;
  isAdmin: boolean;
  botUsername?: string;
}

export function TelegramLinkCard({ botReady, isAdmin, botUsername }: TelegramLinkCardProps) {
  const { binding, groupBinding, loading, generateDeeplink, unlink, unlinkGroup } = useTelegramBinding();
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlinkingGroup, setUnlinkingGroup] = useState(false);

  const botDirectUrl = botUsername ? `https://t.me/${botUsername}` : null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateDeeplink();
      if (result) setDeeplink(result.deeplink);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!deeplink) return;
    await navigator.clipboard.writeText(deeplink);
    setCopied(true);
    toast({ title: 'Đã copy link' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = async () => {
    await unlink();
    setDeeplink(null);
  };

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

  const qrUrl = deeplink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(deeplink)}`
    : '';

  return (
    <div className="space-y-4">
      {/* Personal binding */}
      {binding ? (
        <div className="flex items-center justify-between rounded-md border p-3 bg-primary/5 gap-2 flex-wrap">
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" /> Đã kết nối
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {binding.telegram_username ? `@${binding.telegram_username}` : `Chat ID: ${binding.telegram_chat_id}`}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleUnlink}>
            <Unlink className="w-4 h-4 mr-1" /> Gỡ
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {!deeplink && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tạo link kết nối
              </Button>
              {botDirectUrl && (
                <Button asChild variant="ghost" size="sm">
                  <a href={botDirectUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Xem bot @{botUsername}
                  </a>
                </Button>
              )}
            </div>
          )}
          {deeplink && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="text-xs text-muted-foreground mb-3">
                Link hết hạn sau 10 phút. Mở trên điện thoại hoặc scan QR:
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <img
                  src={qrUrl}
                  alt="QR code Telegram"
                  className="w-[140px] h-[140px] rounded border bg-white shrink-0 mx-auto sm:mx-0"
                />
                <div className="flex-1 space-y-2 w-full">
                  <Button asChild size="sm" className="w-full sm:w-auto">
                    <a href={deeplink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1.5" /> Mở Telegram
                    </a>
                  </Button>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 truncate">
                      {deeplink}
                    </code>
                    <Button size="icon" variant="outline" onClick={handleCopy} className="shrink-0">
                      {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
