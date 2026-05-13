import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
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
  /** Linked DB row in generation_tasks (for cross-tab/reload persistence) */
  taskId?: string | null;
  /** Carousel UUID once backend has saved it */
  carouselId?: string | null;
  /** Job kind — 'prompt' is text/slide generation, 'image' is image-batch */
  kind: 'prompt' | 'image';
  /** True if this job was rebuilt from generation_tasks after page reload */
  rehydrated?: boolean;
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
    let cancelledTaskId: string | null = null;
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === id && j.status === 'generating') {
          cancelledTaskId = j.taskId || null;
          return {
            ...j,
            status: 'cancelled',
            phase: 'cancelled',
            currentStep: 'Đã hủy',
            error: 'Cancelled by user',
            abortReason: 'user',
            lastEventAt: Date.now(),
          };
        }
        return j;
      })
    );
    if (cancelledTaskId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase.from('generation_tasks') as any)
        .update({
          status: 'cancelled',
          progress_message: 'Đã hủy',
          updated_at: new Date().toISOString(),
        })
        .eq('id', cancelledTaskId)
        .then(({ error }: { error: unknown }) => {
          if (error) console.warn('[CarouselGen] cancel persist failed:', error);
        });
    }
    toast.info('Đã hủy quá trình tạo carousel');
  }, []);

  /** Try to fetch the carousel row by id (preferred) or topic+timestamp window (fallback) */
  const trySyncFromDb = useCallback(
    async (formData: CarouselFormData, startedAt: number, knownId?: string | null): Promise<Carousel | null> => {
      try {
        if (!user) return null;
        // Preferred path: backend emitted carousel_saved with id — fetch by id directly
        if (knownId) {
          let q = supabase.from('carousels').select('*').eq('id', knownId).limit(1);
          if (currentOrganization?.id) q = q.eq('organization_id', currentOrganization.id);
          const { data } = await q.maybeSingle();
          if (data) return data as any;
        }
        // Fallback: match by topic + user + tight created_at window
        let q = supabase
          .from('carousels')
          .select('*')
          .eq('topic', formData.topic)
          .eq('user_id', user.id)
          .gte('created_at', new Date(startedAt - 5_000).toISOString())
          .lte('created_at', new Date(startedAt + 10 * 60_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        if (currentOrganization?.id) q = q.eq('organization_id', currentOrganization.id);
        const { data } = await q.maybeSingle();
        return (data as any) || null;
      } catch (err) {
        console.warn('[CarouselGen] DB sync fallback query failed:', err);
        return null;
      }
    },
    [user, currentOrganization?.id]
  );

  const generateCarousel = useCallback(
    async (formData: CarouselFormData): Promise<Carousel | null> => {
      if (!user) {
        toast.error('Vui lòng đăng nhập để tạo carousel');
        return null;
      }

      // Dedup key: normalized topic + style + preset + brand + user.
      // sessionStorage TTL 90s survives a fast refresh (without it the
      // in-memory ref is wiped and the user can spawn duplicates as observed
      // in prod 12/05 — 8 carousels in 7 minutes for the same intent).
      const normTopic = (formData.topic || '').trim().toLowerCase().slice(0, 80);
      const dedupKey = `carousel:${user.id}:${formData.brandTemplateId || 'nobrand'}:${normTopic}:${formData.carouselStyle}:${formData.visualPreset}`;
      if (inFlightRef.current.has(dedupKey)) {
        console.log('[CarouselGen] Blocked duplicate invoke (in-memory)');
        toast.info('Đang tạo carousel cho chủ đề này — vui lòng đợi.');
        return null;
      }
      try {
        const stored = sessionStorage.getItem(dedupKey);
        if (stored && Date.now() - parseInt(stored, 10) < 90_000) {
          console.log('[CarouselGen] Blocked duplicate invoke (session, <90s)');
          toast.info('Bạn vừa tạo carousel tương tự. Vui lòng đợi 90s rồi thử lại.');
          return null;
        }
        sessionStorage.setItem(dedupKey, String(Date.now()));
      } catch { /* sessionStorage may be disabled */ }
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
        revealingSlideMeta: null,
        kind: 'prompt',
        taskId: null,
        carouselId: null,
      };
      setJobs((prev) => [job, ...prev]);

      // Persist task row up front so it survives reload / tab close
      let dbTaskId: string | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: taskRow, error: taskErr } = await (supabase.from('generation_tasks') as any)
          .insert({
            user_id: user.id,
            organization_id: currentOrganization?.id || null,
            task_type: 'carousel_prompt',
            status: 'generating',
            progress: 0,
            progress_message: 'Đang khởi tạo...',
            current_step: 'init',
            input_params: {
              ...formData,
              jobId,
              startedAt,
            },
          })
          .select('id')
          .single();
        if (!taskErr && taskRow?.id) {
          dbTaskId = taskRow.id as string;
          updateJob(jobId, { taskId: dbTaskId });
        } else if (taskErr) {
          console.warn('[CarouselGen] Could not persist task row:', taskErr);
        }
      } catch (err) {
        console.warn('[CarouselGen] Persist task error:', err);
      }

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

        // Throttled DB sync of progress → generation_tasks (so reload sees latest state)
        let lastDbSync = 0;
        const DB_SYNC_INTERVAL_MS = 1500;
        const syncTaskRow = async (
          patch: { progress?: number; current_step?: string; progress_message?: string; status?: string; error_message?: string; result_id?: string | null; result_type?: string | null },
          force = false,
        ) => {
          if (!dbTaskId) return;
          const now = Date.now();
          if (!force && now - lastDbSync < DB_SYNC_INTERVAL_MS) return;
          lastDbSync = now;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('generation_tasks') as any)
              .update({ ...patch, updated_at: new Date().toISOString() })
              .eq('id', dbTaskId);
          } catch (err) {
            console.warn('[CarouselGen] sync task row failed:', err);
          }
        };

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
        let savedCarouselId: string | null = null;
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
              void syncTaskRow({
                progress: typeof event.percent === 'number' ? event.percent : undefined,
                current_step: phase,
                progress_message: event.message || event.step || 'Đang xử lý...',
              });
            } else if (event.type === 'carousel_saved') {
              if (event.carouselId) {
                savedCarouselId = String(event.carouselId);
                updateJob(jobId, { carouselId: savedCarouselId });
                void syncTaskRow({ result_id: savedCarouselId, result_type: 'carousels' }, true);
              }
            } else if (event.type === 'slide_start') {
              const newSlide = event.slideNumber ?? 0;
              const prevMeta = job.revealingSlideMeta;
              // Preserve prior meta if same slideNumber (avoid flicker between slide_start → slide_preview)
              const nextMeta = prevMeta && prevMeta.slideNumber === newSlide
                ? prevMeta
                : { slideNumber: newSlide };
              updateJob(jobId, {
                phase: 'revealing',
                revealingSlide: event.slideNumber ?? null,
                revealingSlideMeta: nextMeta,
                currentStep: event.message || `Prompt cho Slide ${event.slideNumber}`,
                totalSlides: event.totalSlides ?? job.totalSlides,
              });
            } else if (event.type === 'slide_preview') {
              const prevMeta = job.revealingSlideMeta;
              updateJob(jobId, {
                phase: 'revealing',
                revealingSlide: event.slideNumber ?? null,
                revealingSlideMeta: {
                  slideNumber: event.slideNumber ?? 0,
                  // Merge with prior to avoid losing fields if events arrive out of order
                  objective: event.objective ?? prevMeta?.objective,
                  textPreview: event.textPreview ?? prevMeta?.textPreview,
                  promptPreview: event.promptPreview ?? prevMeta?.promptPreview,
                },
                currentStep: event.objective || event.message || `Đang viết slide ${event.slideNumber}...`,
                totalSlides: event.totalSlides ?? job.totalSlides,
              });
            } else if (event.type === 'slide_done') {
              if (event.slide) partial.push(event.slide as CarouselSlide);
              updateJob(jobId, {
                progress: event.percent ?? 0,
                currentStep: event.message || `Slide ${event.completedSlides}/${event.totalSlides}`,
                phase: 'revealing',
                revealingSlide: null,
                revealingSlideMeta: null,
                partialSlides: [...partial],
                completedSlides: event.completedSlides ?? partial.length,
                totalSlides: event.totalSlides ?? partial.length,
              });
              void syncTaskRow({
                progress: event.percent ?? undefined,
                progress_message: event.message || `Slide ${event.completedSlides}/${event.totalSlides}`,
                current_step: 'revealing',
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
                carouselId: finalCarousel.id,
                progress: 100,
                currentStep: 'Hoàn thành!',
                partialSlides: finalCarousel.slides_content || partial,
                completedSlides: (finalCarousel.slides_content || partial).length,
                revealingSlide: null,
                revealingSlideMeta: null,
              });
              void syncTaskRow({
                status: 'completed',
                progress: 100,
                progress_message: 'Hoàn thành',
                current_step: 'done',
                result_id: finalCarousel.id || savedCarouselId,
                result_type: 'carousels',
              }, true);
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
              void syncTaskRow({ status: 'failed', error_message: m }, true);
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
            const synced = await trySyncFromDb(formData, startedAt, savedCarouselId);
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

  // ────────────────────────────────────────────
  // Rehydrate active background tasks on mount
  // ────────────────────────────────────────────
  const rehydratedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || rehydratedRef.current) return;
    rehydratedRef.current = true;

    const rebuildJob = (row: Record<string, unknown>): CarouselGenerationJob | null => {
      const params = (row.input_params as Record<string, unknown>) || {};
      const kind = row.task_type === 'carousel_image' ? 'image' : 'prompt';
      const formData =
        kind === 'prompt'
          ? (params as unknown as CarouselFormData)
          : ({
              topic: (params as { carouselTopic?: string }).carouselTopic || 'Carousel',
              platform: ((params as { platform?: string }).platform as CarouselFormData['platform']) || 'instagram',
              slideCount: ((params as { slides?: unknown[] }).slides?.length as number) || 0,
              aiTool: 'ideogram',
              brandName: '',
              brandGuideline: '',
              includeLogo: false,
              carouselStyle: ((params as { carouselStyle?: string }).carouselStyle as CarouselFormData['carouselStyle']) || 'seamless',
              visualPreset: ((params as { visualPreset?: string }).visualPreset as CarouselFormData['visualPreset']) || 'minimalist',
            } as CarouselFormData);
      const totalSlides =
        (formData.slideCount as number) ||
        ((params as { slides?: unknown[] }).slides?.length as number) ||
        0;
      const startedAtMs = row.created_at ? new Date(row.created_at as string).getTime() : Date.now();
      return {
        id: `task_${row.id}`,
        formData,
        status: 'generating',
        startedAt: startedAtMs,
        progress: typeof row.progress === 'number' ? (row.progress as number) : 0,
        currentStep: (row.progress_message as string) || 'Đang chạy nền...',
        phase: 'ai_generating',
        partialSlides: [],
        totalSlides,
        completedSlides: 0,
        lastEventAt: Date.now(),
        abortReason: null,
        revealingSlide: null,
        revealingSlideMeta: null,
        kind,
        taskId: row.id as string,
        carouselId: (row.result_id as string) || null,
        rehydrated: true,
      };
    };

    (async () => {
      try {
        const sinceIso = new Date(Date.now() - 30 * 60_000).toISOString();
        const { data, error } = await supabase
          .from('generation_tasks')
          .select('id, task_type, status, progress, progress_message, current_step, input_params, result_id, created_at, updated_at')
          .eq('user_id', user.id)
          .in('task_type', ['carousel_prompt', 'carousel_image'])
          .in('status', ['pending', 'generating'])
          .gte('updated_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) {
          console.warn('[CarouselGen] Rehydrate query failed:', error);
          return;
        }
        if (!data || data.length === 0) return;
        const rebuilt = data
          .map((row) => rebuildJob(row as Record<string, unknown>))
          .filter((x): x is CarouselGenerationJob => Boolean(x));
        if (rebuilt.length === 0) return;
        setJobs((prev) => {
          // De-dup against any in-memory jobs already started this session
          const taskIds = new Set(prev.map((j) => j.taskId).filter(Boolean));
          const merged = [...prev];
          for (const r of rebuilt) {
            if (r.taskId && !taskIds.has(r.taskId)) merged.push(r);
          }
          return merged;
        });
        toast.info(
          rebuilt.length === 1
            ? '🎨 Có 1 carousel đang chạy nền — tiếp tục theo dõi'
            : `🎨 Có ${rebuilt.length} carousel đang chạy nền — tiếp tục theo dõi`,
          { duration: 4000 },
        );
      } catch (err) {
        console.warn('[CarouselGen] Rehydrate error:', err);
      }
    })();
  }, [user?.id]);

  // ────────────────────────────────────────────
  // Realtime: keep jobs in sync with generation_tasks DB
  // (covers reload state, image batch progress, cross-tab updates)
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`carousel_gen_tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (!row) return;
          const taskType = row.task_type as string;
          if (taskType !== 'carousel_prompt' && taskType !== 'carousel_image') return;
          const taskId = row.id as string;
          const status = row.status as string;

          setJobs((prev) => {
            const exists = prev.some((j) => j.taskId === taskId);
            if (!exists && (status === 'pending' || status === 'generating')) {
              // Auto-add image-batch job that wasn't in memory (e.g. launched
              // from another tab or before the provider mounted).
              if (taskType === 'carousel_image') {
                const params = (row.input_params as Record<string, unknown>) || {};
                const totalSlides = ((params as { slides?: unknown[] }).slides?.length as number) || 0;
                const startedAtMs = row.created_at ? new Date(row.created_at as string).getTime() : Date.now();
                return [
                  {
                    id: `task_${taskId}`,
                    formData: {
                      topic: (params as { carouselTopic?: string }).carouselTopic || 'Carousel',
                      platform: ((params as { platform?: string }).platform as CarouselFormData['platform']) || 'instagram',
                      slideCount: totalSlides,
                      aiTool: 'ideogram' as const,
                      brandName: '',
                      brandGuideline: '',
                      includeLogo: false,
                      carouselStyle: 'seamless' as const,
                      visualPreset: 'minimalist' as const,
                    },
                    status: 'generating',
                    startedAt: startedAtMs,
                    progress: typeof row.progress === 'number' ? (row.progress as number) : 0,
                    currentStep: (row.progress_message as string) || 'Đang tạo ảnh...',
                    phase: 'image_generating',
                    partialSlides: [],
                    totalSlides,
                    completedSlides: 0,
                    lastEventAt: Date.now(),
                    abortReason: null,
                    revealingSlide: null,
                    revealingSlideMeta: null,
                    kind: 'image',
                    taskId,
                    carouselId: (row.result_id as string) || (params as { carouselId?: string }).carouselId || null,
                  } satisfies CarouselGenerationJob,
                  ...prev,
                ];
              }
            }
            return prev.map((j) => {
              if (j.taskId !== taskId) return j;
              if (status === 'completed') {
                return {
                  ...j,
                  status: 'done',
                  phase: 'done',
                  progress: 100,
                  currentStep: 'Hoàn thành',
                  carouselId: (row.result_id as string) || j.carouselId,
                  lastEventAt: Date.now(),
                };
              }
              if (status === 'failed') {
                return {
                  ...j,
                  status: 'error',
                  phase: 'error',
                  error: (row.error_message as string) || j.error || 'Tạo thất bại',
                  lastEventAt: Date.now(),
                };
              }
              if (status === 'cancelled') {
                return {
                  ...j,
                  status: 'cancelled',
                  phase: 'cancelled',
                  currentStep: 'Đã hủy',
                  lastEventAt: Date.now(),
                };
              }
              // Active: merge progress
              return {
                ...j,
                progress: typeof row.progress === 'number' ? (row.progress as number) : j.progress,
                currentStep: (row.progress_message as string) || j.currentStep,
                lastEventAt: Date.now(),
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch { /* noop */ }
    };
  }, [user?.id]);

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
