import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// BACKGROUND GENERATION HOOK
// Allows generation to continue when user navigates away
// ============================================

export type TaskType = 'core_content' | 'multichannel';
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
  pollIntervalMs?: number;
  onTaskComplete?: (task: GenerationTask) => void;
  onTaskError?: (task: GenerationTask) => void;
}

const DEFAULT_POLL_INTERVAL = 3000; // 3 seconds

export function useBackgroundGeneration(options: UseBackgroundGenerationOptions = {}) {
  const { user } = useAuth();
  const [activeTasks, setActiveTasks] = useState<GenerationTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<GenerationTask[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

      setActiveTasks((tasks as GenerationTask[]) || []);
      setIsChecking(false);
    } catch (err) {
      console.error('[useBackgroundGeneration] Error:', err);
      setIsChecking(false);
    }
  }, [user?.id]);

  // Poll for updates on active tasks
  const pollTasks = useCallback(async () => {
    if (activeTasks.length === 0) return;

    const taskIds = activeTasks.map(t => t.id);
    
    try {
      const { data: updatedTasks, error } = await supabase
        .from('generation_tasks')
        .select('*')
        .in('id', taskIds);

      if (error) {
        console.error('[useBackgroundGeneration] Poll error:', error);
        return;
      }

      if (!updatedTasks) return;

      const stillActive: GenerationTask[] = [];
      const newlyCompleted: GenerationTask[] = [];

      for (const task of updatedTasks as GenerationTask[]) {
        if (task.status === 'pending' || task.status === 'generating') {
          stillActive.push(task);
        } else if (task.status === 'completed') {
          newlyCompleted.push(task);
          optionsRef.current.onTaskComplete?.(task);
        } else if (task.status === 'failed') {
          newlyCompleted.push(task);
          optionsRef.current.onTaskError?.(task);
        }
      }

      setActiveTasks(stillActive);
      if (newlyCompleted.length > 0) {
        setCompletedTasks(prev => [...newlyCompleted, ...prev].slice(0, 10)); // Keep last 10
      }
    } catch (err) {
      console.error('[useBackgroundGeneration] Poll error:', err);
    }
  }, [activeTasks]);

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
      setActiveTasks(prev => [newTask, ...prev]);
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
      
      setActiveTasks(prev => prev.filter(t => t.id !== taskId));
      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('[useBackgroundGeneration] Dismiss task error:', err);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkActiveTasks();
  }, [checkActiveTasks]);

  // Set up polling when there are active tasks
  useEffect(() => {
    if (activeTasks.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const interval = options.pollIntervalMs || DEFAULT_POLL_INTERVAL;
    pollIntervalRef.current = setInterval(pollTasks, interval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeTasks.length, pollTasks, options.pollIntervalMs]);

  return {
    activeTasks,
    completedTasks,
    isChecking,
    hasActiveTasks: activeTasks.length > 0,
    createTask,
    getTaskResult,
    clearCompletedTasks,
    dismissTask,
    refresh: checkActiveTasks,
  };
}
