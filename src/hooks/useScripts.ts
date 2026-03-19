import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { Script, ScriptFormData } from '@/types/script';
import { toast } from 'sonner';

export function useScripts() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchScripts = async () => {
    if (!user) {
      setScripts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScripts(data as Script[]);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error('Không thể tải danh sách kịch bản');
    } finally {
      setLoading(false);
    }
  };

  const generateScript = async (formData: ScriptFormData): Promise<Script | null> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo kịch bản');
      return null;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { 
          ...formData, 
          user_id: user.id,
          organization_id: currentOrganization?.id,
          brandVoiceVariantId: formData.brandVoiceVariantId,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn yêu cầu. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Cần nạp thêm credits để tiếp tục sử dụng.');
        } else {
          throw error;
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      const newScript = data as Script;
      setScripts((prev) => [newScript, ...prev]);
      toast.success('Đã tạo kịch bản thành công!');

      // Send notification
      if (user) {
        supabase.from('notifications').insert({
          user_id: user.id,
          type: 'script_generated',
          title: 'Kịch bản đã sẵn sàng!',
          message: `Kịch bản "${formData.topic}" đã được tạo thành công`,
          data: { script_id: newScript.id },
        }).then(({ error: notifError }) => {
          if (notifError) console.warn('[useScripts] Failed to send script notification:', notifError);
        });
      }

      // Auto-analyze script in background (non-blocking)
      analyzeScriptInBackground(newScript);

      return newScript;
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('Không thể tạo kịch bản. Vui lòng thử lại.');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Auto-analyze script and cache results (non-blocking)
  const analyzeScriptInBackground = async (script: Script) => {
    try {
      console.log('[useScripts] Auto-analyzing script:', script.id);
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-script', {
        body: {
          scriptContent: script.content,
          topic: script.topic,
          duration: script.duration,
          videoType: script.video_type,
          characterType: script.character_type,
        },
      });

      if (analysisError || analysisData?.error) {
        console.warn('[useScripts] Auto-analysis failed:', analysisError || analysisData?.error);
        return;
      }

      // Save analysis cache to database
      const { error: updateError } = await supabase
        .from('scripts')
        .update({ 
          analysis_cache: analysisData,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', script.id);

      if (updateError) {
        console.warn('[useScripts] Failed to cache analysis:', updateError);
        return;
      }

      // Update local state with analysis
      setScripts((prev) => 
        prev.map((s) => s.id === script.id 
          ? { ...s, analysis_cache: analysisData, analyzed_at: new Date().toISOString() } 
          : s
        )
      );

      console.log('[useScripts] Script auto-analyzed and cached:', script.id);

      // Send analysis notification
      if (user) {
        const score = analysisData?.overallScore || 0;
        supabase.from('notifications').insert({
          user_id: user.id,
          type: 'script_analysis_done',
          title: 'Phân tích kịch bản hoàn tất!',
          message: `Kịch bản "${script.topic}" đã được chấm điểm: ${score}/100`,
          data: { script_id: script.id, score },
        }).then(({ error: notifError }) => {
          if (notifError) console.warn('[useScripts] Failed to send analysis notification:', notifError);
        });
      }
    } catch (err) {
      console.warn('[useScripts] Auto-analysis error:', err);
    }
  };

  const deleteScript = async (id: string) => {
    try {
      const { error } = await supabase.from('scripts').delete().eq('id', id);
      if (error) throw error;
      setScripts((prev) => prev.filter((s) => s.id !== id));
      toast.success('Đã xóa kịch bản!');
    } catch (error) {
      console.error('Error deleting script:', error);
      toast.error('Không thể xóa kịch bản');
    }
  };

  useEffect(() => {
    fetchScripts();
  }, [user]);

  const updateScript = (updatedScript: Script) => {
    setScripts((prev) =>
      prev.map((s) => (s.id === updatedScript.id ? updatedScript : s))
    );
  };

  return {
    scripts,
    loading,
    generating,
    generateScript,
    deleteScript,
    updateScript,
    refetch: fetchScripts,
  };
}
