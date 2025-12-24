import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneratedHook } from '@/types/hook';
import { toast } from 'sonner';

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
}

interface GenerateOptions {
  topic: string;
  brandVoice?: BrandVoice;
  platform?: string;
  duration?: string;
  count?: number;
}

export function useHookGenerator() {
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateHooks = useCallback(async (options: GenerateOptions) => {
    const { topic, brandVoice, platform, duration, count = 5 } = options;
    
    if (!topic.trim()) {
      toast.error('Vui lòng nhập chủ đề');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useHookGenerator] Generating hooks for:', topic);
      
      const { data, error: fnError } = await supabase.functions.invoke('generate-hooks', {
        body: {
          topic,
          brandVoice,
          platform,
          duration,
          count,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate hooks');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const generatedHooks = data?.hooks || [];
      setHooks(generatedHooks);
      
      if (generatedHooks.length > 0) {
        toast.success(`Đã tạo ${generatedHooks.length} hook`);
      }
      
      return generatedHooks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo hooks';
      console.error('[useHookGenerator] Error:', err);
      setError(message);
      toast.error(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHooks = useCallback(() => {
    setHooks([]);
    setError(null);
  }, []);

  return {
    hooks,
    loading,
    error,
    generateHooks,
    clearHooks,
  };
}
