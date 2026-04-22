import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, FileText, Send, ExternalLink, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  CHANNEL_EMOJI, CHANNEL_LABEL, CHANNEL_PUBLISH_ACTION, Loading, formatDateTime,
  openExternal, isTokenExpiredError, relativeTime,
} from './shared';

type Props = {
  orgId: string;
  brandId: string | null;
  onGoConnections: () => void;
  autoOpenContentId?: string | null;
  onAutoOpened?: () => void;
};

type PostRow = {
  id: string;
  title: string | null;
  selected_channels: string[] | null;
  status: string | null;
  channel_statuses: Record<string, { status?: string }> | null;
  channel_versions: Record<string, unknown> | null;
  channel_images: Record<string, unknown> | null;
  created_at: string;
};

export function PostsTab({ orgId, brandId, onGoConnections, autoOpenContentId, onAutoOpened }: Props) {
  const [items, setItems] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<PostRow | null>(null);
  const [publishingKey, setPublishingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      let q = sb.from('multi_channel_contents')
        .select('id, title, selected_channels, status, channel_statuses, channel_versions, channel_images, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (brandId) q = q.eq('brand_template_id', brandId);
      const { data } = await q;
      setItems(data ?? []);
    } catch (e) {
      console.error('[posts-tab] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [orgId, brandId]);

  useEffect(() => { void load(); }, [load]);

  // Deep-link: auto-open preview drawer for a specific content ID (e.g. "Xem ảnh" from bot).
  // Fetch the row directly so it works even when not in the recent-20 list.
  useEffect(() => {
    if (!autoOpenContentId) return;
    let cancelled = false;
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      const { data, error } = await sb.from('multi_channel_contents')
        .select('id, title, selected_channels, status, channel_statuses, channel_versions, channel_images, created_at')
        .eq('id', autoOpenContentId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error('Không tìm thấy bài viết — có thể thuộc workspace khác.');
        onAutoOpened?.();
        return;
      }
      setPreview(data as PostRow);
      onAutoOpened?.();
    })();
    return () => { cancelled = true; };
  }, [autoOpenContentId, orgId, onAutoOpened]);

  async function publish(post: PostRow, channel: string) {
    const action = CHANNEL_PUBLISH_ACTION[channel];
    if (!action) {
      toast.error('Kênh chưa hỗ trợ đăng tự động');
      return;
    }
    const key = `${post.id}::${channel}`;
    setPublishingKey(key);
    try {
      const { data, error } = await supabase.functions.invoke('channel-publisher', {
        body: { action, contentId: post.id, channel },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resp: any = data;
      if (resp?.error || resp?.ok === false) throw new Error(resp.error || 'Đăng thất bại');
      toast.success(`🚀 Đã đăng lên ${CHANNEL_LABEL[channel] || channel}`);
      void load();
    } catch (e) {
      if (isTokenExpiredError(e)) {
        toast.error(`Kết nối ${CHANNEL_LABEL[channel] || channel} hết hạn`, {
          action: { label: 'Kết nối lại', onClick: onGoConnections },
        });
      } else {
        toast.error('Đăng thất bại: ' + (e instanceof Error ? e.message : 'Lỗi'));
      }
    } finally {
      setPublishingKey(null);
    }
  }

  function getThumbnail(post: PostRow): string | null {
    const imgs = post.channel_images || {};
    for (const ch of Object.keys(imgs)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v: any = (imgs as any)[ch];
      if (typeof v === 'string') return v;
      if (Array.isArray(v) && v[0]) return typeof v[0] === 'string' ? v[0] : (v[0]?.url ?? null);
      if (v?.url) return v.url;
    }
    return null;
  }

  function getChannelText(post: PostRow, channel: string): string {
    const cv = post.channel_versions || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v: any = (cv as any)[channel];
    if (typeof v === 'string') return v;
    return v?.content || v?.text || v?.body || '';
  }

  if (loading) return <Loading />;
  if (items.length === 0) {
    return (
      <div className="p-6 text-center">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Chưa có bài nào ở brand này.</p>
        <Button variant="outline" size="sm" onClick={() => void load()} className="mt-3">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{items.length} bài gần nhất</span>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Làm mới
          </Button>
        </div>
        {items.map((it) => {
          const thumb = getThumbnail(it);
          const channels = it.selected_channels ?? [];
          return (
            <Card key={it.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-16 h-16 rounded-md object-cover border border-border shrink-0" loading="lazy" />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-2">{it.title || 'Bài viết'}</div>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {channels.slice(0, 4).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          {CHANNEL_EMOJI[c] ?? '•'} {CHANNEL_LABEL[c] ?? c}
                        </Badge>
                      ))}
                      {channels.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">+{channels.length - 4}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{relativeTime(it.created_at)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => setPreview(it)}>
                    <Eye className="w-4 h-4 mr-1" /> Xem
                  </Button>
                  <Button
                    size="sm" variant="outline" className="flex-1"
                    onClick={() => openExternal(`https://app.flowa.one/multichannel/${it.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" /> Web
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Drawer open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader>
            <DrawerTitle className="text-base line-clamp-2">{preview?.title || 'Xem nội dung'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto space-y-4">
            {preview?.selected_channels?.map((ch) => {
              const text = getChannelText(preview, ch);
              if (!text) return null;
              const action = CHANNEL_PUBLISH_ACTION[ch];
              const key = `${preview.id}::${ch}`;
              return (
                <div key={ch} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {CHANNEL_EMOJI[ch] ?? '•'} {CHANNEL_LABEL[ch] ?? ch}
                    </Badge>
                  </div>
                  <div className="text-sm whitespace-pre-line text-foreground/90 max-h-48 overflow-y-auto rounded-md border border-border p-2 bg-muted/30">
                    {text}
                  </div>
                  {action && (
                    <Button
                      size="sm" className="w-full"
                      disabled={publishingKey === key}
                      onClick={() => void publish(preview, ch)}
                    >
                      {publishingKey === key ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Đăng lên {CHANNEL_LABEL[ch] ?? ch}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
