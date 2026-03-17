import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GalleryImage {
  id: string;
  imageUrl: string;
  carouselId: string;
  carouselTitle: string;
  slideNumber: number;
  version: number;
  isSelected: boolean;
  createdAt: string;
}

export function useCarouselGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselFilter, setCarouselFilter] = useState<string>('all');

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('carousel_images')
        .select('id, image_url, carousel_id, slide_number, version, is_selected, created_at, carousels(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: GalleryImage[] = (data || []).map((row: any) => ({
        id: row.id,
        imageUrl: row.image_url,
        carouselId: row.carousel_id,
        carouselTitle: row.carousels?.title || 'Không rõ',
        slideNumber: row.slide_number,
        version: row.version,
        isSelected: row.is_selected ?? false,
        createdAt: row.created_at,
      }));

      setImages(mapped);
    } catch (err) {
      console.error('Failed to fetch gallery images:', err);
      toast.error('Không thể tải gallery ảnh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const filteredImages = useMemo(() => {
    if (carouselFilter === 'all') return images;
    return images.filter(img => img.carouselId === carouselFilter);
  }, [images, carouselFilter]);

  const carouselOptions = useMemo(() => {
    const map = new Map<string, string>();
    images.forEach(img => map.set(img.carouselId, img.carouselTitle));
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [images]);

  const deleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase.from('carousel_images').delete().eq('id', imageId);
      if (error) throw error;
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Đã xóa ảnh');
    } catch (err) {
      console.error('Failed to delete image:', err);
      toast.error('Không thể xóa ảnh');
    }
  };

  return {
    images: filteredImages,
    allImages: images,
    loading,
    carouselFilter,
    setCarouselFilter,
    carouselOptions,
    deleteImage,
    refetch: fetchImages,
  };
}
