// useVideoCompletion — tổng hợp readiness của 1 ActiveScript để Wizard chạy end-to-end
import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useAudioStudio } from '@/hooks/useAudioStudio';
import { useVideoRender, type RenderRequest } from '@/hooks/useVideoRender';
import { toast } from 'sonner';

export type WizardStepId = 'scenes' | 'voiceover' | 'bgm' | 'render';
export type WizardStepStatus = 'pending' | 'partial' | 'done' | 'running' | 'failed';

export interface WizardStep {
  id: WizardStepId;
  label: string;
  status: WizardStepStatus;
  detail: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useVideoCompletion() {
  const { activeScript } = useScriptToVideo();
  const { generations, generateVideo, fetchGenerations } = useVideoGeneration();
  const { assets, generateVoiceover, generateBGM, generateSubtitles } = useAudioStudio();
  const { submitRender, submitting: rendering } = useVideoRender();

  const [running, setRunning] = useState<WizardStepId | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Clips của script (theo scene_number) — completed only
  const scriptClips = useMemo(() => {
    if (!activeScript) return [];
    return generations
      .filter((g) => g.script_id === activeScript.id && g.status === 'completed' && g.video_url)
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
  }, [generations, activeScript]);

  const scriptScenesCount = activeScript?.scenes.length ?? 0;
  const completedScenesCount = scriptClips.length;

  // Audio assets (mới nhất per type — script-scoped không có cột script_id nên xài "mới nhất tổng")
  const latestVoiceover = useMemo(
    () => assets.find((a) => a.asset_type === 'voiceover' && a.audio_url) ?? null,
    [assets],
  );
  const latestBGM = useMemo(
    () => assets.find((a) => a.asset_type === 'music' && a.audio_url) ?? null,
    [assets],
  );

  const steps: WizardStep[] = useMemo(() => {
    const sceneStatus: WizardStepStatus = !activeScript
      ? 'pending'
      : completedScenesCount === 0
        ? 'pending'
        : completedScenesCount < scriptScenesCount
          ? 'partial'
          : 'done';
    return [
      {
        id: 'scenes',
        label: 'Quay scenes',
        status: running === 'scenes' ? 'running' : sceneStatus,
        detail: activeScript
          ? `${completedScenesCount}/${scriptScenesCount} cảnh`
          : 'Chưa có kịch bản',
      },
      {
        id: 'voiceover',
        label: 'Voiceover',
        status: running === 'voiceover' ? 'running' : latestVoiceover ? 'done' : 'pending',
        detail: latestVoiceover
          ? `${Math.round(latestVoiceover.duration_seconds ?? 0)}s`
          : 'Chưa tạo',
      },
      {
        id: 'bgm',
        label: 'Nhạc nền',
        status: running === 'bgm' ? 'running' : latestBGM ? 'done' : 'pending',
        detail: latestBGM
          ? `${Math.round(latestBGM.duration_seconds ?? 0)}s`
          : 'Chưa tạo',
      },
      {
        id: 'render',
        label: 'Render MP4',
        status: running === 'render' ? 'running' : 'pending',
        detail: rendering ? 'Đang submit…' : 'Chưa render',
      },
    ];
  }, [activeScript, scriptScenesCount, completedScenesCount, latestVoiceover, latestBGM, running, rendering]);

  const allReady = completedScenesCount > 0 && completedScenesCount === scriptScenesCount;

  /**
   * Auto chạy hết: 
   *  1. Quay missing scenes (nếu có) → nhưng KHÔNG đợi tất cả completed inline (poller xử lý nền).
   *     Wizard sẽ cảnh báo user mở lại sau khi clip xong.
   *  2. Khi user trigger "auto" và đã có đủ clip → tạo VO + BGM song song nếu thiếu.
   *  3. Submit render với clips theo thứ tự scene_number.
   */
  const runAuto = useCallback(async (opts?: { voiceText?: string; bgmPrompt?: string }) => {
    if (!activeScript) {
      toast.error('Chưa có kịch bản đang hoạt động.');
      return;
    }
    setLastError(null);

    // Bước 1 — quay missing scenes (fire-and-forget; user sẽ chờ poller)
    const missing = activeScript.scenes.filter(
      (s) => !scriptClips.find((c) => c.scene_number === s.sceneNumber),
    );
    if (missing.length > 0) {
      setRunning('scenes');
      try {
        for (const scene of missing) {
          // Provider Veo/Seedance chỉ accept 9/16/1; 2:3/4:5 sinh ở 9:16 rồi crop khi stitch
          const sceneAspect: '9:16' | '16:9' | '1:1' =
            activeScript.aspectRatio === '16:9'
              ? '16:9'
              : activeScript.aspectRatio === '1:1'
                ? '1:1'
                : '9:16';
          const res = await generateVideo({
            provider: 'geminigen',
            prompt: scene.prompt,
            duration: Math.max(3, Math.min(scene.duration ?? 5, 10)),
            aspect_ratio: sceneAspect,
            resolution: '1080p',
            script_id: activeScript.id,
            scene_number: scene.sceneNumber,
          });
          if (!res) throw new Error(`Submit scene ${scene.sceneNumber} thất bại`);
          await sleep(800); // tránh rate-limit provider
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi submit scenes';
        setLastError(msg);
        toast.error(msg);
        setRunning(null);
        return;
      }
      setRunning(null);
      toast.info(
        `Đã submit ${missing.length} scene. Mỗi clip mất 1-3 phút. Quay lại bấm "Auto chạy hết" sau khi tất cả ✅.`,
      );
      await fetchGenerations();
      return; // dừng — user sẽ mở lại
    }

    // Bước 2 — Audio (chỉ tạo nếu chưa có)
    if (!latestVoiceover && opts?.voiceText) {
      setRunning('voiceover');
      const vo = await generateVoiceover(opts.voiceText, VOICE_OPTIONS_DEFAULT_ID);
      if (!vo) {
        setLastError('Tạo voiceover thất bại');
        setRunning(null);
        return;
      }
    }
    if (!latestBGM && opts?.bgmPrompt) {
      setRunning('bgm');
      const bgmDur = Math.min(120, activeScript.totalDuration ?? 30);
      const bgm = await generateBGM(opts.bgmPrompt, bgmDur);
      if (!bgm) {
        setLastError('Tạo BGM thất bại');
        setRunning(null);
        return;
      }
    }
    setRunning(null);

    // Bước 3 — Render
    setRunning('render');
    try {
      const orderedUrls = scriptClips.map((c) => c.video_url!).filter(Boolean);
      // Re-fetch latest assets sau khi tạo (state có thể đã cập nhật rồi)
      const voUrl = (latestVoiceover ?? assets.find((a) => a.asset_type === 'voiceover' && a.audio_url))?.audio_url ?? undefined;
      const bgmUrl = (latestBGM ?? assets.find((a) => a.asset_type === 'music' && a.audio_url))?.audio_url ?? undefined;
      const req: RenderRequest = {
        clip_urls: orderedUrls,
        voiceover_url: voUrl,
        bgm_url: bgmUrl,
        bgm_volume: 0.2,
        burn_subtitles: false, // SRT generate sau khi có MP4
        aspect_ratio: activeScript.aspectRatio ?? '9:16',
        script_id: activeScript.id,
        source_clip_ids: scriptClips.map((c) => c.id),
      };
      const job = await submitRender(req);
      if (!job) throw new Error('Submit render thất bại');
      toast.success('Đã gửi render! Sẽ thông báo khi có MP4.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi render';
      setLastError(msg);
      toast.error(msg);
    } finally {
      setRunning(null);
    }
  }, [
    activeScript,
    scriptClips,
    latestVoiceover,
    latestBGM,
    assets,
    generateVideo,
    generateVoiceover,
    generateBGM,
    submitRender,
    fetchGenerations,
  ]);

  return {
    activeScript,
    steps,
    running,
    lastError,
    allReady,
    completedScenesCount,
    scriptScenesCount,
    runAuto,
  };
}

// Default voice — keep in sync with VOICE_OPTIONS[0] in useAudioStudio
const VOICE_OPTIONS_DEFAULT_ID = 'EXAVITQu4vr4xnSDxMaL';
