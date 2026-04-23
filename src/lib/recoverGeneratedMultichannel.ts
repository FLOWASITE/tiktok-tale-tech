import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type GenerationTaskRow = Database['public']['Tables']['generation_tasks']['Row'];
type MultiChannelContentRow = Database['public']['Tables']['multi_channel_contents']['Row'];

const RECOVERABLE_MULTICHANNEL_ERROR_PATTERN = /abort|aborted|network error|failed to fetch|request failed before receiving a response|timeout|timed out|stream.*closed|body stream|load failed|fetch failed/i;

export interface RecoveredMultichannelResult {
  content: MultiChannelContentRow | null;
  source: 'task_result' | 'recent_content' | null;
  task: GenerationTaskRow | null;
}

export function isRecoverableMultichannelError(message: string | null | undefined): boolean {
  return !!message && RECOVERABLE_MULTICHANNEL_ERROR_PATTERN.test(message);
}

async function fetchTask(taskId: string): Promise<GenerationTaskRow | null> {
  const { data } = await supabase
    .from('generation_tasks')
    .select('*')
    .eq('id', taskId)
    .maybeSingle();

  return data ?? null;
}

async function fetchContentById(contentId: string): Promise<MultiChannelContentRow | null> {
  const { data } = await supabase
    .from('multi_channel_contents')
    .select('*')
    .eq('id', contentId)
    .maybeSingle();

  return data ?? null;
}

async function fetchLatestMatchingContent(params: {
  userId?: string | null;
  organizationId?: string | null;
  topic?: string | null;
  createdAfterIso: string;
}): Promise<MultiChannelContentRow | null> {
  const { userId, organizationId, topic, createdAfterIso } = params;

  if (!userId || !topic?.trim()) {
    return null;
  }

  let query = supabase
    .from('multi_channel_contents')
    .select('*')
    .eq('user_id', userId)
    .eq('topic', topic)
    .gte('created_at', createdAfterIso)
    .order('created_at', { ascending: false })
    .limit(1);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

export async function waitForRecoveredMultichannel(options: {
  taskId: string;
  userId?: string | null;
  organizationId?: string | null;
  topic?: string | null;
  timeoutMs?: number;
  pollIntervalMs?: number;
  recentWindowMs?: number;
}): Promise<RecoveredMultichannelResult> {
  const {
    taskId,
    userId,
    organizationId,
    topic,
    timeoutMs = 60_000,
    pollIntervalMs = 3_000,
    recentWindowMs = 15 * 60_000,
  } = options;

  const deadline = Date.now() + timeoutMs;
  const createdAfterIso = new Date(Date.now() - recentWindowMs).toISOString();

  while (Date.now() <= deadline) {
    const task = await fetchTask(taskId);

    if (task?.status === 'completed' && task.result_id) {
      const content = await fetchContentById(task.result_id);
      if (content) {
        return { content, source: 'task_result', task };
      }
    }

    const fallbackContent = await fetchLatestMatchingContent({
      userId,
      organizationId,
      topic,
      createdAfterIso,
    });

    if (fallbackContent) {
      return { content: fallbackContent, source: 'recent_content', task };
    }

    if (task?.status === 'failed') {
      return { content: null, source: null, task };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return {
    content: null,
    source: null,
    task: await fetchTask(taskId),
  };
}