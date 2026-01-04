import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Eye, Trash2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, Tag, Image, Building, FileText, RefreshCw, CalendarClock, Music2, AtSign } from 'lucide-react';
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
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  facebook: <Facebook className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  instagram: <Instagram className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  twitter: <Twitter className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  google_maps: <MapPin className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  linkedin: <Linkedin className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  email: <Mail className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  youtube: <Youtube className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  zalo_oa: <MessageCircle className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  telegram: <Send className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  tiktok: <Music2 className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
  threads: <AtSign className="w-2.5 h-2.5 xs:w-3 xs:h-3" />,
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

const statusConfig: Record<ContentStatus, { color: string; glow: string }> = {
  draft: { color: 'bg-muted text-muted-foreground border-muted-foreground/30', glow: '' },
  review: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', glow: 'hover:shadow-yellow-500/20' },
  approved: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', glow: 'hover:shadow-blue-500/20' },
  published: { color: 'bg-green-500/20 text-green-400 border-green-500/30', glow: 'hover:shadow-green-500/20' },
};

// Status indicator colors for channel dots
const statusDotColors: Record<ContentStatus, string> = {
  draft: 'bg-muted-foreground',
  review: 'bg-yellow-400',
  approved: 'bg-blue-400',
  published: 'bg-green-400',
};

