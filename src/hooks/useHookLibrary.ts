import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { HookTemplate, UserSavedHook } from '@/types/hook';
import { toast } from 'sonner';

interface BrandTemplate {
  id: string;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  industry: string[] | null;
}

export function useHookLibrary(brandTemplateId?: string) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<HookTemplate[]>([]);
  const [savedHooks, setSavedHooks] = useState<UserSavedHook[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandTemplate, setBrandTemplate] = useState<BrandTemplate | null>(null);

  // Fetch brand template if provided
  useEffect(() => {
    async function fetchBrand() {
      if (!brandTemplateId) {
        setBrandTemplate(null);
        return;
      }
      
      const { data, error } = await supabase
        .from('brand_templates')
        .select('id, tone_of_voice, formality_level, industry')
        .eq('id', brandTemplateId)
        .single();
      
      if (!error && data) {
        setBrandTemplate(data);
      }
    }
    fetchBrand();
  }, [brandTemplateId]);

  // Fetch hook templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hook_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Type assertion since Supabase types might not be updated yet
      setTemplates((data as unknown as HookTemplate[]) || []);
    } catch (error) {
      console.error('[useHookLibrary] Error fetching templates:', error);
      toast.error('Không thể tải Hook Library');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's saved hooks
  const fetchSavedHooks = useCallback(async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('user_saved_hooks')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by brand if specified
      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSavedHooks((data as unknown as UserSavedHook[]) || []);
    } catch (error) {
      console.error('[useHookLibrary] Error fetching saved hooks:', error);
    }
  }, [user, brandTemplateId]);

  // Save a hook
  const saveHook = useCallback(async (
    hook: Partial<UserSavedHook> & { opening_line?: string },
    customizedLine?: string
  ) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu hook');
      return null;
    }

    try {
      const insertData = {
        user_id: user.id,
        organization_id: null,
        hook_template_id: hook.hook_template_id || null,
        brand_template_id: brandTemplateId || null,
        framework: hook.framework || 'question',
        original_opening_line: hook.original_opening_line || hook.opening_line || '',
        customized_opening_line: customizedLine || null,
        visual_direction: hook.visual_direction || null,
        text_overlay: hook.text_overlay || null,
        collection_name: hook.collection_name || null,
        notes: hook.notes || null,
        is_favorite: hook.is_favorite || false,
      };

      const { data, error } = await supabase
        .from('user_saved_hooks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      setSavedHooks(prev => [data as unknown as UserSavedHook, ...prev]);
      toast.success('Đã lưu hook');
      return data;
    } catch (error) {
      console.error('[useHookLibrary] Error saving hook:', error);
      toast.error('Không thể lưu hook');
      return null;
    }
  }, [user, brandTemplateId]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (hookId: string) => {
    const hook = savedHooks.find(h => h.id === hookId);
    if (!hook) return;

    try {
      const { error } = await supabase
        .from('user_saved_hooks')
        .update({ is_favorite: !hook.is_favorite })
        .eq('id', hookId);

      if (error) throw error;
      
      setSavedHooks(prev => 
        prev.map(h => h.id === hookId ? { ...h, is_favorite: !h.is_favorite } : h)
      );
      toast.success(hook.is_favorite ? 'Đã bỏ yêu thích' : 'Đã thêm vào yêu thích');
    } catch (error) {
      console.error('[useHookLibrary] Error toggling favorite:', error);
      toast.error('Không thể cập nhật');
    }
  }, [savedHooks]);

  // Delete saved hook
  const deleteHook = useCallback(async (hookId: string) => {
    try {
      const { error } = await supabase
        .from('user_saved_hooks')
        .delete()
        .eq('id', hookId);

      if (error) throw error;
      
      setSavedHooks(prev => prev.filter(h => h.id !== hookId));
      toast.success('Đã xóa hook');
    } catch (error) {
      console.error('[useHookLibrary] Error deleting hook:', error);
      toast.error('Không thể xóa hook');
    }
  }, []);

  // Increment usage count
  const incrementUsage = useCallback(async (hookId: string) => {
    try {
      const hook = savedHooks.find(h => h.id === hookId);
      if (!hook) return;

      await supabase
        .from('user_saved_hooks')
        .update({ usage_count: (hook.usage_count || 0) + 1 })
        .eq('id', hookId);
      
      setSavedHooks(prev => 
        prev.map(h => h.id === hookId ? { ...h, usage_count: (h.usage_count || 0) + 1 } : h)
      );
    } catch (error) {
      console.error('[useHookLibrary] Error incrementing usage:', error);
    }
  }, [savedHooks]);

  // Filter templates by brand compatibility
  const getFilteredTemplates = useCallback((
    filters?: { framework?: string; platform?: string; industry?: string }
  ) => {
    let filtered = [...templates];

    // Filter by framework
    if (filters?.framework && filters.framework !== 'all') {
      filtered = filtered.filter(t => t.framework === filters.framework);
    }

    // Filter by platform
    if (filters?.platform && filters.platform !== 'all') {
      filtered = filtered.filter(t => t.platforms.includes(filters.platform!));
    }

    // Filter by industry
    if (filters?.industry && filters.industry !== 'all') {
      filtered = filtered.filter(t => 
        t.industries.includes(filters.industry!) || t.industries.includes('all')
      );
    }

    // If brand template is selected, score by compatibility
    if (brandTemplate) {
      filtered = filtered.map(t => {
        let score = 0;
        
        // Check tone compatibility
        if (brandTemplate.tone_of_voice?.some(tone => 
          t.compatible_tones.includes(tone.toLowerCase())
        )) {
          score += 2;
        }
        
        // Check formality compatibility
        if (brandTemplate.formality_level && 
            t.compatible_formality.includes(brandTemplate.formality_level.toLowerCase())) {
          score += 1;
        }
        
        // Check industry match
        if (brandTemplate.industry?.some(ind => 
          t.industries.includes(ind.toLowerCase()) || t.industries.includes('all')
        )) {
          score += 1;
        }
        
        return { ...t, compatibilityScore: score };
      }).sort((a, b) => (b as any).compatibilityScore - (a as any).compatibilityScore);
    }

    return filtered;
  }, [templates, brandTemplate]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
    fetchSavedHooks();
  }, [fetchTemplates, fetchSavedHooks]);

  return {
    templates,
    savedHooks,
    loading,
    brandTemplate,
    saveHook,
    toggleFavorite,
    deleteHook,
    incrementUsage,
    getFilteredTemplates,
    refetch: () => {
      fetchTemplates();
      fetchSavedHooks();
    },
  };
}
