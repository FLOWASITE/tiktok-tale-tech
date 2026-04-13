import { useState, useMemo, useCallback } from 'react';
import { formatDistanceToNow, isPast, parseISO, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Eye, Trash2, CalendarClock, Tag, Star, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Zap, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiChannelContent, Channel, CONTENT_GOALS, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';
import { QuickScheduleDialog } from '@/components/QuickScheduleDialog';
import { CreatorCell } from '@/components/CreatorCell';
import type { CreatorProfile } from '@/hooks/useCreatorProfiles';
import { cn } from '@/lib/utils';

interface SocialPostCardProps {
  content: MultiChannelContent;
  activeChannel: Channel;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  onScheduleComplete?: () => void;
  creatorProfile?: CreatorProfile;
  isLoadingProfile?: boolean;
  index?: number;
  brandLogoUrl?: string | null;
  geoScore?: number | null;
}

const statusConfig: Record<ContentStatus, { color: string; glow: string; indicator: string }> = {
  draft: { color: 'bg-muted text-muted-foreground border-muted-foreground/30', glow: '', indicator: 'bg-muted-foreground' },
  review: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', glow: 'hover:shadow-yellow-500/20', indicator: 'bg-yellow-400' },
  approved: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', glow: 'hover:shadow-blue-500/20', indicator: 'bg-blue-400' },
  partially_published: { color: 'bg-teal-500/20 text-teal-400 border-teal-500/30', glow: 'hover:shadow-teal-500/20', indicator: 'bg-teal-400' },
  published: { color: 'bg-green-500/20 text-green-400 border-green-500/30', glow: 'hover:shadow-green-500/20', indicator: 'bg-green-400' },
};

const goalColors: Record<string, string> = {
  education: 'bg-cyan-500/20 text-cyan-400',
  awareness: 'bg-purple-500/20 text-purple-400',
  engagement: 'bg-orange-500/20 text-orange-400',
  expertise: 'bg-emerald-500/20 text-emerald-400',
  conversion: 'bg-red-500/20 text-red-400',
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

export function SocialPostCard({
  content, activeChannel, onView, onDelete, onScheduleComplete,
  creatorProfile, isLoadingProfile, index = 0, brandLogoUrl, geoScore,
}: SocialPostCardProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;
  const channelStatus = (content.channel_statuses?.[activeChannel] || content.status || 'draft') as ContentStatus;
  const statusLabel = CONTENT_STATUSES.find(s => s.value === channelStatus)?.label || channelStatus;
  const statusStyle = statusConfig[channelStatus] || statusConfig.draft;

  const timeAgo = formatDistanceToNow(new Date(content.created_at), { addSuffix: true, locale: vi });

  // Channel-specific thumbnail
  const thumbnail = useMemo(() => {
    const img = content.channel_images?.[activeChannel];
    if (img && typeof img === 'object' && 'url' in img && img.url) return img.url as string;
    if (img && typeof img === 'string') return img;
    // Fallback to any available image
    if (content.channel_images) {
      for (const ch of content.selected_channels || []) {
        const fallback = content.channel_images[ch];
        if (fallback && typeof fallback === 'object' && 'url' in fallback && fallback.url) return fallback.url as string;
        if (fallback && typeof fallback === 'string') return fallback;
      }
    }
    return null;
  }, [content.channel_images, content.selected_channels, activeChannel]);

  // Channel-specific content preview
  const channelContent = useMemo(() => {
    const key = `${activeChannel}_content` as keyof MultiChannelContent;
    const text = content[key] as string | null;
    if (text) return text.replace(/[#*_`~\\[\]]/g, '').trim();
    return null;
  }, [content, activeChannel]);

  const deadlineInfo = useMemo(() => {
    if (!content.deadline) return null;
    try {
      const date = parseISO(content.deadline);
      return { overdue: isPast(date), formatted: format(date, 'dd/MM') };
    } catch { return null; }
  }, [content.deadline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative rounded-xl border border-border/50 transition-all duration-300 ease-out group overflow-hidden",
        "bg-background/80 backdrop-blur-sm",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
        statusStyle.glow
      )}
    >
      {/* Thumbnail - 16:9 */}
      <div className="relative w-full aspect-video bg-muted/30 overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <ImageOff className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
        {/* Status badge overlay */}
        <Badge
          variant="outline"
          className={cn("absolute top-2 left-2 text-[10px] px-1.5 py-0.5 backdrop-blur-sm", statusStyle.color)}
        >
          {statusLabel}
        </Badge>
        {content.priority && priorityConfig[content.priority] && (
          <Badge
            variant="outline"
            className={cn("absolute top-2 right-2 text-[9px] px-1 py-0 gap-0.5 backdrop-blur-sm", priorityConfig[content.priority].color)}
          >
            {priorityConfig[content.priority].icon}
            {priorityConfig[content.priority].label}
          </Badge>
        )}
      </div>

      {/* Content body */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
          {content.title}
        </h3>

        {/* Channel content preview */}
        {channelContent && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {channelContent}
          </p>
        )}

        {/* Badges row: Goal + Deadline + Scores */}
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", goalColors[content.content_goal])}>
            {goalLabel}
          </Badge>

          {deadlineInfo && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1 py-0 h-4 gap-0.5",
                deadlineInfo.overdue ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-sky-500/10 text-sky-400 border-sky-500/30"
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
                  <div className="flex items-center gap-0.5 px-1 py-0 h-4 rounded-full border border-border/50 bg-background/50">
                    <Star className={cn("w-2.5 h-2.5", getCritiqueColor(content.critique_score))} />
                    <span className={cn("text-[9px] font-semibold", getCritiqueColor(content.critique_score))}>
                      {content.critique_score}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Điểm đánh giá: {content.critique_score}/100</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {geoScore != null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5 px-1 py-0 h-4 rounded-full border border-border/50 bg-background/50">
                    <Zap className={cn("w-2.5 h-2.5", getCritiqueColor(geoScore))} />
                    <span className={cn("text-[9px] font-semibold", getCritiqueColor(geoScore))}>{geoScore}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">GEO Score: {geoScore}/100</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="hidden xs:flex items-center gap-1">
            <Tag className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1 overflow-hidden">
              {content.tags.slice(0, 3).map((tag, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground truncate max-w-[80px]">
                  {tag}
                </span>
              ))}
              {content.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{content.tags.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Footer: Creator + Brand + Time */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
            {(brandLogoUrl || content.brand_name) && (
              <>
                <span className="text-muted-foreground/40">·</span>
                {brandLogoUrl ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <img src={brandLogoUrl} alt={content.brand_name || 'Brand'} className="w-4 h-4 rounded-sm object-contain flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">{content.brand_name}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <span className="truncate text-[10px]">{content.brand_name}</span>
                )}
              </>
            )}
          </div>
          <span className="opacity-70 text-[9px] flex-shrink-0">{timeAgo}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-[10px] xs:text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
            onClick={() => onView(content)}
          >
            <Eye className="w-3 h-3 mr-0.5" />
            Xem
          </Button>
          <div className={cn(
            "flex gap-1 transition-all duration-300 ease-out overflow-hidden",
            isHovered ? "opacity-100 max-w-24 translate-x-0" : "opacity-0 max-w-0 translate-x-2"
          )}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-background/80 hover:bg-blue-500 hover:text-white hover:border-blue-500" onClick={() => setShowScheduleDialog(true)}>
                    <CalendarClock className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lên lịch đăng</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 bg-background/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa nội dung?</AlertDialogTitle>
                  <AlertDialogDescription>Bạn có chắc muốn xóa "{content.title}"? Hành động này không thể hoàn tác.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(content.id)} className="bg-destructive hover:bg-destructive/90">Xóa</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <QuickScheduleDialog content={content} open={showScheduleDialog} onOpenChange={setShowScheduleDialog} onScheduleComplete={onScheduleComplete} />
    </motion.div>
  );
}
