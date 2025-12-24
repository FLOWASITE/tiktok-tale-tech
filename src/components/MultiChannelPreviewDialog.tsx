import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, 
  RefreshCw, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Facebook, 
  Instagram, 
  Twitter, 
  MapPin, 
  Linkedin, 
  Mail, 
  Youtube, 
  MessageCircle, 
  Send, 
  Music2, 
  AtSign,
  LayoutGrid,
  Layers,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Channel, ContentGoal, CONTENT_GOALS, CHANNELS } from "@/types/multichannel";
import { ChannelMockupFrame } from "@/components/preview/ChannelMockupFrame";
import { cn } from "@/lib/utils";

interface MultiChannelPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    topic: string;
    industry?: string;
    contentGoal: ContentGoal;
    channels: Channel[];
    brandTemplateId?: string;
    brandName?: string;
  };
  onConfirm: () => void;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <MessageCircle className="w-4 h-4" />,
  telegram: <Send className="w-4 h-4" />,
  tiktok: <Music2 className="w-4 h-4" />,
  threads: <AtSign className="w-4 h-4" />,
};

type ChannelMockupType = 'facebook' | 'linkedin' | 'instagram' | 'tiktok' | 'email' | 'twitter' | 'general';

const channelToMockupType: Record<Channel, ChannelMockupType> = {
  facebook: 'facebook',
  instagram: 'instagram',
  twitter: 'twitter',
  linkedin: 'linkedin',
  tiktok: 'tiktok',
  email: 'email',
  website: 'general',
  google_maps: 'general',
  youtube: 'general',
  zalo_oa: 'general',
  telegram: 'general',
  threads: 'general',
};

