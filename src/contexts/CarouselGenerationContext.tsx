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
  status: 'generating' | 'done' | 'error' | 'cancelled';
  startedAt: number;
  carousel?: Carousel;
  error?: string;
  // Streaming state
  progress: number;
  currentStep: string;
  partialSlides: CarouselSlide[];
  totalSlides: number;
  completedSlides: number;
}

interface CarouselGenerationContextValue {
  jobs: CarouselGenerationJob[];
  activeJob: CarouselGenerationJob | null;
  generating: boolean;
  generateCarousel: (formData: CarouselFormData) => Promise<Carousel | null>;
  dismissJob: (id: string) => void;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => void;
}

const CarouselGenerationContext = createContext<CarouselGenerationContextValue | null>(null);

const FIRST_BYTE_TIMEOUT_MS = 30_000;
const IDLE_TIMEOUT_MS = 150_000;

export function CarouselGenerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CarouselGenerationJob[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const abortersRef = useRef<Map<string, AbortController>>(new Map());

  const updateJob = useCallback((id: string, patch: Partial<CarouselGenerationJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    abortersRef.current.delete(id);
  }, []);

  const cancelJob = useCallback((id: string) => {
    const c = abortersRef.current.get(id);
    if (c) {
      try { c.abort(); } catch { /* noop */ }
    }
    abortersRef.current.delete(id);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id && j.status === 'generating'
          ? { ...j, status: 'cancelled', currentStep: 'Đã hủy', error: 'Cancelled by user' }
          : j
      )
    );
    toast.info('Đã hủy quá trình tạo carousel');
  }, []);

  const generateCarousel = useCallback(
    async (formData: CarouselFormData): Promise<Carousel | null> => {
      if (!user) {
        toast.error('Vui lòng đăng nhập để tạo carousel');
        return null;
      }

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
        progress: 0,
        currentStep: 'Đang khởi tạo...',
        partialSlides: [],
        totalSlides: formData.slideCount || 0,
        completedSlides: 0,
      };
      setJobs((prev) => [job, ...prev]);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          updateJob(jobId, { status: 'error', error: 'Unauthorized' });
          return null;
        }

        const accessToken = sessionData.session.access_token;
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-carousel`;

        const controller = new AbortController();
        abortersRef.current.set(jobId, controller);
        let watchdog: ReturnType<typeof setTimeout> | null = null;
        let receivedFirstByte = false;
        const armWatchdog = () => {
          if (watchdog) clearTimeout(watchdog);
          watchdog = setTimeout(() => {
            console.warn('[CarouselGen] Watchdog timeout — aborting');
            controller.abort('watchdog');
          }, receivedFirstByte ? IDLE_TIMEOUT_MS : FIRST_BYTE_TIMEOUT_MS);
        };
        armWatchdog();

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...formData,
            user_id: user.id,
            organization_id: currentOrganization?.id,
            carouselStyle: formData.carouselStyle,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          const errText = await resp.text().catch(() => '');
          let msg = 'Không thể tạo carousel. Vui lòng thử lại.';
          if (resp.status === 401) msg = 'Phiên đăng nhập đã hết hạn.';
          else if (resp.status === 429) msg = 'Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.';
          else if (resp.status === 402) msg = 'Cần nạp thêm credits để tiếp tục sử dụng.';
          else if (errText) {
            try {
              const parsed = JSON.parse(errText);
              if (parsed?.error) msg = parsed.error;
            } catch { /* ignore */ }
          }
          toast.error(msg);
          updateJob(jobId, { status: 'error', error: msg });
          return null;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalCarousel: Carousel | null = null;
        const partial: CarouselSlide[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!receivedFirstByte) {
            receivedFirstByte = true;
            armWatchdog();
          }
          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;

            let event: any;
            try { event = JSON.parse(payload); } catch { continue; }
            armWatchdog();

            if (event.type === 'progress') {
              updateJob(jobId, {
                progress: typeof event.percent === 'number' ? event.percent : undefined as any,
                currentStep: event.message || event.step || 'Đang xử lý...',
                totalSlides: event.totalSlides ?? job.totalSlides,
              });
            } else if (event.type === 'slide_done') {
              if (event.slide) partial.push(event.slide as CarouselSlide);
              updateJob(jobId, {
                progress: event.percent ?? 0,
                currentStep: event.message || `Slide ${event.completedSlides}/${event.totalSlides}`,
                partialSlides: [...partial],
                completedSlides: event.completedSlides ?? partial.length,
                totalSlides: event.totalSlides ?? partial.length,
              });
            } else if (event.type === 'result') {
              finalCarousel = {
                ...event.carousel,
                slides_content: event.carousel?.slides_content as CarouselSlide[],
              } as Carousel;
              updateJob(jobId, {
                status: 'done',
                carousel: finalCarousel,
                progress: 100,
                currentStep: 'Hoàn thành!',
                partialSlides: finalCarousel.slides_content || partial,
                completedSlides: (finalCarousel.slides_content || partial).length,
              });
            } else if (event.type === 'error') {
              const m = event.message || 'Tạo carousel thất bại';
              if (event.status === 429) toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
              else if (event.status === 402) toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
              else toast.error(m);
              updateJob(jobId, { status: 'error', error: m });
            }
          }
        }

        if (watchdog) clearTimeout(watchdog);

        if (finalCarousel) {
          toast.success('Carousel đã sẵn sàng!', {
            action: {
              label: 'Xem kết quả',
              onClick: () => navigate('/carousel'),
            },
          });
          return finalCarousel;
        }

        // Stream ended without result event — only flag error if not already cancelled
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId && j.status === 'generating'
              ? { ...j, status: 'error', error: 'Stream kết thúc không có kết quả' }
              : j
          )
        );
        const cur = jobs.find((j) => j.id === jobId);
        if (cur?.status !== 'cancelled') {
          toast.error('Tạo carousel chưa hoàn tất. Vui lòng thử lại.');
        }
        return null;
      } catch (err: any) {
        console.error('[CarouselGen] Unexpected error:', err);
        if (err?.name === 'AbortError') {
          // Distinguish user-cancel vs watchdog
          setJobs((prev) =>
            prev.map((j) => {
              if (j.id !== jobId) return j;
              if (j.status === 'cancelled') return j;
              return { ...j, status: 'error', error: 'Mất kết nối streaming' };
            })
          );
          const j = jobs.find((x) => x.id === jobId);
          if (j?.status !== 'cancelled') {
            toast.error('Mất kết nối streaming. Vui lòng thử lại.');
          }
        } else {
          updateJob(jobId, { status: 'error', error: String(err?.message || err) });
          toast.error('Không thể tạo carousel. Vui lòng thử lại.');
        }
        return null;
      } finally {
        inFlightRef.current.delete(dedupKey);
        abortersRef.current.delete(jobId);
      }
    },
    [user, currentOrganization?.id, navigate, updateJob, jobs]
  );

  const retryJob = useCallback(
    (id: string) => {
      const j = jobs.find((x) => x.id === id);
      if (!j) return;
      dismissJob(id);
      void generateCarousel(j.formData);
    },
    [jobs, dismissJob, generateCarousel]
  );

  const activeJob = jobs.find((j) => j.status === 'generating') || jobs[0] || null;
  const generating = jobs.some((j) => j.status === 'generating');

  return (
    <CarouselGenerationContext.Provider
      value={{ jobs, activeJob, generating, generateCarousel, dismissJob, cancelJob, retryJob }}
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
