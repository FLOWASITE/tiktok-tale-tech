// ============================================
// generate-video — submit-only async pipeline (Phase 3)
// Submits task to provider, persists provider_task_id, returns immediately.
// Background `video-job-poller` (pg_cron) checks status & updates row.
// Legacy sync mode still available via { sync: true } in body.
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withPerf } from "../_shared/middleware/perf.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import {
  generateVideoViaGeminiGen,
  submitGeminiGenVideoTask,
  GEMINIGEN_VIDEO_MODELS,
} from "../_shared/geminigen-video-generator.ts";
import {
  generateVideoViaPoyo,
  submitPoyoVideoTask,
  POYO_VIDEO_MODELS,
  type PoyoVideoModel,
} from "../_shared/poyo-video-generator.ts";
import { checkUnitQuota, buildQuotaExceededResponse } from "../_shared/quota-units.ts";
import { buildProductBlockEN, fetchProductRows, pickProductRefImage } from "../_shared/product-block-builder.ts";
import { buildCharacterCollage, hashIds, deriveStableSeed } from "../_shared/character-collage.ts";
import { synthesizeKeyframe } from "../_shared/keyframe-synthesizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VideoProvider = 'geminigen' | 'poyo' | 'lovable' | 'minimax' | 'runway';

interface VideoGenerationRequest {
  provider: VideoProvider;
  prompt: string;
  model?: string;
  duration?: number;
  aspect_ratio?: string;
  resolution?: string;
  starting_frame_url?: string;
  negative_prompt?: string;
  script_id?: string;
  storyboard_id?: string;
  scene_number?: number;
  sync?: boolean;  // if true, wait inline (legacy / agent flow)
  character_profile_id?: string;
  character_profile_ids?: string[];
  product_profile_ids?: string[];
}

