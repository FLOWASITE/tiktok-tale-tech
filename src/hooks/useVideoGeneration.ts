import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoGeneration, VideoGenerationRequest, VideoProvider } from '@/types/videoGeneration';
import { toast } from 'sonner';

export function useVideoGeneration() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<VideoGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Realtime subscription — push updates from the background poller into local state
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`video-generations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as VideoGeneration;
          setGenerations((prev) => {
            const idx = prev.findIndex((g) => g.id === updated.id);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = updated;
            return next;
          });
          const old = (payload.old ?? {}) as Partial<VideoGeneration>;
          if (old.status !== 'completed' && updated.status === 'completed') {
            toast.success('Video đã tạo xong! 🎬');
          } else if (old.status !== 'failed' && updated.status === 'failed') {
            toast.error(updated.error_message ?? 'Video tạo thất bại');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchGenerations = useCallback(async (scriptId?: string) => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('video_generations')
        .select('*')
        .order('created_at', { ascending: false });

      if (scriptId) {
        query = query.eq('script_id', scriptId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setGenerations(data as VideoGeneration[]);
    } catch (error) {
      console.error('Error fetching video generations:', error);
      toast.error('Không thể tải danh sách video');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateVideo = useCallback(async (
    request: VideoGenerationRequest
  ): Promise<VideoGeneration | null> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập');
      return null;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: request,
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Cần nạp thêm credits để tiếp tục.');
        } else if (error.message?.includes('MINIMAX_API_KEY')) {
          toast.error('Chưa cấu hình Minimax API key. Vui lòng thêm trong Settings.');
        } else {
          throw error;
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setCurrentJobId(data.job_id);
      
      // Fetch the created generation
      const { data: generationData } = await supabase
        .from('video_generations')
        .select('*')
        .eq('id', data.job_id)
        .single();

      if (generationData) {
        const generation = generationData as VideoGeneration;
        setGenerations(prev => {
          // Avoid duplicate if realtime got there first
          if (prev.some((g) => g.id === generation.id)) return prev;
          return [generation, ...prev];
        });

        if (generation.status === 'completed') {
          toast.success('Video đã tạo thành công!');
        } else if (generation.status === 'processing' || generation.status === 'pending') {
          toast.info('Video đang được tạo nền — sẽ thông báo khi xong.');
        }

        return generation;
      }

      return null;
    } catch (error) {
      console.error('Error generating video:', error);
      toast.error('Không thể tạo video. Vui lòng thử lại.');
      return null;
    } finally {
      setGenerating(false);
      // KHÔNG reset currentJobId — UI cần theo dõi job qua realtime đến completed/failed
    }
  }, [user]);

  const clearCurrentJob = useCallback(() => setCurrentJobId(null), []);

  const pollJobStatus = useCallback(async (jobId: string): Promise<VideoGeneration | null> => {
    try {
      const { data, error } = await supabase
        .from('video_generations')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      const generation = data as VideoGeneration;
      
      // Update local state
      setGenerations(prev => 
        prev.map(g => g.id === jobId ? generation : g)
      );
      
      return generation;
    } catch (error) {
      console.error('Error polling job status:', error);
      return null;
    }
  }, []);

  const deleteGeneration = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('video_generations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setGenerations(prev => prev.filter(g => g.id !== id));
      toast.success('Đã xóa video');
      return true;
    } catch (error) {
      console.error('Error deleting generation:', error);
      toast.error('Không thể xóa video');
      return false;
    }
  }, []);

  const getProviderAvailability = useCallback(async (): Promise<Record<VideoProvider, boolean>> => {
    // Check which providers are available based on configured secrets
    const availability: Record<VideoProvider, boolean> = {
      lovable: true, // Always available
      geminigen: false,
      poyo: false,
      minimax: false,
      runway: false,
    };

    // Note: In production, you'd check if the API keys are configured
    // For now, we assume Lovable is always available
    
    return availability;
  }, []);

  return {
    generations,
    loading,
    generating,
    currentJobId,
    clearCurrentJob,
    fetchGenerations,
    generateVideo,
    pollJobStatus,
    deleteGeneration,
    getProviderAvailability,
  };
}
