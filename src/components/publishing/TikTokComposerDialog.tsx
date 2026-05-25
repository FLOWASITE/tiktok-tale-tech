import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send, ExternalLink, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { useTikTokCreatorInfo, type TikTokPrivacyLevel } from '@/hooks/useTikTokCreatorInfo';
import type { SocialConnection } from '@/hooks/useSocialConnections';

export interface TikTokSubmitPayload {
  caption: string;
  privacyLevel: TikTokPrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  isCommercialContent: boolean;
  isYourBrand: boolean;
  isBrandedContent: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: SocialConnection | null;
  mediaUrl: string;
  defaultCaption?: string;
  isPublishing?: boolean;
  onSubmit: (payload: TikTokSubmitPayload) => void | Promise<void>;
}

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, { title: string; sub: string }> = {
  PUBLIC_TO_EVERYONE: { title: 'Mọi người', sub: 'Public · ai cũng có thể xem' },
  MUTUAL_FOLLOW_FRIENDS: { title: 'Bạn bè', sub: 'Friends · chỉ tài khoản 2 bên cùng follow' },
  FOLLOWER_OF_CREATOR: { title: 'Người theo dõi', sub: 'Followers · chỉ người follow bạn' },
  SELF_ONLY: { title: 'Chỉ mình tôi', sub: 'Only me · chỉ bạn xem được' },
};

const PRIVACY_ORDER: TikTokPrivacyLevel[] = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
];

