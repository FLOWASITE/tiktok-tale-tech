import { useState } from 'react';
import { Loader2, Plus, Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, Music2, AtSign } from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
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
import { ChannelSettings, BASE_CHANNEL_CONFIG, getChannelDescription } from '@/types/channelSettings';
import { cn } from '@/lib/utils';

interface ExpandChannelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  onExpand: (newChannels: Channel[]) => Promise<void>;
  isExpanding: boolean;
  channelOverrides?: Record<string, Partial<ChannelSettings>> | null;
}

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <XIcon className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  zalo_oa: <ZaloIcon className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

const ALL_CHANNEL_VALUES: Channel[] = [
  'website', 'facebook', 'instagram', 'twitter', 'linkedin', 
  'youtube', 'email', 'google_maps', 'zalo_oa', 'telegram', 'tiktok', 'threads'
];

export function ExpandChannelsDialog({
  open,
  onOpenChange,
  content,
  onExpand,
  isExpanding,
  channelOverrides,
}: ExpandChannelsDialogProps) {
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  // Filter out channels that already have content
  const contentChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
  const availableChannels = ALL_CHANNEL_VALUES.filter(
    ch => !contentChannels.includes(ch)
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
              {availableChannels.map(channelValue => {
                const isSelected = selectedChannels.includes(channelValue);
                const config = BASE_CHANNEL_CONFIG[channelValue];
                const icon = CHANNEL_ICONS[channelValue];
                const hasOverride = channelOverrides?.[channelValue];
                
                if (!config) return null;
                
                return (
                  <label
                    key={channelValue}
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
                      onCheckedChange={() => !isExpanding && handleToggleChannel(channelValue)}
                      disabled={isExpanding}
                    />
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", config.bgColor)}>
                      <span className={config.color}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {config.label}
                        {hasOverride && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 border-primary/20">
                            Brand
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getChannelDescription(channelValue, channelOverrides)}
                      </div>
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
