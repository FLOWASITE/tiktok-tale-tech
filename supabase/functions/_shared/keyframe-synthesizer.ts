/**
 * Keyframe Synthesizer — dùng image-edit model (Nano Banana 2 / Gemini-2.5-flash-image)
 * để dựng 1 keyframe khớp scene+aspect TRƯỚC khi đưa vào Veo i2v.
 *
 * Lý do: portrait studio làm starting_frame_url buộc Veo phải re-imagine khuôn mặt
 * trong context mới → drift mạnh. Với keyframe đã đặt nhân vật vào đúng scene,
 * Veo chỉ cần animate → mặt giữ nguyên rất tốt.
 *
 * Cache key = sha256(charIds sorted + scenePrompt + aspect) → tái dùng cho cùng cast+cảnh.
 */

interface CharRef {
  id: string;
  name: string;
  refUrl?: string;
  appearance?: Record<string, string>;
  wardrobe?: string;
}

interface SynthesizeArgs {
  scenePrompt: string;
  aspectRatio: string;
  characters: CharRef[];
  productRefUrl?: string;
  organizationId: string;
  supabase: any;
  lovableApiKey: string;
}

const DEFAULT_PRIMARY_MODEL = 'google/gemini-3.1-flash-image-preview';
const FALLBACK_MODEL = 'google/gemini-2.5-flash-image';
const ALLOWED_KEYFRAME_MODELS = new Set([
  'google/gemini-3.1-flash-image-preview',
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-flash-image',
]);

