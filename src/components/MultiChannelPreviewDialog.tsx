import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Eye, 
  RefreshCw, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Facebook, 
  Instagram, 
  MapPin, 
  Linkedin, 
  Mail, 
  Youtube, 
  Send, 
  Music2, 
  AtSign,
  LayoutGrid,
  Layers,
  ArrowLeft,
  ArrowRight,
  Pencil,
  RotateCcw,
  Wand2
} from "lucide-react";
import { ZaloIcon, XIcon } from '@/components/icons/SocialIcons';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Channel, ContentGoal, CONTENT_GOALS, CHANNELS } from "@/types/multichannel";
import { ChannelMockupFrame } from "@/components/preview/ChannelMockupFrame";
import { cn } from "@/lib/utils";

export interface EditedPreviews {
  [channel: string]: {
    original: string;
    edited: string;
  };
}

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
  onConfirm: (editedPreviews?: EditedPreviews) => void;
}

const channelIcons: Record<Channel, React.ReactNode> = {
  website: <Globe className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  twitter: <XIcon className="w-4 h-4" />,
  google_maps: <MapPin className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  zalo_oa: <ZaloIcon className="w-4 h-4" />,
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
  editedContent: string | null;
  isLoading: boolean;
  error: string | null;
  isEditing: boolean;
}

type ViewMode = 'grid' | 'single';

