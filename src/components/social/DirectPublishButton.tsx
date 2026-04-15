import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { ChannelIcon } from '@/components/ui/channel-icon';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrganization } from '@/hooks/useOrganization';
import { useSocialConnections, SocialPlatform } from '@/hooks/useSocialConnections';
import { useDirectPublish, PublishOptions } from '@/hooks/useDirectPublish';
import { useContentSchedules } from '@/hooks/useContentSchedules';
import { Channel } from '@/types/multichannel';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Send, 
  Twitter, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Settings,
  CalendarClock,
  CalendarIcon,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { stripSeoMetadata } from '@/utils/contentFormatter';
import { useNavigate } from 'react-router-dom';

interface DirectPublishButtonProps {
  content: string;
  contentId?: string;
  channel: string;
  brandTemplateId?: string;
  mediaUrls?: string[];
  disabled?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  channelStatus?: string;
  onPublishSuccess?: () => void;
  iconOnly?: boolean;
}

const CHANNEL_TO_PLATFORM: Record<string, SocialPlatform> = {
  twitter: 'twitter',
  facebook: 'facebook',
  instagram: 'instagram',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  threads: 'threads',
  youtube: 'youtube',
  zalo_oa: 'zalo_oa',
  google_business: 'google_business',
  website: 'website',
};

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  twitter: 'Twitter / X',
  facebook: 'Facebook Page',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  threads: 'Threads',
  youtube: 'YouTube',
  zalo_oa: 'Zalo OA',
  google_business: 'Google Business',
  website: 'Website',
};

const PLATFORM_ICONS: Record<SocialPlatform, React.ElementType> = {
  twitter: XIcon,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: () => <span>🎵</span>,
  threads: () => <span>🧵</span>,
  youtube: () => <span>▶️</span>,
  zalo_oa: ZaloIcon,
  google_business: () => <span>📍</span>,
  website: () => <span>🌐</span>,
};

const PLATFORM_CHAR_LIMITS: Partial<Record<SocialPlatform, number>> = {
  twitter: 280,
  facebook: 63206,
  zalo_oa: 2000,
};

type DialogState = 'confirm' | 'success' | 'blog';

