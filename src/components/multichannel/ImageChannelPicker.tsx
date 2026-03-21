import { cn } from '@/lib/utils';
import { Channel } from '@/types/multichannel';
import { Badge } from '@/components/ui/badge';
import {
  Facebook, Instagram, Linkedin, Globe, MapPin,
  Youtube, Mail, Music2, AtSign, Send,
} from 'lucide-react';
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';

interface ImageChannelPickerProps {
  availableChannels: Channel[];
  selectedChannels: Channel[];
  onSelectedChange: (channels: Channel[]) => void;
  className?: string;
}

const CHANNEL_META: Record<Channel, { icon: React.ReactNode; label: string }> = {
  facebook: { icon: <Facebook className="w-3.5 h-3.5" />, label: 'FB' },
  instagram: { icon: <Instagram className="w-3.5 h-3.5" />, label: 'IG' },
  linkedin: { icon: <Linkedin className="w-3.5 h-3.5" />, label: 'LI' },
  twitter: { icon: <XIcon className="w-3.5 h-3.5" />, label: 'X' },
  website: { icon: <Globe className="w-3.5 h-3.5" />, label: 'Web' },
  google_maps: { icon: <MapPin className="w-3.5 h-3.5" />, label: 'Maps' },
  youtube: { icon: <Youtube className="w-3.5 h-3.5" />, label: 'YT' },
  email: { icon: <Mail className="w-3.5 h-3.5" />, label: 'Mail' },
  tiktok: { icon: <Music2 className="w-3.5 h-3.5" />, label: 'TT' },
  zalo_oa: { icon: <ZaloIcon className="w-3.5 h-3.5" />, label: 'Zalo' },
  telegram: { icon: <Send className="w-3.5 h-3.5" />, label: 'TG' },
  threads: { icon: <AtSign className="w-3.5 h-3.5" />, label: 'Th' },
};

export function ImageChannelPicker({
  availableChannels,
  selectedChannels,
  onSelectedChange,
  className,
}: ImageChannelPickerProps) {
  const allSelected = selectedChannels.length === availableChannels.length;

  const toggleAll = () => {
    onSelectedChange(allSelected ? [] : [...availableChannels]);
  };

  const toggleChannel = (ch: Channel) => {
    onSelectedChange(
      selectedChannels.includes(ch)
        ? selectedChannels.filter(c => c !== ch)
        : [...selectedChannels, ch]
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Kênh</span>
        <button
          onClick={toggleAll}
          className="text-xs text-primary hover:underline"
        >
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {availableChannels.map(ch => {
          const meta = CHANNEL_META[ch];
          const selected = selectedChannels.includes(ch);
          return (
            <button
              key={ch}
              onClick={() => toggleChannel(ch)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border",
                selected
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
              )}
            >
              {meta?.icon}
              {meta?.label || ch}
            </button>
          );
        })}
      </div>
      {selectedChannels.length > 0 && (
        <Badge variant="secondary" className="text-[10px]">
          {selectedChannels.length} kênh đã chọn
        </Badge>
      )}
    </div>
  );
}
