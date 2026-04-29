import { useState } from 'react';
import { GitCompare, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MultiChannelContent, Channel } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface ChannelComparisonProps {
  content: MultiChannelContent;
  channelConfig: Record<Channel, { label: string; icon: React.ReactNode; color: string }>;
}

function getContentForChannel(content: MultiChannelContent, channel: Channel): string | null {
  switch (channel) {
    case 'website': return content.website_content;
    case 'facebook': return content.facebook_content;
    case 'instagram': return content.instagram_content;
    case 'twitter': return content.twitter_content;
    case 'google_maps': return content.google_maps_content;
    case 'linkedin': return content.linkedin_content;
    case 'email': return content.email_content;
    case 'youtube': return content.youtube_content;
    case 'zalo_oa': return content.zalo_oa_content;
    case 'telegram': return content.telegram_content;
    case 'tiktok': return content.tiktok_content;
    case 'threads': return content.threads_content;
    case 'pinterest': return content.pinterest_content;
    default: return null;
  }
}

function countWords(text: string): number {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text: string): number {
  if (typeof text !== 'string') return 0;
  return text.length;
}

export function ChannelComparison({
  content,
  channelConfig,
}: ChannelComparisonProps) {
  const [open, setOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  const toggleChannel = (channel: Channel) => {
    if (selectedChannels.includes(channel)) {
      setSelectedChannels(selectedChannels.filter(c => c !== channel));
    } else if (selectedChannels.length < 3) {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const clearSelection = () => {
    setSelectedChannels([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <GitCompare className="w-4 h-4" />
          So sánh
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle>So sánh nội dung giữa các kênh</DialogTitle>
            {selectedChannels.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4 mr-1" />
                Xóa lựa chọn
              </Button>
            )}
          </div>
          
          {/* Channel Selection */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground mr-2 self-center">
              Chọn 2-3 kênh để so sánh:
            </span>
            {(content?.selected_channels ?? []).map((channel) => {
              const config = channelConfig[channel];
              if (!config) return null;
              const isSelected = selectedChannels.includes(channel);
              const isDisabled = !isSelected && selectedChannels.length >= 3;
              
              return (
                <button
                  key={channel}
                  onClick={() => !isDisabled && toggleChannel(channel)}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all',
                    isSelected 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className={config.color}>{config.icon}</span>
                  <span className="text-sm">{config.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Comparison View */}
        <div className="flex-1 overflow-hidden">
          {selectedChannels.length < 2 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Vui lòng chọn ít nhất 2 kênh để so sánh</p>
            </div>
          ) : (
            <div className={cn(
              'grid gap-4 p-6 pt-2 h-[60vh]',
              selectedChannels.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            )}>
              {selectedChannels.map((channel) => {
                const config = channelConfig[channel];
                if (!config) return null;
                const channelContent = getContentForChannel(content, channel) || '';
                const words = countWords(channelContent);
                const chars = countCharacters(channelContent);
                
                return (
                  <div
                    key={channel}
                    className="flex flex-col border border-border rounded-lg overflow-hidden"
                  >
                    {/* Channel Header */}
                    <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
                      <span className={config.color}>{config.icon}</span>
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {words} chữ
                      </Badge>
                    </div>
                    
                    {/* Content */}
                    <ScrollArea className="flex-1">
                      <div className="p-4 text-sm whitespace-pre-wrap">
                        {channelContent || (
                          <span className="text-muted-foreground italic">
                            Không có nội dung
                          </span>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Stats Footer */}
                    <div className="p-2 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-between">
                      <span>{words} chữ</span>
                      <span>{chars} ký tự</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
