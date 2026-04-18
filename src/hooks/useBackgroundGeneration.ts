import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================
// BACKGROUND GENERATION HOOK
// Uses Realtime subscription for instant updates
// ============================================

export type TaskType = 'core_content' | 'multichannel' | 'carousel_image';
export type TaskStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GenerationTask {
  id: string;
  user_id: string;
  organization_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  progress: number;
  progress_message: string | null;
  current_step: string | null;
  input_params: Record<string, unknown>;
  result_id: string | null;
  result_type: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface UseBackgroundGenerationOptions {
  onTaskComplete?: (task: GenerationTask) => void;
  onTaskError?: (task: GenerationTask) => void;
  onTaskProgress?: (task: GenerationTask) => void;
  enableFallbackPolling?: boolean; // Default: true
}

const FALLBACK_POLL_INTERVAL = 30000; // 30 seconds fallback
const STALE_TASK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes — auto-dismiss zombies

export function useBackgroundGeneration(options: UseBackgroundGenerationOptions = {}) {
  const { user } = useAuth();
  const [activeTasks, setActiveTasks] = useState<GenerationTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<GenerationTask[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Check for active tasks on mount
  const checkActiveTasks = useCallback(async () => {
    if (!user?.id) {
      setIsChecking(false);
      return;
    }

    try {
      const { data: tasks, error } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'generating'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useBackgroundGeneration] Error fetching tasks:', error);
        setIsChecking(false);
        return;
      }

      // Auto-recover zombie tasks: anything stuck for >10min with no update.
      // Mark as failed in DB so it disappears from UI everywhere, not just locally.
      const allTasks = (tasks as GenerationTask[]) || [];
      const now = Date.now();
      const stale: GenerationTask[] = [];
      const fresh: GenerationTask[] = [];
      for (const t of allTasks) {
        const updatedMs = new Date(t.updated_at).getTime();
        if (now - updatedMs > STALE_TASK_THRESHOLD_MS) {
          stale.push(t);
        } else {
          fresh.push(t);
        }
      }

      if (stale.length > 0) {
        console.warn(`[useBackgroundGeneration] Auto-recovering ${stale.length} stale task(s)`);
        // Fire-and-forget: don't block UI on cleanup
        supabase
          .from('generation_tasks')
          .update({
            status: 'failed',
            error_message: 'Auto-recovered: stale background task',
            completed_at: new Date().toISOString(),
          })
          .in('id', stale.map(t => t.id))
          .then(({ error: updErr }) => {
            if (updErr) console.warn('[useBackgroundGeneration] Stale recovery failed:', updErr);
          });
      }

      setActiveTasks(fresh);
      setIsChecking(false);
    } catch (err) {
      console.error('[useBackgroundGeneration] Error:', err);
      setIsChecking(false);
    }
  }, [user?.id]);

  // Handle realtime changes
  const handleRealtimeChange = useCallback(
    (payload: RealtimePostgresChangesPayload<GenerationTask>) => {
      const { eventType } = payload;

      if (eventType === 'INSERT') {
        const task = payload.new as GenerationTask;
        if (task.status === 'pending' || task.status === 'generating') {
          setActiveTasks(prev => {
            if (prev.some(t => t.id === task.id)) return prev;
            return [task, ...prev];
          });
        }
      }

      if (eventType === 'UPDATE') {
        const task = payload.new as GenerationTask;

        if (task.status === 'completed') {
          setActiveTasks(prev => prev.filter(t => t.id !== task.id));
          setCompletedTasks(prev => [task, ...prev].slice(0, 10));
          optionsRef.current.onTaskComplete?.(task);
        } else if (task.status === 'failed') {
          setActiveTasks(prev => prev.filter(t => t.id !== task.id));
          setCompletedTasks(prev => [task, ...prev].slice(0, 10));
          optionsRef.current.onTaskError?.(task);
        } else {
          // Still active - update progress
          setActiveTasks(prev =>
            prev.map(t => (t.id === task.id ? task : t))
          );
          optionsRef.current.onTaskProgress?.(task);
        }
      }

      if (eventType === 'DELETE') {
        const taskId = (payload.old as { id?: string })?.id;
        if (taskId) {
          setActiveTasks(prev => prev.filter(t => t.id !== taskId));
          setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
        }
      }
    },
    []
  );

  // Create a new background task
  const createTask = useCallback(async (
    taskType: TaskType,
    inputParams: Record<string, unknown>,
    organizationId?: string
  ): Promise<GenerationTask | null> => {
    if (!user?.id) {
      console.error('[useBackgroundGeneration] Not authenticated');
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: task, error } = await (supabase
        .from('generation_tasks') as any)
        .insert({
          user_id: user.id,
          organization_id: organizationId || null,
          task_type: taskType,
          status: 'pending',
          progress: 0,
          input_params: inputParams,
        })
        .select()
        .single();

      if (error) {
        console.error('[useBackgroundGeneration] Create task error:', error);
        return null;
      }

      const newTask = task as GenerationTask;
      // Note: Realtime subscription will handle adding to activeTasks
      return newTask;
    } catch (err) {
      console.error('[useBackgroundGeneration] Create task error:', err);
      return null;
    }
  }, [user?.id]);

  // Get task result by ID
  const getTaskResult = useCallback(async (taskId: string) => {
    try {
      const { data: task, error } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        console.error('[useBackgroundGeneration] Get task error:', error);
        return null;
      }

      const typedTask = task as GenerationTask;

      if (typedTask.status !== 'completed' || !typedTask.result_id) {
        return null;
      }

      // Fetch actual result based on type
      if (typedTask.result_type === 'core_contents') {
        const { data } = await supabase
          .from('core_contents')
          .select('*')
          .eq('id', typedTask.result_id)
          .single();
        return { type: 'core_content' as const, data, task: typedTask };
      } else if (typedTask.result_type === 'multi_channel_contents') {
        const { data } = await supabase
          .from('multi_channel_contents')
          .select('*')
          .eq('id', typedTask.result_id)
          .single();
        return { type: 'multichannel' as const, data, task: typedTask };
      } else if (typedTask.result_type === 'carousel_images') {
        // For carousel images, result_id is the carousel_id
        const { data } = await supabase
          .from('carousel_images')
          .select('*')
          .eq('carousel_id', typedTask.result_id)
          .eq('is_selected', true)
          .order('slide_number', { ascending: true });
        return { type: 'carousel_image' as const, data, task: typedTask };
      }

      return null;
    } catch (err) {
      console.error('[useBackgroundGeneration] Get result error:', err);
      return null;
    }
  }, []);

  // Clear completed tasks
  const clearCompletedTasks = useCallback(() => {
    setCompletedTasks([]);
  }, []);

  // Dismiss a specific task (delete from DB if pending, or just remove from local state)
  const dismissTask = useCallback(async (taskId: string) => {
    try {
      // Try to delete from DB
      await supabase
        .from('generation_tasks')
        .delete()
        .eq('id', taskId);
      
      // Note: Realtime subscription will handle removing from state
      // But we also update locally for immediate feedback
      setActiveTasks(prev => prev.filter(t => t.id !== taskId));
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('[useBackgroundGeneration] Dismiss task error:', err);
    }
  }, []);

  // Retry a failed task by creating a new task with same input_params
  const retryTask = useCallback(async (taskId: string): Promise<GenerationTask | null> => {
    if (!user?.id) return null;

    try {
      // Fetch the failed task to get input_params
      const { data: failedTask, error: fetchError } = await supabase
        .from('generation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError || !failedTask) {
        console.error('[useBackgroundGeneration] Failed task not found');
        return null;
      }

      const typedTask = failedTask as GenerationTask;
      
      if (typedTask.status !== 'failed') {
        console.error('[useBackgroundGeneration] Task is not failed, cannot retry');
        return null;
      }

      // Create new task with same input_params
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newTask, error: createError } = await (supabase
        .from('generation_tasks') as any)
        .insert({
          user_id: user.id,
          organization_id: typedTask.organization_id,
          task_type: typedTask.task_type,
          status: 'pending',
          progress: 0,
          input_params: typedTask.input_params,
        })
        .select()
        .single();

      if (createError || !newTask) {
        console.error('[useBackgroundGeneration] Retry create error:', createError);
        return null;
      }

      // Delete the old failed task
      await supabase
        .from('generation_tasks')
        .delete()
        .eq('id', taskId);

      // Remove from local state immediately
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));

      // Trigger the edge function
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (accessToken) {
        const endpoint = typedTask.task_type === 'core_content' 
          ? 'generate-core-content' 
          : typedTask.task_type === 'carousel_image'
            ? 'generate-carousel-images-batch'
            : 'generate-multichannel';
          
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ...typedTask.input_params,
            stream: true,
            taskId: newTask.id,
          }),
        }).catch(err => console.warn('[retryTask] Edge function call error:', err));
      }

      return newTask as GenerationTask;
    } catch (err) {
      console.error('[useBackgroundGeneration] Retry error:', err);
      return null;
    }
  }, [user?.id]);

  // Initial check on mount
  useEffect(() => {
    checkActiveTasks();
  }, [checkActiveTasks]);

  // Set up Realtime subscription with error suppression
  useEffect(() => {
    if (!user?.id) return;

    let errorCount = 0;
    const MAX_LOGGED_ERRORS = 2;

    const channel = supabase
      .channel(`generation_tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleRealtimeChange(payload as RealtimePostgresChangesPayload<GenerationTask>);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          errorCount = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          if (errorCount < MAX_LOGGED_ERRORS) {
            console.warn('[useBackgroundGeneration] Realtime unavailable, using polling fallback');
            errorCount++;
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, handleRealtimeChange]);

  // Optional fallback polling for reliability
  useEffect(() => {
    const enableFallback = optionsRef.current.enableFallbackPolling !== false;
    if (!enableFallback || activeTasks.length === 0) return;

    const fallbackInterval = setInterval(() => {
      checkActiveTasks();
    }, FALLBACK_POLL_INTERVAL);

    return () => clearInterval(fallbackInterval);
  }, [activeTasks.length, checkActiveTasks]);

  return {
    activeTasks,
    completedTasks,
    isChecking,
    isConnected,
    hasActiveTasks: activeTasks.length > 0,
    createTask,
    getTaskResult,
    clearCompletedTasks,
    dismissTask,
    retryTask,
    refresh: checkActiveTasks,
  };
}
