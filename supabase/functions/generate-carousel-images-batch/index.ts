// ============================================
// BATCH CAROUSEL IMAGE GENERATION (Background)
// Sequential V2: Each slide N waits for slide N-1 and uses
// its actual scene description + image URL for true seamless continuity.
// Auto-triggers seamless validation when done.
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
    const successUrls: string[] = []; // for post-batch seamless validation

    // === Sequential scene chain state ===
    // Captures the ACTUAL previous slide's scene + image, so seamless context is real.
    let previousSceneDescription: string | null = seriesBible || null;
    let previousImageUrl: string | null = null;
    // Rolling window of last 2 slides' descriptions to limit drift
    const recentScenes: string[] = [];

    try {
      await updateTaskProgress(supabase, taskId, 0, `Bắt đầu tạo ${totalSlides} ảnh...`, 'starting', 'generating');

      // Mark carousel as using sequential_v2 mode + clear any stale flag
      try {
        await supabase
          .from('carousels')
          .update({
            generation_mode: 'sequential_v2',
            needs_regeneration: false,
            seamless_score: null,
            seamless_issues: null,
          })
          .eq('id', carouselId);
      } catch (e) {
        console.warn('[batch] Could not mark generation_mode:', e);
      }

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

      // Process slides STRICTLY sequentially (slide N waits for slide N-1).
      // This is mandatory for seamless continuity — see plan layer 1.
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

        // Build seamless context from PREVIOUS slide's actual output (not from a static seriesBible).
        // For slide 1, fall back to seriesBible (no previous slide exists yet).
        const accumulatedChain = recentScenes.length > 0
          ? `Recent slides in this carousel: ${recentScenes.map((s, idx) => `[${idx + 1}] ${s}`).join(' | ')}`
          : null;

        const slideSeamlessContext = {
          colorPalette: null,
          previousSceneDescription: previousSceneDescription, // ACTUAL previous slide scene (or seriesBible for slide 1)
          siblingSlidesSummary: accumulatedChain || siblingsSummary || null,
          sequencePosition: slideNum,
          totalInSequence: totalSlides,
        };

        const MAX_ATTEMPTS = 3;
        let slideSuccess = false;
        let slideImageUrl: string | undefined;
        let slideSceneDescription: string | null = null;
        let slideError: string | undefined;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            console.log(`[batch] Slide ${slideNum} attempt ${attempt}/${MAX_ATTEMPTS} (prevImage=${previousImageUrl ? 'yes' : 'no'})`);

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
                // Pass previous slide image for img2img continuity (slide 2..N only)
                previousImageUrl: slideNum > 1 ? previousImageUrl : null,
                seamlessContext: slideSeamlessContext,
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
              slideSceneDescription = data.sceneDescription || null;
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

              break; // Success
            }
          } catch (err) {
            slideError = err instanceof Error ? err.message : String(err);
            console.error(`[batch] Slide ${slideNum} attempt ${attempt} failed:`, slideError);

            if (attempt < MAX_ATTEMPTS) {
              await new Promise(r => setTimeout(r, 3000 * attempt));
            }
          }
        }

        if (slideSuccess && slideImageUrl) {
          successCount++;
          successUrls.push(slideImageUrl);

          // === Update chain state for NEXT slide ===
          // Prefer AI-returned sceneDescription. Fallback to slide objective + first 100 chars of prompt.
          const nextSceneDesc = slideSceneDescription
            || slide.objective
            || (slide.fullPrompt ? String(slide.fullPrompt).slice(0, 200) : null);

          previousSceneDescription = nextSceneDesc;
          previousImageUrl = slideImageUrl;

          // Maintain rolling window of last 2 scenes (avoid drift from slide 1)
          if (nextSceneDesc) {
            recentScenes.push(`Slide ${slideNum}: ${nextSceneDesc.slice(0, 150)}`);
            if (recentScenes.length > 2) recentScenes.shift();
          }
        } else {
          failCount++;
          // Do NOT update chain state on failure — keep last successful slide as anchor
        }

        results.push({
          slideNumber: slideNum,
          success: slideSuccess,
          imageUrl: slideImageUrl,
          error: slideError,
        });

        // Brief delay between slides to avoid provider rate limits
        if (i < totalSlides - 1) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      // === Post-batch: persist metadata ===
      const metadata = { successCount, failCount, totalSlides, results, generationMode: 'sequential_v2' };

      try {
        await supabase
          .from('generation_tasks')
          .update({ result_metadata: metadata })
          .eq('id', taskId);
      } catch (e) {
        console.warn('[batch] Failed to save result_metadata:', e);
      }

      // === AUTO seamless validation (anti silent-failure) ===
      // Only when 2+ slides succeeded and style is seamless (or always for V2 to detect drift).
      if (successCount >= 2) {
        try {
          await updateTaskProgress(
            supabase,
            taskId,
            98,
            `Đang kiểm tra tính liên tục thị giác...`,
            'validating',
            'generating'
          );

          const validationResp = await fetch(`${supabaseUrl}/functions/v1/validate-seamless-consistency`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ carouselId, slideImageUrls: successUrls }),
          });

          if (validationResp.ok) {
            const validation = await validationResp.json();
            const score = validation?.consistency?.overallScore ?? null;
            const issues = validation?.consistency?.issues || [];
            const needsRegen = typeof score === 'number' && score < 60;

            await supabase
              .from('carousels')
              .update({
                seamless_score: score,
                seamless_issues: issues.length ? { issues, suggestion: validation?.consistency?.suggestion } : null,
                needs_regeneration: needsRegen,
              })
              .eq('id', carouselId);

            console.log(`[batch] Seamless validation: score=${score}, needsRegen=${needsRegen}`);
          } else {
            console.warn('[batch] Seamless validation HTTP error:', validationResp.status);
          }
        } catch (vErr) {
          console.warn('[batch] Seamless validation failed (non-fatal):', vErr);
        }
      }

      if (successCount === 0) {
        await failTask(supabase, taskId, `Tất cả ${totalSlides} slide đều thất bại`);
      } else {
        await completeTask(supabase, taskId, carouselId, 'carousel_images' as any);

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
    JSON.stringify({ ok: true, taskId, message: "Background generation started (sequential v2)" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
