import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

import { ChannelOverrides } from '@/components/ChannelSettingsEditor';
import { ContentPillar } from '@/types/topicDiscovery';
import { BrandFooterInfo } from '@/components/BrandForm';

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
  // Ownership
  user_id: string | null;
  organization_id: string | null;
  // Industry Memory Link
  industry_template_id: string | null;
  // Brand Voice Profile
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  compliance_rules: string[] | null;
  // Channel Settings Overrides
  channel_overrides: ChannelOverrides | null;
  // Sample texts for channels
  sample_texts: Record<string, string> | null;
  // Content Pillars for topic strategy
  content_pillars?: ContentPillar[];
  // Footer info for AI content generation
  footer_info?: BrandFooterInfo | null;
  
  // Brand Identity & Story (new fields)
  mission?: string | null;
  vision?: string | null;
  unique_value_proposition?: string | null;
  tagline?: string | null;
  
  // Target Market (new fields)
  target_age_range?: string | null;
  target_gender?: string | null;
  market_segment?: string | null;
  target_locations?: string[] | null;
  
  // Content Strategy (new fields)
  brand_hashtags?: string[] | null;
  signature_phrases?: string[] | null;
  cta_templates?: string[] | null;
  evergreen_themes?: string[] | null;
  
  // Brand Assets (new fields)
  secondary_colors?: string[] | null;
  image_style?: string | null;
  
  // Competitor Analysis (new fields)
  main_competitors?: string[] | null;
  competitive_advantages?: string[] | null;
  
  // Country/Region
  country_code?: string | null;
  
  // Headline
  headline?: string | null;
  sub_headline?: string | null;
}

// Helper to transform DB response to BrandTemplate
function transformDbResponse(data: any): BrandTemplate {
  return {
    ...data,
    content_pillars: Array.isArray(data.content_pillars) ? data.content_pillars : [],
    channel_overrides: data.channel_overrides || null,
    sample_texts: data.sample_texts || null,
    footer_info: data.footer_info || null,
  };
}

export type BrandScope = 'personal' | 'organization' | 'both';

const BUCKET_NAME = 'brand-logos';

