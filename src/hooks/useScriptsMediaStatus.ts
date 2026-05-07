import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ScriptMediaStatus {
  clips: { total: number; completed: number; processing: number };
  movies: { total: number; completed: number; processing: number };
}

const EMPTY: ScriptMediaStatus = {
  clips: { total: 0, completed: 0, processing: 0 },
  movies: { total: 0, completed: 0, processing: 0 },
};

/**
 * Bulk fetch + realtime cho 2 nguồn media của 1 list kịch bản:
 *  - video_generations (scene clips)  → "🎬 N scene"
 *  - video_render_jobs (merged movie) → "🎞 Đã ghép phim"
 *
 * Tránh N+1: 2 query batch cho toàn bộ scriptIds, group ở client.
 */
export function useScriptsMediaStatus(scriptIds: string[]) {
  const { user } = useAuth();
  const [map, setMap] = useState<Map<string, ScriptMediaStatus>>(new Map());

  // Stable key để tránh refetch khi array reference đổi nhưng nội dung không đổi
  const idsKey = useMemo(() => [...scriptIds].sort().join(','), [scriptIds]);
  const idsArr = useMemo(() => idsKey ? idsKey.split(',') : [], [idsKey]);

  const refetch = useCallback(async () => {
    if (!user || idsArr.length === 0) {
      setMap(new Map());
      return;
    }
    const next = new Map<string, ScriptMediaStatus>();
    const ensure = (id: string): ScriptMediaStatus => {
      let v = next.get(id);
      if (!v) {
        v = {
          clips: { total: 0, completed: 0, processing: 0 },
          movies: { total: 0, completed: 0, processing: 0 },
        };
        next.set(id, v);
      }
      return v;
    };

    const [clipsRes, moviesRes] = await Promise.all([
      supabase
        .from('video_generations')
        .select('script_id,status')
        .in('script_id', idsArr),
      supabase
        .from('video_render_jobs')
        .select('script_id,status')
        .in('script_id', idsArr),
    ]);

    if (!clipsRes.error && clipsRes.data) {
      for (const row of clipsRes.data as Array<{ script_id: string | null; status: string }>) {
        if (!row.script_id) continue;
        const v = ensure(row.script_id);
        v.clips.total++;
        if (row.status === 'completed') v.clips.completed++;
        else if (row.status === 'processing' || row.status === 'pending') v.clips.processing++;
      }
    }
    if (!moviesRes.error && moviesRes.data) {
      for (const row of moviesRes.data as Array<{ script_id: string | null; status: string }>) {
        if (!row.script_id) continue;
        const v = ensure(row.script_id);
        v.movies.total++;
        if (row.status === 'completed') v.movies.completed++;
        else if (row.status === 'processing' || row.status === 'pending') v.movies.processing++;
      }
    }
    setMap(next);
  }, [user, idsArr]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Realtime: debounced refetch
  const debounceRef = useRef<number | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      refetch();
    }, 250);
  }, [refetch]);

  useEffect(() => {
    if (!user || idsArr.length === 0) return;
    const idsSet = new Set(idsArr);

    const ch1 = supabase
      .channel(`scripts-media-clips-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_generations', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { script_id?: string | null };
          if (row?.script_id && idsSet.has(row.script_id)) scheduleRefetch();
        },
      )
      .subscribe();

    const ch2 = supabase
      .channel(`scripts-media-movies-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'video_render_jobs' },
        (payload) => {
          const row = (payload.new ?? payload.old) as { script_id?: string | null };
          if (row?.script_id && idsSet.has(row.script_id)) scheduleRefetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [user, idsArr, scheduleRefetch]);

  const get = useCallback((id: string): ScriptMediaStatus => map.get(id) ?? EMPTY, [map]);

  return { map, get, refetch };
}
