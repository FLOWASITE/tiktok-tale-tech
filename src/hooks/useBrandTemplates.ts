import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BrandTemplate {
  id: string;
  name: string;
  brand_name: string;
  industry: string[] | null;
  brand_guideline: string;
  include_logo: boolean;
  is_default: boolean;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

const BUCKET_NAME = 'brand-logos';

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

  const updateTemplate = async (id: string, updates: Partial<Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<BrandTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from('brand_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedTemplate = data as BrandTemplate;
      setTemplates((prev) => prev.map((t) => t.id === id ? updatedTemplate : t));
      toast.success('Đã cập nhật template!');
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Không thể cập nhật template');
      return null;
    }
  };

  const setDefaultTemplate = async (id: string): Promise<boolean> => {
    try {
      // First, unset all defaults
      await supabase
        .from('brand_templates')
        .update({ is_default: false })
        .neq('id', id);
      
      // Then set the new default
      const { error } = await supabase
        .from('brand_templates')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      setTemplates((prev) => prev.map((t) => ({
        ...t,
        is_default: t.id === id
      })));
      toast.success('Đã đặt làm mặc định!');
      return true;
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('Không thể đặt làm mặc định');
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      // Get template to check for logo
      const template = templates.find(t => t.id === id);
      if (template?.logo_url) {
        // Extract file path from URL and delete from storage
        const url = new URL(template.logo_url);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');
        if (filePath) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      }
      
      const { error } = await supabase.from('brand_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Đã xóa template!');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Không thể xóa template');
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Không thể upload logo');
      return null;
    }
  };

  const deleteLogo = async (logoUrl: string): Promise<boolean> => {
    try {
      const url = new URL(logoUrl);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');
      
      if (!filePath) return false;
      
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting logo:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    uploadLogo,
    deleteLogo,
    refetch: fetchTemplates,
  };
}
