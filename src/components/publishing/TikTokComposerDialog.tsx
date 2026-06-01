import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  Globe2,
  Users2,
  UserCheck,
  Lock,
  Hash,
  AtSign,
  AlertTriangle,
  Info,
  ExternalLink,
  Handshake,
  Check,
  MessageCircle,
  Video,
  Scissors,
  Settings,
  Share2,
  Archive,
  ArrowUpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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

const TIKTOK_RED = '#FE2C55';

const PRIVACY_META: Record<
  TikTokPrivacyLevel,
  { nativeTitle: string; shortTitle: string; Icon: typeof Globe2 }
> = {
  PUBLIC_TO_EVERYONE: {
    nativeTitle: 'Ai cũng có thể xem bài đăng này',
    shortTitle: 'Mọi người',
    Icon: Globe2,
  },
  MUTUAL_FOLLOW_FRIENDS: {
    nativeTitle: 'Bạn bè',
    shortTitle: 'Bạn bè',
    Icon: Users2,
  },
  FOLLOWER_OF_CREATOR: {
    nativeTitle: 'Người theo dõi',
    shortTitle: 'Người theo dõi',
    Icon: UserCheck,
  },
  SELF_ONLY: {
    nativeTitle: 'Chỉ mình tôi',
    shortTitle: 'Chỉ mình tôi',
    Icon: Lock,
  },
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
    setCaption((prev) =>
      prev.endsWith(' ') || prev.length === 0 ? prev + token : prev + ' ' + token,
    );
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
  const PrivacyIcon = privacyMeta?.Icon ?? Globe2;

  const discloseSummary = !disclose
    ? undefined
    : brandedContent && yourBrand
    ? 'Brand · Paid'
    : brandedContent
    ? 'Paid partnership'
    : yourBrand
    ? 'Promotional'
    : 'Bật';

  const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 max-w-md sm:max-w-md w-full h-[100dvh] sm:h-[92vh] sm:max-h-[880px] sm:rounded-2xl rounded-none overflow-hidden flex flex-col bg-background [&>button]:hidden"
      >
        {/* Header — only back button */}
        <div className="flex items-center px-2 h-12 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => onOpenChange(false)}
            disabled={isPublishing}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Body scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Caption + thumbnail */}
          <div className="relative px-4 pt-1 pb-3">
            <div className="pr-[108px]">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={4000}
                rows={6}
                className="border-0 px-0 py-0 resize-none shadow-none focus-visible:ring-0 text-[15px] leading-relaxed min-h-[140px]"
              />
            </div>
            <div className="absolute top-1 right-4 w-[96px] h-[128px] rounded-lg overflow-hidden bg-muted shrink-0">
              {isVideo ? (
                <video src={mediaUrl} muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
              )}
              <span className="absolute top-1 right-1 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full">
                Xem trước
              </span>
              <span className="absolute inset-x-1 bottom-1 bg-black/55 text-white text-[10px] py-1 rounded-md text-center">
                Sửa ảnh bìa
              </span>
            </div>

            {/* Hashtag / Mention pills */}
            <div className="flex items-center gap-2 mt-3">
              <ChipButton onClick={() => insertToken('#')}>
                <Hash className="w-4 h-4" /> Hashtag
              </ChipButton>
              <ChipButton onClick={() => insertToken('@')}>
                <AtSign className="w-4 h-4" /> Nhắc đến
              </ChipButton>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Loading / error */}
          {isLoading && (
            <div className="space-y-0 p-0">
              <Skeleton className="h-14 w-full rounded-none" />
              <Skeleton className="h-14 w-full rounded-none" />
              <Skeleton className="h-14 w-full rounded-none" />
            </div>
          )}
          {error && !isLoading && (
            <div className="m-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              Không tải được thông tin tài khoản TikTok: {(error as Error).message}
            </div>
          )}

          {creatorInfo && (
            <div className="divide-y divide-border/40">
              {/* Disclose commercial content */}
              <SectionRow
                icon={<Megaphone className="w-5 h-5" />}
                title="Khai báo nội dung và quảng cáo"
                rightHint={discloseSummary}
              >
                <div className="space-y-3 px-4 pb-4">
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium">Bật khai báo</div>
                      <div className="text-[12px] text-muted-foreground leading-snug">
                        Bắt buộc nếu video quảng bá sản phẩm hoặc dịch vụ thương mại.
                      </div>
                    </div>
                    <Switch checked={disclose} onCheckedChange={setDisclose} />
                  </div>

                  {disclose && (
                    <div className="space-y-2 pt-1">
                      <DiscloseCard
                        icon={<Megaphone className="w-4 h-4" />}
                        title="Thương hiệu của bạn"
                        desc='Quảng bá thương hiệu của chính bạn — nhãn "Promotional content".'
                        active={yourBrand}
                        onToggle={() => setYourBrand((v) => !v)}
                      />
                      <DiscloseCard
                        icon={<Handshake className="w-4 h-4" />}
                        title="Nội dung có thương hiệu"
                        desc='Paid partnership với thương hiệu khác — nhãn "Paid partnership".'
                        active={brandedContent}
                        onToggle={() => setBrandedContent((v) => !v)}
                      />

                      {!discloseValid && (
                        <div className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/30 p-2.5 text-[12px] text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          Hãy chọn ít nhất một loại nội dung khai báo.
                        </div>
                      )}
                      {brandedContent && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2.5 text-[12px] text-foreground/80">
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                          Chế độ <strong className="mx-1">Chỉ mình tôi</strong> không khả dụng khi bật Branded content.
                        </div>
                      )}
                      <a
                        href="https://www.tiktok.com/legal/page/global/bc-policy/en"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline pt-1"
                      >
                        Đọc Branded Content Policy
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </SectionRow>

              {/* Privacy — title reflects current selection */}
              <SectionRow
                icon={<PrivacyIcon className="w-5 h-5" />}
                title={privacyMeta?.nativeTitle ?? 'Ai có thể xem'}
              >
                <div className="pb-2">
                  <RadioGroup
                    value={privacyLevel || ''}
                    onValueChange={(v) => setPrivacyLevel(v as TikTokPrivacyLevel)}
                    className="space-y-0"
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
                              'flex items-center gap-3 px-4 h-12 cursor-pointer active:bg-muted/60 transition-colors',
                              disabledByBranded && 'opacity-50 pointer-events-none',
                            )}
                          >
                            <Icon className="w-[18px] h-[18px] text-foreground/70" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[14px] font-medium leading-tight">
                                {meta.shortTitle}
                              </div>
                              {disabledByBranded && (
                                <div className="text-[11px] text-muted-foreground">
                                  Không khả dụng với Branded content
                                </div>
                              )}
                            </div>
                            <RadioGroupItem value={p} disabled={disabledByBranded} />
                          </label>
                        );
                      },
                    )}
                  </RadioGroup>
                </div>
              </SectionRow>

              {/* Tùy chọn khác → contains Comment / Duet / Stitch */}
              <SectionRow
                icon={<Settings className="w-5 h-5" />}
                title="Tùy chọn khác"
              >
                <div className="pb-2">
                  <FlatToggleRow
                    icon={<MessageCircle className="w-[18px] h-[18px]" />}
                    label="Cho phép bình luận"
                    checked={commentForcedOff ? false : allowComment}
                    disabled={commentForcedOff}
                    note={commentForcedOff ? 'TikTok đã tắt' : undefined}
                    onChange={setAllowComment}
                  />
                  <FlatToggleRow
                    icon={<Video className="w-[18px] h-[18px]" />}
                    label="Cho phép Duet"
                    checked={duetForcedOff ? false : allowDuet}
                    disabled={duetForcedOff}
                    note={duetForcedOff ? 'TikTok đã tắt' : undefined}
                    onChange={setAllowDuet}
                  />
                  <FlatToggleRow
                    icon={<Scissors className="w-[18px] h-[18px]" />}
                    label="Cho phép Stitch"
                    checked={stitchForcedOff ? false : allowStitch}
                    disabled={stitchForcedOff}
                    note={stitchForcedOff ? 'TikTok đã tắt' : undefined}
                    onChange={setAllowStitch}
                  />
                </div>
              </SectionRow>

              {/* Static "Chia sẻ với" — visual only */}
              <div className="flex items-center gap-3 px-4 h-14">
                <Share2 className="w-5 h-5 text-foreground/70" />
                <span className="flex-1 text-[15px] font-normal">Chia sẻ với</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/70" />
              </div>

              {/* Compact music usage line above footer */}
              <div className="px-4 py-3 text-center text-[10px] text-muted-foreground leading-relaxed">
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

        {/* Sticky footer — 2 pill buttons */}
        <div className="shrink-0 border-t border-border/50 bg-background px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveDraft ?? (() => onOpenChange(false))}
            disabled={isPublishing}
            className="flex-1 h-12 rounded-full bg-muted text-foreground text-[15px] font-medium inline-flex items-center justify-center gap-2 hover:bg-muted/80 active:opacity-80 disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            Nháp
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{ backgroundColor: canSubmit ? TIKTOK_RED : undefined }}
            className={cn(
              'flex-1 h-12 rounded-full text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-opacity',
              canSubmit ? 'text-white hover:opacity-90 active:opacity-80' : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang đăng...
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4" />
                Đăng
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-muted text-[14px] text-foreground/85 hover:bg-muted/80 active:opacity-80"
    >
      {children}
    </button>
  );
}

