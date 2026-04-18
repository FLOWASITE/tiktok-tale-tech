import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Carousel, CarouselFormData, CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';

export interface CarouselGenerationJob {
  id: string;
  formData: CarouselFormData;
  status: 'generating' | 'done' | 'error';
  startedAt: number;
  carousel?: Carousel;
  error?: string;
}

interface CarouselGenerationContextValue {
  jobs: CarouselGenerationJob[];
  activeJob: CarouselGenerationJob | null;
  generating: boolean;
  generateCarousel: (formData: CarouselFormData) => Promise<Carousel | null>;
  dismissJob: (id: string) => void;
}

const CarouselGenerationContext = createContext<CarouselGenerationContextValue | null>(null);

export function CarouselGenerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CarouselGenerationJob[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());

  const updateJob = useCallback((id: string, patch: Partial<CarouselGenerationJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const generateCarousel = useCallback(
    async (formData: CarouselFormData): Promise<Carousel | null> => {
      if (!user) {
        toast.error('Vui lòng đăng nhập để tạo carousel');
        return null;
      }

      // Dedup: same topic+style within 3s
      const dedupKey = `${formData.topic}|${formData.carouselStyle}|${formData.visualPreset}`;
      if (inFlightRef.current.has(dedupKey)) {
        console.log('[CarouselGen] Blocked duplicate invoke');
        return null;
      }
      inFlightRef.current.add(dedupKey);

      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const job: CarouselGenerationJob = {
        id: jobId,
        formData,
        status: 'generating',
        startedAt: Date.now(),
      };
      setJobs((prev) => [job, ...prev]);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          updateJob(jobId, { status: 'error', error: 'Unauthorized' });
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
          console.error('[CarouselGen] Edge error:', error);
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            toast.error('Phiên đăng nhập đã hết hạn.');
          } else if (error.message?.includes('429')) {
            toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
          } else if (error.message?.includes('402')) {
            toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
          } else {
            toast.error('Không thể tạo carousel. Vui lòng thử lại.');
          }
          updateJob(jobId, { status: 'error', error: error.message });
          return null;
        }

        if (data?.error) {
          toast.error(data.error);
          updateJob(jobId, { status: 'error', error: data.error });
          return null;
        }

        const newCarousel = {
          ...data,
          slides_content: data.slides_content as CarouselSlide[],
        } as Carousel;

        updateJob(jobId, { status: 'done', carousel: newCarousel });
        toast.success('Carousel đã sẵn sàng!', {
          action: {
            label: 'Xem kết quả',
            onClick: () => navigate('/carousel'),
          },
        });
        return newCarousel;
      } catch (err) {
        console.error('[CarouselGen] Unexpected error:', err);
        toast.error('Không thể tạo carousel. Vui lòng thử lại.');
        updateJob(jobId, { status: 'error', error: String(err) });
        return null;
      } finally {
        inFlightRef.current.delete(dedupKey);
      }
    },
    [user, currentOrganization?.id, navigate, updateJob]
  );

  const activeJob = jobs.find((j) => j.status === 'generating') || jobs[0] || null;
  const generating = jobs.some((j) => j.status === 'generating');

  return (
    <CarouselGenerationContext.Provider
      value={{ jobs, activeJob, generating, generateCarousel, dismissJob }}
    >
      {children}
    </CarouselGenerationContext.Provider>
  );
}

export function useCarouselGeneration() {
  const ctx = useContext(CarouselGenerationContext);
  if (!ctx) throw new Error('useCarouselGeneration must be used within CarouselGenerationProvider');
  return ctx;
}
