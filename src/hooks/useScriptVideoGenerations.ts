import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { VideoGeneration } from '@/types/videoGeneration';

/**
 * Fetch + realtime cho clip video gắn với một kịch bản (script_id).
 * Trả về map theo scene_number để ScriptViewer dễ render từng scene.
 */
export function useScriptVideoGenerations(scriptId: string | null | undefined) {
  const { user } = useAuth();
  const [clips, setClips] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchClips = useCallback(async () => {
    if (!user || !scriptId) {
      setClips([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('script_id', scriptId)
        .order('scene_number', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClips((data as VideoGeneration[]) ?? []);
    } catch (e) {
      console.error('useScriptVideoGenerations fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [user, scriptId]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  // Realtime: bất kỳ thay đổi nào trên video_generations của user → reconcile
  useEffect(() => {
    if (!user || !scriptId) return;
    const channel = supabase
      .channel(`script-videos-${scriptId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Partial<VideoGeneration>;
          if (!row || row.script_id !== scriptId) return;

          if (payload.eventType === 'DELETE') {
            setClips((prev) => prev.filter((c) => c.id !== row.id));
            return;
          }
          const updated = payload.new as VideoGeneration;
          setClips((prev) => {
            const idx = prev.findIndex((c) => c.id === updated.id);
            if (idx === -1) {
              return [...prev, updated].sort(
                (a, b) => (a.scene_number ?? 0) - (b.scene_number ?? 0),
              );
            }
            const next = [...prev];
            next[idx] = updated;
            return next;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, scriptId]);

  /** Map sceneNumber → clip mới nhất (ưu tiên completed > processing > failed). */
  const bySceneNumber = new Map<number, VideoGeneration>();
  const rank = (s: string) =>
    s === 'completed' ? 3 : s === 'processing' ? 2 : s === 'pending' ? 1 : 0;
  for (const c of clips) {
    if (!c.scene_number) continue;
    const existing = bySceneNumber.get(c.scene_number);
    if (!existing || rank(c.status) > rank(existing.status)) {
      bySceneNumber.set(c.scene_number, c);
    }
  }

  return { clips, bySceneNumber, loading, refetch: fetchClips };
}
