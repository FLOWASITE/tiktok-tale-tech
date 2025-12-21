import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselFormData, CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';

export function useCarousels() {
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchCarousels = async () => {
    try {
      const { data, error } = await supabase
        .from('carousels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse slides_content from JSON
      const parsedData = (data || []).map((item) => ({
        ...item,
        slides_content: item.slides_content as unknown as CarouselSlide[],
      })) as Carousel[];
      
      setCarousels(parsedData);
    } catch (error) {
      console.error('Error fetching carousels:', error);
      toast.error('Không thể tải danh sách carousel');
    } finally {
      setLoading(false);
    }
  };

  const generateCarousel = async (formData: CarouselFormData): Promise<Carousel | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: formData,
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
        } else {
          throw error;
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      const newCarousel = {
        ...data,
        slides_content: data.slides_content as CarouselSlide[],
      } as Carousel;
      
      setCarousels((prev) => [newCarousel, ...prev]);
      toast.success('Đã tạo carousel prompts thành công!');
      return newCarousel;
    } catch (error) {
      console.error('Error generating carousel:', error);
      toast.error('Không thể tạo carousel. Vui lòng thử lại.');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const deleteCarousel = async (id: string) => {
    try {
      const { error } = await supabase.from('carousels').delete().eq('id', id);
      if (error) throw error;
      setCarousels((prev) => prev.filter((c) => c.id !== id));
      toast.success('Đã xóa carousel!');
    } catch (error) {
      console.error('Error deleting carousel:', error);
      toast.error('Không thể xóa carousel');
    }
  };

  const updateCarousel = (updatedCarousel: Carousel) => {
    setCarousels((prev) =>
      prev.map((c) => (c.id === updatedCarousel.id ? updatedCarousel : c))
    );
  };

  useEffect(() => {
    fetchCarousels();
  }, []);

  return {
    carousels,
    loading,
    generating,
    generateCarousel,
    deleteCarousel,
    updateCarousel,
    refetch: fetchCarousels,
  };
}
