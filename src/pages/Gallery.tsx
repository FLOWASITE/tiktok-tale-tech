import { CarouselGalleryView } from '@/components/carousel/CarouselGalleryView';

export default function Gallery() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý tất cả ảnh được tạo trong toàn bộ ứng dụng</p>
      </div>
      <CarouselGalleryView />
    </div>
  );
}
