// ============================================
// BATCH CAROUSEL IMAGE GENERATION (Background)
// Sequential V2: Each slide N waits for slide N-1 and uses
// its actual scene description + image URL for true seamless continuity.
// Auto-triggers seamless validation when done.
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { updateTaskProgress, completeTask, failTask } from "../_shared/task-tracking.ts";
import { getAIConfig } from "../_shared/ai-config.ts";

/**
 * Extract dominant hex palette from anchor slide image.
 * Reads model + max_tokens from `ai_function_configs` (function_name = 'extract-carousel-palette')
 * so admin có thể override mà không cần đụng code. Multimodal call → đi thẳng Lovable Gateway
 * (callAI() chưa hỗ trợ image_url content arrays).
 */
async function extractLockedPalette(
  imageUrl: string,
  organizationId: string | undefined,
  traceId: string,
  supabase: any,
): Promise<string[] | null> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return null;

  const startedAt = Date.now();
  let model = 'google/gemini-2.5-flash-lite';
  let maxTokens = 120;
  try {
    const cfg = await getAIConfig('extract-carousel-palette', organizationId);
    if (cfg?.model_override) model = cfg.model_override;
    if (cfg?.max_tokens) maxTokens = cfg.max_tokens;
  } catch { /* fall back to defaults */ }

  let hexes: string[] | null = null;
  let hadError = false;
  let errorMessage: string | undefined;

  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 12_000);
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: 'Extract the 5 dominant hex colors of this image. Reply ONLY with a JSON array of hex strings, no markdown. Example: ["#1A2B3C","#FFFFFF","#888888","#A0E0FF","#222222"]' },
          ],
        }],
        max_tokens: maxTokens,
      }),
      signal: ctl.signal,
    }).catch((e) => { hadError = true; errorMessage = String(e); return null; });
    clearTimeout(to);

    if (resp && resp.ok) {
      const pj = await resp.json().catch(() => null);
      const txt: string = pj?.choices?.[0]?.message?.content || '';
      const m = txt.match(/\[[^\]]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]);
          if (Array.isArray(arr)) {
            const filtered = arr
              .filter((x) => typeof x === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(x))
              .slice(0, 5);
            if (filtered.length >= 3) hexes = filtered;
          }
        } catch { /* ignore parse */ }
      }
    } else if (resp) {
      hadError = true;
      errorMessage = `gateway ${resp.status}`;
    }
  } catch (e) {
    hadError = true;
    errorMessage = String(e);
  }

  // Telemetry → ai_metrics (cost + latency tracking)
  try {
    await supabase.from('ai_metrics').insert({
      trace_id: traceId,
      function_name: 'extract-carousel-palette',
      organization_id: organizationId || null,
      total_duration_ms: Date.now() - startedAt,
      models_used: [model],
      had_error: hadError,
      error_message: errorMessage || null,
      exit_reason: hexes ? 'success' : (hadError ? 'error' : 'no_palette'),
    });
  } catch { /* non-fatal */ }

  return hexes;
}

/**
 * LAYER 4.1 — Visual Lexicon Lock
 * After slide 1 generates, run a cheap Gemini Flash Lite multimodal call to
 * extract the actual visual world: metaphor, lighting, medium, perspective.
 * Returns a single short paragraph that can be injected into slides 2..N's
 * seamlessContext to lock cohesion (vs hoping the model "remembers" via palette).
 */
