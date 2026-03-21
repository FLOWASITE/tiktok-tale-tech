import { useState, useMemo, useEffect } from 'react';
import { Plus, CheckCircle2, X, Loader2, Globe, Facebook, Instagram, MapPin, Linkedin, Mail, Youtube, Send, Music2, AtSign, Sparkles } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { Channel, MultiChannelContent } from '@/types/multichannel';
import { ChannelSettings, BASE_CHANNEL_CONFIG, getChannelDescription } from '@/types/channelSettings';
import { cn } from '@/lib/utils';
import { useExpandChannelsStreaming } from '@/hooks/useExpandChannelsStreaming';
import { StreamingTextGrid, ChannelStreamData } from '@/components/multichannel/streaming/StreamingTextGrid';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ExpandChannelsStreamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: MultiChannelContent;
  onComplete?: (updatedContent: MultiChannelContent) => void;
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

type Phase = 'select' | 'streaming' | 'complete';

export function ExpandChannelsStreamingDialog({
  open,
  onOpenChange,
  content,
  onComplete,
}: ExpandChannelsStreamingDialogProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [freshSelectedChannels, setFreshSelectedChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);

  // Fetch brand template for channel overrides
  const { data: brandTemplate } = useQuery({
    queryKey: ['brand-overrides-expand', content?.brand_template_id],
    queryFn: async () => {
      if (!content?.brand_template_id) return null;
      const { data } = await supabase
        .from('brand_templates')
        .select('channel_overrides')
        .eq('id', content.brand_template_id)
        .single();
      return data;
    },
    enabled: !!content?.brand_template_id && open,
  });

  const channelOverrides = brandTemplate?.channel_overrides as Record<string, Partial<ChannelSettings>> | null;

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

  // Fetch fresh selected_channels from DB when dialog opens
  useEffect(() => {
    if (open && content?.id) {
      setIsLoadingChannels(true);
      supabase
        .from('multi_channel_contents')
        .select('selected_channels')
        .eq('id', content.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.selected_channels) {
            setFreshSelectedChannels(data.selected_channels as Channel[]);
          } else {
            // Fallback to prop value
            setFreshSelectedChannels(Array.isArray(content.selected_channels) ? content.selected_channels : []);
          }
          setIsLoadingChannels(false);
        });
    }
  }, [open, content?.id]);

  // Filter out channels that already have content - use fresh data
  const contentChannels = freshSelectedChannels.length > 0 ? freshSelectedChannels : (Array.isArray(content.selected_channels) ? content.selected_channels : []);
  const availableChannels = ALL_CHANNEL_VALUES.filter(
    ch => !contentChannels.includes(ch)
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

            {isLoadingChannels ? (
              <div className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải...
              </div>
            ) : availableChannels.length === 0 ? (
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
                            : "border-border hover:border-primary/30 hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleChannel(channelValue)}
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
                  const config = BASE_CHANNEL_CONFIG[channelValue];
                  const icon = CHANNEL_ICONS[channelValue];
                  if (!config) return null;
                  
                  return (
                    <Badge 
                      key={channelValue} 
                      variant="secondary"
                      className={cn("gap-1.5", config.bgColor)}
                    >
                      <span className={config.color}>{icon}</span>
                      {config.label}
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
