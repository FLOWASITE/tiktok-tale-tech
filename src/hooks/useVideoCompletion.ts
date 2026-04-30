// useVideoCompletion — orchestrator end-to-end cho short-form (≤90s).
// Khác bản trước: chạy CONTINUOUS (không return giữa chừng), parallel scenes,
// auto-poll qua state realtime của useVideoGeneration, auto-subtitle bước 4,
// provider mặc định Seedance (rẻ ~10× Veo cho social).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScriptToVideo } from '@/contexts/ScriptToVideoContext';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { useAudioStudio } from '@/hooks/useAudioStudio';
import { useVideoRender, type RenderRequest } from '@/hooks/useVideoRender';
import { toast } from 'sonner';

export type WizardStepId = 'scenes' | 'voiceover' | 'bgm' | 'subtitle' | 'render';
export type WizardStepStatus = 'pending' | 'partial' | 'done' | 'running' | 'failed';

export interface WizardStep {
  id: WizardStepId;
  label: string;
  status: WizardStepStatus;
  detail: string;
}

export type ProviderTier = 'fast' | 'hero';
const PROVIDER_TIER_MAP: Record<ProviderTier, { provider: 'poyo' | 'geminigen'; model?: string; label: string }> = {
  fast: { provider: 'poyo', model: 'poyo/seedance-2', label: 'Tiết kiệm (Seedance)' },
  hero: { provider: 'geminigen', model: 'geminigen/veo-3-fast', label: 'Chất lượng (Veo 3 Fast)' },
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const VOICE_OPTIONS_DEFAULT_ID = 'EXAVITQu4vr4xnSDxMaL';

export function useVideoCompletion() {
  const { activeScript } = useScriptToVideo();
  const { generations, generateVideo, fetchGenerations } = useVideoGeneration();
  const { assets, generateVoiceover, generateBGM, generateSubtitles } = useAudioStudio();
  const { submitRender, submitting: rendering } = useVideoRender();

  const [running, setRunning] = useState<WizardStepId | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [tier, setTier] = useState<ProviderTier>('fast');
  // Refs để vòng polling đọc state mới nhất
  const generationsRef = useRef(generations);
  const assetsRef = useRef(assets);
  useEffect(() => { generationsRef.current = generations; }, [generations]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);

  // ───────── Derived state ─────────
  const scriptClips = useMemo(() => {
    if (!activeScript) return [];
    return generations
      .filter((g) => g.script_id === activeScript.id && g.status === 'completed' && g.video_url)
      .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
  }, [generations, activeScript]);

  const scriptScenesCount = activeScript?.scenes.length ?? 0;
  const completedScenesCount = scriptClips.length;

  // Audio asset SCOPE theo script_id (mới — bảng đã có cột script_id)
  const scriptVoiceover = useMemo(() => {
    if (!activeScript) return null;
    return assets.find((a) => a.asset_type === 'voiceover' && a.audio_url && a.script_id === activeScript.id) ?? null;
  }, [assets, activeScript]);
  const scriptBGM = useMemo(() => {
    if (!activeScript) return null;
    return assets.find((a) => a.asset_type === 'music' && a.audio_url && a.script_id === activeScript.id) ?? null;
  }, [assets, activeScript]);
  const scriptSubtitle = useMemo(() => {
    if (!activeScript) return null;
    return assets.find((a) => a.asset_type === 'subtitle' && a.srt_content && a.script_id === activeScript.id) ?? null;
  }, [assets, activeScript]);

  const isShortForm = (activeScript?.totalDuration ?? 0) <= 90;

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
        status: running === 'voiceover' ? 'running' : scriptVoiceover ? 'done' : 'pending',
        detail: scriptVoiceover ? `${Math.round(scriptVoiceover.duration_seconds ?? 0)}s` : 'Chưa tạo',
      },
      {
        id: 'bgm',
        label: 'Nhạc nền',
        status: running === 'bgm' ? 'running' : scriptBGM ? 'done' : 'pending',
        detail: scriptBGM ? `${Math.round(scriptBGM.duration_seconds ?? 0)}s` : 'Chưa tạo',
      },
      {
        id: 'subtitle',
        label: 'Phụ đề',
        status: running === 'subtitle' ? 'running' : scriptSubtitle ? 'done' : 'pending',
        detail: scriptSubtitle ? 'SRT sẵn sàng' : isShortForm ? 'Tự tạo sau render' : 'Chưa tạo',
      },
      {
        id: 'render',
        label: 'Render MP4',
        status: running === 'render' ? 'running' : 'pending',
        detail: rendering ? 'Đang submit…' : 'Chưa render',
      },
    ];
  }, [activeScript, scriptScenesCount, completedScenesCount, scriptVoiceover, scriptBGM, scriptSubtitle, running, rendering, isShortForm]);

  const allReady = completedScenesCount > 0 && completedScenesCount === scriptScenesCount;

  // Tổng % tiến độ: scenes 50% + voice 15% + bgm 10% + render 25%
  const overallProgress = useMemo(() => {
    if (!activeScript) return 0;
    const scenePct = scriptScenesCount > 0 ? (completedScenesCount / scriptScenesCount) * 50 : 0;
    const voPct = scriptVoiceover ? 15 : 0;
    const bgmPct = scriptBGM ? 10 : 0;
    const renderPct = running === 'render' ? 12 : 0;
    return Math.min(100, Math.round(scenePct + voPct + bgmPct + renderPct));
  }, [activeScript, scriptScenesCount, completedScenesCount, scriptVoiceover, scriptBGM, running]);

  // ETA tính dynamic (giây)
  const etaSeconds = useMemo(() => {
    if (!activeScript) return 0;
    const missing = Math.max(0, scriptScenesCount - completedScenesCount);
    return missing * 90 + (scriptVoiceover ? 0 : 25) + (scriptBGM ? 0 : 30) + 120;
  }, [activeScript, scriptScenesCount, completedScenesCount, scriptVoiceover, scriptBGM]);

  /**
   * Đợi đến khi tất cả scenes của script `scriptId` completed (hoặc timeout).
   * Đọc state qua ref để luôn fresh.
   */
  const waitForAllScenes = useCallback(async (
    scriptId: string,
    expected: number,
    timeoutMs = 8 * 60_000,
  ): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const done = generationsRef.current
        .filter((g) => g.script_id === scriptId && g.status === 'completed' && g.video_url).length;
      if (done >= expected) return true;
      // refetch định kỳ phòng realtime miss
      if ((Date.now() - start) % 15_000 < 5000) {
        await fetchGenerations();
      }
      await sleep(5000);
    }
    return false;
  }, [fetchGenerations]);

  /**
   * Auto chạy hết — CONTINUOUS, không cần user bấm lần 2.
   * 1. Submit parallel tất cả missing scenes (provider tự queue)
   * 2. Đợi tất cả completed (max 8 phút)
   * 3. Tạo VO + BGM song song nếu thiếu
   * 4. Submit render → poller tự chạy
   * 5. Background: sau khi render xong, generate-subtitles auto-resolve clip mới nhất
   */
  const runAuto = useCallback(async (opts?: { voiceText?: string; bgmPrompt?: string }) => {
    if (!activeScript) {
      toast.error('Chưa có kịch bản đang hoạt động.');
      return;
    }
    setLastError(null);
    const tierCfg = PROVIDER_TIER_MAP[tier];

    // ───────── Bước 1: Quay missing scenes (PARALLEL) ─────────
    const missing = activeScript.scenes.filter(
      (s) => !scriptClips.find((c) => c.scene_number === s.sceneNumber),
    );
    if (missing.length > 0) {
      setRunning('scenes');
      try {
        const sceneAspect: '9:16' | '16:9' | '1:1' =
          activeScript.aspectRatio === '16:9'
            ? '16:9'
            : activeScript.aspectRatio === '1:1'
              ? '1:1'
              : '9:16'; // 2:3 / 4:5 → tạo 9:16 rồi smart-crop khi stitch

        const results = await Promise.allSettled(
          missing.map((scene) =>
            generateVideo({
              provider: tierCfg.provider,
              model: tierCfg.model,
              prompt: scene.prompt,
              duration: Math.max(3, Math.min(scene.duration ?? 5, 10)),
              aspect_ratio: sceneAspect,
              resolution: '1080p',
              script_id: activeScript.id,
              scene_number: scene.sceneNumber,
            }),
          ),
        );
        const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
        if (failed.length === missing.length) {
          throw new Error('Tất cả scene submit thất bại — kiểm tra quota hoặc API key.');
        }
        if (failed.length > 0) {
          toast.warning(`Submit ${missing.length - failed.length}/${missing.length} scene. ${failed.length} lỗi sẽ thử lại sau.`);
        } else {
          toast.success(`Đã submit ${missing.length} scene song song. Đang chờ render…`);
        }

        // Đợi tất cả completed (qua realtime + polling fallback)
        const ok = await waitForAllScenes(activeScript.id, scriptScenesCount);
        if (!ok) {
          setLastError('Hết 8 phút mà vẫn chưa đủ scene. Hãy mở lại Wizard sau ít phút để tiếp tục.');
          toast.warning('Quá giờ chờ scene — thử lại sau khi clip xong (xem tab Thư viện).');
          setRunning(null);
          return;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Lỗi submit scenes';
        setLastError(msg);
        toast.error(msg);
        setRunning(null);
        return;
      }
    }

    // ───────── Bước 2 + 3: Audio (PARALLEL VO + BGM) ─────────
    const audioTasks: Promise<unknown>[] = [];
    if (!scriptVoiceover && opts?.voiceText) {
      setRunning('voiceover');
      audioTasks.push(generateVoiceover(opts.voiceText, VOICE_OPTIONS_DEFAULT_ID, 'vi', activeScript.id));
    }
    if (!scriptBGM && opts?.bgmPrompt) {
      const bgmDur = Math.min(120, Math.max(5, activeScript.totalDuration ?? 30));
      audioTasks.push(generateBGM(opts.bgmPrompt, bgmDur, activeScript.id));
    }
    if (audioTasks.length > 0) {
      try {
        await Promise.allSettled(audioTasks);
      } catch (e) {
        console.warn('[wizard] audio partial fail', e);
      }
    }

    // ───────── Bước 4: Render ─────────
    setRunning('render');
    try {
      // Re-read clips từ ref để chắc fresh
      const finalClips = generationsRef.current
        .filter((g) => g.script_id === activeScript.id && g.status === 'completed' && g.video_url)
        .sort((a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0));
      const orderedUrls = finalClips.map((c) => c.video_url!).filter(Boolean);
      if (orderedUrls.length === 0) {
        throw new Error('Không tìm thấy clip nào để render.');
      }

      const finalVO = scriptVoiceover ?? assetsRef.current.find(
        (a) => a.asset_type === 'voiceover' && a.audio_url && a.script_id === activeScript.id,
      );
      const finalBGM = scriptBGM ?? assetsRef.current.find(
        (a) => a.asset_type === 'music' && a.audio_url && a.script_id === activeScript.id,
      );
      const finalSub = scriptSubtitle ?? assetsRef.current.find(
        (a) => a.asset_type === 'subtitle' && a.srt_content && a.script_id === activeScript.id,
      );

      const req: RenderRequest = {
        clip_urls: orderedUrls,
        voiceover_url: finalVO?.audio_url ?? undefined,
        bgm_url: finalBGM?.audio_url ?? undefined,
        bgm_volume: 0.2,
        subtitle_srt: finalSub?.srt_content ?? undefined,
        // Vertical formats → bật burn mặc định khi đã có SRT
        burn_subtitles: !!finalSub?.srt_content,
        aspect_ratio: activeScript.aspectRatio ?? '9:16',
        script_id: activeScript.id,
        source_clip_ids: finalClips.map((c) => c.id),
      };
      const job = await submitRender(req);
      if (!job) throw new Error('Submit render thất bại');
      toast.success('Đã gửi render! Sẽ thông báo khi có MP4.');

      // Background auto-subtitle nếu chưa có (không block UI)
      if (!finalSub && isShortForm) {
        // Fire-and-forget: dùng clip đầu tiên làm media
        generateSubtitles({ media_url: orderedUrls[0], script_id: activeScript.id })
          .catch((e) => console.warn('[wizard] auto-subtitle fail', e));
      }
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
    scriptScenesCount,
    scriptVoiceover,
    scriptBGM,
    scriptSubtitle,
    tier,
    isShortForm,
    generateVideo,
    generateVoiceover,
    generateBGM,
    generateSubtitles,
    submitRender,
    waitForAllScenes,
  ]);

  return {
    activeScript,
    steps,
    running,
    lastError,
    allReady,
    completedScenesCount,
    scriptScenesCount,
    overallProgress,
    etaSeconds,
    isShortForm,
    tier,
    setTier,
    providerLabel: PROVIDER_TIER_MAP[tier].label,
    runAuto,
  };
}
