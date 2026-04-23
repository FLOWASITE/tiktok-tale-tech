import { supabase } from '@/integrations/supabase/client';
import type { Channel } from '@/types/multichannel';

export interface RecoveredBrandImage {
  imageUrl: string;
  prompt?: string | null;
  aspectRatio?: string | null;
  generatedAt?: string | null;
  source: 'history' | 'content_json';
}

type ImageGenerationTaskStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'unknown';

export interface BrandImageRecoveryStatus {
  image: RecoveredBrandImage | null;
  taskStatus: ImageGenerationTaskStatus;
  taskId?: string | null;
}

const RECOVERABLE_IMAGE_ERROR_PATTERN = /timed out|timeout|request failed before receiving a response|network error|failed to fetch|504|aborted|clone failed/i;

export function isRecoverableBrandImageError(message: string | null | undefined): boolean {
  return !!message && RECOVERABLE_IMAGE_ERROR_PATTERN.test(message);
}

async function fetchRecoveredImage(contentId: string, channel: Channel): Promise<RecoveredBrandImage | null> {
  const [{ data: historyRow }, { data: contentRow }] = await Promise.all([
    supabase
      .from('channel_image_history')
      .select('image_url, prompt, aspect_ratio, created_at')
      .eq('content_id', contentId)
      .eq('channel', channel)
      .eq('is_selected', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('multi_channel_contents')
      .select('channel_images')
      .eq('id', contentId)
      .maybeSingle(),
  ]);

  if (historyRow?.image_url) {
    return {
      imageUrl: historyRow.image_url,
      prompt: historyRow.prompt,
      aspectRatio: historyRow.aspect_ratio,
      generatedAt: historyRow.created_at,
      source: 'history',
    };
  }

  const contentImage = (contentRow?.channel_images as Record<string, { url?: string; aspectRatio?: string } | undefined> | null)?.[channel];
  if (contentImage?.url) {
    return {
      imageUrl: contentImage.url,
      aspectRatio: contentImage.aspectRatio || null,
      source: 'content_json',
    };
  }

  return null;
}

async function fetchImageTaskStatus(contentId: string, channel: Channel): Promise<{ status: ImageGenerationTaskStatus; taskId?: string | null }> {
  const { data } = await supabase
    .from('generation_tasks')
    .select('id, status')
    .eq('task_type', 'image_generation')
    .contains('input_params', { contentId, channel })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.status) {
    return { status: 'unknown', taskId: data?.id ?? null };
  }

  if (data.status === 'pending' || data.status === 'generating' || data.status === 'completed' || data.status === 'failed') {
    return { status: data.status, taskId: data.id };
  }

  return { status: 'unknown', taskId: data.id };
}

export async function getBrandImageRecoveryStatus(contentId: string, channel: Channel): Promise<BrandImageRecoveryStatus> {
  const [image, task] = await Promise.all([
    fetchRecoveredImage(contentId, channel),
    fetchImageTaskStatus(contentId, channel),
  ]);

  return {
    image,
    taskStatus: task.status,
    taskId: task.taskId,
  };
}

export async function waitForRecoveredBrandImage(
  contentId: string,
  channel: Channel,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<RecoveredBrandImage | null> {
  const { timeoutMs = 20_000, pollIntervalMs = 2_500 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const status = await getBrandImageRecoveryStatus(contentId, channel);
    if (status.image?.imageUrl) {
      return status.image;
    }

    if (status.taskStatus === 'failed') {
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}