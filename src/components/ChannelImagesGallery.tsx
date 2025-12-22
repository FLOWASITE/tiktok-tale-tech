import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  ExternalLink, 
  Trash2, 
  ImageIcon, 
  Package,
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
  Loader2,
  Music2,
  AtSign
} from 'lucide-react';
import { Channel, ChannelImage, ChannelImages } from '@/types/multichannel';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChannelImagesGalleryProps {
  channelImages: ChannelImages;
  selectedChannels: Channel[];
  onDeleteImage?: (channel: Channel) => Promise<void>;
  isDeleting?: Channel | null;
}

const channelConfig: Record<Channel, { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  bgColor: string;
}> = {
  website: { 
    label: 'Website', 
    icon: <Globe className="w-3 h-3" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  facebook: { 
    label: 'Facebook', 
    icon: <Facebook className="w-3 h-3" />, 
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
  },
  instagram: { 
    label: 'Instagram', 
    icon: <Instagram className="w-3 h-3" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
  twitter: { 
    label: 'Twitter', 
    icon: <Twitter className="w-3 h-3" />, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
  google_maps: { 
    label: 'Google Maps', 
    icon: <MapPin className="w-3 h-3" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
  },
  linkedin: { 
    label: 'LinkedIn', 
    icon: <Linkedin className="w-3 h-3" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
  },
  email: { 
    label: 'Email', 
    icon: <Mail className="w-3 h-3" />, 
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  youtube: { 
    label: 'YouTube', 
    icon: <Youtube className="w-3 h-3" />, 
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  zalo_oa: { 
    label: 'Zalo OA', 
    icon: <MessageCircle className="w-3 h-3" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  telegram: { 
    label: 'Telegram', 
    icon: <Send className="w-3 h-3" />, 
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/20',
  },
  tiktok: { 
    label: 'TikTok', 
    icon: <Music2 className="w-3 h-3" />, 
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
  threads: { 
    label: 'Threads', 
    icon: <AtSign className="w-3 h-3" />, 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
  },
};

export function ChannelImagesGallery({
  channelImages,
  selectedChannels,
  onDeleteImage,
  isDeleting,
}: ChannelImagesGalleryProps) {
  const [deleteConfirmChannel, setDeleteConfirmChannel] = useState<Channel | null>(null);

  // Get images that exist for selected channels
  const imagesWithChannels = selectedChannels
    .filter(channel => channelImages[channel]?.url)
    .map(channel => ({
      channel,
      image: channelImages[channel] as ChannelImage,
    }));

  const handleDownloadSingle = async (channel: Channel, image: ChannelImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channel}-image.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ảnh ${channelConfig[channel].label}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Không thể tải ảnh');
    }
  };

  const handleDownloadAll = async () => {
    if (imagesWithChannels.length === 0) {
      toast.error('Chưa có ảnh nào để tải');
      return;
    }

    toast.info('Đang tải tất cả ảnh...');
    
    for (const { channel, image } of imagesWithChannels) {
      await handleDownloadSingle(channel, image);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    
    toast.success('Đã tải tất cả ảnh!');
  };

  const handleOpenInNewTab = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmChannel && onDeleteImage) {
      await onDeleteImage(deleteConfirmChannel);
      setDeleteConfirmChannel(null);
    }
  };

  if (imagesWithChannels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">Chưa có ảnh nào</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Nhấn "Tạo ảnh" trên từng kênh để bắt đầu tạo ảnh AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {imagesWithChannels.length}/{selectedChannels.length} ảnh
          </Badge>
        </div>
        <Button onClick={handleDownloadAll} size="sm" variant="outline">
          <Package className="w-4 h-4 mr-2" />
          Tải tất cả
        </Button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {imagesWithChannels.map(({ channel, image }) => {
          const config = channelConfig[channel];
          const isDeletingThis = isDeleting === channel;
          
          return (
            <Card key={channel} className="overflow-hidden group">
              <CardContent className="p-0 relative">
                <div className="aspect-square relative">
                  <img
                    src={image.url}
                    alt={`${config.label} image`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleOpenInNewTab(image.url)}
                      className="h-8 w-8"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleDownloadSingle(channel, image)}
                      className="h-8 w-8"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {onDeleteImage && (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => setDeleteConfirmChannel(channel)}
                        disabled={isDeletingThis}
                        className="h-8 w-8"
                      >
                        {isDeletingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  {/* Channel badge */}
                  <Badge className={`absolute top-2 left-2 ${config.bgColor} ${config.color} border-0 gap-1`}>
                    {config.icon}
                    {config.label}
                  </Badge>
                  {/* Provider badge */}
                  {image.provider && (
                    <Badge variant="outline" className="absolute bottom-2 right-2 bg-black/70 text-white text-xs border-0">
                      {image.provider}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Missing channels info */}
      {imagesWithChannels.length < selectedChannels.length && (
        <p className="text-xs text-muted-foreground text-center">
          Còn {selectedChannels.length - imagesWithChannels.length} kênh chưa tạo ảnh
        </p>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirmChannel} onOpenChange={() => setDeleteConfirmChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa ảnh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa ảnh của kênh {deleteConfirmChannel && channelConfig[deleteConfirmChannel].label}? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
