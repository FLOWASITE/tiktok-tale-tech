// ============================================
// Carousel Image Batch Launcher
// Background-safe — kicks off image generation independent of any mounted UI.
// Used by both CarouselGenerationContext (auto when stream completes) and
// CarouselGenerationTracker (when user is actively viewing).
// ============================================

import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselSlide } from '@/types/carousel';

export async function extractBrandColorsWithFallback(
  carousel: Carousel,
): Promise<{ textColor?: string; backgroundColor?: string } | undefined> {
  if (carousel.brand_guideline) {
    try {
      const parsed = typeof carousel.brand_guideline === 'string'
        ? JSON.parse(carousel.brand_guideline)
        : carousel.brand_guideline;
      if (parsed?.primaryColor) {
        return {
          textColor: parsed.primaryColor,
          backgroundColor: parsed.secondaryColors?.[0] || parsed.backgroundColor,
        };
      }
      if (parsed?.colors || parsed?.textColor) {
        return {
          textColor: parsed.textColor || parsed.colors?.text || parsed.colors?.primary,
          backgroundColor: parsed.backgroundColor || parsed.colors?.background || parsed.colors?.secondary,
        };
      }
    } catch {
      const hexColors = (carousel.brand_guideline as string).match(/#[0-9A-Fa-f]{3,8}/g);
      if (hexColors && hexColors.length >= 2) return { textColor: hexColors[0], backgroundColor: hexColors[1] };
      if (hexColors && hexColors.length === 1) return { textColor: hexColors[0] };
    }
  }

  try {
    let template: any = null;
    if (carousel.brand_template_id) {
      const { data } = await supabase
        .from('brand_templates')
        .select('primary_color, secondary_colors')
        .eq('id', carousel.brand_template_id)
        .single();
      template = data;
    }
    if (!template && carousel.brand_name) {
      const { data } = await supabase
        .from('brand_templates')
        .select('primary_color, secondary_colors')
        .or(`brand_name.eq.${carousel.brand_name},name.eq.${carousel.brand_name}`)
        .limit(1)
        .maybeSingle();
      template = data;
    }
    if (template?.primary_color) {
      return {
        textColor: template.primary_color,
        backgroundColor: (template.secondary_colors as string[])?.[0],
      };
    }
  } catch (err) {
    console.warn('[imageGenLauncher] brand fallback failed:', err);
  }

  return undefined;
}

/**
 * Build a comprehensive "Series Bible" from ALL slides' prompts.
 */
export function buildSeriesBible(slides: CarouselSlide[]): string {
  const consistencyParts: string[] = [];
  slides.forEach(s => {
    const match = s.fullPrompt?.match(/consistent with (?:previous slides|series):\s*(.+?)$/im);
    if (match) consistencyParts.push(match[1].trim());
  });
  const uniqueParts = [...new Set(consistencyParts)];
  const slide1Prompt = slides[0]?.fullPrompt || '';

  return [
    `SERIES VISUAL BIBLE (applies to ALL slides):`,
    uniqueParts.length > 0
      ? `Visual world: ${uniqueParts.join('. ')}.`
      : `Visual world: ${slides[0]?.designStyle || 'professional photography'}.`,
    `Total slides in series: ${slides.length}.`,
    `All slides share the SAME: lighting direction, color temperature, photography style, environment/setting, and visual mood.`,
    `DIFFERENTIATION: Each slide MUST use a DIFFERENT camera angle (wide/medium/close-up/overhead/side), focal subject, and composition while staying in the same visual world. No two slides should look alike.`,
    `Reference scene (slide 1): "${slide1Prompt.slice(0, 200)}..."`,
  ].join('\n');
}

interface LaunchResult {
  taskId: string | null;
  alreadyRunning: boolean;
  error?: string;
}

/**
 * Launch carousel image batch generation in the background.
 * Idempotent: checks for existing pending/generating task for this carousel first.
 * Returns taskId if launched (or already-running task ID if found).
 *
 * Edge function `generate-carousel-images-batch` is background-safe
 * (uses EdgeRuntime.waitUntil), so it will complete even if the client
 * disconnects right after this call resolves.
 */
export async function launchCarouselImageBatch(
  carousel: Carousel,
  userId: string,
  organizationId?: string,
): Promise<LaunchResult> {
  if (!carousel?.id || !carousel.slides_content?.length) {
    return { taskId: null, alreadyRunning: false, error: 'Invalid carousel' };
  }

  // 1. Idempotency check — don't double-launch
  try {
    const { data: existing } = await (supabase
      .from('generation_tasks') as any)
      .select('id, status, input_params')
      .eq('user_id', userId)
      .eq('task_type', 'carousel_image')
      .in('status', ['pending', 'generating'])
      .order('created_at', { ascending: false })
      .limit(20);

    const match = (existing || []).find((t: any) => t.input_params?.carouselId === carousel.id);
    if (match) {
      console.log('[imageGenLauncher] Existing task found, skip launch:', match.id);
      return { taskId: match.id, alreadyRunning: true };
    }
  } catch (err) {
    console.warn('[imageGenLauncher] Existing-task check failed (continuing):', err);
  }

  // 2. Build inputs
  const brandColors = await extractBrandColorsWithFallback(carousel);
  const seriesBible = buildSeriesBible(carousel.slides_content);
  const siblingsSummary = carousel.slides_content
    .map(s => `Slide ${s.slideNumber}: ${s.objective}`)
    .join(' | ');

  // 3. Create DB task row
  const { data: task, error } = await (supabase
    .from('generation_tasks') as any)
    .insert({
      user_id: userId,
      organization_id: organizationId || null,
      task_type: 'carousel_image',
      status: 'pending',
      progress: 0,
      input_params: {
        carouselId: carousel.id,
        slides: carousel.slides_content,
        brandColors,
        carouselStyle: carousel.carousel_style,
        visualPreset: carousel.visual_preset || 'minimalist',
        platform: carousel.platform,
        carouselTopic: carousel.topic,
        seriesBible,
        siblingsSummary,
        userId,
      },
    })
    .select()
    .single();

  if (error || !task) {
    console.error('[imageGenLauncher] Create task failed:', error);
    return { taskId: null, alreadyRunning: false, error: error?.message || 'Create task failed' };
  }

  // 4. Fire-and-forget edge function — background-safe via EdgeRuntime.waitUntil
  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-carousel-images-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken || ''}`,
      },
      body: JSON.stringify({
        taskId: task.id,
        carouselId: carousel.id,
        slides: carousel.slides_content,
        brandColors,
        carouselStyle: carousel.carousel_style,
        visualPreset: carousel.visual_preset || 'minimalist',
        platform: carousel.platform,
        carouselTopic: carousel.topic,
        seriesBible,
        siblingsSummary,
        userId,
      }),
    }).catch(err => console.warn('[imageGenLauncher] fire-and-forget edge call error:', err));
  } catch (err) {
    console.warn('[imageGenLauncher] Failed to invoke edge function:', err);
  }

  return { taskId: task.id, alreadyRunning: false };
}