/** Resolve keyframe model from ai_function_configs (Admin override). Falls back to default. */
async function resolveKeyframeModel(supabase: any, organizationId: string): Promise<string> {
  try {
    // Org-level override first, then global
    const { data } = await supabase
      .from('ai_function_configs')
      .select('model_override, organization_id, is_enabled')
      .eq('function_name', 'keyframe-synthesizer')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`);
    if (data && data.length) {
      const orgRow = data.find((r: any) => r.organization_id === organizationId && r.is_enabled !== false);
      const globalRow = data.find((r: any) => r.organization_id === null && r.is_enabled !== false);
      const picked = (orgRow?.model_override || globalRow?.model_override || '').trim();
      if (picked && ALLOWED_KEYFRAME_MODELS.has(picked)) return picked;
      if (picked) console.warn(`[keyframe-synth] model "${picked}" not in allowlist, using default`);
    }
  } catch (e) {
    console.warn('[keyframe-synth] resolveKeyframeModel failed, using default', e);
  }
  return DEFAULT_PRIMARY_MODEL;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function aspectGuide(aspect: string): string {
  switch (aspect) {
    case '9:16': return 'vertical 9:16 portrait framing for mobile/Reels/TikTok';
    case '1:1': return 'square 1:1 framing';
    case '4:3': return 'standard 4:3 framing';
    case '3:4': return 'portrait 3:4 framing';
    case '21:9': return 'cinematic ultra-wide 21:9 framing';
    default: return 'landscape 16:9 framing';
  }
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const ab = await res.arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(ab);
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch (e) {
    console.warn('[keyframe-synth] fetch ref failed', url, e);
    return null;
  }
}

async function callImageEdit(
  apiKey: string,
  model: string,
  textPrompt: string,
  imageDataUrls: string[],
): Promise<string | null> {
  const content: any[] = [{ type: 'text', text: textPrompt }];
  for (const dataUrl of imageDataUrls) {
    content.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    console.warn(`[keyframe-synth] ${model} ${resp.status}: ${txt.slice(0, 200)}`);
    return null;
  }
  const data = await resp.json();
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return url || null;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType: m[1] };
}

export async function synthesizeKeyframe(args: SynthesizeArgs): Promise<{ url: string; model: string } | null> {
  const { scenePrompt, aspectRatio, characters, productRefUrl, organizationId, supabase, lovableApiKey } = args;
  const charsWithRef = characters.filter((c) => !!c.refUrl);
  if (charsWithRef.length === 0) return null;

  // ── Cache lookup ────────────────────────────────────────────
  const sortedIds = [...charsWithRef.map((c) => c.id)].sort();
  const cacheInput = JSON.stringify({ ids: sortedIds, scene: scenePrompt.trim(), aspect: aspectRatio, prod: productRefUrl || '' });
  const hash = (await sha256Hex(cacheInput)).slice(0, 16);
  const cachePath = `_keyframes/${organizationId}/${hash}.png`;

  try {
    const { data: existing } = await supabase.storage
      .from('character-references')
      .list(`_keyframes/${organizationId}`, { search: `${hash}.png`, limit: 1 });
    if (existing && existing.length > 0) {
      const { data: pub } = supabase.storage.from('character-references').getPublicUrl(cachePath);
      console.log(`[keyframe-synth] cache hit → ${pub.publicUrl}`);
      return { url: pub.publicUrl, model: 'cache' };
    }
  } catch (_) { /* ignore */ }

  // ── Build edit prompt ───────────────────────────────────────
  const charDesc = charsWithRef.map((c, i) => {
    const role = charsWithRef.length > 1 ? `character ${i + 1} ("${c.name}")` : `the character "${c.name}"`;
    const traits: string[] = [];
    const a = c.appearance || {};
    if (a.gender) traits.push(a.gender);
    if (a.age_range) traits.push(`age ${a.age_range}`);
    if (a.hair) traits.push(`${a.hair} hair`);
    const t = traits.length ? ` (${traits.join(', ')})` : '';
    const w = c.wardrobe ? `, wearing ${c.wardrobe}` : '';
    return `- Reference image ${i + 1} = ${role}${t}${w}. PRESERVE this exact face, hair, and identity pixel-for-pixel.`;
  }).join('\n');

  const prompt = `Create a single cinematic photograph as the FIRST FRAME of a video clip.

CHARACTERS (use the attached reference images):
${charDesc}

SCENE TO RENDER:
${scenePrompt}

REQUIREMENTS:
- ${aspectGuide(aspectRatio)} — compose for this exact aspect ratio.
- Photorealistic, high-quality lighting matching the scene.
- Place the character(s) naturally inside the described scene/environment.
- ABSOLUTE PRIORITY: faces must look IDENTICAL to the reference photos. Do NOT redraw, do NOT stylize, do NOT change features. Same eyes, nose, mouth, jawline, hairstyle, skin tone.
${charsWithRef.length > 1 ? '- Keep each character distinct — do not merge or swap features between them.\n' : ''}- Output: one image only, no text overlay, no watermark, no borders.`;

  // ── Build image attachments (refs first, then product) ──────
  const imageDataUrls: string[] = [];
  for (const c of charsWithRef) {
    const d = await urlToDataUrl(c.refUrl!);
    if (d) imageDataUrls.push(d);
  }
  if (productRefUrl) {
    const d = await urlToDataUrl(productRefUrl);
    if (d) imageDataUrls.push(d);
  }
  if (imageDataUrls.length === 0) return null;

  // ── Call image edit (primary → fallback) ────────────────────
  const PRIMARY_MODEL = await resolveKeyframeModel(supabase, organizationId);
  let outDataUrl: string | null = null;
  let modelUsed = PRIMARY_MODEL;
  try {
    outDataUrl = await callImageEdit(lovableApiKey, PRIMARY_MODEL, prompt, imageDataUrls);
  } catch (e) {
    console.warn('[keyframe-synth] primary failed', e);
  }
  if (!outDataUrl) {
    modelUsed = FALLBACK_MODEL;
    try {
      outDataUrl = await callImageEdit(lovableApiKey, FALLBACK_MODEL, prompt, imageDataUrls);
    } catch (e) {
      console.warn('[keyframe-synth] fallback failed', e);
    }
  }
  if (!outDataUrl) return null;

  // ── Decode + upload ─────────────────────────────────────────
  const decoded = dataUrlToBytes(outDataUrl);
  if (!decoded) return null;
  const { error: upErr } = await supabase.storage
    .from('character-references')
    .upload(cachePath, decoded.bytes, { contentType: decoded.contentType, upsert: true });
  if (upErr) {
    console.warn('[keyframe-synth] upload failed', upErr);
    return null;
  }
  const { data: pub } = supabase.storage.from('character-references').getPublicUrl(cachePath);
  console.log(`[keyframe-synth] ✅ keyframe built model=${modelUsed} → ${pub.publicUrl}`);
  return { url: pub.publicUrl, model: modelUsed };
}