export function MultiChannelCard({ content, onView, onDelete, onScheduleComplete, creatorProfile, isLoadingProfile, index = 0 }: MultiChannelCardProps) {
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

  // Check if updated
  const isUpdated = content.updated_at !== content.created_at;
  const updateTimeAgo = isUpdated ? formatDistanceToNow(new Date(content.updated_at), {
    addSuffix: true,
    locale: vi,
  }) : null;

  // Safe channels array
  const safeChannels = content?.selected_channels ?? [];

  // Count filled channels
  const filledChannelsCount = safeChannels.filter(ch => {
    const contentKey = `${ch}_content` as keyof MultiChannelContent;
    return content[contentKey] && (content[contentKey] as string).length > 0;
  }).length;

  // Get first channel content preview
  const getFirstChannelContent = (): string | null => {
    for (const channel of safeChannels) {
      const contentKey = `${channel}_content` as keyof MultiChannelContent;
      const channelContent = content[contentKey] as string | null;
      if (channelContent && channelContent.length > 0) {
        return channelContent.replace(/[#*_`~\[\]]/g, '').trim();
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
        "relative p-2.5 xs:p-3 rounded-xl border border-border/50 transition-all duration-300 ease-out group overflow-hidden",
        "bg-background/80 backdrop-blur-sm",
        "hover:-translate-y-1 hover:shadow-xl",
        statusStyle.glow
      )}
    >
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
      
      {/* Top Row - Status & Industry */}
      <div className="relative flex items-center justify-between mb-1.5 xs:mb-2 pl-4 xs:pl-5">
        <Badge 
          variant="outline" 
          className={cn("text-[8px] xs:text-[9px] px-1.5 py-0.5", statusStyle.color)}
        >
          {statusLabel}
        </Badge>
        <div className="flex items-center gap-1">
          {content.industry && (
            <Badge variant="outline" className="text-[8px] xs:text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Building className="w-2 h-2 xs:w-2.5 xs:h-2.5 mr-0.5" />
              <span className="hidden xs:inline">{content.industry}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Header - Title & Topic */}
      <div className="relative mb-1.5 xs:mb-2">
        <h3 className="font-semibold text-xs xs:text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {content.title}
        </h3>
        <p className="text-[10px] xs:text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {content.topic}
        </p>
      </div>

      {/* Content Preview */}
      {firstChannelContent && (
        <p className="relative hidden xs:block text-[10px] text-muted-foreground line-clamp-2 mb-2 opacity-70 italic border-l-2 border-primary/30 pl-2">
          "{firstChannelContent.slice(0, 100)}{firstChannelContent.length > 100 ? '...' : ''}"
        </p>
      )}

      {/* Meta Badges Row */}
      <div className="relative flex flex-wrap items-center gap-1 xs:gap-1.5 mb-1.5 xs:mb-2">
        <Badge variant="outline" className={cn("text-[8px] xs:text-[10px] px-1 xs:px-1.5 py-0 h-3.5 xs:h-4", goalColors[content.content_goal])}>
          {goalLabel}
        </Badge>
        {imageCount > 0 && (
          <Badge variant="outline" className="text-[8px] xs:text-[10px] px-1 py-0 h-3.5 xs:h-4 bg-violet-500/20 text-violet-400 border-violet-500/30">
            <Image className="w-2 h-2 xs:w-2.5 xs:h-2.5 mr-0.5" />
            {imageCount}
          </Badge>
        )}
        <Badge variant="outline" className="text-[8px] xs:text-[10px] px-1 py-0 h-3.5 xs:h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          <FileText className="w-2 h-2 xs:w-2.5 xs:h-2.5 mr-0.5" />
          {filledChannelsCount}/{safeChannels.length}
        </Badge>
      </div>

      {/* Channel Progress Bar */}
      <div className="relative h-1 rounded-full bg-muted/50 mb-2 overflow-hidden">
        <motion.div 
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${safeChannels.length > 0 ? (filledChannelsCount / safeChannels.length) * 100 : 0}%` }}
          transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
        />
      </div>

      {/* Channels with status indicators */}
      <TooltipProvider>
        <div className="relative flex flex-wrap gap-0.5 xs:gap-1 mb-1.5 xs:mb-2">
          {safeChannels.slice(0, 4).map((channel) => {
            const channelStatus = content.channel_statuses?.[channel] || 'draft';
            const channelStatusLabel = CONTENT_STATUSES.find(s => s.value === channelStatus)?.label || channelStatus;
            return (
              <Tooltip key={channel}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center p-0.5 xs:p-1 rounded border transition-transform duration-200",
                      channelColors[channel],
                      isHovered && "scale-110"
                    )}
                  >
                    {channelIcons[channel]}
                    <span 
                      className={cn(
                        "absolute -top-0.5 -right-0.5 w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full ring-1 ring-background",
                        statusDotColors[channelStatus]
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{channel}</p>
                  <p className="text-muted-foreground">{channelStatusLabel}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
          {safeChannels.length > 4 && (
            <div className="flex items-center px-1 xs:px-1.5 py-0.5 xs:py-1 rounded border border-border text-[8px] xs:text-[10px] text-muted-foreground">
              +{safeChannels.length - 4}
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="relative hidden xs:flex items-center gap-1 mb-2">
          <Tag className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {content.tags.slice(0, 3).map((tag, tagIndex) => (
              <span 
                key={tagIndex} 
                className="text-[9px] px-1.5 py-0.5 bg-muted/50 rounded text-muted-foreground truncate max-w-[60px]"
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

      {/* Creator */}
      <div className="relative flex items-center gap-1 xs:gap-1.5 mb-1.5 xs:mb-2 text-[9px] xs:text-[10px]">
        <CreatorCell profile={creatorProfile} isLoading={isLoadingProfile} />
      </div>

      {/* Brand & Time Footer */}
      <div className="relative flex items-center justify-between text-[9px] xs:text-[10px] text-muted-foreground mb-1.5 xs:mb-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {content.primary_color && (
            <div
              className="w-2 h-2 xs:w-2.5 xs:h-2.5 rounded-full border border-border flex-shrink-0"
              style={{ backgroundColor: content.primary_color }}
            />
          )}
          <span className="truncate text-[8px] xs:text-[10px]">{content.brand_name}</span>
        </div>
        <div className="flex items-center gap-1 xs:gap-2 flex-shrink-0">
          {isUpdated && updateTimeAgo && (
            <span className="hidden xs:flex items-center gap-0.5 text-[8px] xs:text-[9px] opacity-60">
              <RefreshCw className="w-2 h-2" />
              {updateTimeAgo}
            </span>
          )}
          <span className="opacity-70 text-[8px] xs:text-[10px]">{timeAgo}</span>
        </div>
      </div>

      {/* Actions - Slide up on hover */}
      <div className={cn(
        "relative flex gap-1 xs:gap-1.5 transition-all duration-300",
        isHovered ? "opacity-100 translate-y-0" : "opacity-80"
      )}>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 xs:h-8 text-[10px] xs:text-xs bg-background/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
          onClick={() => onView(content)}
        >
          <Eye className="w-2.5 h-2.5 xs:w-3 xs:h-3 mr-0.5 xs:mr-1" />
          Xem
        </Button>

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
