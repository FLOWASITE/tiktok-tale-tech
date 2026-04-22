import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, Sparkles, Send, CalendarClock, ExternalLink, Plug } from 'lucide-react';
import { toast } from 'sonner';
import {
  CHANNEL_EMOJI, CHANNEL_LABEL, CHANNEL_PUBLISH_ACTION, QUICK_POST_CHANNELS,
  getScheduleSlots, openExternal, isTokenExpiredError, getTelegramMiniApp, formatDateTime,
} from './shared';

type Props = {
  orgId: string;
  userId: string;
  brandId: string | null;
  brandName?: string | null;
  onGoConnections: () => void;
};

type GeneratedContent = {
  id: string;
  title: string;
  text: string;
  thumbnail: string | null;
};

export function QuickPostTab({ orgId, userId, brandId, brandName, onGoConnections }: Props) {
  const [channel, setChannel] = useState<string>('facebook');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  async function generate() {
    if (!topic.trim()) {
      toast.error('Hãy nhập mô tả nội dung');
      return;
    }
    if (!brandId) {
      toast.error('Chưa có brand đang chọn');
      return;
    }
    setGenerating(true);
    setGenerated(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-multichannel', {
        body: {
          action: 'generate',
          topic: topic.trim(),
          channels: [channel],
          selected_channels: [channel],
          brandTemplateId: brandId,
          brand_template_id: brandId,
          organization_id: orgId,
          contentGoal: 'engagement',
          content_goal: 'engagement',
        },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      const contentId: string | undefined = resp?.contentId || resp?.content_id || resp?.id;
      if (!contentId) throw new Error('Không nhận được contentId từ máy chủ');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data: row } = await sb.from('multi_channel_contents')
        .select('id, title, channel_versions, channel_images')
        .eq('id', contentId)
        .maybeSingle();

      const cv = row?.channel_versions || {};
      const v = cv?.[channel];
      const text = typeof v === 'string' ? v : (v?.content || v?.text || v?.body || '');
      const imgs = row?.channel_images || {};
      const thumb = (imgs?.[channel]?.[0]?.url) || (Array.isArray(imgs?.[channel]) ? imgs[channel][0] : null) || null;

      setGenerated({
        id: contentId,
        title: row?.title || topic.slice(0, 80),
        text: text || '_Không có nội dung_',
        thumbnail: typeof thumb === 'string' ? thumb : (thumb?.url ?? null),
      });
      getTelegramMiniApp()?.HapticFeedback?.notificationOccurred?.('success');
    } catch (e) {
      console.error('[quick-post] generate failed', e);
      toast.error('Tạo bài thất bại: ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setGenerating(false);
    }
  }

  async function publishNow() {
    if (!generated) return;
    const action = CHANNEL_PUBLISH_ACTION[channel];
    if (!action) {
      toast.error('Kênh chưa hỗ trợ đăng tự động');
      return;
    }
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke('channel-publisher', {
        body: { action, contentId: generated.id, channel },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      if (resp?.error || resp?.ok === false) throw new Error(resp.error || 'Đăng thất bại');
      toast.success('🚀 Đã đăng thành công');
      getTelegramMiniApp()?.HapticFeedback?.notificationOccurred?.('success');
      reset();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi';
      if (isTokenExpiredError(e)) {
        toast.error('Kết nối ' + (CHANNEL_LABEL[channel] || channel) + ' đã hết hạn', {
          action: { label: 'Kết nối lại', onClick: onGoConnections },
        });
      } else {
        toast.error('Đăng thất bại: ' + msg);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function scheduleAt(iso: string) {
    if (!generated) return;
    setPublishing(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { error } = await sb.from('content_schedules').insert({
        content_id: generated.id,
        channel,
        organization_id: orgId,
        scheduled_at: iso,
        publish_status: 'scheduled',
        created_by: userId,
        timezone: 'Asia/Ho_Chi_Minh',
      });
      if (error) throw error;
      toast.success(`🗓️ Đã lên lịch ${formatDateTime(iso)}`);
      getTelegramMiniApp()?.HapticFeedback?.notificationOccurred?.('success');
      setScheduleOpen(false);
      reset();
    } catch (e) {
      toast.error('Lên lịch thất bại: ' + (e instanceof Error ? e.message : 'Lỗi'));
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    setGenerated(null);
    setTopic('');
  }

  function openWeb() {
    if (!generated) return;
    openExternal(`https://app.flowa.one/multichannel/${generated.id}`);
  }

  return (
    <div className="p-4 space-y-4">
      {!generated && (
        <>
          <div>
            <label className="text-xs text-muted-foreground">Kênh đăng</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {QUICK_POST_CHANNELS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`px-2.5 py-1.5 rounded-full text-xs border transition-colors ${
                    channel === c
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                >
                  {CHANNEL_EMOJI[c]} {CHANNEL_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">
              Brand <span className="font-medium text-foreground">{brandName || '—'}</span>
            </label>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Mô tả nội dung</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={5}
              placeholder="VD: ưu đãi cuối tuần cho dịch vụ chăm sóc da, tone vui tươi, kèm CTA đặt lịch"
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <Button onClick={generate} disabled={generating || !topic.trim() || !brandId} className="w-full">
            {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? 'Đang tạo bài…' : 'Tạo bài nhanh'}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            💡 Ảnh được tạo nhanh ở chế độ cơ bản. Vào web để custom logo, footer, layout.
          </p>
        </>
      )}

      {generated && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                {CHANNEL_EMOJI[channel]} {CHANNEL_LABEL[channel]}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{generated.title}</span>
            </div>
            {generated.thumbnail && (
              <img src={generated.thumbnail} alt="" className="w-full aspect-square object-cover rounded-md border border-border" loading="lazy" />
            )}
            <div className="text-sm whitespace-pre-line text-foreground/90 max-h-60 overflow-y-auto">
              {generated.text}
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={publishNow} disabled={publishing} className="w-full">
                {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Đăng ngay
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(true)} disabled={publishing}>
                  <CalendarClock className="w-4 h-4 mr-2" /> Lên lịch
                </Button>
                <Button variant="outline" className="flex-1" onClick={openWeb}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Xem web
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground">
                ← Tạo bài mới
              </Button>
            </div>
            <button
              onClick={onGoConnections}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 pt-1"
            >
              <Plug className="w-3 h-3" /> Quản lý kết nối kênh
            </button>
          </CardContent>
        </Card>
      )}

      <Drawer open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Lên lịch đăng</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-2">
            {getScheduleSlots().map((slot) => (
              <Button
                key={slot.key}
                variant="outline"
                className="w-full justify-start"
                disabled={publishing}
                onClick={() => scheduleAt(slot.toIso())}
              >
                <CalendarClock className="w-4 h-4 mr-2" />
                {slot.label}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(slot.toIso())}
                </span>
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setScheduleOpen(false);
                openExternal(`https://app.flowa.one/multichannel/${generated?.id ?? ''}`);
              }}
            >
              Tuỳ chỉnh trên web →
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
