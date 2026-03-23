import { useState, useMemo } from 'react';
import { formatDistanceToNow, isPast, parseISO, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Eye, Trash2, Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, Tag, Image, Building, FileText, RefreshCw, CalendarClock, Music2, AtSign, Star, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Zap } from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MultiChannelContent, Channel, CONTENT_GOALS, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';
import { QuickScheduleDialog } from '@/components/QuickScheduleDialog';
import { CreatorCell } from '@/components/CreatorCell';
import type { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { cn } from '@/lib/utils';

interface MultiChannelCardProps {
  content: MultiChannelContent;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  onScheduleComplete?: () => void;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
  index?: number;
  brandLogoUrl?: string | null;
  geoScore?: number | null;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  facebook: <Facebook className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  instagram: <Instagram className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  twitter: <XIcon className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  google_maps: <MapPin className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  linkedin: <Linkedin className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  email: <Mail className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  youtube: <Youtube className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  zalo_oa: <ZaloIcon className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  telegram: <Send className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  tiktok: <Music2 className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
  threads: <AtSign className="w-3 h-3 xs:w-3.5 xs:h-3.5" />,
};

const channelColors: Record<Channel, string> = {
  website: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  facebook: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  twitter: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  google_maps: 'bg-green-500/20 text-green-400 border-green-500/30',
  linkedin: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  email: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  youtube: 'bg-red-500/20 text-red-400 border-red-500/30',
  zalo_oa: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  telegram: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  threads: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const goalColors: Record<string, string> = {
  education: 'bg-cyan-500/20 text-cyan-400',
  awareness: 'bg-purple-500/20 text-purple-400',
  engagement: 'bg-orange-500/20 text-orange-400',
  expertise: 'bg-emerald-500/20 text-emerald-400',
  conversion: 'bg-red-500/20 text-red-400',
};

const statusConfig: Record<ContentStatus, { color: string; glow: string; indicator: string }> = {
  draft: { color: 'bg-muted text-muted-foreground border-muted-foreground/30', glow: '', indicator: 'bg-muted-foreground' },
  review: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', glow: 'hover:shadow-yellow-500/20', indicator: 'bg-yellow-400' },
  approved: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', glow: 'hover:shadow-blue-500/20', indicator: 'bg-blue-400' },
  published: { color: 'bg-green-500/20 text-green-400 border-green-500/30', glow: 'hover:shadow-green-500/20', indicator: 'bg-green-400' },
};

const statusDotColors: Record<ContentStatus, string> = {
  draft: 'bg-muted-foreground',
  review: 'bg-yellow-400',
  approved: 'bg-blue-400',
  published: 'bg-green-400',
};

const priorityConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  high: { label: 'Cao', icon: <ArrowUp className="w-2.5 h-2.5" />, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  medium: { label: 'TB', icon: <ArrowRight className="w-2.5 h-2.5" />, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Thấp', icon: <ArrowDown className="w-2.5 h-2.5" />, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

function getCritiqueColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

function getCritiqueBarColor(score: number): string {
  if (score >= 80) return 'bg-green-400';
  if (score >= 60) return 'bg-yellow-400';
  return 'bg-red-400';
}

export function MultiChannelCard({ content, onView, onDelete, onScheduleComplete, creatorProfile, isLoadingProfile, index = 0, brandLogoUrl, geoScore }: MultiChannelCardProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;
  const statusLabel = CONTENT_STATUSES.find(s => s.value === content.status)?.label || content.status;
  const statusStyle = statusConfig[content.status || 'draft'];
  const imageCount = Object.keys(content.channel_images || {}).length;
  
  const timeAgo = formatDistanceToNow(new Date(content.created_at), {
    addSuffix: true,
    locale: vi,
  });

  const safeChannels = content?.selected_channels ?? [];

  const filledChannelsCount = safeChannels.filter(ch => {
    const contentKey = `${ch}_content` as keyof MultiChannelContent;
    return content[contentKey] && (content[contentKey] as string).length > 0;
  }).length;

  // Get first thumbnail from channel_images - improved
  const firstThumbnail = useMemo(() => {
    if (!content.channel_images) return null;
    for (const channel of safeChannels) {
      const img = content.channel_images[channel];
      if (img && typeof img === 'object' && 'url' in img && img.url) {
        return img.url as string;
      }
      if (img && typeof img === 'string') {
        return img;
      }
    }
    return null;
  }, [content.channel_images, safeChannels]);

  // Deadline check
  const deadlineInfo = useMemo(() => {
    if (!content.deadline) return null;
    try {
      const date = parseISO(content.deadline);
      const overdue = isPast(date);
      return { date, overdue, formatted: format(date, 'dd/MM') };
    } catch {
      return null;
    }
  }, [content.deadline]);

  const getFirstChannelContent = (): string | null => {
    for (const channel of safeChannels) {
      const contentKey = `${channel}_content` as keyof MultiChannelContent;
      const channelContent = content[contentKey] as string | null;
      if (channelContent && channelContent.length > 0) {
        return channelContent.replace(/[#*_`~\\\\[\\\\]]/g, '').trim();
      }
    }
    return null;
  };

  const firstChannelContent = getFirstChannelContent();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative rounded-xl border border-border/50 transition-all duration-300 ease-out group overflow-hidden",
        "bg-background/80 backdrop-blur-sm",
        // #7: Subtler hover - reduced translate and shadow
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
        statusStyle.glow
      )}
    >
      {/* Status indicator line - left edge */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300",
        statusStyle.indicator,
        isHovered ? "w-1.5" : "w-1"
      )} />

      <div className="pl-3.5 xs:pl-4 pr-2.5 xs:pr-3 py-2.5 xs:py-3">
        {/* Animated gradient overlay on hover */}
        <div className={cn(
          "absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 via-transparent to-secondary/0 transition-all duration-500 pointer-events-none",
          isHovered && "from-primary/5 to-secondary/5"
        )} />
        
        {/* Status glow border */}
        <div className={cn(
          "absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none",
          content.status === 'published' && "ring-1 ring-green-500/30",
          content.status === 'review' && "ring-1 ring-yellow-500/30",
          content.status === 'approved' && "ring-1 ring-blue-500/30",
          !isHovered && "opacity-0",
          isHovered && "opacity-100"
        )} />
        
        {/* Top Row - Status, Priority & Thumbnail */}
        <div className="relative flex items-start justify-between mb-1.5 xs:mb-2">
          {/* Row 1: Status + Priority */}
          <div className="flex items-center gap-1 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn("text-[9px] xs:text-[10px] px-1.5 py-0.5", statusStyle.color)}
            >
              {statusLabel}
            </Badge>
            {content.priority && priorityConfig[content.priority] && (
              <Badge 
                variant="outline" 
                className={cn("text-[8px] xs:text-[9px] px-1 py-0 gap-0.5", priorityConfig[content.priority].color)}
              >
                {priorityConfig[content.priority].icon}
                {priorityConfig[content.priority].label}
              </Badge>
            )}
            {content.industry && (
              <Badge variant="outline" className="text-[8px] xs:text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                <Building className="w-2 h-2 xs:w-2.5 xs:h-2.5 mr-0.5" />
                <span className="hidden xs:inline">{content.industry}</span>
              </Badge>
            )}
          </div>
          
          {/* #1: Larger thumbnail (w-14 h-14) with shadow */}
          {firstThumbnail && (
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border/50 flex-shrink-0 ml-2 shadow-sm">
              <img 
                src={firstThumbnail} 
                alt="" 
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>
          )}
        </div>

        {/* Header - Title with tooltip for content preview */}
        <div className="relative mb-1.5 xs:mb-2">
          {/* #2: Content preview only in tooltip, not inline. #7: underline on hover */}
          {firstChannelContent ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="font-semibold text-sm xs:text-base text-foreground line-clamp-2 hover:underline decoration-primary/40 underline-offset-2 transition-all duration-200 cursor-default">
                    {content.title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p className="italic text-muted-foreground">"{firstChannelContent.slice(0, 300)}{firstChannelContent.length > 300 ? '...' : ''}"</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <h3 className="font-semibold text-sm xs:text-base text-foreground line-clamp-2 hover:underline decoration-primary/40 underline-offset-2 transition-all duration-200">
              {content.title}
            </h3>
          )}
          <p className="text-[10px] xs:text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {content.topic}
          </p>
        </div>

        {/* #3: Row 2 badges - Goal + Deadline + Critique score */}
        <div className="relative flex flex-wrap items-center gap-1 xs:gap-1.5 mb-1.5 xs:mb-2">
          <Badge variant="outline" className={cn("text-[8px] xs:text-[10px] px-1 xs:px-1.5 py-0 h-3.5 xs:h-4", goalColors[content.content_goal])}>
            {goalLabel}
          </Badge>
          
          {deadlineInfo && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[8px] xs:text-[10px] px-1 py-0 h-3.5 xs:h-4 gap-0.5",
                deadlineInfo.overdue 
                  ? "bg-red-500/20 text-red-400 border-red-500/30" 
                  : "bg-sky-500/10 text-sky-400 border-sky-500/30"
              )}
            >
              {deadlineInfo.overdue && <AlertTriangle className="w-2 h-2" />}
              <CalendarClock className="w-2 h-2" />
              {deadlineInfo.formatted}
            </Badge>
          )}

          {content.critique_score != null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-1 py-0 h-3.5 xs:h-4 rounded-full border border-border/50 bg-background/50">
                    <Star className={cn("w-2 h-2", getCritiqueColor(content.critique_score))} />
                    <span className={cn("text-[8px] xs:text-[10px] font-semibold", getCritiqueColor(content.critique_score))}>
                      {content.critique_score}
                    </span>
                    <div className="w-6 h-1 rounded-full bg-muted/50 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", getCritiqueBarColor(content.critique_score))} 
                        style={{ width: `${content.critique_score}%` }} 
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Điểm đánh giá: {content.critique_score}/100
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* #6: Improved progress bar - h-1.5 with label */}
        <div className="relative flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${safeChannels.length > 0 ? (filledChannelsCount / safeChannels.length) * 100 : 0}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
            />
          </div>
          <span className="text-[8px] xs:text-[9px] text-muted-foreground whitespace-nowrap">
            {filledChannelsCount}/{safeChannels.length} kênh
          </span>
        </div>

        {/* #4: Channel section with header and image/file counts */}
        <TooltipProvider>
          <div className="relative mb-1.5 xs:mb-2">
            {/* Channel header with counts */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[8px] xs:text-[9px] text-muted-foreground font-medium uppercase tracking-wider">Kênh</span>
              {imageCount > 0 && (
                <span className="flex items-center gap-0.5 text-[8px] text-violet-400">
                  <Image className="w-2 h-2" />
                  {imageCount}
                </span>
              )}
              <span className="flex items-center gap-0.5 text-[8px] text-emerald-500">
                <FileText className="w-2 h-2" />
                {filledChannelsCount}
              </span>
            </div>
            {/* Channel icons - no scale on hover, use brightness instead */}
            <div className="flex flex-wrap gap-1 xs:gap-1.5">
              {safeChannels.slice(0, 6).map((channel) => {
                const channelStatus = content.channel_statuses?.[channel] || 'draft';
                const channelStatusLabel = CONTENT_STATUSES.find(s => s.value === channelStatus)?.label || channelStatus;
                return (
                  <Tooltip key={channel}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative flex items-center p-1.5 xs:p-2 rounded-md border transition-all duration-200",
                          channelColors[channel],
                          // #4: brightness instead of scale to avoid layout shift
                          "hover:brightness-125 hover:shadow-sm"
                        )}
                      >
                        {channelIcons[channel]}
                        <span 
                          className={cn(
                            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-background",
                            statusDotColors[channelStatus]
                          )}
                        />
                        {content.channel_images?.[channel] && (
                          <span 
                            className="absolute -bottom-0.5 -left-0.5 w-2 h-2 rounded-full bg-violet-400 ring-1 ring-background"
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">{channel}</p>
                      <p className="text-muted-foreground">{channelStatusLabel}</p>
                      <p className={cn(
                        "text-[10px]",
                        content.channel_images?.[channel] ? "text-violet-400" : "text-muted-foreground/60"
                      )}>
                        {content.channel_images?.[channel] ? "📷 Có ảnh" : "Chưa có ảnh"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {safeChannels.length > 6 && (
                <div className="flex items-center px-1.5 py-1 rounded-md border border-border text-[9px] xs:text-[10px] text-muted-foreground">
                  +{safeChannels.length - 6}
                </div>
              )}
            </div>
          </div>
        </TooltipProvider>

        {/* Tags - increased max-width for readability */}
        {content.tags && content.tags.length > 0 && (
          <div className="relative hidden xs:flex items-center gap-1 mb-2">
            <Tag className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {content.tags.slice(0, 3).map((tag, tagIndex) => (
                <span 
                  key={tagIndex} 
                  className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground truncate max-w-[80px]"
                >
                  {tag}
                </span>
              ))}
              {content.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{content.tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* #5: Simplified footer - Creator + brand + time in one row */}
        <div className="relative flex items-center justify-between text-[9px] xs:text-[10px] text-muted-foreground mb-1.5 xs:mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
            {(brandLogoUrl || content.brand_name) && (
              <>
                <span className="text-muted-foreground/40">·</span>
                {brandLogoUrl ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <img 
                        src={brandLogoUrl} 
                        alt={content.brand_name || 'Brand'} 
                        className="w-4 h-4 xs:w-5 xs:h-5 rounded-sm object-contain flex-shrink-0"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {content.brand_name}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="truncate text-[8px] xs:text-[10px]">{content.brand_name}</span>
                )}
              </>
            )}
          </div>
          <span className="opacity-70 text-[8px] xs:text-[10px] flex-shrink-0">{timeAgo}</span>
        </div>

        {/* #7: Actions - smooth reveal from right */}
        <div className="relative flex gap-1 xs:gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 xs:h-8 text-[10px] xs:text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
            onClick={() => onView(content)}
          >
            <Eye className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
            Xem
          </Button>

          <div className={cn(
            "flex gap-1 transition-all duration-300 ease-out overflow-hidden",
            isHovered ? "opacity-100 max-w-24 translate-x-0" : "opacity-0 max-w-0 translate-x-2"
          )}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 xs:h-8 xs:w-8 p-0 bg-background/80 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200"
                    onClick={() => setShowScheduleDialog(true)}
                  >
                    <CalendarClock className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lên lịch đăng</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 xs:h-8 xs:w-8 p-0 bg-background/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200"
                >
                  <Trash2 className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa nội dung?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc muốn xóa "{content.title}"? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(content.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Quick Schedule Dialog */}
      <QuickScheduleDialog
        content={content}
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onScheduleComplete={onScheduleComplete}
      />
    </motion.div>
  );
}
