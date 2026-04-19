import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Carousel, CarouselFormData, CarouselSlide } from '@/types/carousel';
import { toast } from 'sonner';
import { launchCarouselImageBatch } from '@/lib/carouselImageBatch';

export type CarouselGenPhase =
  | 'init'
  | 'planning'
  | 'ai_generating'
  | 'parsing'
  | 'compliance'
  | 'revealing'
  | 'finalizing'
  | 'syncing'
  | 'image_generating'
  | 'done'
  | 'error'
  | 'cancelled';

export type CarouselAbortReason = 'user' | 'watchdog' | 'network' | 'backend' | null;

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
  phase: CarouselGenPhase;
  partialSlides: CarouselSlide[];
  totalSlides: number;
  completedSlides: number;
  // Realtime / observability
  lastEventAt: number;
  abortReason: CarouselAbortReason;
  /** Slide number currently being revealed (after slide_start, before slide_done) */
  revealingSlide: number | null;
  /** Real preview content for the slide currently being written */
  revealingSlideMeta: { slideNumber: number; objective?: string; textPreview?: string; promptPreview?: string } | null;
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
const SYNC_FALLBACK_TIMEOUT_MS = 60_000; // After stream drop, wait this long for DB row before failing

export function CarouselGenerationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<CarouselGenerationJob[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());
  const abortersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelReasonRef = useRef<Map<string, CarouselAbortReason>>(new Map());

  const updateJob = useCallback((id: string, patch: Partial<CarouselGenerationJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch, lastEventAt: Date.now() } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    abortersRef.current.delete(id);
    cancelReasonRef.current.delete(id);
  }, []);

  const cancelJob = useCallback((id: string) => {
    cancelReasonRef.current.set(id, 'user');
    const c = abortersRef.current.get(id);
    if (c) {
      try { c.abort(); } catch { /* noop */ }
    }
    abortersRef.current.delete(id);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id && j.status === 'generating'
          ? {
              ...j,
              status: 'cancelled',
              phase: 'cancelled',
              currentStep: 'Đã hủy',
              error: 'Cancelled by user',
              abortReason: 'user',
              lastEventAt: Date.now(),
            }
          : j
      )
    );
    toast.info('Đã hủy quá trình tạo carousel');
  }, []);

  /** Try to fetch the carousel row by topic+timestamp window — used as fallback when stream drops */
  const trySyncFromDb = useCallback(
    async (formData: CarouselFormData, startedAt: number): Promise<Carousel | null> => {
      try {
        const { data } = await supabase
          .from('carousels')
          .select('*')
          .eq('topic', formData.topic)
          .gte('created_at', new Date(startedAt - 5_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return (data as any) || null;
      } catch (err) {
        console.warn('[CarouselGen] DB sync fallback query failed:', err);
        return null;
      }
    },
    []
  );

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
      const startedAt = Date.now();
      const job: CarouselGenerationJob = {
        id: jobId,
        formData,
        status: 'generating',
        startedAt,
        progress: 0,
        currentStep: 'Đang khởi tạo...',
        phase: 'init',
        partialSlides: [],
        totalSlides: formData.slideCount || 0,
        completedSlides: 0,
        lastEventAt: startedAt,
        abortReason: null,
        revealingSlide: null,
      };
      setJobs((prev) => [job, ...prev]);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          updateJob(jobId, { status: 'error', phase: 'error', error: 'Unauthorized' });
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
            cancelReasonRef.current.set(jobId, 'watchdog');
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
          updateJob(jobId, { status: 'error', phase: 'error', error: msg, abortReason: 'backend' });
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

            const phase: CarouselGenPhase = (event.phase as CarouselGenPhase) || 'ai_generating';

            if (event.type === 'progress') {
              updateJob(jobId, {
                progress: typeof event.percent === 'number' ? event.percent : undefined as any,
                currentStep: event.message || event.step || 'Đang xử lý...',
                phase,
                totalSlides: event.totalSlides ?? job.totalSlides,
              });
            } else if (event.type === 'slide_start') {
              updateJob(jobId, {
                phase: 'revealing',
                revealingSlide: event.slideNumber ?? null,
                currentStep: event.message || `Đang hiển thị slide ${event.slideNumber}...`,
                totalSlides: event.totalSlides ?? job.totalSlides,
              });
            } else if (event.type === 'slide_done') {
              if (event.slide) partial.push(event.slide as CarouselSlide);
              updateJob(jobId, {
                progress: event.percent ?? 0,
                currentStep: event.message || `Slide ${event.completedSlides}/${event.totalSlides}`,
                phase: 'revealing',
                revealingSlide: null,
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
                phase: 'done',
                carousel: finalCarousel,
                progress: 100,
                currentStep: 'Hoàn thành!',
                partialSlides: finalCarousel.slides_content || partial,
                completedSlides: (finalCarousel.slides_content || partial).length,
                revealingSlide: null,
              });
              // Auto-launch image batch independently of UI mount
              if (formData.autoGenerateImages && finalCarousel.id && user) {
                void launchCarouselImageBatch({
                  carousel: finalCarousel,
                  userId: user.id,
                  organizationId: currentOrganization?.id,
                }).then(({ taskId, alreadyRunning }) => {
                  if (taskId && !alreadyRunning) {
                    toast.success('🎨 Ảnh đang được tạo nền. Bạn có thể rời đi bất cứ lúc nào!', {
                      duration: 5000,
                    });
                  }
                });
              }
            } else if (event.type === 'error') {
              const m = event.message || 'Tạo carousel thất bại';
              if (event.status === 429) toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
              else if (event.status === 402) toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
              else toast.error(m);
              updateJob(jobId, { status: 'error', phase: 'error', error: m, abortReason: 'backend' });
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

        // Stream ended without result — try DB sync fallback before failing
        const reason = cancelReasonRef.current.get(jobId);
        if (reason !== 'user') {
          updateJob(jobId, {
            phase: 'syncing',
            currentStep: 'Stream đứt, đang đồng bộ kết quả từ máy chủ...',
          });
          const syncStart = Date.now();
          while (Date.now() - syncStart < SYNC_FALLBACK_TIMEOUT_MS) {
            const synced = await trySyncFromDb(formData, startedAt);
            if (synced) {
              updateJob(jobId, {
                status: 'done',
                phase: 'done',
                carousel: synced,
                progress: 100,
                currentStep: 'Hoàn thành (đồng bộ từ máy chủ)!',
                partialSlides: (synced.slides_content as CarouselSlide[]) || partial,
                completedSlides: ((synced.slides_content as CarouselSlide[]) || partial).length,
              });
              toast.success('Carousel đã sẵn sàng (đồng bộ từ máy chủ)!');
              if (formData.autoGenerateImages && synced.id && user) {
                void launchCarouselImageBatch({
                  carousel: synced,
                  userId: user.id,
                  organizationId: currentOrganization?.id,
                }).then(({ taskId, alreadyRunning }) => {
                  if (taskId && !alreadyRunning) {
                    toast.success('🎨 Ảnh đang được tạo nền. Bạn có thể rời đi bất cứ lúc nào!', {
                      duration: 5000,
                    });
                  }
                });
              }
              return synced;
            }
            await new Promise((r) => setTimeout(r, 4_000));
          }
        }

        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId && j.status === 'generating'
              ? {
                  ...j,
                  status: 'error',
                  phase: 'error',
                  error: 'Stream kết thúc không có kết quả',
                  abortReason: 'network',
                  lastEventAt: Date.now(),
                }
              : j
          )
        );
        if (reason !== 'user') {
          toast.error('Tạo carousel chưa hoàn tất. Vui lòng thử lại.');
        }
        return null;
      } catch (err: any) {
        console.error('[CarouselGen] Unexpected error:', err);
        if (err?.name === 'AbortError') {
          const reason = cancelReasonRef.current.get(jobId);
          setJobs((prev) =>
            prev.map((j) => {
              if (j.id !== jobId) return j;
              if (j.status === 'cancelled') return j;
              return {
                ...j,
                status: 'error',
                phase: 'error',
                error: reason === 'watchdog' ? 'Hết thời gian chờ máy chủ' : 'Mất kết nối streaming',
                abortReason: reason || 'network',
                lastEventAt: Date.now(),
              };
            })
          );
          if (reason !== 'user') {
            toast.error(reason === 'watchdog' ? 'Máy chủ phản hồi chậm. Vui lòng thử lại.' : 'Mất kết nối streaming. Vui lòng thử lại.');
          }
        } else {
          updateJob(jobId, { status: 'error', phase: 'error', error: String(err?.message || err), abortReason: 'network' });
          toast.error('Không thể tạo carousel. Vui lòng thử lại.');
        }
        return null;
      } finally {
        inFlightRef.current.delete(dedupKey);
        abortersRef.current.delete(jobId);
        cancelReasonRef.current.delete(jobId);
      }
    },
    [user, currentOrganization?.id, navigate, updateJob, trySyncFromDb]
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
