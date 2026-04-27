import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/multichannel';

interface CreateImageGenerationTaskParams {
  contentId?: string;
  channel?: Channel;
  brandTemplateId: string;
  organizationId?: string;
  source: 'auto' | 'manual';
}

export async function createImageGenerationTask({
  contentId,
  channel,
  brandTemplateId,
  organizationId,
  source,
}: CreateImageGenerationTaskParams): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;

    if (!userId || !contentId || !channel) {
      return null;
    }

    const inputParams = {
      contentId,
      channel,
      brandTemplateId,
      source,
    };

    const { data, error } = await (supabase.from('generation_tasks') as any)
      .insert({
        user_id: userId,
        organization_id: organizationId || null,
        task_type: 'image_generation',
        status: 'pending',
        progress: 0,
        input_params: inputParams,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[imageGenerationTasks] Failed to create image task:', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        contentId,
        channel,
        brandTemplateId,
        userId,
      });
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[imageGenerationTasks] Exception creating image task:', msg, {
      contentId,
      channel,
      brandTemplateId,
    });
    return null;
  }
}