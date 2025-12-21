import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Script, ScriptFormData } from '@/types/script';
import { toast } from 'sonner';

export function useScripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchScripts = async () => {
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
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: formData,
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
      return newScript;
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('Không thể tạo kịch bản. Vui lòng thử lại.');
      return null;
    } finally {
      setGenerating(false);
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
  }, []);

  return {
    scripts,
    loading,
    generating,
    generateScript,
    deleteScript,
    refetch: fetchScripts,
  };
}