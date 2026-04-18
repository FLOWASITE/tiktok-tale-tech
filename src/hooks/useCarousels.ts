import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCarouselGeneration } from '@/contexts/CarouselGenerationContext';
import { Carousel, CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';

export function useCarousels() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const { generateCarousel, generating } = useCarouselGeneration();
  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [user, currentOrganization?.id]);

  // Realtime subscription: pick up carousels inserted in background (other tabs / unmounted state)
  useEffect(() => {
    if (!currentOrganization?.id) return;
    const channel = supabase
      .channel(`carousels-org-${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carousels',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const newCarousel = {
            ...row,
            slides_content: row.slides_content as CarouselSlide[],
          } as Carousel;
          setCarousels((prev) => {
            if (prev.some((c) => c.id === newCarousel.id)) return prev;
            return [newCarousel, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization?.id]);

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
