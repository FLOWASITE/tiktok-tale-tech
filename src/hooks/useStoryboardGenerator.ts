import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Storyboard, StoryboardScene, StoryboardGenerationParams } from '@/types/storyboard';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export function useStoryboardGenerator() {
  const [generating, setGenerating] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [savedStoryboards, setSavedStoryboards] = useState<Storyboard[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const generateStoryboard = async (params: StoryboardGenerationParams): Promise<Storyboard | null> => {
    if (!params.scriptContent) {
      toast.error('Cần có nội dung kịch bản để tạo storyboard');
      return null;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-storyboard', {
        body: params,
      });

      if (error) {
        console.error('Error generating storyboard:', error);
        if (error.message?.includes('429')) {
          toast.error('Đã vượt giới hạn API. Vui lòng thử lại sau.');
        } else if (error.message?.includes('402')) {
          toast.error('Cần nạp thêm credits để tiếp tục.');
        } else {
          toast.error('Không thể tạo storyboard: ' + error.message);
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      const newStoryboard: Storyboard = {
        id: crypto.randomUUID(),
        title: params.scriptTitle,
        scenes: data.scenes,
        total_duration: data.totalDuration,
        style_notes: data.styleNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setStoryboard(newStoryboard);
      toast.success(`Đã tạo storyboard với ${data.scenes.length} phân cảnh!`);
      return newStoryboard;
    } catch (error) {
      console.error('Error generating storyboard:', error);
      toast.error('Lỗi không xác định khi tạo storyboard');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const saveStoryboard = async (scriptId?: string): Promise<boolean> => {
    if (!storyboard || !user) {
      toast.error('Không có storyboard để lưu');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('storyboards')
        .insert({
          script_id: scriptId || null,
          title: storyboard.title,
          scenes: storyboard.scenes as any,
          total_duration: storyboard.total_duration,
          style_notes: storyboard.style_notes,
          user_id: user.id,
          organization_id: currentOrganization?.id || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving storyboard:', error);
        toast.error('Không thể lưu storyboard');
        return false;
      }

      setStoryboard({
        ...storyboard,
        id: data.id,
        script_id: data.script_id,
      });

      toast.success('Đã lưu storyboard!');
      return true;
    } catch (error) {
      console.error('Error saving storyboard:', error);
      toast.error('Lỗi khi lưu storyboard');
      return false;
    }
  };

  const fetchStoryboards = async (scriptId?: string) => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('storyboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (scriptId) {
        query = query.eq('script_id', scriptId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching storyboards:', error);
        return;
      }

      const parsed = (data || []).map((sb) => ({
        ...sb,
        scenes: (sb.scenes as any) || [],
      })) as Storyboard[];

      setSavedStoryboards(parsed);
    } catch (error) {
      console.error('Error fetching storyboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStoryboard = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('storyboards')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting storyboard:', error);
        toast.error('Không thể xóa storyboard');
        return false;
      }

      setSavedStoryboards((prev) => prev.filter((sb) => sb.id !== id));
      if (storyboard?.id === id) {
        setStoryboard(null);
      }

      toast.success('Đã xóa storyboard');
      return true;
    } catch (error) {
      console.error('Error deleting storyboard:', error);
      return false;
    }
  };

  const updateScene = (sceneNumber: number, updates: Partial<StoryboardScene>) => {
    if (!storyboard) return;

    const updatedScenes = storyboard.scenes.map((scene) =>
      scene.sceneNumber === sceneNumber ? { ...scene, ...updates } : scene
    );

    setStoryboard({
      ...storyboard,
      scenes: updatedScenes,
      updated_at: new Date().toISOString(),
    });
  };

  const clearStoryboard = () => {
    setStoryboard(null);
  };

  return {
    generating,
    storyboard,
    savedStoryboards,
    loading,
    generateStoryboard,
    saveStoryboard,
    fetchStoryboards,
    deleteStoryboard,
    updateScene,
    clearStoryboard,
    setStoryboard,
  };
}
