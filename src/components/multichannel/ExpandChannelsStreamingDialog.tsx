import { useState, useMemo } from 'react';
import { Plus, CheckCircle2, X, Loader2, Globe, Facebook, Instagram, Twitter, MapPin, Linkedin, Mail, Youtube, MessageCircle, Send, Music2, AtSign, Sparkles } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { Channel, MultiChannelContent } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { useExpandChannelsStreaming } from '@/hooks/useExpandChannelsStreaming';
import { StreamingTextGrid, ChannelStreamData } from '@/components/multichannel/streaming/StreamingTextGrid';
import { toast } from '@/hooks/use-toast';

interface ExpandChannelsStreamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  onComplete?: (updatedContent: MultiChannelContent) => void;
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

type Phase = 'select' | 'streaming' | 'complete';

export function ExpandChannelsStreamingDialog({
  open,
  onOpenChange,
  content,
  onComplete,
}: ExpandChannelsStreamingDialogProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);

  const { 
    expand, 
    cancel, 
    reset,
    progress, 
    isExpanding, 
    streamingTexts,
    completedChannels,
  } = useExpandChannelsStreaming({
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error,
        variant: 'destructive',
      });
      setPhase('select');
    },
  });

  // Filter out channels that already have content
  const contentChannels = Array.isArray(content.selected_channels) ? content.selected_channels : [];
  const availableChannels = ALL_CHANNELS.filter(
    ch => !contentChannels.includes(ch.value)
  );

  // Build streaming grid data
  const streamingGridData = useMemo((): ChannelStreamData[] => {
    return selectedChannels.map(channel => {
      const isComplete = completedChannels.includes(channel);
      const text = streamingTexts[channel] || '';
      const isStreaming = !isComplete && text.length > 0;
      
      return {
        channel,
        text,
        isComplete,
        isStreaming,
        progress: isComplete ? 100 : (text.length > 0 ? 50 : 0),
      };
    });
  }, [selectedChannels, streamingTexts, completedChannels]);

  // Pending channels (not yet started streaming)
  const pendingChannels = useMemo(() => {
    return selectedChannels.filter(
      ch => !streamingTexts[ch] && !completedChannels.includes(ch)
    );
  }, [selectedChannels, streamingTexts, completedChannels]);

  const handleToggleChannel = (channel: Channel) => {
    setSelectedChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleStartExpand = async () => {
    if (selectedChannels.length === 0) return;
    
    setPhase('streaming');
    
    try {
      const result = await expand(content.id, selectedChannels);
      if (result) {
        setPhase('complete');
        onComplete?.(result);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleClose = () => {
    if (isExpanding) {
      // Ask for confirmation before canceling
      if (confirm('Đang tạo nội dung. Bạn có chắc muốn hủy?')) {
        cancel();
        handleReset();
        onOpenChange(false);
      }
    } else {
      handleReset();
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setPhase('select');
    setSelectedChannels([]);
    reset();
  };

  const progressPercent = progress?.progress || 0;
  const progressMessage = progress?.message || 'Đang xử lý...';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "transition-all duration-300",
        phase === 'streaming' ? "sm:max-w-[900px]" : "sm:max-w-[500px]"
      )}>
        {/* Phase 1: Channel Selection */}
        {phase === 'select' && (
          <>
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
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleChannel(channel.value)}
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
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button 
                onClick={handleStartExpand} 
                disabled={selectedChannels.length === 0}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Bắt đầu tạo
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Phase 2: Streaming Progress */}
        {phase === 'streaming' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                Đang tạo nội dung
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                {progressMessage}
                <Badge variant="outline" className="ml-2">
                  {completedChannels.length} / {selectedChannels.length} kênh
                </Badge>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-2">
                <Progress value={progressPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{progress?.step || 'init'}</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </div>

              {/* Streaming grid */}
              <ScrollArea className="h-[400px]">
                <StreamingTextGrid
                  streamingChannels={streamingGridData.filter(ch => ch.text.length > 0 || ch.isComplete)}
                  pendingChannels={pendingChannels}
                />
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="gap-2">
                <X className="w-4 h-4" />
                Hủy
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Phase 3: Complete */}
        {phase === 'complete' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                Hoàn thành!
              </DialogTitle>
              <DialogDescription>
                Đã thêm {selectedChannels.length} kênh mới thành công.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex flex-wrap gap-2">
                {selectedChannels.map(channelValue => {
                  const channel = ALL_CHANNELS.find(c => c.value === channelValue);
                  if (!channel) return null;
                  
                  return (
                    <Badge 
                      key={channelValue} 
                      variant="secondary"
                      className={cn("gap-1.5", channel.bgColor)}
                    >
                      <span className={channel.color}>{channel.icon}</span>
                      {channel.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Đóng
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
