import { useState } from 'react';
import { Loader2, Send, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSocialConnections, type SocialPlatform } from '@/hooks/useSocialConnections';
import { useDirectPublish } from '@/hooks/useDirectPublish';
import { useCurrentBrand } from '@/contexts/BrandContext';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { toast } from 'sonner';
import { TikTokComposerDialog, type TikTokSubmitPayload } from '@/components/publishing/TikTokComposerDialog';

interface Props {
  videoUrl: string;
  defaultCaption?: string;
  /** 9:16 = TikTok/Reels/Shorts; 16:9 = YouTube/FB; 1:1 = IG/FB */
  aspectRatio?: '9:16' | '16:9' | '1:1' | '2:3' | '4:5';
  size?: 'sm' | 'default';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

// Platforms hỗ trợ video (publish-* edge function tương ứng đã có)
const VIDEO_PLATFORMS: SocialPlatform[] = ['tiktok', 'facebook', 'instagram', 'youtube', 'linkedin'];

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
  linkedin: 'LinkedIn',
};

// Gợi ý platform tốt nhất theo tỉ lệ
function suggestPlatformsForAspect(aspect?: string): SocialPlatform[] {
  if (aspect === '9:16') return ['tiktok', 'instagram', 'youtube', 'facebook'];
  if (aspect === '16:9') return ['youtube', 'facebook', 'linkedin'];
  if (aspect === '1:1')  return ['instagram', 'facebook', 'linkedin'];
  if (aspect === '2:3')  return ['instagram']; // Pinterest publish chưa hỗ trợ trong menu này
  if (aspect === '4:5')  return ['instagram', 'facebook'];
  return VIDEO_PLATFORMS;
}

export function PublishVideoMenu({
  videoUrl,
  defaultCaption = '',
  aspectRatio,
  size = 'sm',
  variant = 'outline',
  className,
}: Props) {
  const { currentBrand } = useCurrentBrand();
  const { connections } = useSocialConnections({
    brandTemplateId: currentBrand?.id,
  });
  const { publishToTikTok, publishToFacebook, publishToInstagram, publishToLinkedIn, isPublishing } =
    useDirectPublish();

  const [pickedPlatform, setPickedPlatform] = useState<SocialPlatform | null>(null);
  const [pickedConnectionId, setPickedConnectionId] = useState<string | null>(null);
  const [caption, setCaption] = useState(defaultCaption);

  const activeConnections = (connections ?? []).filter(
    (c) => c.is_active && VIDEO_PLATFORMS.includes(c.platform),
  );
  const suggested = suggestPlatformsForAspect(aspectRatio);

  const openPicker = (platform: SocialPlatform) => {
    const conns = activeConnections.filter((c) => c.platform === platform);
    if (conns.length === 0) {
      toast.error(`Chưa kết nối ${PLATFORM_LABEL[platform] ?? platform}. Vào Brand → Social để kết nối.`);
      return;
    }
    setPickedPlatform(platform);
    setPickedConnectionId(conns[0].id);
    setCaption(defaultCaption);
  };

  const submit = async (tiktokPayload?: TikTokSubmitPayload) => {
    if (!pickedPlatform || !pickedConnectionId || !videoUrl) return;
    const baseOpts = {
      connectionId: pickedConnectionId,
      content: (tiktokPayload?.caption ?? caption).trim(),
      mediaUrls: [videoUrl],
    };
    try {
      let result;
      switch (pickedPlatform) {
        case 'tiktok':
          if (!tiktokPayload) return; // wait for composer
          result = await publishToTikTok({
            ...baseOpts,
            tiktokOptions: {
              privacyLevel: tiktokPayload.privacyLevel,
              disableComment: tiktokPayload.disableComment,
              disableDuet: tiktokPayload.disableDuet,
              disableStitch: tiktokPayload.disableStitch,
              isCommercialContent: tiktokPayload.isCommercialContent,
              isYourBrand: tiktokPayload.isYourBrand,
              isBrandedContent: tiktokPayload.isBrandedContent,
            },
          });
          break;
        case 'facebook': result = await publishToFacebook(baseOpts); break;
        case 'instagram': result = await publishToInstagram(baseOpts); break;
        case 'linkedin': result = await publishToLinkedIn(baseOpts); break;
        default:
          toast.error(`Chưa hỗ trợ publish video lên ${pickedPlatform}`);
          return;
      }
      if (result?.postUrl) {
        toast.success('Đăng thành công', {
          action: { label: 'Mở bài đăng', onClick: () => window.open(result.postUrl!, '_blank') },
        });
      }
      setPickedPlatform(null);
    } catch (e) {
      // useDirectPublish đã toast error
      console.error('[publish-video] error', e);
    }
  };


  const conns = pickedPlatform
    ? activeConnections.filter((c) => c.platform === pickedPlatform)
    : [];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant={variant} className={className} disabled={!videoUrl}>
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Đăng ngay
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {aspectRatio ? `Phù hợp với ${aspectRatio}` : 'Chọn nền tảng'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {suggested.map((p) => {
            const conns = activeConnections.filter((c) => c.platform === p);
            const disabled = conns.length === 0;
            return (
              <DropdownMenuItem
                key={p}
                onClick={() => openPicker(p)}
                disabled={disabled}
                className="gap-2 text-xs cursor-pointer"
              >
                <ChannelIcon channel={p as any} className="w-3.5 h-3.5" />
                <span className="flex-1">{PLATFORM_LABEL[p] ?? p}</span>
                {disabled ? (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">Chưa kết nối</Badge>
                ) : conns.length > 1 ? (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1">{conns.length}</Badge>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!pickedPlatform} onOpenChange={(o) => !o && setPickedPlatform(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {pickedPlatform && <ChannelIcon channel={pickedPlatform as any} className="w-4 h-4" />}
              Đăng video lên {pickedPlatform ? PLATFORM_LABEL[pickedPlatform] : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {conns.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Tài khoản</Label>
                <select
                  className="w-full text-sm border rounded-md px-2 py-1.5 bg-background"
                  value={pickedConnectionId ?? ''}
                  onChange={(e) => setPickedConnectionId(e.target.value)}
                >
                  {conns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.platform_display_name || c.platform_username || c.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Caption / mô tả</Label>
              <Textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Viết caption cho bài đăng..."
                className="resize-none text-sm"
              />
              <p className="text-[10px] text-muted-foreground">{caption.length} ký tự</p>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground/80">
                Video sẽ được nền tảng tải về từ URL. Quá trình xử lý phía nền tảng có thể mất 1-3 phút.
              </p>
            </div>

            <div className="text-[10px] text-muted-foreground font-mono break-all">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              {videoUrl}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPickedPlatform(null)} disabled={isPublishing}>
              Hủy
            </Button>
            <Button size="sm" onClick={submit} disabled={isPublishing || !pickedConnectionId}>
              {isPublishing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Đang đăng...</> : <><Send className="w-3.5 h-3.5 mr-1.5" />Đăng ngay</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
