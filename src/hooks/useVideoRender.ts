import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VideoRenderJob {
  id: string;
  user_id: string;
  organization_id?: string | null;
  storyboard_id?: string | null;
  source_clip_ids: string[];
  voiceover_url?: string | null;
  bgm_url?: string | null;
  subtitle_srt?: string | null;
  burn_subtitles: boolean;
  aspect_ratio: string;
  output_url?: string | null;
  thumbnail_url?: string | null;
  provider: string;
  provider_render_id?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  poll_attempts: number;
  error_message?: string | null;
  cost_estimate?: number | null;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface RenderRequest {
  clip_urls: string[];
  voiceover_url?: string;
  bgm_url?: string;
  bgm_volume?: number;
  subtitle_srt?: string;
  burn_subtitles?: boolean;
  aspect_ratio?: '9:16' | '16:9' | '1:1';
  storyboard_id?: string;
  source_clip_ids?: string[];
}

export function useVideoRender() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<VideoRenderJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`render-jobs-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'video_render_jobs',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const updated = payload.new as VideoRenderJob;
        setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
        const old = (payload.old ?? {}) as Partial<VideoRenderJob>;
        if (old.status !== 'completed' && updated.status === 'completed') {
          toast.success('Video ghép xong! 🎬');
        } else if (old.status !== 'failed' && updated.status === 'failed') {
          toast.error(updated.error_message ?? 'Render thất bại');
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('video_render_jobs')
        .select('*').order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      setJobs((data ?? []) as VideoRenderJob[]);
    } catch (e) {
      console.error('[render] fetch err', e);
    } finally { setLoading(false); }
  }, [user]);

  const submitRender = useCallback(async (req: RenderRequest) => {
    if (!user) { toast.error('Vui lòng đăng nhập'); return null; }
    if (!req.clip_urls.length) { toast.error('Cần ít nhất 1 clip'); return null; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('render-video-creatomate', { body: req });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return null; }
      const job = data.render_job as VideoRenderJob;
      setJobs((prev) => [job, ...prev]);
      toast.info('Video đang được ghép — sẽ thông báo khi xong (1-3 phút).');
      return job;
    } catch (e) {
      console.error('[render] submit err', e);
      toast.error('Submit render thất bại');
      return null;
    } finally { setSubmitting(false); }
  }, [user]);

  useEffect(() => { if (user) fetchJobs(); }, [user, fetchJobs]);

  return { jobs, loading, submitting, fetchJobs, submitRender };
}
