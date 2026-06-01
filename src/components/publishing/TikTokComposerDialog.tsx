import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  ArrowUpCircle,
  Inbox,
  Megaphone,
  Globe2,
  Users2,
  UserCheck,
  Lock,
  Settings2,
  Hash,
  AtSign,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useTikTokCreatorInfo, type TikTokPrivacyLevel } from '@/hooks/useTikTokCreatorInfo';
import { cn } from '@/lib/utils';
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
  onSaveDraft?: () => void;
}

const PRIVACY_META: Record<
  TikTokPrivacyLevel,
  { title: string; sub: string; Icon: typeof Globe2 }
> = {
  PUBLIC_TO_EVERYONE: { title: 'Ai cũng có thể xem bài đăng này', sub: 'Public', Icon: Globe2 },
  MUTUAL_FOLLOW_FRIENDS: { title: 'Bạn bè', sub: 'Mutual follow', Icon: Users2 },
  FOLLOWER_OF_CREATOR: { title: 'Người theo dõi', sub: 'Followers', Icon: UserCheck },
  SELF_ONLY: { title: 'Chỉ mình tôi', sub: 'Only me', Icon: Lock },
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
  onSaveDraft,
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

  useEffect(() => {
    if (!creatorInfo) return;
    if (privacyLevel && creatorInfo.privacyLevelOptions.includes(privacyLevel)) return;
    const first =
      PRIVACY_ORDER.find((p) => creatorInfo.privacyLevelOptions.includes(p)) ||
      creatorInfo.privacyLevelOptions[0];
    if (first) setPrivacyLevel(first as TikTokPrivacyLevel);
  }, [creatorInfo, privacyLevel]);

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

  const insertToken = (token: string) => {
    setCaption((prev) => (prev.endsWith(' ') || prev.length === 0 ? prev + token : prev + ' ' + token));
  };

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

  const privacyMeta = privacyLevel ? PRIVACY_META[privacyLevel as TikTokPrivacyLevel] : null;
  const discloseSummary = !disclose
    ? 'Tắt'
    : brandedContent && yourBrand
    ? 'Thương hiệu của bạn · Nội dung có thương hiệu'
    : brandedContent
    ? 'Nội dung có thương hiệu'
    : yourBrand
    ? 'Thương hiệu của bạn'
    : 'Bật · chưa chọn loại';
  const otherSummary = [
    commentForcedOff || !allowComment ? 'Tắt bình luận' : null,
    duetForcedOff || !allowDuet ? 'Tắt Duet' : null,
    stitchForcedOff || !allowStitch ? 'Tắt Stitch' : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Cho phép tất cả';

  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-md sm:max-w-md w-full h-[100dvh] sm:h-[90vh] sm:max-h-[860px] sm:rounded-2xl rounded-none overflow-hidden flex flex-col bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/60 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 -ml-1"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium">Đăng lên TikTok</div>
          <div className="w-9" />
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Caption + thumbnail */}
          <div className="flex gap-3 px-4 pt-4">
            <div className="flex-1 min-w-0">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Thêm mô tả..."
                maxLength={4000}
                rows={6}
                className="border-0 px-0 py-0 resize-none shadow-none focus-visible:ring-0 text-base placeholder:text-muted-foreground min-h-[140px]"
              />
            </div>
            <div className="relative w-[88px] h-[140px] rounded-md overflow-hidden bg-muted shrink-0">
              {isVideo ? (
                <video src={mediaUrl} muted playsInline className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
              )}
              <div className="absolute top-1 left-1 text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
                Xem trước
              </div>
            </div>
          </div>

          {/* Hashtag / Mention chips */}
          <div className="flex items-center gap-2 px-4 pt-3">
            <Chip onClick={() => insertToken('#')}>
              <Hash className="w-3.5 h-3.5" /> Hashtag
            </Chip>
            <Chip onClick={() => insertToken('@')}>
              <AtSign className="w-3.5 h-3.5" /> Nhắc đến
            </Chip>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {caption.length}/4000
            </span>
          </div>

          <div className="mt-4 border-t border-border/60" />

          {/* Loading / error */}
          {isLoading && (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
          {error && !isLoading && (
            <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Không tải được thông tin tài khoản TikTok: {(error as Error).message}
            </div>
          )}

          {creatorInfo && (
            <div className="divide-y divide-border/60">
              {/* Khai báo nội dung và quảng cáo */}
              <SectionRow
                icon={<Megaphone className="w-5 h-5" />}
                title="Khai báo nội dung và quảng cáo"
                summary={discloseSummary}
              >
                <div className="space-y-3 px-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">Bật khai báo</div>
                      <div className="text-[11px] text-muted-foreground">
                        Bắt buộc nếu video quảng bá sản phẩm/dịch vụ thương mại.
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
                          <div className="text-sm">Thương hiệu của bạn</div>
                          <div className="text-[11px] text-muted-foreground">
                            Quảng bá cho thương hiệu/doanh nghiệp của chính bạn → nhãn "Promotional content".
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
                          <div className="text-sm">Nội dung có thương hiệu</div>
                          <div className="text-[11px] text-muted-foreground">
                            Paid partnership với thương hiệu khác → nhãn "Paid partnership".
                          </div>
                        </div>
                      </label>

                      {!discloseValid && (
                        <div className="flex items-start gap-2 rounded bg-destructive/5 border border-destructive/30 p-2 text-[11px] text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          Hãy chọn ít nhất một trong "Thương hiệu của bạn" hoặc "Nội dung có thương hiệu".
                        </div>
                      )}
                      {brandedContent && (
                        <div className="flex items-start gap-2 rounded bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-foreground/80">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                          Chế độ <strong>Only me</strong> không khả dụng khi bật Branded content.
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
              </SectionRow>

              {/* Privacy */}
              <SectionRow
                icon={privacyMeta ? <privacyMeta.Icon className="w-5 h-5" /> : <Globe2 className="w-5 h-5" />}
                title={privacyMeta?.title ?? 'Ai có thể xem bài đăng này'}
                summary={privacyMeta?.sub}
              >
                <div className="px-4 pb-4">
                  <RadioGroup
                    value={privacyLevel || ''}
                    onValueChange={(v) => setPrivacyLevel(v as TikTokPrivacyLevel)}
                    className="space-y-1.5"
                  >
                    {PRIVACY_ORDER.filter((p) => creatorInfo.privacyLevelOptions.includes(p)).map(
                      (p) => {
                        const disabledByBranded = brandedContent && p === 'SELF_ONLY';
                        const meta = PRIVACY_META[p];
                        const Icon = meta.Icon;
                        return (
                          <label
                            key={p}
                            className={cn(
                              'flex items-center gap-3 rounded-md border border-border/60 p-2.5 cursor-pointer hover:bg-muted/40',
                              disabledByBranded && 'opacity-50 pointer-events-none',
                              privacyLevel === p && 'border-foreground/30 bg-muted/40',
                            )}
                          >
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm">{meta.title}</div>
                              <div className="text-[11px] text-muted-foreground">{meta.sub}</div>
                            </div>
                            <RadioGroupItem value={p} disabled={disabledByBranded} />
                          </label>
                        );
                      },
                    )}
                  </RadioGroup>
                </div>
              </SectionRow>

              {/* Tùy chọn khác */}
              <SectionRow
                icon={<Settings2 className="w-5 h-5" />}
                title="Tùy chọn khác"
                summary={otherSummary}
              >
                <div className="space-y-3 px-4 pb-4">
                  <ToggleRow
                    label="Cho phép bình luận"
                    checked={commentForcedOff ? false : allowComment}
                    disabled={commentForcedOff}
                    forcedOffNote={commentForcedOff ? 'Tài khoản đã tắt bình luận' : undefined}
                    onChange={setAllowComment}
                  />
                  <ToggleRow
                    label="Cho phép Duet"
                    checked={duetForcedOff ? false : allowDuet}
                    disabled={duetForcedOff}
                    forcedOffNote={duetForcedOff ? 'Tài khoản đã tắt Duet' : undefined}
                    onChange={setAllowDuet}
                  />
                  <ToggleRow
                    label="Cho phép Stitch"
                    checked={stitchForcedOff ? false : allowStitch}
                    disabled={stitchForcedOff}
                    forcedOffNote={stitchForcedOff ? 'Tài khoản đã tắt Stitch' : undefined}
                    onChange={setAllowStitch}
                  />
                </div>
              </SectionRow>

              {/* Confirmation footnote */}
              <div className="px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
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
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3 flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-full"
            onClick={onSaveDraft ?? (() => onOpenChange(false))}
            disabled={isPublishing}
          >
            <Inbox className="w-4 h-4 mr-2" />
            Nháp
          </Button>
          <Button
            className="flex-1 h-11 rounded-full bg-[hsl(351,95%,62%)] hover:bg-[hsl(351,95%,56%)] text-white"
            onClick={submit}
            disabled={!canSubmit}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang đăng...
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Đăng
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 hover:bg-muted px-3 py-1.5 text-xs text-foreground/80"
    >
      {children}
    </button>
  );
}

function SectionRow({
  icon,
  title,
  summary,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 text-left">
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 min-w-0 text-sm truncate">{title}</span>
        {summary && (
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{summary}</span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
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
