import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandTemplate {
  id: string;
  name: string;
  brand_name: string;
  brand_guideline: string;
  include_logo: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useBrandTemplates() {
  const [templates, setTemplates] = useState<BrandTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('brand_templates')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data as BrandTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Không thể tải danh sách template');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (template: Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<BrandTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('brand_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      
      const newTemplate = data as BrandTemplate;
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success('Đã lưu template!');
      return newTemplate;
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Không thể lưu template');
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from('brand_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Đã xóa template!');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Không thể xóa template');
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    saveTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
