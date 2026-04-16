// ============================================
// BATCH CAROUSEL IMAGE GENERATION (Background)
// Generates all slide images sequentially,
// updates generation_tasks progress in realtime
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { updateTaskProgress, completeTask, failTask } from "../_shared/task-tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { taskId, carouselId, slides, brandColors, carouselStyle, visualPreset, platform, carouselTopic, seriesBible, siblingsSummary } = body;

  if (!taskId || !carouselId || !slides?.length) {
    return new Response(
      JSON.stringify({ error: "taskId, carouselId, and slides are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Return immediately — processing happens in the background
  const responsePromise = (async () => {
    const totalSlides = slides.length;
    let successCount = 0;
    let failCount = 0;
    const results: { slideNumber: number; success: boolean; imageUrl?: string; error?: string }[] = [];

    try {
      await updateTaskProgress(supabase, taskId, 0, `Bắt đầu tạo ${totalSlides} ảnh...`, 'starting', 'generating');

      // Resolve organizationId from carousel
      let organizationId: string | undefined;
      try {
        const { data: carouselData } = await supabase
          .from('carousels')
          .select('organization_id')
          .eq('id', carouselId)
          .maybeSingle();
        organizationId = carouselData?.organization_id || undefined;
      } catch (e) {
        console.warn('[batch] Could not resolve organizationId:', e);
      }

      // Process slides sequentially (to avoid rate limits)
      for (let i = 0; i < totalSlides; i++) {
        const slide = slides[i];
        const slideNum = slide.slideNumber || (i + 1);
        const progress = Math.round((i / totalSlides) * 100);

        await updateTaskProgress(
          supabase,
          taskId,
          progress,
          `Đang tạo ảnh slide ${slideNum}/${totalSlides}...`,
          `slide_${slideNum}`,
          'generating'
        );

        // Call the single-slide edge function internally
        const MAX_ATTEMPTS = 3;
        let slideSuccess = false;
        let slideImageUrl: string | undefined;
        let slideError: string | undefined;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            console.log(`[batch] Slide ${slideNum} attempt ${attempt}/${MAX_ATTEMPTS}`);
            
            const response = await fetch(`${supabaseUrl}/functions/v1/generate-carousel-image`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                prompt: slide.fullPrompt,
                carouselId,
                slideNumber: slideNum,
                textContent: slide.textContent,
                platform: platform || 'facebook',
                brandColors,
                carouselStyle: carouselStyle || 'educational',
                totalSlides,
                slideObjective: slide.objective,
                visualPreset: visualPreset || 'minimalist',
                carouselTopic,
                seamlessContext: {
                  colorPalette: null,
                  previousSceneDescription: seriesBible || null,
                  siblingSlidesSummary: siblingsSummary || null,
                  sequencePosition: slideNum,
                  totalInSequence: totalSlides,
                },
              }),
            });

            if (!response.ok) {
              const errText = await response.text().catch(() => 'Unknown error');
              throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
            }

            const data = await response.json();
            if (data.error) {
              throw new Error(data.error);
            }

            if (data.imageUrl) {
              slideImageUrl = data.imageUrl;
              slideSuccess = true;

              // Save to carousel_images table
              await supabase
                .from('carousel_images')
                .update({ is_selected: false })
                .eq('carousel_id', carouselId)
                .eq('slide_number', slideNum);

              await supabase
                .from('carousel_images')
                .insert({
                  carousel_id: carouselId,
                  slide_number: slideNum,
                  image_url: slideImageUrl,
                  prompt: slide.fullPrompt,
                  is_selected: true,
                  created_by: body.userId || null,
                  organization_id: organizationId || null,
                });

              break; // Success, no more retries
            }
          } catch (err) {
            slideError = err instanceof Error ? err.message : String(err);
            console.error(`[batch] Slide ${slideNum} attempt ${attempt} failed:`, slideError);
            
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(r => setTimeout(r, 3000 * attempt));
            }
          }
        }

        if (slideSuccess) {
          successCount++;
        } else {
          failCount++;
        }

        results.push({
          slideNumber: slideNum,
          success: slideSuccess,
          imageUrl: slideImageUrl,
          error: slideError,
        });

        // Brief delay between slides
        if (i < totalSlides - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      // Update result_metadata
      const metadata = { successCount, failCount, totalSlides, results };
      
      try {
        await supabase
          .from('generation_tasks')
          .update({ result_metadata: metadata })
          .eq('id', taskId);
      } catch (e) {
        console.warn('[batch] Failed to save result_metadata:', e);
      }

      if (successCount === 0) {
        await failTask(supabase, taskId, `Tất cả ${totalSlides} slide đều thất bại`);
      } else {
        // Use carousel ID as result_id, carousel_images as result_type
        await completeTask(supabase, taskId, carouselId, 'carousel_images' as any);
        
        // Update progress message to show final count
        await updateTaskProgress(
          supabase,
          taskId,
          100,
          `Hoàn thành: ${successCount}/${totalSlides} ảnh`,
          'completed',
          'completed'
        );
      }

      console.log(`[batch] Done: ${successCount}/${totalSlides} success, ${failCount} failed`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[batch] Fatal error:', errMsg);
      await failTask(supabase, taskId, errMsg);
    }
  })();

  // Use waitUntil if available (Deno Deploy), otherwise fire-and-forget
  try {
    const ctx = (Deno as any).serve?.context;
    if (ctx?.waitUntil) {
      ctx.waitUntil(responsePromise);
    }
  } catch {
    // fire-and-forget — the async function runs in background
  }

  return new Response(
    JSON.stringify({ ok: true, taskId, message: "Background generation started" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
