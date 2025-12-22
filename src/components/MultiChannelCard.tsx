import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, Trash2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, Tag, Image, Building, FileText, RefreshCw, CalendarClock } from 'lucide-react';
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

interface MultiChannelCardProps {
  content: MultiChannelContent;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
  onScheduleComplete?: () => void;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  instagram: <Instagram className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  google_maps: <MapPin className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
  zalo_oa: <MessageCircle className="w-3 h-3" />,
  telegram: <Send className="w-3 h-3" />,
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
};

const goalColors: Record<string, string> = {
  education: 'bg-cyan-500/20 text-cyan-400',
  awareness: 'bg-purple-500/20 text-purple-400',
  engagement: 'bg-orange-500/20 text-orange-400',
  expertise: 'bg-emerald-500/20 text-emerald-400',
  conversion: 'bg-red-500/20 text-red-400',
};

const statusColors: Record<ContentStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-muted-foreground/30',
  review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
};

// Status indicator colors for channel dots
const statusDotColors: Record<ContentStatus, string> = {
  draft: 'bg-muted-foreground',
  review: 'bg-yellow-400',
  approved: 'bg-blue-400',
  published: 'bg-green-400',
};

export function MultiChannelCard({ content, onView, onDelete, onScheduleComplete }: MultiChannelCardProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  
  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;
  const statusLabel = CONTENT_STATUSES.find(s => s.value === content.status)?.label || content.status;
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

  // Count filled channels
  const filledChannelsCount = content.selected_channels.filter(ch => {
    const contentKey = `${ch}_content` as keyof MultiChannelContent;
    return content[contentKey] && (content[contentKey] as string).length > 0;
  }).length;

  // Get first channel content preview
  const getFirstChannelContent = (): string | null => {
    for (const channel of content.selected_channels) {
      const contentKey = `${channel}_content` as keyof MultiChannelContent;
      const channelContent = content[contentKey] as string | null;
      if (channelContent && channelContent.length > 0) {
        // Strip markdown and get plain text
        return channelContent.replace(/[#*_`~\[\]]/g, '').trim();
      }
    }
    return null;
  };

  const firstChannelContent = getFirstChannelContent();

  return (
    <div className="relative gradient-card p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300 ease-out group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/0 via-primary/0 to-secondary/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-secondary/5 transition-all duration-500 pointer-events-none" />
      
      {/* Top Row - Status & Industry */}
      <div className="relative flex items-center justify-between mb-2 pl-5">
        <Badge 
          variant="outline" 
          className={`text-[9px] px-1 py-0 ${statusColors[content.status || 'draft']}`}
        >
          {statusLabel}
        </Badge>
        <div className="flex items-center gap-1">
          {content.industry && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Building className="w-2.5 h-2.5 mr-0.5" />
              {content.industry}
            </Badge>
          )}
        </div>
      </div>

      {/* Header - Title & Topic */}
      <div className="relative mb-2">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors duration-200">
          {content.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {content.topic}
        </p>
      </div>

      {/* Content Preview */}
      {firstChannelContent && (
        <p className="relative text-[10px] text-muted-foreground line-clamp-2 mb-2 opacity-70 italic border-l-2 border-primary/30 pl-2">
          "{firstChannelContent.slice(0, 100)}{firstChannelContent.length > 100 ? '...' : ''}"
        </p>
      )}

      {/* Meta Badges Row */}
      <div className="relative flex flex-wrap items-center gap-1.5 mb-2">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${goalColors[content.content_goal]}`}>
          {goalLabel}
        </Badge>
        {imageCount > 0 && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-violet-500/20 text-violet-400 border-violet-500/30">
            <Image className="w-2.5 h-2.5 mr-0.5" />
            {imageCount}
          </Badge>
        )}
        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
          <FileText className="w-2.5 h-2.5 mr-0.5" />
          {filledChannelsCount}/{content.selected_channels.length}
        </Badge>
      </div>

      {/* Channels with status indicators */}
      <TooltipProvider>
        <div className="relative flex flex-wrap gap-1 mb-2">
          {content.selected_channels.slice(0, 5).map((channel) => {
            const channelStatus = content.channel_statuses?.[channel] || 'draft';
            const channelStatusLabel = CONTENT_STATUSES.find(s => s.value === channelStatus)?.label || channelStatus;
            return (
              <Tooltip key={channel}>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex items-center p-1 rounded border ${channelColors[channel]}`}
                  >
                    {channelIcons[channel]}
                    {/* Status indicator dot */}
                    <span 
                      className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${statusDotColors[channelStatus]} ring-1 ring-background`}
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
          {content.selected_channels.length > 5 && (
            <div className="flex items-center px-1.5 py-1 rounded border border-border text-[10px] text-muted-foreground">
              +{content.selected_channels.length - 5}
            </div>
          )}
        </div>
      </TooltipProvider>

      {/* Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="relative flex items-center gap-1 mb-2">
          <Tag className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {content.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
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

      {/* Brand & Time Footer */}
      <div className="relative flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {content.primary_color && (
            <div
              className="w-2.5 h-2.5 rounded-full border border-border flex-shrink-0"
              style={{ backgroundColor: content.primary_color }}
            />
          )}
          <span className="truncate">{content.brand_name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isUpdated && updateTimeAgo && (
            <span className="flex items-center gap-0.5 text-[9px] opacity-60">
              <RefreshCw className="w-2 h-2" />
              {updateTimeAgo}
            </span>
          )}
          <span className="opacity-70">{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          onClick={() => onView(content)}
        >
          <Eye className="w-3 h-3 mr-1" />
          Xem
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50"
                onClick={() => setShowScheduleDialog(true)}
              >
                <CalendarClock className="w-3 h-3" />
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
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="w-3 h-3" />
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
    </div>
  );
}
