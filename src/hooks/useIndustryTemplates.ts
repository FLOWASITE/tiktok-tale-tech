import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface IndustryTemplate {
  id: string;
  code: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  country_code: string;
  category_id: string | null;
  category_code: string | null;
  category_name: string | null;
  brand_voice: {
    tone_of_voice: string[];
    formality_level: string;
    language_style: string[];
    allow_emoji: boolean;
  };
  channel_settings: Record<string, unknown>;
  // Translation fields
  name: string;
  short_name: string | null;
  brand_positioning: string | null;
  preferred_words: string[];
  forbidden_words: string[];
  is_active: boolean;
}

export interface IndustryCategory {
  id: string;
  code: string;
  icon_name: string;
  color: string;
  name: string;
  description: string | null;
}

export interface Country {
  id: string;
  code: string;
  name: string;
  native_name: string | null;
  flag_emoji: string | null;
  default_language: string;
  is_active: boolean;
}

interface UseIndustryTemplatesOptions {
  countryCode?: string;
  languageCode?: string;
  categoryCode?: string;
  enabled?: boolean;
}

export function useIndustryTemplates(options: UseIndustryTemplatesOptions = {}) {
  const { 
    countryCode = 'VN', 
    languageCode = 'vi',
    categoryCode,
    enabled = true 
  } = options;

  // Fetch countries
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as Country[];
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch categories with translations
  const categoriesQuery = useQuery({
    queryKey: ['industry_categories', languageCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_categories')
        .select(`
          id,
          code,
          icon_name,
          color,
          industry_category_translations!inner (
            name,
            description
          )
        `)
        .eq('is_active', true)
        .eq('industry_category_translations.language_code', languageCode)
        .order('sort_order');

      if (error) throw error;
      
      return (data || []).map(cat => ({
        id: cat.id,
        code: cat.code,
        icon_name: cat.icon_name,
        color: cat.color,
        name: (cat.industry_category_translations as unknown as Array<{ name: string; description: string | null }>)?.[0]?.name || cat.code,
        description: (cat.industry_category_translations as unknown as Array<{ name: string; description: string | null }>)?.[0]?.description || null,
      })) as IndustryCategory[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch industry templates with translations
  const templatesQuery = useQuery({
    queryKey: ['industry_templates', countryCode, languageCode, categoryCode],
    queryFn: async () => {
      // First get country ID
      const { data: country, error: countryError } = await supabase
        .from('countries')
        .select('id')
        .eq('code', countryCode)
        .single();

      if (countryError || !country) {
        console.warn(`Country ${countryCode} not found`);
        return [];
      }

      // Helper to build and execute query for a specific language
      const fetchWithLanguage = async (lang: string, catId?: string | null) => {
        let query = supabase
          .from('industry_templates')
          .select(`
            id,
            code,
            target_audience,
            category_id,
            brand_voice,
            channel_settings,
            is_active,
            status,
            countries!inner (
              code
            ),
            industry_categories (
              code
            ),
            industry_template_translations!inner (
              name,
              short_name,
              brand_positioning,
              preferred_words,
              forbidden_words
            )
          `)
          .eq('country_id', country.id)
          .eq('is_active', true)
          .eq('status', 'stable')
          .eq('industry_template_translations.language_code', lang)
          .order('sort_order');

        if (catId) {
          query = query.eq('category_id', catId);
        }

        return query;
      };

      // Get category ID if provided
      let categoryId: string | null = null;
      if (categoryCode) {
        const { data: cat } = await supabase
          .from('industry_categories')
          .select('id')
          .eq('code', categoryCode)
          .single();
        categoryId = cat?.id || null;
      }

      // Try with requested language first
      let { data, error } = await fetchWithLanguage(languageCode, categoryId);

      // Fallback to 'en' if no results and requested language wasn't 'en'
      if ((!data || data.length === 0) && languageCode !== 'en') {
        console.log(`Industry Templates: No ${languageCode} translations found for ${countryCode}, trying 'en' fallback`);
        const fallbackResult = await fetchWithLanguage('en', categoryId);
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;

      return (data || []).map(template => {
        const translation = (template.industry_template_translations as unknown as Array<{
          name: string;
          short_name: string | null;
          brand_positioning: string | null;
          preferred_words: string[];
          forbidden_words: string[];
        }>)?.[0];

        return {
          id: template.id,
          code: template.code,
          target_audience: template.target_audience as 'B2B' | 'B2C' | 'both',
          country_code: (template.countries as unknown as { code: string })?.code || countryCode,
          category_id: template.category_id,
          category_code: (template.industry_categories as unknown as { code: string } | null)?.code || null,
          category_name: null, // Will be enriched from categories
          brand_voice: template.brand_voice as IndustryTemplate['brand_voice'],
          channel_settings: template.channel_settings as Record<string, unknown>,
          name: translation?.name || template.code,
          short_name: translation?.short_name || null,
          brand_positioning: translation?.brand_positioning || null,
          preferred_words: translation?.preferred_words || [],
          forbidden_words: translation?.forbidden_words || [],
          is_active: template.is_active,
        } as IndustryTemplate;
      });
    },
    enabled: enabled && !!countryCode,
    staleTime: 5 * 60 * 1000,
  });

  // Enrich templates with category names
  const templates = templatesQuery.data?.map(template => {
    const category = categoriesQuery.data?.find(c => c.code === template.category_code);
    return {
      ...template,
      category_name: category?.name || null,
    };
  }) || [];

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const categoryCode = template.category_code || 'other';
    if (!acc[categoryCode]) {
      acc[categoryCode] = [];
    }
    acc[categoryCode].push(template);
    return acc;
  }, {} as Record<string, IndustryTemplate[]>);

  // Get template by code
  const getTemplateByCode = (code: string) => {
    return templates.find(t => t.code === code);
  };

  // Get template by name (for backward compatibility)
  const getTemplateByName = (name: string) => {
    return templates.find(t => t.name === name);
  };

  return {
    // Data
    templates,
    templatesByCategory,
    categories: categoriesQuery.data || [],
    countries: countriesQuery.data || [],
    
    // Loading states
    isLoading: templatesQuery.isLoading || categoriesQuery.isLoading,
    isLoadingCountries: countriesQuery.isLoading,
    
    // Error states
    error: templatesQuery.error || categoriesQuery.error,
    
    // Helper functions
    getTemplateByCode,
    getTemplateByName,
    
    // Refetch
    refetch: () => {
      templatesQuery.refetch();
      categoriesQuery.refetch();
    },
  };
}

// Hook for admin operations (requires admin role)
export function useIndustryTemplatesAdmin() {
  const createTemplate = async (
    countryCode: string,
    categoryCode: string | null,
    data: {
      code: string;
      target_audience: 'B2B' | 'B2C' | 'both';
      brand_voice: IndustryTemplate['brand_voice'];
      channel_settings?: Record<string, unknown>;
    },
    translations: {
      language_code: string;
      name: string;
      short_name?: string;
      brand_positioning?: string;
      preferred_words?: string[];
      forbidden_words?: string[];
    }[]
  ) => {
    // Get country ID
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('id')
      .eq('code', countryCode)
      .single();

    if (countryError || !country) throw new Error(`Country ${countryCode} not found`);

    // Get category ID if provided
    let categoryId = null;
    if (categoryCode) {
      const { data: cat } = await supabase
        .from('industry_categories')
        .select('id')
        .eq('code', categoryCode)
        .single();
      categoryId = cat?.id || null;
    }

    // Insert template
    const { data: template, error: templateError } = await supabase
      .from('industry_templates')
      .insert([{
        country_id: country.id,
        category_id: categoryId,
        code: data.code,
        target_audience: data.target_audience,
        brand_voice: data.brand_voice as Json,
        channel_settings: (data.channel_settings || {}) as Json,
      }])
      .select('id')
      .single();

    if (templateError) throw templateError;

    // Insert translations
    for (const translation of translations) {
      const { error: translationError } = await supabase
        .from('industry_template_translations')
        .insert([{
          industry_template_id: template.id,
          language_code: translation.language_code,
          name: translation.name,
          short_name: translation.short_name,
          brand_positioning: translation.brand_positioning,
          preferred_words: translation.preferred_words,
          forbidden_words: translation.forbidden_words,
        }]);

      if (translationError) throw translationError;
    }

    return template;
  };

  const updateTemplate = async (
    templateId: string,
    data: Partial<{
      target_audience: 'B2B' | 'B2C' | 'both';
      brand_voice: IndustryTemplate['brand_voice'];
      channel_settings: Record<string, unknown>;
      is_active: boolean;
    }>
  ) => {
    const updateData: Record<string, unknown> = {};
    if (data.target_audience) updateData.target_audience = data.target_audience;
    if (data.brand_voice) updateData.brand_voice = data.brand_voice;
    if (data.channel_settings) updateData.channel_settings = data.channel_settings;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const { error } = await supabase
      .from('industry_templates')
      .update(updateData)
      .eq('id', templateId);

    if (error) throw error;
  };

  const updateTranslation = async (
    templateId: string,
    languageCode: string,
    data: Partial<{
      name: string;
      short_name: string;
      brand_positioning: string;
      preferred_words: string[];
      forbidden_words: string[];
    }>
  ) => {
    const { error } = await supabase
      .from('industry_template_translations')
      .upsert([{
        industry_template_id: templateId,
        language_code: languageCode,
        name: data.name || '',
        short_name: data.short_name,
        brand_positioning: data.brand_positioning,
        preferred_words: data.preferred_words,
        forbidden_words: data.forbidden_words,
      }]);

    if (error) throw error;
  };

  // Soft delete - marks template as deleted without removing data
  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('industry_templates')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: (await supabase.auth.getUser()).data.user?.id 
      })
      .eq('id', templateId);

    if (error) throw error;
    toast.success('🗑️ Đã xóa Industry Pack!', {
      description: 'Pack có thể được khôi phục',
    });
  };

  // Restore soft-deleted template
  const restoreTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('industry_templates')
      .update({ 
        deleted_at: null,
        deleted_by: null 
      })
      .eq('id', templateId);

    if (error) throw error;
    toast.success('✨ Đã khôi phục Industry Pack!');
  };

  // Permanent delete - actually removes template
  const permanentDeleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from('industry_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    toast.success('🗑️ Đã xóa vĩnh viễn Industry Pack!');
  };

  // Fetch deleted templates for restoration
  const fetchDeletedTemplates = async (): Promise<Array<{
    id: string;
    code: string;
    deleted_at: string;
    deleted_by: string | null;
  }>> => {
    const { data, error } = await supabase
      .from('industry_templates')
      .select('id, code, deleted_at, deleted_by')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  return {
    createTemplate,
    updateTemplate,
    updateTranslation,
    deleteTemplate,
    restoreTemplate,
    permanentDeleteTemplate,
    fetchDeletedTemplates,
  };
}