export function MultiChannelPreviewDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
}: MultiChannelPreviewDialogProps) {
  const channels = Array.isArray(formData.channels) ? formData.channels : [];

  const [previews, setPreviews] = useState<Record<Channel, ChannelPreview>>({} as Record<Channel, ChannelPreview>);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Initialize previews when dialog opens
  useEffect(() => {
    if (open && channels.length > 0) {
      const initialPreviews: Record<Channel, ChannelPreview> = {} as Record<Channel, ChannelPreview>;
      channels.forEach((ch) => {
        initialPreviews[ch] = {
          channel: ch,
          content: null,
          editedContent: null,
          isLoading: false,
          error: null,
          isEditing: false,
        };
      });
      setPreviews(initialPreviews);
      setActiveChannel(channels[0]);
    }
  }, [open, channels]);

  const generatePreview = useCallback(async (channel: Channel) => {
    setPreviews((prev) => ({
      ...prev,
      [channel]: { ...prev[channel], isLoading: true, error: null, isEditing: false },
    }));

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-multichannel", {
        body: {
          action: 'preview',
          topic: formData.topic,
          industry: formData.industry,
          contentGoal: formData.contentGoal,
          previewChannel: channel,
          brandTemplateId: formData.brandTemplateId,
          channels: [channel], // Required by FormData interface
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPreviews((prev) => ({
        ...prev,
        [channel]: {
          ...prev[channel],
          content: data.preview,
          editedContent: null,
          isLoading: false,
        },
      }));
    } catch (err) {
      console.error("Preview error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate preview";
      setPreviews((prev) => ({
        ...prev,
        [channel]: { ...prev[channel], error: message, isLoading: false },
      }));
    }
  }, [formData]);

  const generateAllPreviews = useCallback(async () => {
    setIsGeneratingAll(true);

    // Generate all previews in parallel
    await Promise.all(channels.map((ch) => generatePreview(ch)));

    setIsGeneratingAll(false);
    toast.success("Đã tạo preview cho tất cả kênh");
  }, [channels, generatePreview]);

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
    if (channels.length === 0) return;

    const currentIndex = channels.indexOf(activeChannel);
    const newIndex =
      direction === 'prev'
        ? (currentIndex - 1 + channels.length) % channels.length
        : (currentIndex + 1) % channels.length;
    setActiveChannel(channels[newIndex]);
  };

  // Edit functions
  const startEditing = (channel: Channel) => {
    const preview = previews[channel];
    if (!preview?.content) return;
    
    setPreviews(prev => ({
      ...prev,
      [channel]: { 
        ...prev[channel], 
        isEditing: true,
        editedContent: prev[channel].editedContent ?? prev[channel].content
      }
    }));
  };

  const cancelEditing = (channel: Channel) => {
    setPreviews(prev => ({
      ...prev,
      [channel]: { 
        ...prev[channel], 
        isEditing: false 
      }
    }));
  };

  const saveEdit = (channel: Channel) => {
    setPreviews(prev => ({
      ...prev,
      [channel]: { 
        ...prev[channel], 
        isEditing: false 
      }
    }));
    toast.success("Đã lưu chỉnh sửa");
  };

  const resetEdit = (channel: Channel) => {
    setPreviews(prev => ({
      ...prev,
      [channel]: { 
        ...prev[channel], 
        editedContent: null,
        isEditing: false
      }
    }));
    toast.info("Đã khôi phục nội dung gốc");
  };

  const updateEditedContent = (channel: Channel, content: string) => {
    setPreviews(prev => ({
      ...prev,
      [channel]: { 
        ...prev[channel], 
        editedContent: content 
      }
    }));
  };

  // Get display content (edited if available, otherwise original)
  const getDisplayContent = (channel: Channel): string => {
    const preview = previews[channel];
    if (!preview) return '';
    return preview.editedContent ?? preview.content ?? '';
  };

  // Check if channel has been edited
  const isEdited = (channel: Channel): boolean => {
    const preview = previews[channel];
    if (!preview) return false;
    return preview.editedContent !== null && preview.editedContent !== preview.content;
  };

  // Handle confirm with edited previews
  const handleConfirm = () => {
    const editedPreviews: EditedPreviews = {};
    
    Object.entries(previews).forEach(([channel, preview]) => {
      if (preview.content) {
        editedPreviews[channel] = {
          original: preview.content,
          edited: preview.editedContent ?? preview.content
        };
      }
    });

    const hasEdits = Object.values(editedPreviews).some(p => p.original !== p.edited);
    
    onConfirm(hasEdits ? editedPreviews : undefined);
  };

  const selectedGoal = CONTENT_GOALS.find((g) => g.value === formData.contentGoal);
  const GoalIcon = selectedGoal?.icon || Sparkles;

  const hasAnyPreview = Object.values(previews).some((p) => p.content);
  const hasAnyLoading = Object.values(previews).some((p) => p.isLoading);
  const hasAnyEdits = channels.some((ch) => isEdited(ch));
  const allGenerated = channels.every((ch) => previews[ch]?.content);
  const editedCount = channels.filter((ch) => isEdited(ch)).length;
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            So sánh Preview nhiều kênh
          </DialogTitle>
          <DialogDescription>
            Xem trước, chỉnh sửa và so sánh nội dung AI sẽ tạo cho từng kênh. 
            <span className="text-primary font-medium"> AI sẽ học theo nội dung bạn đã chỉnh sửa.</span>
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
              {hasAnyEdits && (
                <Badge variant="default" className="text-xs gap-1 bg-amber-500">
                  <Pencil className="w-3 h-3" />
                  {editedCount} chỉnh sửa
                </Badge>
              )}
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
                {channels.length} kênh
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
              <div
                className={cn(
                  "grid gap-4 pr-4",
                  channels.length === 1 && "grid-cols-1",
                  channels.length === 2 && "grid-cols-1 md:grid-cols-2",
                  channels.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {channels.map((ch) => {
                  const preview = previews[ch];
                  const channelInfo = CHANNELS.find((c) => c.value === ch);
                  const edited = isEdited(ch);
                  
                  return (
                    <div 
                      key={ch} 
                      className={cn(
                        "border rounded-lg overflow-hidden bg-card",
                        edited && "ring-2 ring-amber-500/50"
                      )}
                    >
                      {/* Channel Header */}
                      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                          {channelIcons[ch]}
                          <span className="text-sm font-medium">{channelInfo?.label}</span>
                          {edited && (
                            <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                              <Pencil className="w-2.5 h-2.5" />
                              Đã sửa
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {preview?.content && !preview?.isEditing && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEditing(ch)}
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {edited && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => resetEdit(ch)}
                              title="Khôi phục"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
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
                        ) : preview.isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={preview.editedContent ?? preview.content ?? ''}
                              onChange={(e) => updateEditedContent(ch, e.target.value)}
                              className="min-h-[160px] text-sm resize-none"
                              placeholder="Chỉnh sửa nội dung..."
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelEditing(ch)}
                              >
                                Hủy
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(ch)}
                              >
                                Lưu
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="transform scale-[0.85] origin-top-left w-[118%] cursor-pointer"
                            onClick={() => startEditing(ch)}
                            title="Nhấn để chỉnh sửa"
                          >
                            <ChannelMockupFrame
                              channel={channelToMockupType[ch]}
                              content={getDisplayContent(ch)}
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
                    disabled={channels.length <= 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>
                  
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {channels.map((ch) => {
                      const channelInfo = CHANNELS.find((c) => c.value === ch);
                      const isActive = activeChannel === ch;
                      const preview = previews[ch];
                      const edited = isEdited(ch);
                      
                      return (
                        <Button
                          key={ch}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setActiveChannel(ch)}
                          className={cn(
                            "gap-1.5",
                            edited && !isActive && "border-amber-500"
                          )}
                        >
                          {channelIcons[ch]}
                          <span className="hidden sm:inline">{channelInfo?.label}</span>
                          {preview?.content && !edited && (
                            <CheckCircle className="w-3 h-3 text-green-500" />
                          )}
                          {edited && (
                            <Pencil className="w-3 h-3 text-amber-500" />
                          )}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateChannel('next')}
                    disabled={channels.length <= 1}
                  >
                    Sau
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Single Channel Preview */}
                {activeChannel && (
                  <div className={cn(
                    "border rounded-lg overflow-hidden",
                    isEdited(activeChannel) && "ring-2 ring-amber-500/50"
                  )}>
                    <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                      <div className="flex items-center gap-2">
                        {channelIcons[activeChannel]}
                        <span className="font-medium">
                          {CHANNELS.find((c) => c.value === activeChannel)?.label}
                        </span>
                        {isEdited(activeChannel) && (
                          <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-600">
                            <Pencil className="w-2.5 h-2.5" />
                            Đã chỉnh sửa
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {previews[activeChannel]?.content && !previews[activeChannel]?.isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(activeChannel)}
                            className="gap-1.5"
                          >
                            <Pencil className="w-4 h-4" />
                            Chỉnh sửa
                          </Button>
                        )}
                        {isEdited(activeChannel) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetEdit(activeChannel)}
                            className="gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Khôi phục
                          </Button>
                        )}
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

                        if (preview.isEditing) {
                          return (
                            <div className="space-y-3">
                              <Textarea
                                value={preview.editedContent ?? preview.content ?? ''}
                                onChange={(e) => updateEditedContent(activeChannel, e.target.value)}
                                className="min-h-[280px] text-sm resize-none"
                                placeholder="Chỉnh sửa nội dung..."
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => cancelEditing(activeChannel)}
                                >
                                  Hủy
                                </Button>
                                <Button onClick={() => saveEdit(activeChannel)}>
                                  Lưu chỉnh sửa
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            className="max-w-md mx-auto cursor-pointer"
                            onClick={() => startEditing(activeChannel)}
                            title="Nhấn để chỉnh sửa"
                          >
                            <ChannelMockupFrame
                              channel={channelToMockupType[activeChannel]}
                              content={getDisplayContent(activeChannel)}
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
          <div className="text-xs text-muted-foreground space-y-1">
            {hasAnyPreview && (
              <div>
                Đã tạo {Object.values(previews).filter((p) => p.content).length}/{channels.length} preview
              </div>
            )}
            {hasAnyEdits && (
              <div className="flex items-center gap-1 text-amber-600">
                <Wand2 className="w-3 h-3" />
                <span>AI sẽ học theo {editedCount} nội dung đã chỉnh sửa</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Đóng
            </Button>
            <Button onClick={handleConfirm} className="gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Tạo nội dung đầy đủ
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
