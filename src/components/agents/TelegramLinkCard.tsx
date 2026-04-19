import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTelegramBinding } from '@/hooks/useTelegramBinding';
import { Loader2, Send, Unlink, Users } from 'lucide-react';

export function TelegramLinkCard() {
  const { binding, groupBinding, loading, generateDeeplink, unlink } = useTelegramBinding();
  const [deeplink, setDeeplink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateDeeplink();
      if (result) setDeeplink(result.deeplink);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" /> Telegram của bạn
        </CardTitle>
        <CardDescription>
          Link tài khoản Telegram để gõ /generate trigger campaign từ chat. Yêu cầu quyền can_create_goals.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {binding ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Đã kết nối</div>
              <div className="text-xs text-muted-foreground">
                {binding.telegram_username ? `@${binding.telegram_username}` : `Chat ID: ${binding.telegram_chat_id}`}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={unlink}>
              <Unlink className="w-4 h-4 mr-1" /> Gỡ
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tạo link kết nối
            </Button>
            {deeplink && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Link hết hạn sau 10 phút:</div>
                <a
                  href={deeplink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline break-all"
                >
                  {deeplink}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Group tổ chức:</span>
            {groupBinding ? (
              <Badge variant="default">Đã link (chat_id: {groupBinding.telegram_chat_id})</Badge>
            ) : (
              <Badge variant="secondary">Chưa link</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Admin thêm bot vào group, bot trả lời /link_group để hoàn tất.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