async function extractVisualLexicon(
  imageUrl: string,
  organizationId: string | undefined,
  traceId: string,
  supabase: any,
): Promise<string | null> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return null;

  const startedAt = Date.now();
  let model = 'google/gemini-2.5-flash-lite';
  let maxTokens = 220;
  try {
    const cfg = await getAIConfig('extract-carousel-lexicon', organizationId);
    if (cfg?.model_override) model = cfg.model_override;
    if (cfg?.max_tokens) maxTokens = cfg.max_tokens;
  } catch { /* defaults */ }

  let lexicon: string | null = null;
  let hadError = false;
  let errorMessage: string | undefined;

  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 12_000);
    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: `Analyze this carousel slide image. In ONE concise paragraph (max 80 words), describe its visual lexicon so future slides can match. Cover EXACTLY these 4 dimensions:
1. METAPHOR/MOTIF (what visual symbol or concept anchors the scene)
2. LIGHTING (direction + softness, e.g. "soft top-left light, no harsh shadows")
3. RENDERING MEDIUM (e.g. "flat 2D vector", "soft 3D clay", "editorial photography", "minimalist line art")
4. PERSPECTIVE (e.g. "isometric", "top-down", "eye-level frontal", "cinematic 3/4")
Reply ONLY with the paragraph, no headers, no markdown, no quotes.` },
          ],
        }],
        max_tokens: maxTokens,
      }),
      signal: ctl.signal,
    }).catch((e) => { hadError = true; errorMessage = String(e); return null; });
    clearTimeout(to);

    if (resp && resp.ok) {
      const pj = await resp.json().catch(() => null);
      const txt: string = pj?.choices?.[0]?.message?.content || '';
      const cleaned = txt.trim().replace(/^["']|["']$/g, '').slice(0, 600);
      if (cleaned.length >= 40) lexicon = cleaned;
    } else if (resp) {
      hadError = true;
      errorMessage = `gateway ${resp.status}`;
    }
  } catch (e) {
    hadError = true;
    errorMessage = String(e);
  }

  try {
    await supabase.from('ai_metrics').insert({
      trace_id: traceId,
      function_name: 'extract-carousel-lexicon',
      organization_id: organizationId || null,
      total_duration_ms: Date.now() - startedAt,
      models_used: [model],
      had_error: hadError,
      error_message: errorMessage || null,
      exit_reason: lexicon ? 'success' : (hadError ? 'error' : 'no_lexicon'),
    });
  } catch { /* non-fatal */ }

  return lexicon;
}

/**
 * LAYER 4.3 — Composition Scaffold Rotation
 * Per-slide composition archetype to break monotony. Slide 1 = hero left,
 * Last = single icon + negative space, middle slides rotate through 4 archetypes.
 */
