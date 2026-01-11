// ============================================
// SHARED TASK TRACKING HELPERS
// Updates generation_tasks table for background processing
// ============================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type TaskStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ResultType = 'core_contents' | 'multi_channel_contents';

/**
 * Update task progress in the database
 */
export async function updateTaskProgress(
  supabase: SupabaseClient,
  taskId: string | undefined,
  progress: number,
  message: string,
  step: string,
  status: TaskStatus = 'generating'
): Promise<void> {
  if (!taskId) return;
  
  try {
    const updateData: Record<string, unknown> = {
      status,
      progress,
      progress_message: message,
      current_step: step,
    };
    
    if (status === 'generating' && progress === 0) {
      updateData.started_at = new Date().toISOString();
    }
    
    await supabase
      .from('generation_tasks')
      .update(updateData)
      .eq('id', taskId);
  } catch (err) {
    console.warn(`[TaskTracking] Failed to update progress:`, err);
  }
}

/**
 * Mark task as completed with result reference
 */
export async function completeTask(
  supabase: SupabaseClient,
  taskId: string | undefined,
  resultId: string,
  resultType: ResultType
): Promise<void> {
  if (!taskId) return;
  
  try {
    await supabase
      .from('generation_tasks')
      .update({
        status: 'completed',
        progress: 100,
        progress_message: 'Hoàn thành',
        result_id: resultId,
        result_type: resultType,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);
      
    console.log(`[TaskTracking] Task ${taskId} completed with result ${resultId}`);
  } catch (err) {
    console.warn(`[TaskTracking] Failed to complete task:`, err);
  }
}

/**
 * Mark task as failed with error message
 */
export async function failTask(
  supabase: SupabaseClient,
  taskId: string | undefined,
  errorMessage: string
): Promise<void> {
  if (!taskId) return;
  
  try {
    await supabase
      .from('generation_tasks')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);
      
    console.log(`[TaskTracking] Task ${taskId} failed: ${errorMessage}`);
  } catch (err) {
    console.warn(`[TaskTracking] Failed to fail task:`, err);
  }
}
