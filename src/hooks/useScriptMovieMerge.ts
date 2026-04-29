import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface MergeClipInput {
  id: string;
  video_url: string;
  scene_number: number;
}

interface MergeOptions {
  scriptId: string;
  organizationId?: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  voiceoverUrl?: string;
  bgmUrl?: string;
  subtitleSrt?: string;
  burnSubtitles?: boolean;
}

/**
 * Ghép các scene clip thành 1 phim hoàn chỉnh thông qua Creatomate.
 * Edge function `render-video-creatomate` đã xử lý quota + persistence.
 */
export function useScriptMovieMerge() {
  const [merging, setMerging] = useState(false);

  const mergeMovie = useCallback(
    async (orderedClips: MergeClipInput[], opts: MergeOptions) => {
      if (orderedClips.length < 2) {
        toast.info('Cần ít nhất 2 scene đã render để ghép phim.');
        return null;
      }

      // Đảm bảo đúng thứ tự scene
      const sorted = [...orderedClips].sort((a, b) => a.scene_number - b.scene_number);

      setMerging(true);
      const tId = toast.loading(`Đang ghép ${sorted.length} scene thành phim…`, {
        description: 'Quá trình thường mất 30–90 giây.',
      });

      try {
        const { data, error } = await supabase.functions.invoke('render-video-creatomate', {
          body: {
            script_id: opts.scriptId,
            organization_id: opts.organizationId,
            source_clip_ids: sorted.map((c) => c.id),
            clip_urls: sorted.map((c) => c.video_url),
            aspect_ratio: opts.aspectRatio ?? '9:16',
            voiceover_url: opts.voiceoverUrl,
            bgm_url: opts.bgmUrl,
            subtitle_srt: opts.subtitleSrt,
            burn_subtitles: opts.burnSubtitles ?? false,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast.success('Đã gửi yêu cầu ghép phim', {
          id: tId,
          description: 'Phim sẽ xuất hiện trong "Phim đã ghép" khi hoàn tất.',
        });
        return data?.render_job ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        toast.error('Ghép phim thất bại', { id: tId, description: msg.slice(0, 200) });
        return null;
      } finally {
        setMerging(false);
      }
    },
    [],
  );

  return { mergeMovie, merging };
}