function pickCompositionScaffold(slideNum: number, totalSlides: number): string {
  if (slideNum === 1) {
    return 'COMPOSITION: Hero focal subject anchored on the LEFT third, generous breathing space on the RIGHT half (kept visually quiet — for later text overlay). Strong single focal point.';
  }
  if (slideNum === totalSlides) {
    return 'COMPOSITION: Single strong icon or object centered, surrounded by GENEROUS negative space (~60% of frame). Calm, decisive, CTA-ready.';
  }
  const archetypes = [
    'COMPOSITION: Split 60/40 layout — primary subject on one side, supporting visual element (small data viz / accent shape) on the other.',
    'COMPOSITION: Full-width centered metaphor — subject occupies center 50%, edges fade to soft background, breathing space top + bottom.',
    'COMPOSITION: Top-down flat-lay arrangement — multiple small elements arranged with grid-like rhythm, equal spacing.',
    'COMPOSITION: Asymmetric editorial — primary subject offset to one corner, secondary visual rhythm flowing diagonally across frame.',
  ];
  // Slides 2..N-1 rotate through archetypes deterministically
  return archetypes[(slideNum - 2) % archetypes.length];
}

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

  const { taskId, carouselId, slides, brandColors, carouselStyle, visualPreset, platform, carouselTopic, seriesBible, siblingsSummary, aspectRatio: bodyAspectRatio } = body;
  // Aspect ratio resolution: explicit body > slide hint > platform default.
  // All slides MUST share the same aspect ratio for visual coherence.
  const platformDefault = platform === 'tiktok' ? '9:16' : platform === 'instagram' ? '4:5' : platform === 'linkedin' ? '1:1' : '1:1';
  const lockedAspectRatio: string = bodyAspectRatio || (slides?.[0]?.aspectRatio) || platformDefault;

  if (!taskId || !carouselId || !slides?.length) {
    return new Response(
      JSON.stringify({ error: "taskId, carouselId, and slides are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // trace_id ties together every per-slide ai_metrics row + carousel/task — so
  // ops can grep one ID across logs to reconstruct the whole batch.
  const traceId = `carousel-batch-${taskId}`;

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
    // Anchor = slide 1 image. Used as visual reference for ALL subsequent slides
    // to prevent style drift when the chain only carries slide N-1 forward.
    let anchorImageUrl: string | null = null;
    let anchorSceneDescription: string | null = null;
    // Locked color palette (top hex colors) extracted from anchor slide once,
    // then injected into seamlessContext.colorPalette for slides 2..N.
    let lockedPalette: string[] | null = null;
    // LAYER 4.1: Visual lexicon extracted from anchor slide (metaphor, lighting,
    // medium, perspective). Locks visual world for slides 2..N beyond just palette.
    let visualLexicon: string | null = null;
    // Rolling window of last 4 slides' descriptions to limit drift on long carousels.
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

      // Resolve organizationId + brand logo (for Layer 6 deterministic logo overlay)
      let organizationId: string | undefined;
      let brandLogoUrl: string | null = null;
      let brandIncludesLogo = false;
      try {
        const { data: carouselData } = await supabase
          .from('carousels')
          .select('organization_id, include_logo, brand_template_id')
          .eq('id', carouselId)
          .maybeSingle();
        organizationId = carouselData?.organization_id || undefined;
        brandIncludesLogo = !!carouselData?.include_logo;
        const brandTemplateId = carouselData?.brand_template_id || null;

        if (brandIncludesLogo && brandTemplateId) {
          const { data: brand } = await supabase
            .from('brand_templates')
            .select('logo_url')
            .eq('id', brandTemplateId)
            .maybeSingle();
          const raw = brand?.logo_url || null;
          if (raw) {
            if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
              brandLogoUrl = raw;
            } else {
              const { data: pub } = supabase.storage.from('brand-assets').getPublicUrl(raw);
              brandLogoUrl = pub?.publicUrl || null;
            }
          }
          console.log(`[batch] Brand logo resolved: ${brandLogoUrl ? 'YES' : 'NO'} (brand=${brandTemplateId})`);
        }
      } catch (e) {
        console.warn('[batch] Could not resolve organizationId/logo:', e);
      }

      // Process slides STRICTLY sequentially (slide N waits for slide N-1).
      // This is mandatory for seamless continuity — see plan layer 1.
      let userCancelled = false;
      for (let i = 0; i < totalSlides; i++) {
        // Cancel check: user may stop the batch from UI by setting status='cancelled'.
        try {
          const { data: t } = await supabase
            .from('generation_tasks')
            .select('status')
            .eq('id', taskId)
            .maybeSingle();
          if (t?.status === 'cancelled') {
            console.log(`[batch] Task ${taskId} cancelled by user — stopping at slide ${i + 1}/${totalSlides}`);
            userCancelled = true;
            break;
          }
        } catch (e) {
          // Non-fatal: continue if cancel check fails
          console.warn('[batch] Cancel check failed:', e);
        }

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

        // Build seamless context. previousSceneDescription is layered:
        // [seriesBible] + [slide 1 anchor] + [slide N-1] so far-from-anchor slides still see the original visual world.
        const accumulatedChain = recentScenes.length > 0
          ? `Recent slides in this carousel: ${recentScenes.map((s, idx) => `[${idx + 1}] ${s}`).join(' | ')}`
          : null;

        const layeredPrevDesc = (() => {
          const parts: string[] = [];
          if (slideNum === 1 && seriesBible) parts.push(seriesBible);
          if (slideNum > 1) {
            if (seriesBible) parts.push(`SERIES BIBLE: ${seriesBible.slice(0, 600)}`);
            // LAYER 4.1: inject visual lexicon (metaphor + lighting + medium + perspective)
            // — strongest cohesion lock, replaces vague "same visual world" hand-waving.
            if (visualLexicon) parts.push(`VISUAL LEXICON (lock from slide 1 — match exactly): ${visualLexicon}`);
            if (anchorSceneDescription) parts.push(`ANCHOR (slide 1): ${anchorSceneDescription.slice(0, 300)}`);
            if (previousSceneDescription && previousSceneDescription !== anchorSceneDescription && previousSceneDescription !== seriesBible) {
              parts.push(`PREVIOUS (slide ${slideNum - 1}): ${previousSceneDescription.slice(0, 300)}`);
            }
          }
          // LAYER 4.3: composition scaffold rotation — break monotony, force per-slide variety.
          parts.push(pickCompositionScaffold(slideNum, totalSlides));
          return parts.length > 0 ? parts.join('\n\n') : previousSceneDescription;
        })();

        const slideSeamlessContext = {
          colorPalette: lockedPalette, // null for slide 1, populated for slide 2..N
          previousSceneDescription: layeredPrevDesc,
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
          const attemptStartedAt = Date.now();
          let attemptExitReason = 'success';
          let attemptError: string | null = null;
          let attemptModel: string | null = null;

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
                aspectRatio: lockedAspectRatio,
                brandColors,
                carouselStyle: carouselStyle || 'educational',
                totalSlides,
                slideObjective: slide.objective,
                visualPreset: visualPreset || 'minimalist',
                carouselTopic,
                // Pass previous slide image for img2img continuity (slide 2..N only)
                previousImageUrl: slideNum > 1 ? previousImageUrl : null,
                // Anchor (slide 1) — gives single-slot providers a stable visual reference
                // and lets multi-image providers (Lovable Gateway) layer logo+anchor+previous.
                anchorImageUrl: slideNum > 1 ? anchorImageUrl : null,
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
              attemptExitReason = 'credits_exhausted';
              attemptError = parsedMsg;
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
                attemptExitReason = 'credits_exhausted';
                attemptError = data.error;
                console.error(`[batch] Slide ${slideNum} CREDITS_EXHAUSTED — aborting batch`);
                break;
              }
              throw new Error(data.error);
            }

            if (data.imageUrl) {
              slideImageUrl = data.imageUrl;
              slideSceneDescription = data.sceneDescription || null;
              attemptModel = data.modelUsed || null;
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
            attemptExitReason = isAbort ? 'timeout' : 'error';
            attemptError = slideError;
            console.error(`[batch] Slide ${slideNum} attempt ${attempt} failed:`, slideError);

            // Skip retry for non-retryable code-level bugs (ReferenceError,
            // TypeError, "is not defined") — retrying just wastes provider credits.
            const isCodeBug = /ReferenceError|TypeError|is not defined|SyntaxError/i.test(slideError);
            if (isCodeBug) {
              attemptExitReason = 'code_bug';
              console.warn(`[batch] Slide ${slideNum}: non-retryable code bug detected — aborting retries`);
              break;
            }

            if (attempt < MAX_ATTEMPTS) {
              await new Promise(r => setTimeout(r, 3000 * attempt));
            }
          } finally {
            // Per-attempt telemetry — without this, ops have zero visibility
            // into which provider/timeout combination is failing. Best-effort,
            // never throws back into the batch loop.
            try {
              await supabase.from('ai_metrics').insert({
                trace_id: traceId,
                span_id: `slide-${slideNum}-attempt-${attempt}`,
                function_name: 'generate-carousel-images-batch',
                organization_id: organizationId || null,
                user_id: body.userId || null,
                total_duration_ms: Date.now() - attemptStartedAt,
                ai_call_duration_ms: Date.now() - attemptStartedAt,
                exit_reason: attemptExitReason,
                had_error: attemptExitReason !== 'success',
                error_type: attemptExitReason !== 'success' ? attemptExitReason : null,
                error_message: attemptError,
                retry_count: attempt - 1,
                content_id: carouselId,
                action_type: 'carousel_image_slide',
                channels: ['carousel'],
                models_used: attemptModel ? [attemptModel] : null,
              });
            } catch (mErr) {
              console.warn('[batch] ai_metrics insert failed (non-fatal):', mErr);
            }
          }
        }

        if (slideSuccess && slideImageUrl) {
          successCount++;
          successUrls.push(slideImageUrl);

          // === Update chain state for NEXT slide ===
          const nextSceneDesc = slideSceneDescription
            || slide.objective
            || (slide.fullPrompt ? String(slide.fullPrompt).slice(0, 200) : null);

          previousSceneDescription = nextSceneDesc;
          previousImageUrl = slideImageUrl;

          // === Anchor capture (slide 1 only) ===
          // Slide 1 becomes the visual reference for the rest of the carousel.
          // We also extract a locked color palette from it so slides 2..N can
          // hard-lock the same dominant colors (consistency win #1).
          if (slideNum === 1) {
            anchorImageUrl = slideImageUrl;
            anchorSceneDescription = slideSceneDescription || nextSceneDesc;

            // Run palette + visual lexicon extraction in parallel — both are
            // anchored on slide 1 image and unrelated, so we save ~10s on long batches.
            try {
              const [hexes, lexicon] = await Promise.all([
                extractLockedPalette(slideImageUrl, organizationId, traceId, supabase).catch((e) => {
                  console.warn('[batch] Palette extraction failed:', e);
                  return null;
                }),
                extractVisualLexicon(slideImageUrl, organizationId, traceId, supabase).catch((e) => {
                  console.warn('[batch] Lexicon extraction failed:', e);
                  return null;
                }),
              ]);
              if (hexes && hexes.length >= 3) {
                lockedPalette = hexes;
                console.log(`[batch] Locked palette from anchor: ${hexes.join(', ')}`);
              }
              if (lexicon) {
                visualLexicon = lexicon;
                console.log(`[batch] Locked visual lexicon from anchor: "${lexicon.slice(0, 120)}..."`);
              }
              if (hexes || lexicon) {
                const updatePayload: Record<string, unknown> = {};
                if (hexes) updatePayload.locked_palette = hexes;
                if (lexicon) updatePayload.visual_lexicon = lexicon;
                try {
                  await supabase.from('carousels').update(updatePayload).eq('id', carouselId);
                } catch (uErr) {
                  // visual_lexicon column may not exist yet — non-fatal, lexicon still in-memory
                  console.warn('[batch] Persist anchor metadata partial:', uErr);
                }
              }
            } catch (anchorErr) {
              console.warn('[batch] Anchor extraction step failed (non-fatal):', anchorErr);
            }
          }

          // Rolling window of last 4 scenes — long carousels (8-10 slides)
          // need more context than 2 to avoid drift from slide ~5 onward.
          if (nextSceneDesc) {
            recentScenes.push(`Slide ${slideNum}: ${nextSceneDesc.slice(0, 150)}`);
            if (recentScenes.length > 4) recentScenes.shift();
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
      const metadata = { successCount, failCount, totalSlides, results, generationMode: 'sequential_v2', cancelled: userCancelled };

      try {
        await supabase
          .from('generation_tasks')
          .update({ result_metadata: metadata })
          .eq('id', taskId);
      } catch (e) {
        console.warn('[batch] Failed to save result_metadata:', e);
      }

      // === Early-exit branch: user cancelled via UI ===
      if (userCancelled) {
        await updateTaskProgress(
          supabase,
          taskId,
          Math.round((successCount / totalSlides) * 100),
          `Đã dừng theo yêu cầu — ${successCount}/${totalSlides} ảnh đã tạo`,
          'cancelled',
          'cancelled'
        );
        console.log(`[batch] User cancelled: ${successCount}/${totalSlides} success, ${failCount} failed before stop`);
        return; // skip validation
      }

      // === AUTO seamless validation (anti silent-failure) ===
      // Mark task COMPLETED BEFORE validation so user sees images immediately.
      // Validation runs as best-effort with a tight timeout.
      if (successCount === 0) {
        // Aggregate top-2 distinct errors for actionable diagnostics.
        // Without this, error_message is a generic "Tất cả N slide đều thất bại"
        // and operators cannot tell whether it was 402, timeout, or schema.
        const errorCounts = new Map<string, number>();
        for (const r of results) {
          if (r.success || !r.error) continue;
          const key = String(r.error).slice(0, 160);
          errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
        }
        const topErrors = Array.from(errorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([msg, count]) => `${count}× ${msg}`)
          .join(' | ');
        const failMsg = batchCreditsExhausted
          ? 'Provider ảnh hết credits (GeminiGen/PoYo). Vui lòng nạp thêm hoặc thử lại sau.'
          : (topErrors
              ? `Tất cả ${totalSlides} slide thất bại — ${topErrors}`
              : `Tất cả ${totalSlides} slide đều thất bại`);
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

            // Detect outlier slides: brightness >25 from median, or temperature
            // not matching majority cluster. successUrls is in slide order so
            // index i = slide number i+1.
            let outlierSlides: number[] = [];
            try {
              const slidesAnalysis = Array.isArray(validation?.slides) ? validation.slides : [];
              if (slidesAnalysis.length >= 3) {
                const brightnesses = slidesAnalysis.map((s: any) => Number(s?.brightness ?? 50));
                const sorted = [...brightnesses].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const tempCounts = new Map<string, number>();
                slidesAnalysis.forEach((s: any) => {
                  const t = String(s?.temperature || 'neutral');
                  tempCounts.set(t, (tempCounts.get(t) || 0) + 1);
                });
                const majorityTemp = Array.from(tempCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
                slidesAnalysis.forEach((s: any, idx: number) => {
                  const brightDelta = Math.abs(Number(s?.brightness ?? 50) - median);
                  const tempMismatch = majorityTemp && s?.temperature && s.temperature !== majorityTemp;
                  if (brightDelta > 25 || tempMismatch) {
                    outlierSlides.push(idx + 1);
                  }
                });
                // Cap at 2 to avoid suggesting "regenerate everything"
                outlierSlides = outlierSlides.slice(0, 2);
              }
            } catch (oErr) {
              console.warn('[batch] Outlier detection failed (non-fatal):', oErr);
            }

            await supabase
              .from('carousels')
              .update({
                seamless_score: score,
                seamless_issues: issues.length ? { issues, suggestion: validation?.consistency?.suggestion } : null,
                needs_regeneration: needsRegen,
                needs_regeneration_slides: outlierSlides.length > 0 ? outlierSlides : null,
              })
              .eq('id', carouselId);

            console.log(`[batch] Seamless validation: score=${score}, needsRegen=${needsRegen}, outliers=[${outlierSlides.join(',')}]`);
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