Deno.serve(withPerf({ functionName: 'generate-video', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: VideoGenerationRequest = await req.json();
    const {
      provider: requestedProvider = 'geminigen',
      prompt,
      model: clientModel,
      duration: clientDuration,
      aspect_ratio: clientAspect,
      resolution: clientResolution,
      starting_frame_url,
      negative_prompt,
      script_id,
      storyboard_id,
      scene_number,
      sync = false,
      character_profile_id,
      character_profile_ids,
      product_profile_ids,
    } = body;
    const synthesize_keyframe: boolean = (body as any).synthesize_keyframe !== false; // default ON

    if (!prompt || prompt.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Prompt must be at least 5 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve org_id for the user (for RLS-friendly insert)
    const { data: orgRow } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    // ───────── QUOTA CHECK (Pricing v2 — unit "video") ─────────
    if (orgRow?.organization_id) {
      const quota = await checkUnitQuota(supabase, orgRow.organization_id, 'video', 1);
      if (!quota.allowed) {
        console.warn(`[generate-video] quota exceeded org=${orgRow.organization_id}`);
        return buildQuotaExceededResponse(quota, corsHeaders);
      }
    }

    // ───────── ADMIN-CONTROLLED MODEL RESOLUTION ─────────
    // Priority cascade (matches mem://ai-system/model-selection-priority-vn):
    //   1. Client `model` (only respected if request comes from agent/internal pipelines — kept for backward compat)
    //   2. Admin `ai_function_configs.model_override` for `generate-video`
    //   3. Hard default per provider
    let resolvedModel = clientModel || null;
    let resolvedProvider: VideoProvider = requestedProvider;
    let adminParams: Record<string, any> = {};
    let adminPickedModel = false;

    // Always fetch admin parameters jsonb for fallback defaults (duration/aspect/resolution)
    try {
      const { data: paramRow } = await supabase
        .from('ai_function_configs')
        .select('parameters')
        .eq('function_name', 'generate-video')
        .eq('is_enabled', true)
        .or(orgRow?.organization_id
          ? `organization_id.eq.${orgRow.organization_id},organization_id.is.null`
          : `organization_id.is.null`)
        .order('organization_id', { nullsFirst: false })
        .limit(1)
        .maybeSingle();
      adminParams = (paramRow?.parameters as Record<string, any>) || {};
    } catch (paramErr) {
      console.warn('[generate-video] admin parameters fetch failed:', paramErr);
    }

    if (!resolvedModel) {
      try {
        const cfg = await getAIConfig('generate-video', orgRow?.organization_id ?? undefined);
        if (cfg.model) {
          resolvedModel = cfg.model;
          adminPickedModel = true;
          // If admin-configured model has a provider prefix (e.g. "geminigen/..." or "poyo/..."),
          // override the requested provider so routing matches the model.
          if (cfg.model.startsWith('poyo/')) resolvedProvider = 'poyo';
          else if (cfg.model.startsWith('geminigen/')) resolvedProvider = 'geminigen';
        }
        if (cfg.force_provider) {
          resolvedProvider = cfg.force_provider as VideoProvider;
        }
      } catch (cfgErr) {
        console.warn('[generate-video] getAIConfig failed, using fallback:', cfgErr);
      }
    }

    let provider = resolvedProvider;
    let model = resolvedModel || undefined;

    // Resolve duration/aspect/resolution: client value wins, else admin params fallback, else hard default
    const duration = clientDuration ?? adminParams.default_duration ?? 5;
    const aspect_ratio = clientAspect ?? adminParams.default_aspect_ratio ?? '9:16';
    const resolution = clientResolution ?? adminParams.default_resolution ?? '1080p';

    console.log(`[generate-video] provider=${provider} model=${model} (admin=${!clientModel}) duration=${duration}s aspect=${aspect_ratio} res=${resolution} sync=${sync}`);

    // ───────── CHARACTER CONSISTENCY — multi-character support ─────────
    let enrichedPrompt = prompt;
    let characterRefUrl = starting_frame_url;
    let stableSeed: number | undefined;
    let modelUpgradedReason: string | undefined;
    // Holder for keyframe synthesis (filled inside char block)
    let synthCharacters: Array<{ id: string; name: string; refUrl?: string; appearance?: any; wardrobe?: string }> = [];
    let userProvidedFrame = !!starting_frame_url;
    let keyframeSynthesized = false;
    let keyframeModel: string | undefined;
    let chainedFromPrevScene = false;

    // ───────── CHAIN FRAME — clip 2,3,... dùng thumbnail của clip trước
    // (cùng script_id) làm starting frame để continuity mượt + giữ identity
    if (!characterRefUrl && script_id && typeof scene_number === 'number' && scene_number > 1) {
      try {
        const { data: prev } = await supabase
          .from('video_generations')
          .select('thumbnail_url, video_url')
          .eq('script_id', script_id)
          .eq('scene_number', scene_number - 1)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const prevThumb = prev?.thumbnail_url as string | undefined;
        if (prevThumb && /\.(png|jpe?g|webp)(\?.*)?$/i.test(prevThumb)) {
          characterRefUrl = prevThumb;
          userProvidedFrame = true; // skip keyframe synth — đã có ref tốt
          chainedFromPrevScene = true;
          enrichedPrompt = `[CONTINUITY] This clip continues directly from the previous scene. Match lighting, color grading, environment, and character position from the reference frame for a seamless transition.\n\n${enrichedPrompt}`;
          console.log(`[generate-video] 🔗 Chained from scene ${scene_number - 1} thumbnail`);
        }
      } catch (e) {
        console.warn('[generate-video] Chain prev-scene lookup failed:', e);
      }
    }

    // Resolve character IDs: prefer array, fallback to single
    const resolvedCharIds: string[] = Array.isArray(character_profile_ids) && character_profile_ids.length > 0
      ? character_profile_ids
      : character_profile_id ? [character_profile_id] : [];

    if (resolvedCharIds.length > 0) {
      try {
        const { data: charProfiles } = await supabase
          .from('character_profiles')
          .select('id, name, description, appearance, wardrobe, reference_image_url, reference_images, default_voice_id, default_voice_provider')
          .in('id', resolvedCharIds);

        if (charProfiles && charProfiles.length > 0) {
          // Sort to match input order (primary first)
          const sorted = resolvedCharIds
            .map(id => charProfiles.find(p => p.id === id))
            .filter(Boolean) as typeof charProfiles;

          // Smart angle pick helper — áp dụng cho từng nhân vật
          const p = prompt.toLowerCase();
          const matchAngle = (): string => {
            if (/close-?up|cận|macro|cận cảnh/.test(p)) return 'close-up';
            if (/full[- ]?body|toàn thân|whole body|wide shot|long shot/.test(p)) return 'full-body';
            if (/side|nghiêng|profile view|từ bên/.test(p)) return 'side';
            if (/outfit|trang phục|wardrobe|costume/.test(p)) return 'outfit';
            return 'front';
          };
          const preferredAngle = matchAngle();
          const pickRefForChar = (cp: typeof sorted[number]): string | undefined => {
            const refImages = Array.isArray(cp.reference_images) ? cp.reference_images as { url: string; label: string }[] : [];
            // Clip đầu (scene 1 hoặc không xác định) → ưu tiên avatar gốc cho first impression
            const isFirstScene = !scene_number || scene_number === 1;
            if (isFirstScene && cp.reference_image_url) {
              return cp.reference_image_url;
            }
            if (refImages.length > 0) {
              return (refImages.find(r => r.label === preferredAngle) || refImages[0]).url;
            }
            return cp.reference_image_url || undefined;
          };

          // Collect for keyframe synth (uses per-char ref pick)
          synthCharacters = sorted.map((cp) => ({
            id: cp.id,
            name: cp.name,
            refUrl: pickRefForChar(cp),
            appearance: cp.appearance,
            wardrobe: cp.wardrobe,
          }));

          const charBlocks: string[] = [];
          for (let i = 0; i < sorted.length; i++) {
            const cp = sorted[i];
            const role = i === 0 ? 'MAIN CHARACTER' : `SUPPORTING CHARACTER ${i}`;
            const app = (cp.appearance || {}) as Record<string, string>;
            const traits: string[] = [];
            if (app.gender) traits.push(app.gender);
            if (app.age_range) traits.push(`age ${app.age_range}`);
            if (app.hair) traits.push(`${app.hair} hair`);
            if (app.skin_tone) traits.push(`${app.skin_tone} skin`);
            if (app.body_type) traits.push(app.body_type);

            let block = `[${role} — "${cp.name}" | Face ID: ${cp.id.slice(0, 8)}]`;
            if (traits.length) block += `\nAppearance: ${traits.join(', ')}.`;
            if (cp.description) block += `\nDetails: ${cp.description}`;
            if (cp.wardrobe) block += `\nWardrobe: ${cp.wardrobe}.`;
            if (app.distinctive_features) block += `\nDistinctive: ${app.distinctive_features}.`;
            if (cp.default_voice_id) block += `\nVoice ID: ${cp.default_voice_id} (provider: ${cp.default_voice_provider || 'default'}).`;
            block += `\nIMPORTANT: Maintain "${cp.name}" EXACT appearance consistently. Same face, hair, clothing, body proportions.`;
            if (sorted.length > 1) {
              block += ` Do NOT mix up with other characters.`;
            }
            charBlocks.push(block);
          }

          if (sorted.length > 1) {
            charBlocks.push(`[CHARACTER DISTINCTION] There are ${sorted.length} distinct characters. Each must have their own unique appearance as described above. Never merge or swap features between characters.`);
          }

          // Consistency lock — buộc model ưu tiên giữ ảnh ref hơn sáng tạo
          charBlocks.push(`[CONSISTENCY LOCK] If any character cannot match the reference photo exactly, prefer keeping the photo over creative variation. Faces must match the provided reference image pixel-for-pixel.`);

          enrichedPrompt = `${charBlocks.join('\n\n')}\n\n${enrichedPrompt}`;
          console.log(`[generate-video] Injected ${sorted.length} character(s): ${sorted.map(c => c.name).join(', ')}`);

          // ✅ Guard: nếu starting_frame_url là VIDEO URL thì bỏ
          const isVideoUrl = typeof characterRefUrl === 'string'
            && /\.(mp4|mov|webm|m3u8)(\?.*)?$/i.test(characterRefUrl);
          if (isVideoUrl) {
            console.log(`[generate-video] starting_frame_url là video → bỏ qua, dùng ảnh ref nhân vật.`);
            characterRefUrl = undefined;
          }

          // ───── MULTI-REF COLLAGE (≥ 2 nhân vật) ─────
          if (!characterRefUrl && sorted.length >= 2) {
            try {
              const cacheKey = await hashIds(sorted.map(c => c.id));
              const collagePath = `_collage/${cacheKey}.png`;

              // Check cache
              const { data: existing } = await supabase.storage
                .from('character-references')
                .list('_collage', { search: `${cacheKey}.png`, limit: 1 });

              let collageUrl: string | undefined;
              if (existing && existing.length > 0) {
                const { data: pub } = supabase.storage.from('character-references').getPublicUrl(collagePath);
                collageUrl = pub.publicUrl;
                console.log(`[generate-video] Collage cache hit: ${collageUrl}`);
              } else {
                const items = sorted
                  .map(c => ({ url: pickRefForChar(c), name: c.name }))
                  .filter(it => it.url) as { url: string; name: string }[];

                if (items.length >= 2) {
                  const png = await buildCharacterCollage(items);
                  if (png) {
                    const { error: upErr } = await supabase.storage
                      .from('character-references')
                      .upload(collagePath, png, { contentType: 'image/png', upsert: true });
                    if (!upErr) {
                      const { data: pub } = supabase.storage.from('character-references').getPublicUrl(collagePath);
                      collageUrl = pub.publicUrl;
                      console.log(`[generate-video] Multi-char collage built: ${collageUrl}`);
                    } else {
                      console.warn('[generate-video] Collage upload failed:', upErr);
                    }
                  }
                }
              }

              if (collageUrl) {
                characterRefUrl = collageUrl;
                // Inject positional anchor để model hiểu collage layout
                const names = sorted.map(c => `"${c.name}"`).join(' → ');
                const layoutAnchor = `[FRAME LAYOUT] Reference image is a side-by-side collage. From LEFT to RIGHT: ${names}. Use these EXACT faces. Do NOT swap, blend, or invent new faces.`;
                enrichedPrompt = `${layoutAnchor}\n\n${enrichedPrompt}`;
              }
            } catch (e) {
              console.warn('[generate-video] Collage build failed, fallback to primary ref:', e);
            }
          }

          // Fallback: nếu chưa có ref (1 char hoặc collage fail) → dùng ref của primary
          if (!characterRefUrl) {
            const primary = sorted[0];
            const url = pickRefForChar(primary);
            if (url) {
              characterRefUrl = url;
              console.log(`[generate-video] Single-char ref pick (angle=${preferredAngle})`);
            }
          }

          // ───── STABLE SEED — cùng cast → cùng seed → identity nhất quán giữa các clip
          stableSeed = await deriveStableSeed(sorted.map(c => c.id));
          console.log(`[generate-video] Stable seed for cast: ${stableSeed}`);

          // ───── FORCE VEO 3.1 (không Fast) khi có character — identity-lock
          //   Veo 3.1 i2v giữ identity tốt nhất; identity-lock quan trọng hơn lựa chọn user.
          //   Áp dụng KỂ CẢ khi không có ref ảnh (chỉ có character text block) — vì Fast drift mặt mạnh.
          const IDENTITY_LOCK_MODEL = 'geminigen/veo-3.1';
          if (model !== IDENTITY_LOCK_MODEL) {
            console.log(`[generate-video] hasCharacter(${sorted.length}) → force-upgrade ${model || '(default)'} → ${IDENTITY_LOCK_MODEL}`);
            model = IDENTITY_LOCK_MODEL;
            provider = 'geminigen';
            modelUpgradedReason = 'character_identity_lock';
          }
          console.log(`[generate-video] 🔒 Identity lock active: chars=${sorted.length}, refUrl=${characterRefUrl ? 'yes' : 'no'}, seed=${stableSeed}, model=${model}`);
        }
      } catch (e) {
        console.warn('[generate-video] Failed to fetch character profiles:', e);
      }
    }

    // ───────── PRODUCT CONSISTENCY — inject product blocks + smart-pick ref ─────────
    let productRefUrl: string | undefined;
    if (Array.isArray(product_profile_ids) && product_profile_ids.length > 0) {
      try {
        const products = await fetchProductRows(supabase, product_profile_ids);
        if (products.length > 0) {
          const block = buildProductBlockEN(products);
          if (block) {
            enrichedPrompt = `${block}\n\n${enrichedPrompt}`;
            console.log(`[generate-video] Injected ${products.length} product(s): ${products.map(p => p.name).join(', ')}`);
          }
          // Smart pick reference image from primary product based on scene text
          // (label: front | back | side | in-use | packaging)
          const primary = products[0];
          const picked = pickProductRefImage(primary, prompt);
          if (picked) {
            productRefUrl = picked;
            console.log(`[generate-video] Product ref image picked for "${primary.name}"`);
          }

          // If no character ref, use product ref as starting frame to lock product visuals
          if (!characterRefUrl && productRefUrl) {
            characterRefUrl = productRefUrl;
            // Auto-upgrade model to identity-preserving i2v if user didn't pick one
            if (!clientModel) {
              const PRODUCT_LOCK_MODEL = 'geminigen/veo-3.1';
              console.log(`[generate-video] hasProductRef → auto-upgrade model ${model} → ${PRODUCT_LOCK_MODEL}`);
              model = PRODUCT_LOCK_MODEL;
              provider = 'geminigen';
            }
          }
        }
      } catch (e) {
        console.warn('[generate-video] Failed to fetch product profiles:', e);
      }
    }

    // ───────── KEYFRAME SYNTHESIS — dùng image-edit model attach ảnh ref
    // để dựng 1 keyframe khớp scene+aspect TRƯỚC khi đưa vào Veo i2v.
    // Veo chỉ cần "animate" → giữ mặt brand tốt hơn rất nhiều so với portrait studio.
    if (
      synthesize_keyframe &&
      !userProvidedFrame &&
      synthCharacters.length > 0 &&
      synthCharacters.some((c) => !!c.refUrl) &&
      orgRow?.organization_id
    ) {
      const lovableKey = Deno.env.get('LOVABLE_API_KEY');
      if (lovableKey) {
        try {
          const synth = await synthesizeKeyframe({
            scenePrompt: prompt,
            aspectRatio: aspect_ratio,
            characters: synthCharacters,
            productRefUrl,
            organizationId: orgRow.organization_id,
            supabase,
            lovableApiKey: lovableKey,
          });
          if (synth?.url) {
            characterRefUrl = synth.url;
            keyframeSynthesized = true;
            keyframeModel = synth.model;
            // Bỏ [FRAME LAYOUT] collage anchor nếu trước đó đã inject — không còn là collage
            enrichedPrompt = enrichedPrompt.replace(/^\[FRAME LAYOUT\][\s\S]*?\n\n/, '');
            console.log(`[generate-video] 🎨 Keyframe synthesized (model=${synth.model}) → ${synth.url}`);
          } else {
            console.log('[generate-video] keyframe synth returned null, dùng portrait/collage làm starting frame');
          }
        } catch (e) {
          console.warn('[generate-video] keyframe synth threw, fallback portrait:', e);
        }
      }
    }

    const { data: job, error: jobError } = await supabase
      .from('video_generations')
      .insert({
        script_id,
        storyboard_id,
        scene_number,
        provider,
        model_used: model,
        prompt: enrichedPrompt,
        negative_prompt,
        duration_seconds: duration,
        aspect_ratio,
        resolution,
        starting_frame_url: characterRefUrl,
        status: 'pending',
        progress: 5,
        user_id: user.id,
        organization_id: orgRow?.organization_id ?? null,
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('[generate-video] Insert failed:', jobError);
      throw new Error('Failed to create video job: ' + (jobError?.message ?? 'unknown'));
    }

    // ───────── SYNC MODE (legacy) — wait inline ─────────
    if (sync) {
      const startTime = Date.now();
      let videoUrl: string | null = null;
      let errorMsg: string | null = null;
      let syncProvider: VideoProvider = provider;

      // Model mapping for PoYo→GeminiGen fallback (sync)
      const SYNC_FALLBACK_MAP: Record<string, string> = {
        'poyo/seedance-2': 'geminigen/veo-3.1-fast',
        'poyo/sora-2': 'geminigen/sora-2',
        'poyo/happy-horse': 'geminigen/veo-3.1-fast',
      };

      try {
        if (provider === 'geminigen') {
          const apiKey = Deno.env.get("GEMINIGEN_API_KEY");
          if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');
          const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
          const result = await generateVideoViaGeminiGen({
            prompt: enrichedPrompt, model: selectedModel,
            aspectRatio: aspect_ratio,
            resolution: resolution === '720p' ? '720p' : '1080p',
            duration, negativePrompt: negative_prompt,
            startingFrameUrl: characterRefUrl,
              seed: stableSeed,
          }, apiKey);
          videoUrl = result.videoUrl;
        } else if (provider === 'poyo') {
          const apiKey = Deno.env.get("POYO_API_KEY");
          if (!apiKey) throw new Error('POYO_API_KEY not configured');
          const selectedModel = (model && POYO_VIDEO_MODELS.includes(model as PoyoVideoModel)
            ? model : POYO_VIDEO_MODELS[0]) as PoyoVideoModel;
          try {
            const result = await generateVideoViaPoyo({
              prompt: enrichedPrompt, model: selectedModel,
              aspectRatio: (aspect_ratio as '16:9' | '9:16' | '1:1') ?? '9:16',
              duration,
              resolution: resolution === '720p' ? '720p' : '1080p',
              startingFrameUrl: characterRefUrl,
              seed: stableSeed,
              negativePrompt: negative_prompt,
            }, apiKey);
            videoUrl = result.videoUrl;
          } catch (poyoErr) {
            const poyoMsg = poyoErr instanceof Error ? poyoErr.message : '';
            const isCredits = poyoMsg.includes('402') || poyoMsg.includes('CREDITS_EXHAUSTED') || poyoMsg.includes('insufficient_credits');
            const gKey = Deno.env.get("GEMINIGEN_API_KEY");
            if (isCredits && gKey) {
              const fallbackModel = SYNC_FALLBACK_MAP[model || 'poyo/seedance-2'] || 'geminigen/veo-3.1-fast';
              console.log(`[generate-video] sync PoYo credits exhausted → fallback GeminiGen model=${fallbackModel}`);
              const result = await generateVideoViaGeminiGen({
                prompt: enrichedPrompt, model: fallbackModel,
                aspectRatio: aspect_ratio,
                resolution: resolution === '720p' ? '720p' : '1080p',
                duration, negativePrompt: negative_prompt,
                startingFrameUrl: characterRefUrl,
              seed: stableSeed,
              }, gKey);
              videoUrl = result.videoUrl;
              syncProvider = 'geminigen';
            } else {
              throw poyoErr;
            }
          }
        } else {
          throw new Error(`Provider "${provider}" not supported in sync mode`);
        }
      } catch (e) {
        errorMsg = e instanceof Error ? e.message : 'Generation failed';
        console.error(`[generate-video] sync ${syncProvider} error:`, e);
      }

      await supabase.from('video_generations').update({
        status: videoUrl ? 'completed' : 'failed',
        video_url: videoUrl,
        error_message: errorMsg,
        provider: syncProvider,
        model_used: syncProvider !== provider ? (SYNC_FALLBACK_MAP[model || ''] || model) : model,
        generation_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
        progress: 100,
      }).eq('id', job.id);

      if (errorMsg) {
        return new Response(JSON.stringify({ error: errorMsg, job_id: job.id, status: 'failed' }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        job_id: job.id, video_url: videoUrl, status: 'completed', provider: syncProvider,
        model_used: model, model_upgraded_reason: modelUpgradedReason, stable_seed: stableSeed,
        keyframe_synthesized: keyframeSynthesized, keyframe_model: keyframeModel,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ───────── ASYNC MODE (default) — submit only ─────────
    let providerTaskId: string | null = null;
    let submitError: string | null = null;
    let actualProvider: VideoProvider = provider;

    // Helper: map PoYo model → GeminiGen equivalent for fallback
    const POYO_TO_GEMINIGEN_MAP: Record<string, string> = {
      'poyo/seedance-2': 'geminigen/veo-3.1-fast',
      'poyo/sora-2': 'geminigen/sora-2',
      'poyo/happy-horse': 'geminigen/veo-3.1-fast',
    };

    try {
      if (provider === 'geminigen') {
        const apiKey = Deno.env.get("GEMINIGEN_API_KEY");
        if (!apiKey) throw new Error('GEMINIGEN_API_KEY not configured');
        const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
        providerTaskId = await submitGeminiGenVideoTask({
          prompt: enrichedPrompt, model: selectedModel,
          aspectRatio: aspect_ratio,
          resolution: resolution === '720p' ? '720p' : '1080p',
          duration, negativePrompt: negative_prompt,
          startingFrameUrl: characterRefUrl,
              seed: stableSeed,
        }, apiKey);
      } else if (provider === 'poyo') {
        const apiKey = Deno.env.get("POYO_API_KEY");
        if (!apiKey) throw new Error('POYO_API_KEY not configured');
        const selectedModel = (model && POYO_VIDEO_MODELS.includes(model as PoyoVideoModel)
          ? model : POYO_VIDEO_MODELS[0]) as PoyoVideoModel;
        providerTaskId = await submitPoyoVideoTask({
          prompt: enrichedPrompt, model: selectedModel,
          aspectRatio: (aspect_ratio as '16:9' | '9:16' | '1:1') ?? '9:16',
          duration,
          resolution: resolution === '720p' ? '720p' : '1080p',
          startingFrameUrl: characterRefUrl,
              seed: stableSeed,
          negativePrompt: negative_prompt,
        }, apiKey);
      } else {
        throw new Error(`Provider "${provider}" not supported in async mode (use sync=true).`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Submit failed';
      console.error(`[generate-video] submit ${provider} error:`, e);

      // ───── AUTO-FALLBACK: PoYo 402/credits → GeminiGen ─────
      const isPoyoCreditsError = provider === 'poyo' &&
        (errMsg.includes('402') || errMsg.includes('CREDITS_EXHAUSTED') || errMsg.includes('insufficient_credits'));
      const geminigenKey = Deno.env.get("GEMINIGEN_API_KEY");

      if (isPoyoCreditsError && geminigenKey) {
        const fallbackModel = POYO_TO_GEMINIGEN_MAP[model || 'poyo/seedance-2'] || 'geminigen/veo-3.1-fast';
        console.log(`[generate-video] PoYo credits exhausted → fallback to GeminiGen model=${fallbackModel}`);

        try {
          providerTaskId = await submitGeminiGenVideoTask({
            prompt: enrichedPrompt, model: fallbackModel,
            aspectRatio: aspect_ratio,
            resolution: resolution === '720p' ? '720p' : '1080p',
            duration, negativePrompt: negative_prompt,
            startingFrameUrl: characterRefUrl,
              seed: stableSeed,
          }, geminigenKey);
          actualProvider = 'geminigen';

          // Update job row with new provider info
          await supabase.from('video_generations').update({
            provider: 'geminigen',
            model_used: fallbackModel,
          }).eq('id', job.id);

          console.log(`[generate-video] GeminiGen fallback succeeded: task=${providerTaskId}`);
        } catch (fallbackErr) {
          console.error(`[generate-video] GeminiGen fallback also failed:`, fallbackErr);
          submitError = `PoYo hết credits, GeminiGen fallback cũng thất bại: ${fallbackErr instanceof Error ? fallbackErr.message : 'Unknown'}`;
        }
      } else {
        submitError = errMsg;
      }
    }

    if (submitError || !providerTaskId) {
      await supabase.from('video_generations').update({
        status: 'failed',
        error_message: submitError ?? 'Unknown submit error',
        completed_at: new Date().toISOString(),
        progress: 100,
      }).eq('id', job.id);

      const status = submitError?.includes('429') ? 429
                    : submitError?.includes('402') || submitError?.includes('CREDITS') ? 402
                    : 500;
      return new Response(JSON.stringify({ error: submitError, job_id: job.id, status: 'failed' }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as processing — poller will take over
    await supabase.from('video_generations').update({
      status: 'processing',
      provider_task_id: providerTaskId,
      progress: 10,
      last_polled_at: new Date().toISOString(),
    }).eq('id', job.id);

    console.log(`[generate-video] async job ready: id=${job.id} task=${providerTaskId}`);

    return new Response(JSON.stringify({
      job_id: job.id,
      provider_task_id: providerTaskId,
      status: 'processing',
      provider: actualProvider,
      model_used: model,
      model_upgraded_reason: modelUpgradedReason,
      stable_seed: stableSeed,
      keyframe_synthesized: keyframeSynthesized,
      keyframe_model: keyframeModel,
      message: 'Video đang được tạo nền — theo dõi tiến độ qua Realtime hoặc tab Thư viện.',
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("[generate-video] Error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    const status = errorMessage.includes('429') ? 429
                  : errorMessage.includes('402') ? 402 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
