import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVideoGeneration } from './useVideoGeneration';
import type { VideoGenerationRequest, VideoProvider } from '@/types/videoGeneration';

/** Poll video_generations cho tới khi job đạt completed/failed (hoặc timeout). */
async function waitForJobCompletion(
  jobId: string,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<'completed' | 'failed' | 'timeout'> {
  const timeoutMs = opts.timeoutMs ?? 6 * 60 * 1000; // 6 phút
  const intervalMs = opts.intervalMs ?? 4000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase
      .from('video_generations')
      .select('status')
      .eq('id', jobId)
      .maybeSingle();
    if (!error && data) {
      if (data.status === 'completed') return 'completed';
      if (data.status === 'failed') return 'failed';
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return 'timeout';
}

export interface BatchScene {
  sceneNumber: number;
  prompt: string;
  duration?: number;
  aspect_ratio?: string;
}

export interface BatchDefaults {
  provider: VideoProvider;
  model?: string;
  aspect_ratio: string;
  resolution: string;
  duration: number;
  script_id: string;
  /** Forward để server inject character block + force Veo 3.1 + synth keyframe. */
  character_profile_ids?: string[];
  /** Forward sản phẩm để inject ref ảnh sản phẩm. */
  product_profile_ids?: string[];
}

export interface BatchProgress {
  total: number;
  done: number;
  currentSceneNumber: number | null;
  errors: Array<{ sceneNumber: number; message: string }>;
  status: 'idle' | 'running' | 'completed' | 'aborted';
}

const INITIAL: BatchProgress = {
  total: 0,
  done: 0,
  currentSceneNumber: null,
  errors: [],
  status: 'idle',
};

/**
 * Render tuần tự các scene chưa có clip completed.
 * - Tôn trọng quota: 402/429 → stop và toast upgrade.
 * - Mỗi scene chờ generateVideo enqueue xong rồi sang scene tiếp (không chờ render xong
 *   vì background poller sẽ cập nhật realtime). Tránh nhồi quá nhiều job cùng lúc.
 */
export function useScriptVideoBatch() {
  const { generateVideo } = useVideoGeneration();
  const [progress, setProgress] = useState<BatchProgress>(INITIAL);
  const [running, setRunning] = useState(false);

  const reset = useCallback(() => setProgress(INITIAL), []);

  const renderMissingScenes = useCallback(
    async (scenes: BatchScene[], defaults: BatchDefaults) => {
      if (scenes.length === 0) {
        toast.info('Tất cả scene đã được render hoặc đang xử lý.');
        return;
      }

      setRunning(true);
      setProgress({
        total: scenes.length,
        done: 0,
        currentSceneNumber: scenes[0]?.sceneNumber ?? null,
        errors: [],
        status: 'running',
      });

      let aborted = false;
      let done = 0;
      const errors: BatchProgress['errors'] = [];

      for (const scene of scenes) {
        if (aborted) break;
        setProgress((p) => ({ ...p, currentSceneNumber: scene.sceneNumber }));

        const request: VideoGenerationRequest = {
          provider: defaults.provider,
          model: defaults.model,
          prompt: scene.prompt,
          duration: scene.duration ?? defaults.duration,
          aspect_ratio: scene.aspect_ratio ?? defaults.aspect_ratio,
          resolution: defaults.resolution,
          script_id: defaults.script_id,
          scene_number: scene.sceneNumber,
          character_profile_id: defaults.character_profile_ids?.[0],
          character_profile_ids:
            defaults.character_profile_ids && defaults.character_profile_ids.length > 0
              ? defaults.character_profile_ids
              : undefined,
          product_profile_ids:
            defaults.product_profile_ids && defaults.product_profile_ids.length > 0
              ? defaults.product_profile_ids
              : undefined,
        };

        try {
          const job = await generateVideo(request);
          if (!job) {
            errors.push({ sceneNumber: scene.sceneNumber, message: 'Enqueue thất bại' });
          } else {
            // ⏳ Hướng 1: chờ clip này render xong trước khi sang scene tiếp
            // để server clip kế có thể chain từ thumbnail clip trước.
            const result = await waitForJobCompletion(job.id);
            if (result === 'failed') {
              errors.push({ sceneNumber: scene.sceneNumber, message: 'Render thất bại' });
            } else if (result === 'timeout') {
              errors.push({ sceneNumber: scene.sceneNumber, message: 'Timeout chờ render (>6 phút)' });
              // Không break — vẫn cho scene sau thử (sẽ fallback avatar nếu chain lookup miss)
            }
            done += 1;
            setProgress((p) => ({ ...p, done }));
          }
        } catch (err: any) {
          const message = err?.message ?? 'Lỗi không rõ';
          const code = err?.code ?? err?.status;

          // Quota / rate-limit → dừng batch ngay
          if (code === 402 || code === 429 || /quota|limit|hết hạn mức/i.test(message)) {
            aborted = true;
            errors.push({ sceneNumber: scene.sceneNumber, message });
            toast.error('Đã hết quota video', {
              description: 'Batch render đã dừng. Hãy nâng cấp gói hoặc chờ chu kỳ kế tiếp.',
              duration: 8000,
            });
            break;
          }

          errors.push({ sceneNumber: scene.sceneNumber, message });
          // Tiếp tục các scene khác (lỗi đơn lẻ không nên chặn cả batch)
        }

        // Nhỏ delay để tránh hammer edge function (200ms)
        await new Promise((r) => setTimeout(r, 200));
      }

      setProgress((p) => ({
        ...p,
        done,
        errors,
        status: aborted ? 'aborted' : 'completed',
        currentSceneNumber: null,
      }));
      setRunning(false);

      if (!aborted) {
        if (errors.length === 0) {
          toast.success(`Đã queue ${done}/${scenes.length} scene`, {
            description: 'Video sẽ tự xuất hiện khi render xong.',
          });
        } else {
          toast.warning(`Queue ${done}/${scenes.length} scene, ${errors.length} lỗi`, {
            description: errors[0]?.message?.slice(0, 120),
          });
        }
      }
    },
    [generateVideo],
  );

  return { progress, running, renderMissingScenes, reset };
}