function SectionRow({
  icon,
  title,
  rightHint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  rightHint?: string;
  children: React.ReactNode;
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group w-full flex items-center gap-3 px-4 h-14 hover:bg-muted/40 active:bg-muted/60 text-left transition-colors">
        <span className="text-foreground/70 shrink-0">{icon}</span>
        <span className="flex-1 min-w-0 text-[15px] font-normal truncate">{title}</span>
        {rightHint && (
          <span className="text-[13px] text-muted-foreground truncate max-w-[140px]">
            {rightHint}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/70 transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

function FlatToggleRow({
  icon,
  label,
  checked,
  disabled,
  note,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  disabled?: boolean;
  note?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 h-14">
      <span className="text-foreground/70 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium leading-tight">{label}</div>
        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function DiscloseCard({
  icon,
  title,
  desc,
  active,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-all',
        active
          ? 'border-foreground/40 bg-muted/40'
          : 'border-border/60 hover:border-foreground/20 hover:bg-muted/20',
      )}
    >
      <span className="text-foreground/70 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium leading-tight">{title}</div>
        <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">{desc}</div>
      </div>
      <span
        className={cn(
          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
          active ? 'border-foreground bg-foreground text-background' : 'border-border',
        )}
      >
        {active && <Check className="w-3 h-3" />}
      </span>
    </button>
  );
}