export function DirectPublishButton({
  content,
  contentId,
  channel,
  brandTemplateId,
  mediaUrls,
  disabled,
  variant = 'outline',
  size = 'sm',
  className,
  channelStatus,
  onPublishSuccess,
  iconOnly = false,
}: DirectPublishButtonProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { connections, getConnectionForPlatform } = useSocialConnections({ 
    brandTemplateId,
    organizationId: currentOrganization?.id,
  });
  const { publishToTwitter, publishToFacebook, publishToInstagram, publishToZaloOA, publishToLinkedIn, publishToTikTok, publishToBlog, isPublishing } = useDirectPublish();
  const { upsertSchedule } = useContentSchedules(contentId);

  // Query existing blog post for this content to auto-fill backlink
  const { data: blogBacklink } = useQuery({
    queryKey: ['blog-backlink', contentId],
    queryFn: async () => {
      if (!contentId) return null;
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, is_public, status')
        .eq('content_id', contentId)
        .eq('status', 'published')
        .maybeSingle();
      if (!data?.slug) return null;
      const baseUrl = data.is_public ? 'https://flowa.vn' : 'https://app.flowa.one';
      return `${baseUrl}/blog/${data.slug}`;
    },
    enabled: !!contentId && channel !== 'website',
    staleTime: 30_000,
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    platform: SocialPlatform | null;
  }>({ open: false, platform: null });

  const [dialogState, setDialogState] = useState<DialogState>('confirm');
  const [editableContent, setEditableContent] = useState(content);
  const [linkUrl, setLinkUrl] = useState('');
  const [publishedResult, setPublishedResult] = useState<{ postId?: string; postUrl?: string } | null>(null);
  const [zaloTitle, setZaloTitle] = useState('');
  const [zaloDescription, setZaloDescription] = useState('');
  const [blogTitle, setBlogTitle] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogIsPublic, setBlogIsPublic] = useState(false);

  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const platform = CHANNEL_TO_PLATFORM[channel];
  const connection = platform ? getConnectionForPlatform(platform) : null;
  const Icon = platform ? PLATFORM_ICONS[platform] : Send;
  const charLimit = platform ? PLATFORM_CHAR_LIMITS[platform] : undefined;

  // Sync editableContent when content prop changes
  useEffect(() => {
    const cleanedContent = stripSeoMetadata(content);
    setEditableContent(cleanedContent);
    // Auto-extract title and description — skip channel-name headers and SEO metadata
    const CHANNEL_HEADER_RE = /^(📱\s*)?ZALO[_\s]?OA$/i;
    const SEO_LABEL_RE = /^(SEO\s*Title|Meta\s*Description|Focus\s*Keyword|Slug|Tiêu\s*đề\s*SEO|Mô\s*tả\s*Meta|Từ\s*khóa\s*chính|Đường\s*dẫn)$/i;
    const lines = cleanedContent.split('\n').filter(l => l.trim());
    const meaningfulLines = lines
      .map(l => l.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim())
      .filter(l => l && !CHANNEL_HEADER_RE.test(l) && !SEO_LABEL_RE.test(l));
    const firstLine = meaningfulLines[0] || '';
    setZaloTitle(firstLine.substring(0, 100));
    setZaloDescription(meaningfulLines.slice(0, 3).join(' ').substring(0, 200));
    setBlogTitle(firstLine.substring(0, 200));
    setBlogExcerpt(meaningfulLines.slice(1, 4).join(' ').substring(0, 300));
  }, [content]);

  const zaloCoverUrl = useMemo(() => mediaUrls?.[0] || null, [mediaUrls]);
  const isZaloMissingCover = platform === 'zalo_oa' && !zaloCoverUrl;

  const handlePublish = async () => {
    if (!platform) return;

    // Website/Blog: doesn't need a social connection
    if (platform === 'website') {
      try {
        const result = await publishToBlog({
          connectionId: connection?.id || 'direct-blog',
          contentId,
          content: stripSeoMetadata(editableContent),
          mediaUrls,
          isPublic: blogIsPublic,
          blogData: {
            title: blogTitle || 'Bài viết mới',
            excerpt: blogExcerpt || undefined,
            isPublic: blogIsPublic,
          },
        });
        setPublishedResult({ postId: result?.postId, postUrl: result?.postUrl });
        setDialogState('success');
        onPublishSuccess?.();
      } catch (error) {
        // Error handled by publishToBlog toast
      }
      return;
    }

    if (!connection) return;

    try {
      const publishOptions: PublishOptions = {
        connectionId: connection.id,
        contentId,
        content: editableContent,
        mediaUrls,
        ...(platform === 'facebook' && linkUrl ? { linkUrl } : {}),
        ...(platform === 'zalo_oa' ? {
          articleData: {
            title: zaloTitle || 'Bài viết mới',
            description: zaloDescription || editableContent.substring(0, 200),
            coverUrl: zaloCoverUrl || undefined,
          },
        } : {}),
      };

      let result;
      switch (platform) {
        case 'twitter':
          result = await publishToTwitter(publishOptions);
          break;
        case 'facebook':
          result = await publishToFacebook(publishOptions);
          break;
        case 'instagram':
          result = await publishToInstagram(publishOptions);
          break;
        case 'linkedin':
          result = await publishToLinkedIn(publishOptions);
          break;
        case 'tiktok':
          result = await publishToTikTok(publishOptions);
          break;
        case 'zalo_oa':
          result = await publishToZaloOA(publishOptions);
          break;
        default:
          console.warn(`Platform ${platform} not yet supported`);
          return;
      }

      setPublishedResult({ postId: result?.postId, postUrl: result?.postUrl });
      setDialogState('success');
      onPublishSuccess?.();
    } catch (error) {
      // Error handled by hook toast
    }
  };

  const handleClick = () => {
    // Website/Blog: no social connection needed
    if (platform === 'website') {
      setEditableContent(content);
      setPublishedResult(null);
      setDialogState('blog');
      setConfirmDialog({ open: true, platform });
      return;
    }

    if (!connection) {
      navigate('/settings?tab=social');
      return;
    }

    // Zalo OA: publish directly without confirmation dialog
    if (platform === 'zalo_oa') {
      handlePublish();
      return;
    }

    setEditableContent(content);
    setLinkUrl(blogBacklink || '');
    setPublishedResult(null);
    setDialogState('confirm');
    setConfirmDialog({ open: true, platform });
  };

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, platform: null });
    setDialogState('confirm');
    setPublishedResult(null);
  };

  const handleScheduleClick = () => {
    if (!connection) {
      navigate('/settings?tab=social');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow);
    setScheduleTime('09:00');
    setScheduleNotes('');
    setScheduleDialog(true);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate || !contentId || !platform) return;

    setIsScheduling(true);
    try {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const scheduledAt = new Date(scheduleDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      await upsertSchedule(contentId, {
        channel: channel as Channel,
        scheduled_at: scheduledAt.toISOString(),
        timezone: 'Asia/Ho_Chi_Minh',
        notes: scheduleNotes || undefined,
      });

      setScheduleDialog(false);
    } catch (error) {
      console.error('Schedule error:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  if (!platform) return null;

  const isAlreadyPublished = channelStatus === 'published';
  const isSupported = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'zalo_oa', 'website'].includes(platform);

  if (!isSupported) {
    if (iconOnly) {
      return (
        <button
          type="button"
          disabled
          title={`${PLATFORM_DISPLAY_NAMES[platform!] || platform} — Sắp ra mắt`}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border border-dashed border-muted-foreground/30 opacity-40 cursor-not-allowed touch-manipulation',
            className
          )}
        >
          <ChannelIcon channel={(channel || platform || 'website') as Channel} size={16} className="text-muted-foreground" />
        </button>
      );
    }
    return (
      <Button variant="ghost" size={size} disabled className={cn('opacity-50', className)}>
        <Send className="h-4 w-4 mr-1" />
        Sắp ra mắt
      </Button>
    );
  }

  const tooltipText = isAlreadyPublished
    ? `${PLATFORM_DISPLAY_NAMES[platform!] || platform} — Đã đăng ✓`
    : connection
      ? `Đăng lên ${PLATFORM_DISPLAY_NAMES[platform!] || platform}`
      : `${PLATFORM_DISPLAY_NAMES[platform!] || platform} — Chưa kết nối`;

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          disabled={disabled || isPublishing || !content}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleClick();
          }}
          title={tooltipText}
          aria-label={tooltipText}
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center transition-all relative shrink-0 touch-manipulation',
            isAlreadyPublished && 'bg-emerald-500/15 border-2 border-emerald-500/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25',
            !isAlreadyPublished && connection && 'border-2 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70 hover:shadow-sm hover:shadow-primary/20',
            !isAlreadyPublished && !connection && 'border border-dashed border-muted-foreground/30 text-muted-foreground/50 opacity-60 hover:opacity-80 hover:border-muted-foreground/50',
            (disabled || isPublishing || !content) && 'pointer-events-none opacity-40',
            className
          )}
        >
          {isPublishing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChannelIcon channel={(channel || platform || 'website') as Channel} size={14} />
          )}
          {isAlreadyPublished && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
            </span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-1">
          {isAlreadyPublished && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Đã đăng
            </Badge>
          )}
          <Button
            variant={isAlreadyPublished ? 'ghost' : variant}
            size={size}
            disabled={disabled || isPublishing || !content || isZaloMissingCover}
            onClick={handleClick}
            title={isZaloMissingCover ? 'Cần thêm ảnh bìa để đăng lên Zalo OA' : undefined}
            className={cn(
              isAlreadyPublished ? 'text-muted-foreground text-xs' : '',
              variant === 'outline' && connection ? 'text-primary border-primary/30 hover:bg-primary/10' : '',
              className
            )}
          >
            {isPublishing && platform === 'zalo_oa' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Đang đăng...
              </>
            ) : isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Icon className="h-4 w-4 mr-1" />
            )}
            {!isPublishing && (
              isAlreadyPublished ? 'Đăng lại' :
              platform === 'website' ? 'Đăng Blog' : 
              connection ? 'Đăng ngay' : 'Kết nối để đăng'
            )}
          </Button>

          {connection && contentId && (
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || !content}
              onClick={handleScheduleClick}
              className="h-7 w-7 xs:h-8 xs:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              title="Lên lịch đăng"
            >
              <CalendarClock className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          {dialogState === 'success' ? (
            /* ===== SUCCESS STATE ===== */
            <div className="flex flex-col items-center justify-center py-6 px-4 sm:py-10 sm:px-6 text-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Đăng bài thành công! 🎉</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Bài viết đã được đăng lên {PLATFORM_DISPLAY_NAMES[platform!] || platform}
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                {publishedResult?.postUrl && (
                  <Button asChild>
                    <a href={publishedResult.postUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Xem bài đăng
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={handleCloseDialog}>
                  Đóng
                </Button>
              </div>
            </div>
          ) : dialogState === 'blog' ? (
            /* ===== BLOG PUBLISH STATE ===== */
            <>
              <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 bg-primary/5">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary text-primary-foreground">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-semibold">
                    Đăng lên Blog
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Đăng bài viết lên blog Flowa
                  </DialogDescription>
                </div>
              </div>

              <div className="px-4 sm:px-6 pb-2 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Tiêu đề bài viết</Label>
                  <Input
                    value={blogTitle}
                    onChange={(e) => setBlogTitle(e.target.value)}
                    placeholder="Nhập tiêu đề..."
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Mô tả ngắn (excerpt)</Label>
                  <Textarea
                    value={blogExcerpt}
                    onChange={(e) => setBlogExcerpt(e.target.value)}
                    placeholder="Mô tả ngắn cho bài viết..."
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Nội dung</Label>
                  <Textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    rows={6}
                    className="resize-none text-sm leading-relaxed max-h-[200px]"
                    placeholder="Nhập nội dung..."
                  />
                </div>

                <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Đích đăng</Label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="blogTarget"
                        checked={!blogIsPublic}
                        onChange={() => setBlogIsPublic(false)}
                        className="accent-primary"
                      />
                      <span className="text-sm">Blog nội bộ (chỉ hiển thị trong dashboard)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="blogTarget"
                        checked={blogIsPublic}
                        onChange={() => setBlogIsPublic(true)}
                        className="accent-primary"
                      />
                      <span className="text-sm">Blog Flowa (flowa.vn/blog) — công khai</span>
                    </label>
                  </div>
                  {blogIsPublic && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Chỉ admin mới có quyền đăng bài công khai. Nếu bạn không phải admin, bài sẽ được lưu nội bộ.
                    </p>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleCloseDialog} className="sm:flex-1">
                  Hủy
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || !editableContent.trim() || !blogTitle.trim()}
                  className="sm:flex-1 font-semibold"
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isPublishing ? 'Đang đăng...' : 'Đăng bài'}
                </Button>
              </div>
            </>
          ) : (
            /* ===== CONFIRM STATE ===== */
            <>
              {/* Platform Header */}
              <div className={cn(
                'px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3',
                platform === 'facebook' && 'bg-[hsl(220,46%,48%)]/10',
                platform === 'twitter' && 'bg-foreground/5',
                platform === 'instagram' && 'bg-[hsl(330,70%,50%)]/10',
                platform === 'linkedin' && 'bg-[hsl(201,100%,35%)]/10',
                platform === 'zalo_oa' && 'bg-[hsl(210,100%,50%)]/10',
              )}>
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl',
                  platform === 'facebook' && 'bg-[hsl(220,46%,48%)] text-white',
                  platform === 'twitter' && 'bg-foreground text-background',
                  platform === 'instagram' && 'bg-gradient-to-br from-[hsl(37,97%,60%)] via-[hsl(330,70%,50%)] to-[hsl(270,70%,55%)] text-white',
                  platform === 'linkedin' && 'bg-[hsl(201,100%,35%)] text-white',
                  platform === 'zalo_oa' && 'bg-[hsl(210,100%,50%)] text-white',
                  !['facebook','twitter','instagram','linkedin','zalo_oa'].includes(platform || '') && 'bg-primary text-primary-foreground',
                )}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-semibold">
                    Đăng lên {PLATFORM_DISPLAY_NAMES[platform!] || platform}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {connection?.platform_username 
                      ? `@${connection.platform_username}` 
                      : 'Tài khoản đã kết nối'}
                    <span className="hidden sm:inline">
                      {' · '}{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              {/* Editable Content */}
              <div className="px-4 sm:px-6 pb-2 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Nội dung bài đăng</Label>
                    {platform === 'twitter' && editableContent.length > 280 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-amber-600 hover:text-amber-700 px-2"
                        onClick={() => {
                          // Smart truncate: cut at nearest sentence/word boundary
                          let truncated = editableContent.substring(0, 277);
                          const lastSentence = Math.max(
                            truncated.lastIndexOf('。'),
                            truncated.lastIndexOf('. '),
                            truncated.lastIndexOf('! '),
                            truncated.lastIndexOf('? '),
                            truncated.lastIndexOf('\n'),
                          );
                          if (lastSentence > 200) {
                            truncated = truncated.substring(0, lastSentence + 1).trimEnd();
                          } else {
                            const lastSpace = truncated.lastIndexOf(' ');
                            if (lastSpace > 200) {
                              truncated = truncated.substring(0, lastSpace).trimEnd();
                            }
                          }
                          if (truncated.length < editableContent.length) {
                            truncated = truncated + '...';
                          }
                          setEditableContent(truncated.substring(0, 280));
                        }}
                      >
                        ✂️ Rút gọn
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={editableContent}
                    onChange={(e) => setEditableContent(e.target.value)}
                    rows={8}
                    maxLength={platform === 'twitter' ? 280 : undefined}
                    className="resize-none text-sm leading-relaxed max-h-[250px] sm:max-h-[400px]"
                    placeholder="Nhập nội dung..."
                  />
                  {/* Character Count */}
                  {charLimit && (
                    <div className="flex justify-end">
                      <span className={cn(
                        'text-xs font-mono tabular-nums',
                        editableContent.length > charLimit ? 'text-destructive font-semibold' : 
                        editableContent.length > (charLimit * 0.96) ? 'text-destructive' :
                        editableContent.length > (charLimit * 0.89) ? 'text-amber-500' : 'text-muted-foreground'
                      )}>
                        {editableContent.length}/{charLimit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Link URL Input — Facebook only */}
                {platform === 'facebook' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      Link đính kèm (tuỳ chọn)
                    </Label>
                    <Input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com/bai-viet"
                      type="url"
                      className="text-sm"
                    />
                    {blogBacklink && linkUrl === blogBacklink && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        🔗 Backlink blog đã được thêm tự động
                      </p>
                    )}
                  </div>
                )}

                {/* Zalo OA Article Fields */}
                {platform === 'zalo_oa' && (
                  <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <ZaloIcon className="h-3.5 w-3.5" />
                      Thông tin bài viết Zalo OA
                    </div>

                    {/* Cover Image */}
                    {zaloCoverUrl ? (
                      <div className="relative rounded-md overflow-hidden">
                        <img src={zaloCoverUrl} alt="Ảnh bìa" className="w-full h-32 object-cover" />
                        <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">
                          Ảnh bìa
                        </Badge>
                      </div>
                    ) : (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium text-amber-600">Thiếu ảnh bìa</p>
                          <p className="text-muted-foreground mt-0.5">
                            Zalo OA yêu cầu ảnh bìa để đăng bài viết. Vui lòng thêm ảnh vào nội dung trước khi đăng.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Title */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Tiêu đề bài viết</Label>
                        <span className={cn(
                          'text-[10px] font-mono tabular-nums',
                          zaloTitle.length > 100 ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          {zaloTitle.length}/100
                        </span>
                      </div>
                      <Input
                        value={zaloTitle}
                        onChange={(e) => setZaloTitle(e.target.value.substring(0, 100))}
                        placeholder="Tiêu đề bài viết..."
                        className="text-sm"
                        maxLength={100}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Mô tả ngắn</Label>
                        <span className={cn(
                          'text-[10px] font-mono tabular-nums',
                          zaloDescription.length > 200 ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          {zaloDescription.length}/200
                        </span>
                      </div>
                      <Textarea
                        value={zaloDescription}
                        onChange={(e) => setZaloDescription(e.target.value.substring(0, 200))}
                        placeholder="Mô tả ngắn cho bài viết..."
                        rows={2}
                        className="resize-none text-sm"
                        maxLength={200}
                      />
                    </div>
                  </div>
                )}

                {/* Media Preview (non-Zalo platforms) */}
                {mediaUrls && mediaUrls.length > 0 && platform !== 'zalo_oa' && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-1.5 bg-muted/30">
                      <span className="text-xs text-muted-foreground">📷 {mediaUrls.length} ảnh đính kèm</span>
                    </div>
                    <div className={cn(
                      mediaUrls.length === 1 && 'max-h-48',
                      mediaUrls.length > 1 && 'grid grid-cols-2 gap-0.5',
                    )}>
                      {mediaUrls.slice(0, 4).map((url, i) => (
                        <div key={i} className={cn(
                          'relative overflow-hidden bg-muted',
                          mediaUrls.length === 1 && 'w-full h-full',
                          mediaUrls.length > 1 && 'aspect-[4/3]',
                        )}>
                          <img src={url} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                          {i === 3 && mediaUrls.length > 4 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-lg font-bold">+{mediaUrls.length - 4}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleCloseDialog} className="sm:flex-1">
                  Hủy
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || !editableContent.trim() || (platform === 'twitter' && editableContent.length > 280) || isZaloMissingCover}
                  className={cn(
                    'sm:flex-1 font-semibold',
                    platform === 'facebook' && 'bg-[hsl(220,46%,48%)] hover:bg-[hsl(220,46%,42%)] text-white',
                    platform === 'twitter' && 'bg-foreground hover:bg-foreground/90 text-background',
                    platform === 'linkedin' && 'bg-[hsl(201,100%,35%)] hover:bg-[hsl(201,100%,30%)] text-white',
                    platform === 'zalo_oa' && 'bg-[hsl(210,100%,50%)] hover:bg-[hsl(210,100%,45%)] text-white',
                  )}
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isPublishing ? 'Đang đăng...' : 'Đăng ngay'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Lên lịch đăng bài
            </DialogTitle>
            <DialogDescription>
              Chọn ngày giờ để tự động đăng lên {PLATFORM_DISPLAY_NAMES[platform!] || platform}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ngày đăng</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !scheduleDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate ? format(scheduleDate, 'dd/MM/yyyy (EEEE)', { locale: vi }) : 'Chọn ngày'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduleDate}
                    onSelect={setScheduleDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Giờ đăng</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full" />
              </div>
              <p className="text-xs text-muted-foreground">Múi giờ: Asia/Ho_Chi_Minh (GMT+7)</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Ghi chú (tuỳ chọn)</Label>
              <Textarea
                placeholder="VD: Đăng sau khi review xong..."
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {scheduleDate && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 flex items-start gap-2">
                <CalendarClock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {format(scheduleDate, 'dd/MM/yyyy', { locale: vi })} lúc {scheduleTime}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sẽ đăng lên {PLATFORM_DISPLAY_NAMES[platform!] || platform}
                    {connection?.platform_username && ` (@${connection.platform_username})`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={!scheduleDate || isScheduling} className="gap-2">
              {isScheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              {isScheduling ? 'Đang lên lịch...' : 'Lên lịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
