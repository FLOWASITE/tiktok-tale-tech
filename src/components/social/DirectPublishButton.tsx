import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { useDirectPublish } from '@/hooks/useDirectPublish';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: () => <span>🎵</span>,
  threads: () => <span>🧵</span>,
  youtube: () => <span>▶️</span>,
  zalo_oa: () => <span>💬</span>,
  google_business: () => <span>📍</span>,
  website: () => <span>🌐</span>,
};

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
}: DirectPublishButtonProps) {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { connections, getConnectionForPlatform } = useSocialConnections({ 
    brandTemplateId,
    organizationId: currentOrganization?.id,
  });
  const { publishToTwitter, publishToFacebook, isPublishing, publishResult } = useDirectPublish();
  const { upsertSchedule } = useContentSchedules(contentId);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    platform: SocialPlatform | null;
  }>({ open: false, platform: null });

  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const platform = CHANNEL_TO_PLATFORM[channel];
  const connection = platform ? getConnectionForPlatform(platform) : null;
  const Icon = platform ? PLATFORM_ICONS[platform] : Send;

  const handlePublish = async () => {
    if (!connection || !platform) return;

    setConfirmDialog({ open: false, platform: null });

    try {
      const publishOptions = {
        connectionId: connection.id,
        contentId,
        content,
        mediaUrls,
      };

      switch (platform) {
        case 'twitter':
          await publishToTwitter(publishOptions);
          break;
        case 'facebook':
          await publishToFacebook(publishOptions);
          break;
        default:
          console.warn(`Platform ${platform} not yet supported`);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClick = () => {
    if (!connection) {
      navigate('/settings?tab=social');
      return;
    }
    setConfirmDialog({ open: true, platform });
  };

  const handleScheduleClick = () => {
    if (!connection) {
      navigate('/settings?tab=social');
      return;
    }
    // Default to tomorrow 9:00 AM
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

  // If no platform mapping for this channel, don't show button
  if (!platform) {
    return null;
  }

  // Check if platform is supported
  const isSupported = ['twitter', 'facebook', 'instagram', 'linkedin'].includes(platform);

  if (!isSupported) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={cn('opacity-50', className)}
      >
        <Send className="h-4 w-4 mr-1" />
        Sắp ra mắt
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Main Publish Button */}
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isPublishing || !content}
          onClick={handleClick}
          className={cn(
            variant === 'outline' && connection ? 'text-primary border-primary/30 hover:bg-primary/10' : '',
            className
          )}
        >
          {isPublishing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Icon className="h-4 w-4 mr-1" />
          )}
          {connection ? 'Đăng ngay' : 'Kết nối để đăng'}
        </Button>

        {/* Schedule Button - only show when connected */}
        {connection && contentId && (
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled || !content}
            onClick={handleScheduleClick}
            className={cn(
              'h-7 w-7 xs:h-8 xs:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10',
            )}
            title="Lên lịch đăng"
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, platform: null })}
      >
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          {/* Platform Header */}
          <div className={cn(
            'px-6 py-4 flex items-center gap-3',
            platform === 'facebook' && 'bg-[hsl(220,46%,48%)]/10',
            platform === 'twitter' && 'bg-foreground/5',
            platform === 'instagram' && 'bg-[hsl(330,70%,50%)]/10',
            platform === 'linkedin' && 'bg-[hsl(201,100%,35%)]/10',
          )}>
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl',
              platform === 'facebook' && 'bg-[hsl(220,46%,48%)] text-white',
              platform === 'twitter' && 'bg-foreground text-background',
              platform === 'instagram' && 'bg-gradient-to-br from-[hsl(37,97%,60%)] via-[hsl(330,70%,50%)] to-[hsl(270,70%,55%)] text-white',
              platform === 'linkedin' && 'bg-[hsl(201,100%,35%)] text-white',
              !['facebook','twitter','instagram','linkedin'].includes(platform || '') && 'bg-primary text-primary-foreground',
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold">
                Đăng lên {PLATFORM_DISPLAY_NAMES[platform!] || platform}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {connection?.platform_username 
                  ? `@${connection.platform_username}` 
                  : 'Tài khoản đã kết nối'}
                {' · '}{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </DialogDescription>
            </div>
          </div>

          {/* Post Preview Card */}
          <div className="px-6 pb-2">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Post Author */}
              <div className="flex items-center gap-2.5 p-3 pb-2">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold',
                  platform === 'facebook' && 'bg-[hsl(220,46%,48%)]/15 text-[hsl(220,46%,48%)]',
                  platform === 'twitter' && 'bg-foreground/10 text-foreground',
                  platform === 'linkedin' && 'bg-[hsl(201,100%,35%)]/15 text-[hsl(201,100%,35%)]',
                  !['facebook','twitter','linkedin'].includes(platform || '') && 'bg-primary/15 text-primary',
                )}>
                  {(connection?.platform_username || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {connection?.platform_username || 'Tài khoản'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Vừa xong · 🌐</p>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-3 pb-2">
                <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {platform === 'twitter' && content.length > 280
                    ? content.substring(0, 277) + '...'
                    : content}
                </p>
              </div>

              {/* Character Count for Twitter */}
              {platform === 'twitter' && (
                <div className="px-3 pb-2 flex justify-end">
                  <span className={cn(
                    'text-xs font-mono tabular-nums',
                    content.length > 280 ? 'text-destructive font-semibold' : 
                    content.length > 250 ? 'text-amber-500' : 'text-muted-foreground'
                  )}>
                    {content.length}/280
                  </span>
                </div>
              )}

              {/* Media Preview */}
              {mediaUrls && mediaUrls.length > 0 && (
                <>
                  <div className="px-3 pb-1.5">
                    <span className="text-xs text-muted-foreground">📷 {mediaUrls.length} ảnh đính kèm</span>
                  </div>
                  <div className={cn(
                    'border-t border-border',
                    mediaUrls.length === 1 && 'max-h-72',
                    mediaUrls.length > 1 && 'grid grid-cols-2 gap-0.5',
                  )}>
                    {mediaUrls.slice(0, 4).map((url, i) => (
                      <div key={i} className={cn(
                        'relative overflow-hidden bg-muted',
                        mediaUrls.length === 1 && 'w-full h-full',
                        mediaUrls.length > 1 && 'aspect-[4/3]',
                      )}>
                        <img 
                          src={url} 
                          alt={`Ảnh ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {i === 3 && mediaUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">+{mediaUrls.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Warning Banner */}
          {content.length > 280 && platform === 'twitter' && (
            <div className="mx-6 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Nội dung vượt quá 280 ký tự và sẽ được cắt ngắn khi đăng lên Twitter / X.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, platform: null })}
              className="sm:flex-1"
            >
              Hủy
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className={cn(
                'sm:flex-1 font-semibold',
                platform === 'facebook' && 'bg-[hsl(220,46%,48%)] hover:bg-[hsl(220,46%,42%)] text-white',
                platform === 'twitter' && 'bg-foreground hover:bg-foreground/90 text-background',
                platform === 'linkedin' && 'bg-[hsl(201,100%,35%)] hover:bg-[hsl(201,100%,30%)] text-white',
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
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ngày đăng</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !scheduleDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduleDate 
                      ? format(scheduleDate, 'dd/MM/yyyy (EEEE)', { locale: vi })
                      : 'Chọn ngày'}
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

            {/* Time Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Giờ đăng</Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">Múi giờ: Asia/Ho_Chi_Minh (GMT+7)</p>
            </div>

            {/* Notes */}
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

            {/* Preview summary */}
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
            <Button
              onClick={handleScheduleSubmit}
              disabled={!scheduleDate || isScheduling}
              className="gap-2"
            >
              {isScheduling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}
              {isScheduling ? 'Đang lên lịch...' : 'Lên lịch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