export function TikTokComposerDialog({
  open,
  onOpenChange,
  connection,
  mediaUrl,
  defaultCaption = '',
  isPublishing = false,
  onSubmit,
}: Props) {
  const { data: creatorInfo, isLoading, error } = useTikTokCreatorInfo(connection?.id, open);

  const [caption, setCaption] = useState(defaultCaption);
  const [privacyLevel, setPrivacyLevel] = useState<TikTokPrivacyLevel | ''>('');
  const [allowComment, setAllowComment] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [disclose, setDisclose] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setCaption(defaultCaption);
      setAllowComment(true);
      setAllowDuet(true);
      setAllowStitch(true);
      setDisclose(false);
      setYourBrand(false);
      setBrandedContent(false);
      setPrivacyLevel('');
    }
  }, [open, defaultCaption]);

  // Auto-pick first allowed privacy when creator info arrives
  useEffect(() => {
    if (!creatorInfo) return;
    if (privacyLevel && creatorInfo.privacyLevelOptions.includes(privacyLevel)) return;
    const first = PRIVACY_ORDER.find((p) => creatorInfo.privacyLevelOptions.includes(p)) ||
      creatorInfo.privacyLevelOptions[0];
    if (first) setPrivacyLevel(first as TikTokPrivacyLevel);
  }, [creatorInfo, privacyLevel]);

  // If branded content turns on, force off SELF_ONLY
  useEffect(() => {
    if (brandedContent && privacyLevel === 'SELF_ONLY' && creatorInfo) {
      const alt =
        PRIVACY_ORDER.find(
          (p) => p !== 'SELF_ONLY' && creatorInfo.privacyLevelOptions.includes(p),
        ) || privacyLevel;
      setPrivacyLevel(alt as TikTokPrivacyLevel);
    }
  }, [brandedContent, privacyLevel, creatorInfo]);

  const commentForcedOff = Boolean(creatorInfo?.commentDisabled);
  const duetForcedOff = Boolean(creatorInfo?.duetDisabled);
  const stitchForcedOff = Boolean(creatorInfo?.stitchDisabled);

  const discloseValid = useMemo(() => {
    if (!disclose) return true;
    return yourBrand || brandedContent;
  }, [disclose, yourBrand, brandedContent]);

  const canSubmit =
    !isPublishing &&
    !isLoading &&
    !!creatorInfo &&
    !!privacyLevel &&
    discloseValid &&
    !(brandedContent && privacyLevel === 'SELF_ONLY');

  const submit = async () => {
    if (!privacyLevel) return;
    await onSubmit({
      caption: caption.trim(),
      privacyLevel: privacyLevel as TikTokPrivacyLevel,
      disableComment: commentForcedOff ? true : !allowComment,
      disableDuet: duetForcedOff ? true : !allowDuet,
      disableStitch: stitchForcedOff ? true : !allowStitch,
      isCommercialContent: disclose,
      isYourBrand: disclose && yourBrand,
      isBrandedContent: disclose && brandedContent,
    });
  };

  const displayName =
    creatorInfo?.creatorNickname ||
    connection?.platform_display_name ||
    connection?.platform_username ||
    'TikTok';
  const username =
    creatorInfo?.creatorUsername ||
    connection?.platform_username ||
    '';
  const avatarUrl =
    creatorInfo?.creatorAvatarUrl || connection?.platform_avatar_url || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ChannelIcon channel="tiktok" className="w-4 h-4" />
            Post to TikTok
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cấu hình bài đăng theo đúng chính sách của TikTok trước khi gửi.
          </DialogDescription>
        </DialogHeader>

        {/* 1. Account info */}
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <Avatar className="w-9 h-9">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{displayName}</div>
            {username && (
              <div className="text-xs text-muted-foreground truncate">@{username}</div>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Đang đăng vào
          </span>
        </div>

        {isLoading && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            Không tải được thông tin tài khoản TikTok: {(error as Error).message}
          </div>
        )}

        {creatorInfo && (
          <div className="space-y-4">
            {/* 2. Caption */}
            <div className="space-y-1.5">
              <Label className="text-xs">Caption</Label>
              <Textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Viết caption cho video TikTok..."
                className="resize-none text-sm"
                maxLength={4000}
              />
              <p className="text-[10px] text-muted-foreground">{caption.length}/4000</p>
            </div>

            {/* 3. Privacy */}
            <div className="space-y-2">
              <Label className="text-xs">Ai có thể xem video này</Label>
              <RadioGroup
                value={privacyLevel || ''}
                onValueChange={(v) => setPrivacyLevel(v as TikTokPrivacyLevel)}
                className="space-y-1.5"
              >
                {PRIVACY_ORDER.filter((p) => creatorInfo.privacyLevelOptions.includes(p)).map(
                  (p) => {
                    const disabledByBranded = brandedContent && p === 'SELF_ONLY';
                    const meta = PRIVACY_LABELS[p];
                    return (
                      <label
                        key={p}
                        className={`flex items-start gap-2 rounded-md border border-border/60 p-2.5 cursor-pointer hover:bg-muted/40 ${
                          disabledByBranded ? 'opacity-50 pointer-events-none' : ''
                        } ${privacyLevel === p ? 'border-foreground/30 bg-muted/50' : ''}`}
                      >
                        <RadioGroupItem value={p} className="mt-0.5" disabled={disabledByBranded} />
                        <div className="min-w-0">
                          <div className="text-sm">{meta.title}</div>
                          <div className="text-[11px] text-muted-foreground">{meta.sub}</div>
                          {disabledByBranded && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              Không khả dụng khi bật Branded content
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  },
                )}
              </RadioGroup>
            </div>

            {/* 4. Allow users to */}
            <div className="space-y-2">
              <Label className="text-xs">Allow users to</Label>
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <ToggleRow
                  label="Comment"
                  checked={commentForcedOff ? false : allowComment}
                  disabled={commentForcedOff}
                  forcedOffNote={commentForcedOff ? 'Tài khoản đã tắt bình luận' : undefined}
                  onChange={setAllowComment}
                />
                <ToggleRow
                  label="Duet"
                  checked={duetForcedOff ? false : allowDuet}
                  disabled={duetForcedOff}
                  forcedOffNote={duetForcedOff ? 'Tài khoản đã tắt Duet' : undefined}
                  onChange={setAllowDuet}
                />
                <ToggleRow
                  label="Stitch"
                  checked={stitchForcedOff ? false : allowStitch}
                  disabled={stitchForcedOff}
                  forcedOffNote={stitchForcedOff ? 'Tài khoản đã tắt Stitch' : undefined}
                  onChange={setAllowStitch}
                />
              </div>
            </div>

            {/* 5. Commercial content disclosure */}
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Disclose video content</div>
                  <div className="text-[11px] text-muted-foreground">
                    Bật nếu video quảng bá sản phẩm/dịch vụ thương mại.
                  </div>
                </div>
                <Switch checked={disclose} onCheckedChange={setDisclose} />
              </div>

              {disclose && (
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={yourBrand}
                      onCheckedChange={(c) => setYourBrand(c === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-sm">Your brand</div>
                      <div className="text-[11px] text-muted-foreground">
                        Quảng bá cho thương hiệu/doanh nghiệp của chính bạn.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={brandedContent}
                      onCheckedChange={(c) => setBrandedContent(c === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-sm">Branded content</div>
                      <div className="text-[11px] text-muted-foreground">
                        Quảng bá cho thương hiệu khác (paid partnership).
                      </div>
                    </div>
                  </label>

                  {!discloseValid && (
                    <div className="flex items-start gap-2 rounded bg-destructive/5 border border-destructive/30 p-2 text-[11px] text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Hãy chọn ít nhất một trong "Your brand" hoặc "Branded content".
                    </div>
                  )}

                  {brandedContent && (
                    <div className="flex items-start gap-2 rounded bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-foreground/80">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                      Video sẽ được dán nhãn <strong>"Paid partnership"</strong>. Privacy{' '}
                      <strong>Only me</strong> không khả dụng với Branded content.
                    </div>
                  )}
                  {yourBrand && !brandedContent && (
                    <div className="flex items-start gap-2 rounded bg-muted/40 border border-border/60 p-2 text-[11px] text-foreground/80">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Video sẽ được dán nhãn <strong>"Promotional content"</strong>.
                    </div>
                  )}

                  <a
                    href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                  >
                    Đọc Branded Content Policy
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Media URL */}
            <div className="text-[10px] text-muted-foreground font-mono break-all">
              <ExternalLink className="w-3 h-3 inline mr-1" />
              {mediaUrl}
            </div>

            {/* 6. Confirmation */}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Bằng việc đăng bài, bạn đồng ý với{' '}
              <a
                href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Music Usage Confirmation
              </a>
              {brandedContent && (
                <>
                  {' '}và{' '}
                  <a
                    href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Branded Content Policy
                  </a>
                </>
              )}
              .
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            Hủy
          </Button>
          <Button size="sm" onClick={submit} disabled={!canSubmit}>
            {isPublishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Đang đăng...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Post to TikTok
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  forcedOffNote,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  forcedOffNote?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {forcedOffNote && (
          <div className="text-[10px] text-muted-foreground">{forcedOffNote}</div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
