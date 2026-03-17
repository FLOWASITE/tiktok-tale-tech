import { CarouselGalleryView } from '@/components/carousel/CarouselGalleryView';
import { useCarouselGallery } from '@/hooks/useCarouselGallery';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Layers, Share2 } from 'lucide-react';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';

export default function Gallery() {
  const { sourceCounts, loading } = useCarouselGallery();

  const stats = [
    { label: 'Tổng ảnh', value: sourceCounts.all, icon: ImageIcon, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Carousel', value: sourceCounts.carousel, icon: Layers, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Multichannel', value: sourceCounts.multichannel, icon: Share2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const getPercent = (val: number) => {
    if (sourceCounts.all === 0) return 0;
    return Math.round((val / sourceCounts.all) * 100);
  };

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
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <AnimatedNumber value={s.value} duration={800} className="text-2xl font-bold text-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {s.label}
                    {s.label !== 'Tổng ảnh' && sourceCounts.all > 0 && (
                      <span className="ml-1 text-muted-foreground/70">({getPercent(s.value)}%)</span>
                    )}
                  </p>
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
