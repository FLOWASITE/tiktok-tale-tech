import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Carousel, CarouselFormData, CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';

export function useCarousels() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);

  const fetchCarousels = async () => {
    if (!user || !currentOrganization) {
      setCarousels([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('carousels')
        .select('*')
        .eq('organization_id', currentOrganization.id)
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
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo carousel');
      return null;
    }

    if (generatingRef.current) {
      console.log('[Carousel] Blocked double-invoke');
      return null;
    }
    generatingRef.current = true;
    setGenerating(true);
    try {
      // Ensure we have a fresh session before calling the function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('generate-carousel', {
        body: { 
          ...formData, 
          user_id: user.id,
          organization_id: currentOrganization?.id,
          carouselStyle: formData.carouselStyle,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
        } else {
          throw error;
        }
        return null;
      }

      if (data?.error) {
        if (data.error.includes('Unauthorized')) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else {
          toast.error(data.error);
        }
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
      generatingRef.current = false;
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
  }, [user]);

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
