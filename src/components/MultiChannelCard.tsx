import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Eye, Trash2, Globe, Facebook, Instagram, Twitter, MapPin, Clock, Linkedin, Mail, Youtube, MessageCircle, Send } from 'lucide-react';
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
import { MultiChannelContent, Channel, CONTENT_GOALS } from '@/types/multichannel';

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

export function MultiChannelCard({ content, onView, onDelete }: MultiChannelCardProps) {
  const goalLabel = CONTENT_GOALS.find(g => g.value === content.content_goal)?.label || content.content_goal;
  
  const timeAgo = formatDistanceToNow(new Date(content.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className="relative gradient-card p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 group">
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {content.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {content.topic}
        </p>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="outline" className={goalColors[content.content_goal]}>
          {goalLabel}
        </Badge>
        {content.industry && (
          <Badge variant="outline" className="bg-muted/50">
            {content.industry}
          </Badge>
        )}
      </div>

      {/* Channels */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {content.selected_channels.map((channel) => (
          <div
            key={channel}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs ${channelColors[channel]}`}
          >
            {channelIcons[channel]}
          </div>
        ))}
      </div>

      {/* Brand & Time */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5">
          {content.primary_color && (
            <div
              className="w-3 h-3 rounded-full border border-border"
              style={{ backgroundColor: content.primary_color }}
            />
          )}
          <span className="truncate max-w-[120px]">{content.brand_name}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
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
