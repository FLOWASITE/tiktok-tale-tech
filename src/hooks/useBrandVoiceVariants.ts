import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface ChannelSampleTexts {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  email?: { subject: string; body: string } | string;
  website?: string;
  [key: string]: string | { subject: string; body: string } | undefined;
}

export interface BrandVoiceVariant {
  id: string;
  brand_template_id: string;
  name: string;
  is_control: boolean;
  brand_positioning: string | null;
  tone_of_voice: string[] | null;
  formality_level: string | null;
  language_style: string[] | null;
  preferred_words: string[] | null;
  forbidden_words: string[] | null;
  allow_emoji: boolean;
  sample_text: string | null;
  sample_texts: ChannelSampleTexts | null;
  content_count: number;
  created_at: string;
  updated_at: string;
  organization_id: string | null;
  user_id: string | null;
}

export type BrandVoiceVariantInput = Omit<BrandVoiceVariant, 'id' | 'created_at' | 'updated_at' | 'content_count'>;

// Helper to parse sample_texts from DB (handles both JSON object and string)
function parseSampleTexts(data: unknown): ChannelSampleTexts | null {
  if (!data) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data as ChannelSampleTexts;
}

// Helper to map DB row to typed BrandVoiceVariant
function mapRowToVariant(row: Record<string, unknown>): BrandVoiceVariant {
  return {
    ...row,
    sample_texts: parseSampleTexts(row.sample_texts),
  } as BrandVoiceVariant;
}

export function useBrandVoiceVariants(brandTemplateId: string | undefined) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [variants, setVariants] = useState<BrandVoiceVariant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVariants = useCallback(async () => {
    if (!brandTemplateId) {
      setVariants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_voice_variants')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .order('is_control', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setVariants((data || []).map(row => mapRowToVariant(row as Record<string, unknown>)));
    } catch (error) {
      console.error('Error fetching brand voice variants:', error);
      toast.error('Không thể tải danh sách variants');
    } finally {
      setLoading(false);
    }
  }, [brandTemplateId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const createVariant = async (data: Partial<BrandVoiceVariantInput> & { name: string }): Promise<BrandVoiceVariant | null> => {
    if (!user || !brandTemplateId) return null;

    try {
      const insertData = {
        name: data.name,
        brand_template_id: brandTemplateId,
        is_control: data.is_control ?? false,
        brand_positioning: data.brand_positioning ?? null,
        tone_of_voice: data.tone_of_voice ?? null,
        formality_level: data.formality_level ?? null,
        language_style: data.language_style ?? null,
        preferred_words: data.preferred_words ?? null,
        forbidden_words: data.forbidden_words ?? null,
        allow_emoji: data.allow_emoji ?? true,
        user_id: currentOrganization ? null : user.id,
        organization_id: currentOrganization?.id || null,
      };

      const { data: newVariant, error } = await supabase
        .from('brand_voice_variants')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const mappedVariant = mapRowToVariant(newVariant as Record<string, unknown>);
      setVariants(prev => [...prev, mappedVariant]);
      toast.success('Đã tạo variant mới');
      return mappedVariant;
    } catch (error) {
      console.error('Error creating variant:', error);
      toast.error('Không thể tạo variant');
      return null;
    }
  };

  const updateVariant = async (variantId: string, data: Partial<BrandVoiceVariantInput>): Promise<BrandVoiceVariant | null> => {
    try {
      const { data: updated, error } = await supabase
        .from('brand_voice_variants')
        .update(data)
        .eq('id', variantId)
        .select()
        .single();

      if (error) throw error;

      const mappedVariant = mapRowToVariant(updated as Record<string, unknown>);
      setVariants(prev => prev.map(v => v.id === variantId ? mappedVariant : v));
      toast.success('Đã cập nhật variant');
      return mappedVariant;
    } catch (error) {
      console.error('Error updating variant:', error);
      toast.error('Không thể cập nhật variant');
      return null;
    }
  };

  const deleteVariant = async (variantId: string): Promise<boolean> => {
    try {
      const variant = variants.find(v => v.id === variantId);
      if (variant?.is_control) {
        toast.error('Không thể xóa Control variant');
        return false;
      }

      const { error } = await supabase
        .from('brand_voice_variants')
        .delete()
        .eq('id', variantId);

      if (error) throw error;

      setVariants(prev => prev.filter(v => v.id !== variantId));
      toast.success('Đã xóa variant');
      return true;
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Không thể xóa variant');
      return false;
    }
  };

  const setControlVariant = async (variantId: string): Promise<boolean> => {
    try {
      // First, unset all existing control variants
      await supabase
        .from('brand_voice_variants')
        .update({ is_control: false })
        .eq('brand_template_id', brandTemplateId);

      // Then set the new control
      const { error } = await supabase
        .from('brand_voice_variants')
        .update({ is_control: true })
        .eq('id', variantId);

      if (error) throw error;

      setVariants(prev => prev.map(v => ({
        ...v,
        is_control: v.id === variantId
      })));
      
      toast.success('Đã đặt làm Control variant');
      return true;
    } catch (error) {
      console.error('Error setting control variant:', error);
      toast.error('Không thể đặt Control variant');
      return false;
    }
  };

  const createControlFromBrand = async (brandTemplate: {
    brand_positioning?: string | null;
    tone_of_voice?: string[] | null;
    formality_level?: string | null;
    language_style?: string[] | null;
    preferred_words?: string[] | null;
    forbidden_words?: string[] | null;
    allow_emoji?: boolean | null;
  }): Promise<BrandVoiceVariant | null> => {
    if (!user || !brandTemplateId) return null;

    // Check if control already exists
    if (variants.some(v => v.is_control)) {
      toast.error('Control variant đã tồn tại');
      return null;
    }

    return createVariant({
      brand_template_id: brandTemplateId,
      name: 'Control (Gốc)',
      is_control: true,
      brand_positioning: brandTemplate.brand_positioning || null,
      tone_of_voice: brandTemplate.tone_of_voice || null,
      formality_level: brandTemplate.formality_level || null,
      language_style: brandTemplate.language_style || null,
      preferred_words: brandTemplate.preferred_words || null,
      forbidden_words: brandTemplate.forbidden_words || null,
      allow_emoji: brandTemplate.allow_emoji ?? true,
      user_id: currentOrganization ? null : user.id,
      organization_id: currentOrganization?.id || null,
    });
  };

  return {
    variants,
    loading,
    refetch: fetchVariants,
    createVariant,
    updateVariant,
    deleteVariant,
    setControlVariant,
    createControlFromBrand,
    hasControl: variants.some(v => v.is_control),
  };
}
