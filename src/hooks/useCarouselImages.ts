import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface CarouselImage {
  id: string;
  carousel_id: string;
  slide_number: number;
  image_url: string;
  prompt: string | null;
  version: number;
  is_selected: boolean;
  created_by: string | null;
  organization_id: string | null;
  created_at: string;
}

export function useCarouselImages(carouselId: string | null) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!carouselId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('carousel_images')
        .select('*')
        .eq('carousel_id', carouselId)
        .eq('is_selected', true)
        .order('slide_number', { ascending: true });

      if (error) throw error;
      setImages((data || []) as CarouselImage[]);
    } catch (error) {
      console.error('Error fetching carousel images:', error);
    } finally {
      setLoading(false);
    }
  }, [carouselId, user]);

  const saveImage = useCallback(async (
    slideNumber: number,
    imageUrl: string,
    prompt?: string,
  ): Promise<CarouselImage | null> => {
    if (!carouselId || !user) return null;

    try {
      // Deselect previous versions for this slide
      await supabase
        .from('carousel_images')
        .update({ is_selected: false })
        .eq('carousel_id', carouselId)
        .eq('slide_number', slideNumber);

      // Insert new version
      const { data, error } = await supabase
        .from('carousel_images')
        .insert({
          carousel_id: carouselId,
          slide_number: slideNumber,
          image_url: imageUrl,
          prompt: prompt || null,
          is_selected: true,
          created_by: user.id,
          organization_id: currentOrganization?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newImage = data as CarouselImage;
      setImages(prev => {
        const filtered = prev.filter(img => img.slide_number !== slideNumber);
        return [...filtered, newImage].sort((a, b) => a.slide_number - b.slide_number);
      });

      return newImage;
    } catch (error) {
      console.error('Error saving carousel image:', error);
      toast.error('Không thể lưu ảnh');
      return null;
    }
  }, [carouselId, user, currentOrganization]);

  const deleteImage = useCallback(async (slideNumber: number): Promise<boolean> => {
    if (!carouselId) return false;

    try {
      const { error } = await supabase
        .from('carousel_images')
        .delete()
        .eq('carousel_id', carouselId)
        .eq('slide_number', slideNumber)
        .eq('is_selected', true);

      if (error) throw error;

      setImages(prev => prev.filter(img => img.slide_number !== slideNumber));
      toast.success(`Đã xóa ảnh slide ${slideNumber}`);
      return true;
    } catch (error) {
      console.error('Error deleting carousel image:', error);
      toast.error('Không thể xóa ảnh');
      return false;
    }
  }, [carouselId]);

  const getImageForSlide = useCallback((slideNumber: number): CarouselImage | undefined => {
    return images.find(img => img.slide_number === slideNumber);
  }, [images]);

  // Clear stale images immediately when carouselId changes
  useEffect(() => {
    setImages([]);
    setLoading(true);
  }, [carouselId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return {
    images,
    loading,
    saveImage,
    deleteImage,
    getImageForSlide,
    refetch: fetchImages,
  };
}
