import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QualityMode, PromptStyle, HookIntensity, CostPriority } from '@/types/multichannel';

export type { QualityMode, PromptStyle, HookIntensity, CostPriority };

export interface BrandChannelOptimization {
  id: string;
  brand_template_id: string;
  channel: string;
  quality_mode: QualityMode | null;
  prompt_style: PromptStyle | null;
  hook_intensity: HookIntensity | null;
  cost_priority: CostPriority | null;
  preferred_hook_types: string[] | null;
  max_tokens_override: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export type BrandChannelOptimizationInput = Omit<BrandChannelOptimization, 'id' | 'created_at' | 'updated_at'>;

export function useBrandChannelOptimizations(brandTemplateId: string | undefined) {
  const [optimizations, setOptimizations] = useState<BrandChannelOptimization[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchOptimizations = useCallback(async () => {
    if (!brandTemplateId) {
      setOptimizations([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_channel_optimizations')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .order('channel');

      if (error) throw error;
      setOptimizations((data || []) as BrandChannelOptimization[]);
    } catch (error) {
      console.error('Error fetching brand channel optimizations:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải cấu hình tối ưu kênh',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [brandTemplateId, toast]);

  useEffect(() => {
    fetchOptimizations();
  }, [fetchOptimizations]);

  const upsertOptimization = async (input: BrandChannelOptimizationInput) => {
    if (!brandTemplateId) return null;

    try {
      // Check if exists
      const existing = optimizations.find(o => o.channel === input.channel);

      if (existing) {
        const { data, error } = await supabase
          .from('brand_channel_optimizations')
          .update({
            quality_mode: input.quality_mode,
            prompt_style: input.prompt_style,
            hook_intensity: input.hook_intensity,
            cost_priority: input.cost_priority,
            preferred_hook_types: input.preferred_hook_types,
            max_tokens_override: input.max_tokens_override,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        await fetchOptimizations();
        toast({
          title: 'Đã cập nhật',
          description: `Cấu hình tối ưu cho ${input.channel} đã được lưu`,
        });
        return data as BrandChannelOptimization;
      } else {
        const { data, error } = await supabase
          .from('brand_channel_optimizations')
          .insert({
            brand_template_id: brandTemplateId,
            channel: input.channel,
            quality_mode: input.quality_mode,
            prompt_style: input.prompt_style,
            hook_intensity: input.hook_intensity,
            cost_priority: input.cost_priority,
            preferred_hook_types: input.preferred_hook_types,
            max_tokens_override: input.max_tokens_override,
          })
          .select()
          .single();

        if (error) throw error;
        await fetchOptimizations();
        toast({
          title: 'Đã thêm',
          description: `Cấu hình tối ưu cho ${input.channel} đã được tạo`,
        });
        return data as BrandChannelOptimization;
      }
    } catch (error) {
      console.error('Error upserting brand channel optimization:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể lưu cấu hình tối ưu',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteOptimization = async (channel: string) => {
    if (!brandTemplateId) return false;

    try {
      const { error } = await supabase
        .from('brand_channel_optimizations')
        .delete()
        .eq('brand_template_id', brandTemplateId)
        .eq('channel', channel);

      if (error) throw error;
      await fetchOptimizations();
      toast({
        title: 'Đã xoá',
        description: `Cấu hình tối ưu cho ${channel} đã được xoá`,
      });
      return true;
    } catch (error) {
      console.error('Error deleting brand channel optimization:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xoá cấu hình tối ưu',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getOptimizationForChannel = (channel: string) => {
    return optimizations.find(o => o.channel === channel);
  };

  return {
    optimizations,
    loading,
    refetch: fetchOptimizations,
    upsertOptimization,
    deleteOptimization,
    getOptimizationForChannel,
  };
}
