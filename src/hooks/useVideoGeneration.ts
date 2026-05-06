import { useState, useCallback, useEffect, useRef } from 'react';
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

  // Buffer các sự kiện completed/failed xảy ra khi tab ẩn → flush khi user quay lại
  const pendingWhileHiddenRef = useRef<Array<{ id: string; status: 'completed' | 'failed'; error?: string }>>([]);

  useEffect(() => {
    const flushPending = () => {
      const items = pendingWhileHiddenRef.current;
      if (items.length === 0) return;
      pendingWhileHiddenRef.current = [];

      const completed = items.filter((i) => i.status === 'completed');
      const failed = items.filter((i) => i.status === 'failed');

      if (completed.length === 1) {
        toast.success('🎬 Video đã được lưu khi bạn vắng mặt', {
          description: 'Mở thư viện video để xem kết quả.',
          duration: 6000,
        });
      } else if (completed.length > 1) {
        toast.success(`🎬 ${completed.length} video đã được lưu khi bạn vắng mặt`, {
          description: 'Mở thư viện video để xem kết quả.',
          duration: 6000,
        });
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} video tạo thất bại trong lúc bạn vắng mặt`, {
          description: failed[0].error?.slice(0, 120) ?? 'Mở thư viện để xem chi tiết.',
          duration: 8000,
        });
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') flushPending();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', flushPending);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', flushPending);
    };
  }, []);

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
          const justCompleted = old.status !== 'completed' && updated.status === 'completed';
          const justFailed = old.status !== 'failed' && updated.status === 'failed';

          if (document.hidden && (justCompleted || justFailed)) {
            // Tab đang ẩn → buffer để toast khi quay lại
            pendingWhileHiddenRef.current.push({
              id: updated.id,
              status: justCompleted ? 'completed' : 'failed',
              error: updated.error_message ?? undefined,
            });
            return;
          }

          if (justCompleted) {
            toast.success('Video đã tạo xong! 🎬');
          } else if (justFailed) {
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
      const charCount = request.character_profile_ids?.length ?? (request.character_profile_id ? 1 : 0);
      console.log('[generate-video req]', {
        hasChars: charCount,
        model: request.model,
        aspect: request.aspect_ratio,
        scene: request.scene_number,
      });
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: request,
      });

      if (error) {
        const msg = error.message ?? '';
        // Try to parse the response body for more detail
        let bodyError = '';
        try {
          if (error.context?.body) {
            const bodyText = await new Response(error.context.body).text();
            bodyError = bodyText;
          }
        } catch { /* ignore */ }

        const combined = `${msg} ${bodyError}`;

        if (combined.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (combined.includes('402') || combined.includes('CREDITS_EXHAUSTED') || combined.includes('Insufficient')) {
          toast.error('Credits video đã hết. Vui lòng nạp thêm credits để tiếp tục tạo video.', {
            duration: 6000,
          });
        } else if (combined.includes('MINIMAX_API_KEY')) {
          toast.error('Chưa cấu hình Minimax API key. Vui lòng thêm trong Settings.');
        } else {
          console.error('[generate-video] Unhandled error:', msg, bodyError);
          toast.error(msg || 'Không thể tạo video. Vui lòng thử lại.');
        }
        return null;
      }

      if (data?.error) {
        const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        if (errMsg.includes('CREDITS_EXHAUSTED') || errMsg.includes('Insufficient')) {
          toast.error('Credits video đã hết. Vui lòng nạp thêm credits để tiếp tục tạo video.', {
            duration: 6000,
          });
        } else {
          toast.error(errMsg);
        }
        return null;
      }

      setCurrentJobId(data.job_id);

      // 🔒 Identity-lock notice: server upgraded model to keep characters consistent
      if (data?.model_upgraded_reason === 'character_identity_lock') {
        toast.success('🔒 Đã khoá Veo 3.1 để giữ nhân vật đồng nhất', {
          description: data.stable_seed
            ? `Seed cố định #${data.stable_seed} áp dụng cho cast — các clip cùng nhân vật sẽ giữ mặt giống nhau.`
            : 'Các clip cùng cast sẽ giữ mặt giống nhau.',
          duration: 5000,
        });
      }

      // 🎨 Keyframe synthesis notice
      if (data?.keyframe_synthesized) {
        toast.success('🎨 Đã dựng keyframe từ ảnh nhân vật', {
          description: 'Khuôn mặt brand sẽ được giữ chính xác hơn trong video.',
          duration: 5000,
        });
      }

      
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