interface ChannelPreview {
  channel: Channel;
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

type ViewMode = 'grid' | 'single';

export function MultiChannelPreviewDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
}: MultiChannelPreviewDialogProps) {
  const [previews, setPreviews] = useState<Record<Channel, ChannelPreview>>({} as Record<Channel, ChannelPreview>);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Initialize previews when dialog opens
  useEffect(() => {
    if (open && formData.channels.length > 0) {
      const initialPreviews: Record<Channel, ChannelPreview> = {} as Record<Channel, ChannelPreview>;
      formData.channels.forEach(ch => {
        initialPreviews[ch] = {
          channel: ch,
          content: null,
          isLoading: false,
          error: null,
        };
      });
      setPreviews(initialPreviews);
      setActiveChannel(formData.channels[0]);
    }
  }, [open, formData.channels]);

  const generatePreview = useCallback(async (channel: Channel) => {
    setPreviews(prev => ({
      ...prev,
      [channel]: { ...prev[channel], isLoading: true, error: null }
    }));

    try {
      const { data, error: fnError } = await supabase.functions.invoke("preview-multichannel", {
        body: {
          topic: formData.topic,
          industry: formData.industry,
          contentGoal: formData.contentGoal,
          previewChannel: channel,
          brandTemplateId: formData.brandTemplateId,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPreviews(prev => ({
        ...prev,
        [channel]: { ...prev[channel], content: data.preview, isLoading: false }
      }));
    } catch (err) {
      console.error("Preview error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate preview";
      setPreviews(prev => ({
        ...prev,
        [channel]: { ...prev[channel], error: message, isLoading: false }
      }));
    }
  }, [formData]);

  const generateAllPreviews = useCallback(async () => {
    setIsGeneratingAll(true);
    
    // Generate all previews in parallel
    await Promise.all(formData.channels.map(ch => generatePreview(ch)));
    
    setIsGeneratingAll(false);
    toast.success("Đã tạo preview cho tất cả kênh");
  }, [formData.channels, generatePreview]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPreviews({} as Record<Channel, ChannelPreview>);
      setActiveChannel(null);
      setViewMode('grid');
    }
    onOpenChange(newOpen);
  };

  const navigateChannel = (direction: 'prev' | 'next') => {
    if (!activeChannel) return;
    const currentIndex = formData.channels.indexOf(activeChannel);
    const newIndex = direction === 'prev' 
      ? (currentIndex - 1 + formData.channels.length) % formData.channels.length
      : (currentIndex + 1) % formData.channels.length;
    setActiveChannel(formData.channels[newIndex]);
  };

  const selectedGoal = CONTENT_GOALS.find((g) => g.value === formData.contentGoal);
  const GoalIcon = selectedGoal?.icon || Sparkles;

  const hasAnyPreview = Object.values(previews).some(p => p.content);
  const hasAnyLoading = Object.values(previews).some(p => p.isLoading);
  const allGenerated = formData.channels.every(ch => previews[ch]?.content);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            So sánh Preview nhiều kênh
          </DialogTitle>
          <DialogDescription>
            Xem trước và so sánh nội dung AI sẽ tạo cho từng kênh
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Form Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground shrink-0">Chủ đề:</span>
              <span className="text-sm font-medium line-clamp-2">{formData.topic}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {formData.industry && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ngành:</span>
                  <span className="text-sm">{formData.industry}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mục tiêu:</span>
                <Badge variant="secondary" className="text-xs gap-1">
                  <GoalIcon className="w-3 h-3" />
                  {selectedGoal?.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={generateAllPreviews}
                disabled={isGeneratingAll || hasAnyLoading}
                className="gap-1.5"
              >
                {isGeneratingAll ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {allGenerated ? 'Tạo lại tất cả' : 'Tạo preview tất cả kênh'}
              </Button>
              <Badge variant="outline" className="text-xs">
                {formData.channels.length} kênh
              </Badge>
            </div>

            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3 gap-1.5"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Lưới</span>
              </Button>
              <Button
                variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('single')}
                className="h-8 px-3 gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Chi tiết</span>
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <ScrollArea className="flex-1 h-[400px]">
            {viewMode === 'grid' ? (
              <div className={cn(
                "grid gap-4 pr-4",
                formData.channels.length === 1 && "grid-cols-1",
                formData.channels.length === 2 && "grid-cols-1 md:grid-cols-2",
                formData.channels.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              )}>
                {formData.channels.map((ch) => {
                  const preview = previews[ch];
                  const channelInfo = CHANNELS.find((c) => c.value === ch);
                  
                  return (
                    <div 
                      key={ch} 
                      className="border rounded-lg overflow-hidden bg-card"
                    >
                      {/* Channel Header */}
                      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          {channelIcons[ch]}
                          <span className="text-sm font-medium">{channelInfo?.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {preview?.content && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Đã tạo
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => generatePreview(ch)}
                            disabled={preview?.isLoading}
                          >
                            <RefreshCw className={cn(
                              "w-3.5 h-3.5",
                              preview?.isLoading && "animate-spin"
                            )} />
                          </Button>
                        </div>
                      </div>

                      {/* Preview Content */}
                      <div className="p-3 min-h-[200px]">
                        {!preview || (!preview.content && !preview.isLoading && !preview.error) ? (
                          <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                            <Eye className="w-8 h-8 opacity-30" />
                            <p className="text-xs text-center">
                              Nhấn nút để tạo preview
                            </p>
                          </div>
                        ) : preview.isLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-4 w-4/6" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        ) : preview.error ? (
                          <div className="h-[180px] flex flex-col items-center justify-center text-destructive gap-2">
                            <AlertCircle className="w-6 h-6" />
                            <p className="text-xs text-center">{preview.error}</p>
                          </div>
                        ) : (
                          <div className="transform scale-[0.85] origin-top-left w-[118%]">
                            <ChannelMockupFrame
                              channel={channelToMockupType[ch]}
                              content={preview.content || ''}
                              brandName={formData.brandName || 'Brand'}
                              isGenerating={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pr-4">
                {/* Channel Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateChannel('prev')}
                    disabled={formData.channels.length <= 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>
                  
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {formData.channels.map((ch) => {
                      const channelInfo = CHANNELS.find((c) => c.value === ch);
                      const isActive = activeChannel === ch;
                      const preview = previews[ch];
                      
                      return (
                        <Button
                          key={ch}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveChannel(ch)}
                          className="gap-1.5"
                        >
                          {channelIcons[ch]}
                          <span className="hidden sm:inline">{channelInfo?.label}</span>
                          {preview?.content && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          )}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateChannel('next')}
                    disabled={formData.channels.length <= 1}
                  >
                    Sau
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Single Channel Preview */}
                {activeChannel && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                      <div className="flex items-center gap-2">
                        {channelIcons[activeChannel]}
                        <span className="font-medium">
                          {CHANNELS.find((c) => c.value === activeChannel)?.label}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePreview(activeChannel)}
                        disabled={previews[activeChannel]?.isLoading}
                        className="gap-1.5"
                      >
                        <RefreshCw className={cn(
                          "w-4 h-4",
                          previews[activeChannel]?.isLoading && "animate-spin"
                        )} />
                        {previews[activeChannel]?.content ? 'Tạo lại' : 'Tạo preview'}
                      </Button>
                    </div>

                    <div className="p-4">
                      {(() => {
                        const preview = previews[activeChannel];
                        
                        if (!preview || (!preview.content && !preview.isLoading && !preview.error)) {
                          return (
                            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                              <Eye className="w-12 h-12 opacity-30" />
                              <p className="text-sm">Nhấn "Tạo preview" để xem trước nội dung</p>
                            </div>
                          );
                        }

                        if (preview.isLoading) {
                          return (
                            <div className="space-y-3">
                              <Skeleton className="h-5 w-3/4" />
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-5/6" />
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-2/3" />
                            </div>
                          );
                        }

                        if (preview.error) {
                          return (
                            <div className="h-[300px] flex flex-col items-center justify-center text-destructive gap-2">
                              <AlertCircle className="w-10 h-10" />
                              <p className="text-sm">{preview.error}</p>
                            </div>
                          );
                        }

                        return (
                          <div className="max-w-md mx-auto">
                            <ChannelMockupFrame
                              channel={channelToMockupType[activeChannel]}
                              content={preview.content || ''}
                              brandName={formData.brandName || 'Brand'}
                              isGenerating={false}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {hasAnyPreview && (
              <span>
                Đã tạo {Object.values(previews).filter(p => p.content).length}/{formData.channels.length} preview
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Đóng
            </Button>
            <Button onClick={onConfirm} className="gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Tạo nội dung đầy đủ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
