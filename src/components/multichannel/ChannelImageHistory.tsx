import { useState, useEffect } from 'react';
import { History, Check, Trash2, ExternalLink, Loader2, ArrowLeftRight, FileText, Copy } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { IMAGE_DELETION_ENABLED } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel } from '@/types/multichannel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ImageCompareMode } from './ImageCompareMode';

interface ImageHistoryItem {
  id: string;
  image_url: string;
  aspect_ratio: string | null;
  is_selected: boolean;
  created_at: string;
  version: number;
}

interface ChannelImageHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  channel: Channel;
  onSelectImage?: (imageUrl: string) => void;
}

export function ChannelImageHistory({
  open,
  onOpenChange,
  contentId,
  channel,
  onSelectImage,
}: ChannelImageHistoryProps) {
  const [images, setImages] = useState<ImageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  // Fetch image history
  useEffect(() => {
    if (open && contentId && channel) {
      fetchHistory();
    }
  }, [open, contentId, channel]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channel_image_history')
        .select('id, image_url, prompt, aspect_ratio, is_selected, created_at, version')
        .eq('content_id', contentId)
        .eq('channel', channel)
        .order('version', { ascending: false });

      if (error) throw error;
      setImages((data || []) as ImageHistoryItem[]);
    } catch (err) {
      console.error('Failed to fetch image history:', err);
      toast.error('Không thể tải lịch sử ảnh');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async (imageId: string, imageUrl: string) => {
    setSelecting(imageId);
    try {
      // Unselect all first
      await supabase
        .from('channel_image_history')
        .update({ is_selected: false })
        .eq('content_id', contentId)
        .eq('channel', channel);

      // Select the chosen one
      await supabase
        .from('channel_image_history')
        .update({ is_selected: true })
        .eq('id', imageId);

      // Update local state
      setImages(prev =>
        prev.map(img => ({
          ...img,
          is_selected: img.id === imageId,
        }))
      );

      // Callback to parent
      onSelectImage?.(imageUrl);
      toast.success('Đã chọn ảnh');
    } catch (err) {
      console.error('Failed to select image:', err);
      toast.error('Không thể chọn ảnh');
    } finally {
      setSelecting(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setDeleting(imageId);
    try {
      const { error } = await supabase
        .from('channel_image_history')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Đã xóa ảnh');
    } catch (err) {
      console.error('Failed to delete image:', err);
      toast.error('Không thể xóa ảnh');
    } finally {
      setDeleting(null);
    }
  };

  const getChannelLabel = (ch: Channel): string => {
    const labels: Record<string, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      linkedin: 'LinkedIn',
      twitter: 'X (Twitter)',
      website: 'Website',
      zalo: 'Zalo',
      threads: 'Threads',
    };
    return labels[ch] || ch;
  };

  const channelLabel = getChannelLabel(channel);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Lịch sử ảnh - {channelLabel}
              </DialogTitle>
              {images.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareOpen(true)}
                  className="gap-1"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  So sánh
                </Button>
              )}
            </div>
            <DialogDescription>
              Xem và chọn các phiên bản ảnh đã tạo trước đó
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Chưa có ảnh nào được tạo cho kênh này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {images.map(image => (
                <div
                  key={image.id}
                  className={`relative group rounded-lg border overflow-hidden ${
                    image.is_selected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-video relative bg-muted">
                    <img
                      src={image.image_url}
                      alt="Generated image"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Version & Selected badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge variant="secondary" className="text-xs">
                        v{image.version}
                      </Badge>
                      {image.is_selected && (
                        <Badge className="gap-1">
                          <Check className="w-3 h-3" />
                          Đang dùng
                        </Badge>
                      )}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <TooltipProvider>
                        {!image.is_selected && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSelectImage(image.id, image.image_url)}
                                disabled={selecting === image.id}
                              >
                                {selecting === image.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Chọn ảnh này</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(image.image_url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mở ảnh</TooltipContent>
                        </Tooltip>

                        {IMAGE_DELETION_ENABLED && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage(image.id)}
                              disabled={deleting === image.id || image.is_selected}
                            >
                              {deleting === image.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {image.is_selected ? 'Không thể xóa ảnh đang dùng' : 'Xóa ảnh'}
                          </TooltipContent>
                        </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(image.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    </p>
                    {image.aspect_ratio && (
                      <Badge variant="outline" className="text-xs">
                        {image.aspect_ratio}
                      </Badge>
                    )}
                    {image.prompt && (
                      <p className="text-xs text-muted-foreground line-clamp-2" title={image.prompt}>
                        {image.prompt.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Compare Mode Dialog */}
      <ImageCompareMode
        open={compareOpen}
        onOpenChange={setCompareOpen}
        images={images}
        channelLabel={channelLabel}
        onSelectImage={(imageId, imageUrl) => {
          handleSelectImage(imageId, imageUrl);
          setCompareOpen(false);
        }}
      />
    </>
  );
}
