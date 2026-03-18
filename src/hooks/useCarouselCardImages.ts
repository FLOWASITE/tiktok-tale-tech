import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CarouselImageInfo {
  thumbnailUrl: string;
  imageCount: number;
}

export function useCarouselCardImages(carouselIds: string[]) {
  const [imageMap, setImageMap] = useState<Record<string, CarouselImageInfo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (carouselIds.length === 0) {
      setImageMap({});
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      try {
        // Get all images for these carousels (selected ones)
        const { data, error } = await supabase
          .from('carousel_images')
          .select('carousel_id, slide_number, image_url, is_selected')
          .in('carousel_id', carouselIds)
          .eq('is_selected', true)
          .order('slide_number', { ascending: true });

        if (error) throw error;

        const map: Record<string, CarouselImageInfo> = {};
        
        if (data) {
          // Group by carousel_id
          for (const img of data) {
            if (!map[img.carousel_id]) {
              map[img.carousel_id] = {
                thumbnailUrl: img.image_url,
                imageCount: 1,
              };
            } else {
              map[img.carousel_id].imageCount++;
            }
          }
        }

        setImageMap(map);
      } catch (err) {
        console.error('Error fetching carousel card images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [carouselIds.join(',')]);

  return { imageMap, loading };
}