export function useBrandTemplates() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [templates, setTemplates] = useState<BrandTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('brand_templates')
        .select('*')
        .is('deleted_at', null)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      // Filter strictly by organization when in a workspace context
      if (currentOrganization) {
        query = query.eq('organization_id', currentOrganization.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates((data || []).map(transformDbResponse));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Không thể tải danh sách template', {
        description: 'Vui lòng tải lại trang',
        className: 'animate-error-shake',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (
    template: Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>,
    scope: BrandScope = 'personal'
  ): Promise<BrandTemplate | null> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo template');
      return null;
    }

    try {
      const normalizedScope: BrandScope =
        (scope === 'organization' || scope === 'both') && !currentOrganization
          ? 'personal'
          : scope;

      // Debug for persistent RLS issues
      console.debug('[useBrandTemplates.saveTemplate]', {
        requestedScope: scope,
        normalizedScope,
        currentOrganizationId: currentOrganization?.id ?? null,
        userId: user.id,
      });

      const insertData: any = {
        ...template,
        user_id: normalizedScope === 'personal' || normalizedScope === 'both' ? user.id : null,
        organization_id:
          (normalizedScope === 'organization' || normalizedScope === 'both') && currentOrganization
            ? currentOrganization.id
            : null,
      };

      const { data, error } = await supabase
        .from('brand_templates')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      
      const newTemplate = transformDbResponse(data);
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success('✨ Đã lưu template!', {
        description: `Template "${newTemplate.name}" đã được tạo`,
      });
      return newTemplate;
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('❌ Không thể lưu template', {
        description: 'Vui lòng thử lại',
        className: 'animate-error-shake',
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<Omit<BrandTemplate, 'id' | 'created_at' | 'updated_at'>>): Promise<BrandTemplate | null> => {
    try {
      // Transform content_pillars to JSON for Supabase
      const dbUpdates: any = { ...updates };
      if (updates.content_pillars !== undefined) {
        dbUpdates.content_pillars = updates.content_pillars;
      }
      
      const { data, error } = await supabase
        .from('brand_templates')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      const updatedTemplate = transformDbResponse(data);
      setTemplates((prev) => prev.map((t) => t.id === id ? updatedTemplate : t));
      toast.success('💾 Đã cập nhật template!', {
        description: 'Thay đổi đã được lưu',
      });
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('❌ Không thể cập nhật template', {
        className: 'animate-error-shake',
      });
      return null;
    }
  };

  const setDefaultTemplate = async (id: string): Promise<boolean> => {
    try {
      // First, unset all defaults for this user/org
      const template = templates.find(t => t.id === id);
      if (!template) return false;

      // Unset defaults based on scope
      if (template.organization_id) {
        await supabase
          .from('brand_templates')
          .update({ is_default: false })
          .eq('organization_id', template.organization_id)
          .neq('id', id);
      } else if (template.user_id) {
        await supabase
          .from('brand_templates')
          .update({ is_default: false })
          .eq('user_id', template.user_id)
          .is('organization_id', null)
          .neq('id', id);
      }
      
      // Then set the new default
      const { error } = await supabase
        .from('brand_templates')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      setTemplates((prev) => prev.map((t) => ({
        ...t,
        is_default: t.id === id ? true : (
          // Only unset default for same scope
          template.organization_id 
            ? (t.organization_id === template.organization_id ? false : t.is_default)
            : (t.user_id === template.user_id && !t.organization_id ? false : t.is_default)
        )
      })));
      toast.success('⭐ Đã đặt làm mặc định!', {
        description: 'Template này sẽ được sử dụng cho các nội dung mới',
      });
      return true;
    } catch (error) {
      console.error('Error setting default template:', error);
      toast.error('❌ Không thể đặt làm mặc định', {
        className: 'animate-error-shake',
      });
      return false;
    }
  };

  const duplicateTemplate = async (id: string, scope?: BrandScope): Promise<BrandTemplate | null> => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để tạo bản sao');
      return null;
    }

    try {
      const template = templates.find(t => t.id === id);
      if (!template) throw new Error('Template not found');
      
      const { id: _, created_at, updated_at, is_default, user_id, organization_id, ...templateData } = template;
      
      // Determine scope for duplicate
      const targetScope = scope || (template.organization_id ? 'organization' : 'personal');
      
      const duplicatedData = {
        ...templateData,
        name: `${template.name} (Copy)`,
        is_default: false,
        user_id: targetScope === 'personal' ? user.id : null,
        organization_id: targetScope === 'organization' && currentOrganization ? currentOrganization.id : null,
      };
      
      const { data, error } = await supabase
        .from('brand_templates')
        .insert(duplicatedData as any)
        .select()
        .single();

      if (error) throw error;
      
      const newTemplate = transformDbResponse(data);
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success('📋 Đã tạo bản sao!', {
        description: `Template "${newTemplate.name}" đã được tạo`,
      });
      return newTemplate;
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast.error('❌ Không thể tạo bản sao', {
        className: 'animate-error-shake',
      });
      return null;
    }
  };

  // Soft delete - marks template as deleted without removing data
  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brand_templates')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('🗑️ Đã xóa template!', {
        description: 'Template có thể được khôi phục bởi admin',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('❌ Không thể xóa template', {
        className: 'animate-error-shake',
      });
    }
  };

  // Restore soft-deleted template (admin only)
  const restoreTemplate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('brand_templates')
        .update({ 
          deleted_at: null,
          deleted_by: null 
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Refetch to get restored template
      await fetchTemplates();
      toast.success('✨ Đã khôi phục template!');
      return true;
    } catch (error) {
      console.error('Error restoring template:', error);
      toast.error('❌ Không thể khôi phục template', {
        className: 'animate-error-shake',
      });
      return false;
    }
  };

  // Permanent delete - actually removes template and logo (admin only)
  const permanentDeleteTemplate = async (id: string) => {
    try {
      // Get template to check for logo - need to query directly since it's deleted
      const { data: template } = await supabase
        .from('brand_templates')
        .select('logo_url')
        .eq('id', id)
        .single();
      
      if (template?.logo_url) {
        const url = new URL(template.logo_url);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');
        if (filePath) {
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      }
      
      const { error } = await supabase.from('brand_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('🗑️ Đã xóa vĩnh viễn template!');
    } catch (error) {
      console.error('Error permanently deleting template:', error);
      toast.error('❌ Không thể xóa vĩnh viễn template', {
        className: 'animate-error-shake',
      });
    }
  };

  // Fetch deleted templates for admin restoration
  const fetchDeletedTemplates = async (): Promise<BrandTemplate[]> => {
    if (!user || !currentOrganization) return [];
    
    try {
      const { data, error } = await supabase
        .from('brand_templates')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(transformDbResponse);
    } catch (error) {
      console.error('Error fetching deleted templates:', error);
      return [];
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${crypto.randomUUID()}.${fileExt}`;
      
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
  }, [user, currentOrganization?.id]);

  return {
    templates,
    loading,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    restoreTemplate,
    permanentDeleteTemplate,
    fetchDeletedTemplates,
    duplicateTemplate,
    setDefaultTemplate,
    uploadLogo,
    deleteLogo,
    refetch: fetchTemplates,
  };
}
