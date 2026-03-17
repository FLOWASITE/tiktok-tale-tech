import { CarouselGalleryView } from '@/components/carousel/CarouselGalleryView';
import { useCarouselGallery } from '@/hooks/useCarouselGallery';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Layers, Share2 } from 'lucide-react';

export default function Gallery() {
  const { sourceCounts, loading } = useCarouselGallery();

  const stats = [
    { label: 'Tổng ảnh', value: sourceCounts.all, icon: ImageIcon, color: 'text-primary' },
    { label: 'Carousel', value: sourceCounts.carousel, icon: Layers, color: 'text-blue-500' },
    { label: 'Multichannel', value: sourceCounts.multichannel, icon: Share2, color: 'text-emerald-500' },
  ];

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý tất cả ảnh được tạo trong toàn bộ ứng dụng</p>
      </div>

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CarouselGalleryView />
    </div>
  );
}
