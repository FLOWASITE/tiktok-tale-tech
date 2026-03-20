import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CarouselImageInfo {
  imageUrls: string[];
  imageCount: number;
}

export function useCarouselCardImages(carouselIds: string[]) {
  const [imageMap, setImageMap] = useState<Record<string, CarouselImageInfo>>({});
  const [loading, setLoading] = useState(false);
  const prevMapRef = useRef<Record<string, CarouselImageInfo>>({});

  const buildMap = useCallback((data: { carousel_id: string; image_url: string }[]) => {
    const map: Record<string, CarouselImageInfo> = {};
    for (const img of data) {
      if (!map[img.carousel_id]) {
        map[img.carousel_id] = { imageUrls: [img.image_url], imageCount: 1 };
      } else {
        map[img.carousel_id].imageUrls.push(img.image_url);
        map[img.carousel_id].imageCount++;
      }
    }
    return map;
  }, []);

  useEffect(() => {
    if (carouselIds.length === 0) {
      setImageMap({});
      prevMapRef.current = {};
      return;
    }

    const fetchImages = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('carousel_images')
          .select('carousel_id, slide_number, image_url, is_selected')
          .in('carousel_id', carouselIds)
          .eq('is_selected', true)
          .order('slide_number', { ascending: true });

        if (error) throw error;

        const map = buildMap(data || []);
        prevMapRef.current = map;
        setImageMap(map);
      } catch (err) {
        console.error('Error fetching carousel card images:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [carouselIds.join(','), buildMap]);

  // Realtime subscription for new images
  useEffect(() => {
    if (carouselIds.length === 0) return;

    const channel = supabase
      .channel('carousel-card-images')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carousel_images',
          filter: `is_selected=eq.true`,
        },
        (payload) => {
          const newImg = payload.new as { carousel_id: string; image_url: string; slide_number: number };
          if (!carouselIds.includes(newImg.carousel_id)) return;

          setImageMap((prev) => {
            const existing = prev[newImg.carousel_id];
            if (existing) {
              // Avoid duplicates
              if (existing.imageUrls.includes(newImg.image_url)) return prev;
              return {
                ...prev,
                [newImg.carousel_id]: {
                  imageUrls: [...existing.imageUrls, newImg.image_url],
                  imageCount: existing.imageCount + 1,
                },
              };
            }
            return {
              ...prev,
              [newImg.carousel_id]: { imageUrls: [newImg.image_url], imageCount: 1 },
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carouselIds.join(',')]);

  return { imageMap, loading };
}
