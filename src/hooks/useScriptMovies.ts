import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ScriptMovie {
  id: string;
  script_id: string | null;
  output_url: string | null;
  thumbnail_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  aspect_ratio: string;
  duration_seconds: number | null;
  error_message: string | null;
  source_clip_ids: string[];
  created_at: string;
  completed_at: string | null;
}

/**
 * Realtime list of merged movies for a given script.
 * Filter by `script_id` (added in migration).
 */
export function useScriptMovies(scriptId: string | null) {
  const [movies, setMovies] = useState<ScriptMovie[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMovies = useCallback(async () => {
    if (!scriptId) {
      setMovies([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('video_render_jobs')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setMovies(data as unknown as ScriptMovie[]);
    }
    setLoading(false);
  }, [scriptId]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Realtime subscription
  useEffect(() => {
    if (!scriptId) return;
    const channel = supabase
      .channel(`script-movies-${scriptId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_render_jobs' },
        (payload) => {
          const row = (payload.new ?? payload.old) as ScriptMovie | undefined;
          if (row?.script_id === scriptId) {
            fetchMovies();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scriptId, fetchMovies]);

  return { movies, loading, refetch: fetchMovies };
}
