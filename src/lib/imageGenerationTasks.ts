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

    if (!userId) {
      console.warn('[imageGenerationTasks] No userId — skipping task tracking, will still call generate-brand-image');
      return null;
    }
    if (!contentId || !channel) {
      console.warn('[imageGenerationTasks] Missing contentId/channel — skipping task tracking', { contentId, channel });
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
      // Best-effort: log loud nhưng KHÔNG block pipeline. generate-brand-image vẫn sẽ được gọi với taskId=null.
      console.warn('[imageGenerationTasks] ⚠ Failed to create image task (pipeline will continue):', {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        contentId,
        channel,
        brandTemplateId,
        userId,
        organizationId: organizationId || null,
      });
      return null;
    }

    console.log('[imageGenerationTasks] ✓ Task created', { taskId: data?.id, contentId, channel });
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