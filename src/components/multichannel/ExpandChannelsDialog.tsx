import { useState } from 'react';
import { Loader2, Plus, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, Music2, AtSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel, MultiChannelContent } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ExpandChannelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  onExpand: (newChannels: Channel[]) => Promise<void>;
  isExpanding: boolean;
}

const ALL_CHANNELS: { 
  value: Channel; 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
  description: string;
}[] = [
  { value: 'website', label: 'Website/Blog', icon: <Globe className="w-4 h-4" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10', description: '800-2000 từ, SEO optimized' },
  { value: 'facebook', label: 'Facebook', icon: <Facebook className="w-4 h-4" />, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', description: '120-300 từ, hook + emoji' },
  { value: 'instagram', label: 'Instagram', icon: <Instagram className="w-4 h-4" />, color: 'text-pink-400', bgColor: 'bg-pink-500/10', description: '50-150 từ, visual-first' },
  { value: 'twitter', label: 'X (Twitter)', icon: <Twitter className="w-4 h-4" />, color: 'text-slate-400', bgColor: 'bg-slate-500/10', description: 'Thread 5-7 tweets' },
  { value: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'text-sky-400', bgColor: 'bg-sky-500/10', description: '150-400 từ, professional' },
  { value: 'youtube', label: 'YouTube', icon: <Youtube className="w-4 h-4" />, color: 'text-red-400', bgColor: 'bg-red-500/10', description: 'Script video 3-5 phút' },
  { value: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, color: 'text-amber-400', bgColor: 'bg-amber-500/10', description: '150-400 từ, subject + CTA' },
  { value: 'google_maps', label: 'Google Maps', icon: <MapPin className="w-4 h-4" />, color: 'text-green-400', bgColor: 'bg-green-500/10', description: '80-150 từ, review style' },
  { value: 'zalo_oa', label: 'Zalo OA', icon: <MessageCircle className="w-4 h-4" />, color: 'text-blue-400', bgColor: 'bg-blue-500/10', description: '60-150 từ, mobile-first' },
  { value: 'telegram', label: 'Telegram', icon: <Send className="w-4 h-4" />, color: 'text-sky-400', bgColor: 'bg-sky-500/10', description: '100-500 từ, community' },
  { value: 'tiktok', label: 'TikTok', icon: <Music2 className="w-4 h-4" />, color: 'text-pink-400', bgColor: 'bg-pink-500/10', description: '60-150 từ, short script' },
  { value: 'threads', label: 'Threads', icon: <AtSign className="w-4 h-4" />, color: 'text-slate-400', bgColor: 'bg-slate-500/10', description: '50-200 từ, conversational' },
];

export function ExpandChannelsDialog({
  open,
  onOpenChange,
  content,
  onExpand,
  isExpanding,
}: ExpandChannelsDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // Filter out channels that already have content
  const contentChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
  const availableChannels = ALL_CHANNELS.filter(
    ch => !contentChannels.includes(ch.value)
  );

  const handleToggleChannel = (channel: Channel) => {
    setSelectedChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleExpand = async () => {
    if (selectedChannels.length === 0) return;
    await onExpand(selectedChannels);
    setSelectedChannels([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isExpanding) {
      setSelectedChannels([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Thêm kênh mới
          </DialogTitle>
          <DialogDescription>
            Tạo nội dung cho các kênh social khác từ chủ đề "{content.topic}"
          </DialogDescription>
        </DialogHeader>

        {availableChannels.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Tất cả các kênh đã được tạo nội dung.
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="grid gap-2">
              {availableChannels.map(channel => {
                const isSelected = selectedChannels.includes(channel.value);
                
                return (
                  <label
                    key={channel.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:border-primary/30 hover:bg-muted/50",
                      isExpanding && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => !isExpanding && handleToggleChannel(channel.value)}
                      disabled={isExpanding}
                    />
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", channel.bgColor)}>
                      <span className={channel.color}>{channel.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{channel.label}</div>
                      <div className="text-xs text-muted-foreground">{channel.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedChannels.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {selectedChannels.length} kênh đã chọn
              </Badge>
            )}
          </div>
          <Button variant="outline" onClick={handleClose} disabled={isExpanding}>
            Hủy
          </Button>
          <Button 
            onClick={handleExpand} 
            disabled={selectedChannels.length === 0 || isExpanding}
            className="gap-2"
          >
            {isExpanding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Tạo nội dung
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
