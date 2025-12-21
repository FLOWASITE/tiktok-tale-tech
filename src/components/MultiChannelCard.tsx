import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, Trash2, Globe, Facebook, Instagram, Twitter, MapPin, Clock, Linkedin, Mail, Youtube, MessageCircle, Send, Tag, Image } from 'lucide-react';
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
import { MultiChannelContent, Channel, CONTENT_GOALS, CONTENT_STATUSES, ContentStatus } from '@/types/multichannel';

interface MultiChannelCardProps {
  content: MultiChannelContent;
  onView: (content: MultiChannelContent) => void;
  onDelete: (id: string) => void;
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

export function MultiChannelCard({ content, onView, onDelete }: MultiChannelCardProps) {
  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;
  const statusLabel = CONTENT_STATUSES.find(s => s.value === content.status)?.label || content.status;
  const imageCount = Object.keys(content.channel_images || {}).length;
  
  const timeAgo = formatDistanceToNow(new Date(content.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className="relative gradient-card p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 ease-out group hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 overflow-hidden">
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/0 via-primary/0 to-secondary/0 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-secondary/5 transition-all duration-500 pointer-events-none" />
      
      {/* Status Badge - Top Right */}
      <div className="absolute top-3 right-3 z-10">
        <Badge 
          variant="outline" 
          className={`text-[10px] px-1.5 py-0.5 ${statusColors[content.status || 'draft']}`}
        >
          {statusLabel}
        </Badge>
      </div>

      {/* Header */}
      <div className="relative mb-3 pr-16">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors duration-200">
          {content.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {content.topic}
        </p>
      </div>

      {/* Meta */}
      <div className="relative flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className={`${goalColors[content.content_goal]} transition-transform duration-200 group-hover:scale-105`}>
          {goalLabel}
        </Badge>
        {content.industry && (
          <Badge variant="outline" className="bg-muted/50">
            {content.industry}
          </Badge>
        )}
        {imageCount > 0 && (
          <Badge variant="outline" className="bg-violet-500/20 text-violet-400 border-violet-500/30">
            <Image className="w-3 h-3 mr-1" />
            {imageCount}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="relative flex flex-wrap gap-1 mb-3">
          <Tag className="w-3 h-3 text-muted-foreground mr-0.5" />
          {content.tags.slice(0, 3).map((tag) => (
            <Badge 
              key={tag} 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-5 bg-secondary/50 hover:bg-secondary"
            >
              {tag}
            </Badge>
          ))}
          {content.tags.length > 3 && (
            <Badge 
              variant="secondary" 
              className="text-[10px] px-1.5 py-0 h-5 bg-secondary/50"
            >
              +{content.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Channels */}
      <div className="relative flex flex-wrap gap-1.5 mb-4">
        {content.selected_channels.map((channel, index) => (
          <div
            key={channel}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${channelColors[channel]} transition-all duration-200 group-hover:scale-105`}
            style={{ transitionDelay: `${index * 30}ms` }}
          >
            {channelIcons[channel]}
          </div>
        ))}
      </div>

      {/* Brand & Time */}
      <div className="relative flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5">
          {content.primary_color && (
            <div
              className="w-3 h-3 rounded-full border border-border transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: content.primary_color }}
            />
          )}
          <span className="truncate max-w-[120px]">{content.brand_name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="relative flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          onClick={() => onView(content)}
        >
          <Eye className="w-4 h-4 mr-1.5" />
          Xem
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            >
              <Trash2 className="w-4 h-4" />
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
  );
}
