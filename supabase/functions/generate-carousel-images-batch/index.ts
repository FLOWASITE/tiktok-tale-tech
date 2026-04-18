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
    let batchCreditsExhausted = false;
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

        const MAX_ATTEMPTS = 2;
        let slideSuccess = false;
        let slideImageUrl: string | undefined;
        let slideSceneDescription: string | null = null;
        let slideError: string | undefined;
        let creditsExhausted = false;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          // Per-attempt timeout: 240s. Some providers (GeminiGen Nano Banana 2) can
          // legitimately take ~170s. We were aborting at 150s and retrying, which
          // burned the whole batch budget before any slide could succeed.
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 240_000);

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
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Detect 402 / CREDITS_EXHAUSTED — short-circuit the whole batch.
            // Retrying remaining slides is pointless when all providers are out of credits.
            if (response.status === 402) {
              const errBody = await response.text().catch(() => '');
              let parsedMsg = 'Provider hết credits';
              try {
                const j = JSON.parse(errBody);
                parsedMsg = j.error || parsedMsg;
              } catch { /* ignore */ }
              creditsExhausted = true;
              slideError = parsedMsg;
              console.error(`[batch] Slide ${slideNum} hit 402 — aborting remaining ${totalSlides - slideNum} slides`);
              break;
            }

            if (!response.ok) {
              const errText = await response.text().catch(() => 'Unknown error');
              throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
            }

            const data = await response.json();
            if (data.error) {
              if (data.errorCode === 'CREDITS_EXHAUSTED') {
                creditsExhausted = true;
                slideError = data.error;
                console.error(`[batch] Slide ${slideNum} CREDITS_EXHAUSTED — aborting batch`);
                break;
              }
              throw new Error(data.error);
            }

            if (data.imageUrl) {
              slideImageUrl = data.imageUrl;
              slideSceneDescription = data.sceneDescription || null;
              slideSuccess = true;

              // Save to carousel_images table — persist scene_description for
              // seamless continuity across refresh + single-slide regenerate.
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
                  scene_description: slideSceneDescription,
                  is_selected: true,
                  created_by: body.userId || null,
                  organization_id: organizationId || null,
                });

              break; // Success
            }
          } catch (err) {
            clearTimeout(timeoutId);
            const isAbort = err instanceof Error && (err.name === 'AbortError' || /abort/i.test(err.message));
            slideError = isAbort
              ? `Timeout sau 240s (provider treo) — attempt ${attempt}`
              : (err instanceof Error ? err.message : String(err));
            console.error(`[batch] Slide ${slideNum} attempt ${attempt} failed:`, slideError);

            // Skip retry for non-retryable code-level bugs (ReferenceError,
            // TypeError, "is not defined") — retrying just wastes provider credits.
            const isCodeBug = /ReferenceError|TypeError|is not defined|SyntaxError/i.test(slideError);
            if (isCodeBug) {
              console.warn(`[batch] Slide ${slideNum}: non-retryable code bug detected — aborting retries`);
              break;
            }

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

        // Persist incremental progress so UI sees results slide-by-slide,
        // even if the function gets shut down before completion.
        try {
          const incProgress = Math.round(((i + 1) / totalSlides) * 100);
          await supabase
            .from('generation_tasks')
            .update({
              progress: incProgress,
              progress_message: `Đã xử lý ${i + 1}/${totalSlides} (${successCount} OK, ${failCount} lỗi)`,
              current_step: `slide_${slideNum}_done`,
              result_metadata: { successCount, failCount, totalSlides, results, generationMode: 'sequential_v2' },
            })
            .eq('id', taskId);
        } catch (e) {
          console.warn('[batch] Failed to persist incremental progress:', e);
        }

        // Short-circuit: provider out of credits — skip remaining slides.
        if (creditsExhausted) {
          batchCreditsExhausted = true;
          // Mark all remaining slides as failed in results so UI shows accurate state.
          for (let j = i + 1; j < totalSlides; j++) {
            const remNum = slides[j]?.slideNumber || (j + 1);
            failCount++;
            results.push({
              slideNumber: remNum,
              success: false,
              error: 'Bỏ qua: provider hết credits',
            });
          }
          console.warn(`[batch] CREDITS_EXHAUSTED — aborted batch at slide ${slideNum}, marked ${totalSlides - i - 1} remaining as skipped`);
          break;
        }

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
      // Mark task COMPLETED BEFORE validation so user sees images immediately.
      // Validation runs as best-effort with a tight timeout.
      if (successCount === 0) {
        const failMsg = batchCreditsExhausted
          ? 'Provider ảnh hết credits (GeminiGen/PoYo). Vui lòng nạp thêm hoặc thử lại sau.'
          : `Tất cả ${totalSlides} slide đều thất bại`;
        await failTask(supabase, taskId, failMsg);
      } else {
        await completeTask(supabase, taskId, carouselId, 'carousel_images' as any);
        const completeMsg = batchCreditsExhausted
          ? `Hoàn thành ${successCount}/${totalSlides} ảnh — dừng vì hết credits`
          : `Hoàn thành: ${successCount}/${totalSlides} ảnh`;
        await updateTaskProgress(
          supabase,
          taskId,
          100,
          completeMsg,
          'completed',
          'completed'
        );
      }

      if (successCount >= 2) {
        try {
          const valController = new AbortController();
          const valTimeout = setTimeout(() => valController.abort(), 30_000);

          const validationResp = await fetch(`${supabaseUrl}/functions/v1/validate-seamless-consistency`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ carouselId, slideImageUrls: successUrls }),
            signal: valController.signal,
          });

          clearTimeout(valTimeout);

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
          console.warn('[batch] Seamless validation skipped/failed (non-fatal):', vErr);
        }
      }

      console.log(`[batch] Done: ${successCount}/${totalSlides} success, ${failCount} failed`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[batch] Fatal error:', errMsg);
      await failTask(supabase, taskId, errMsg);
    } finally {
      // Safety net: ensure task NEVER stays in pending/generating once this
      // function returns, even if both try and catch somehow miss closing it.
      // Without this, a crash anywhere above creates a zombie task that
      // shows up as a permanent popup in the UI.
      try {
        const { data: finalTask } = await supabase
          .from('generation_tasks')
          .select('status')
          .eq('id', taskId)
          .maybeSingle();

        if (finalTask && (finalTask.status === 'pending' || finalTask.status === 'generating')) {
          console.warn(`[batch] Task ${taskId} still open in finally — force-closing`);
          if (successCount > 0) {
            await completeTask(supabase, taskId, carouselId, 'carousel_images' as any);
          } else {
            await failTask(supabase, taskId, 'Batch ended without explicit completion');
          }
        }
      } catch (finalErr) {
        console.warn('[batch] Finally safety-net failed:', finalErr);
      }
    }
  })();

  // Keep background task alive on Supabase Edge Runtime.
  // EdgeRuntime.waitUntil is the official API — without it the worker is
  // killed shortly after the 200 response and slides 2..N never finish.
  try {
    // @ts-ignore — EdgeRuntime is a Supabase global, not in Deno types
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(responsePromise);
    }
  } catch {
    // Local dev fallback — promise still runs as fire-and-forget
  }

  return new Response(
    JSON.stringify({ ok: true, taskId, message: "Background generation started (sequential v2)" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
