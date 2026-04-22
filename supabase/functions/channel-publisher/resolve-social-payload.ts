// Pure resolver for social payloads — extracted so it can be unit-tested
// without booting Deno.serve. Used by index.ts.
//
// Given an `action` (facebook/instagram/.../zalo/google-business) plus the
// incoming partial payload from Telegram (typically just `{ contentId }`),
// it returns either a fully-formed publish payload or a typed error.

export interface SupabaseLikeClient {
  from: (table: string) => any;
}

export const SOCIAL_RESOLVE_MAP: Record<
  string,
  { dbPlatform: string; contentColumn: string; channelKey: string }
> = {
  facebook: { dbPlatform: 'facebook', contentColumn: 'facebook_content', channelKey: 'facebook' },
  instagram: { dbPlatform: 'instagram', contentColumn: 'instagram_content', channelKey: 'instagram' },
  linkedin: { dbPlatform: 'linkedin', contentColumn: 'linkedin_content', channelKey: 'linkedin' },
  twitter: { dbPlatform: 'twitter', contentColumn: 'twitter_content', channelKey: 'twitter' },
  threads: { dbPlatform: 'threads', contentColumn: 'threads_content', channelKey: 'threads' },
  tiktok: { dbPlatform: 'tiktok', contentColumn: 'tiktok_content', channelKey: 'tiktok' },
  zalo: { dbPlatform: 'zalo_oa', contentColumn: 'zalo_content', channelKey: 'zalo_oa' },
  'google-business': {
    dbPlatform: 'google_business',
    contentColumn: 'google_business_content',
    channelKey: 'google_maps',
  },
};

export type ResolveResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; status: number; error: string; errorCode?: string };

export interface ResolveInput {
  action: string;
  payload: Record<string, unknown>;
  supabase: SupabaseLikeClient;
}

export async function resolveSocialPayload(input: ResolveInput): Promise<ResolveResult> {
  const { action, payload, supabase } = input;
  const socialMap = SOCIAL_RESOLVE_MAP[action];
  if (!socialMap) {
    return { ok: true, payload }; // not a social action — passthrough
  }

  const contentId = (payload.contentId || payload.content_id) as string | undefined;
  // If caller already provided everything, skip resolve
  if (payload.connectionId && payload.content) {
    return { ok: true, payload };
  }
  if (!contentId || typeof contentId !== 'string') {
    return {
      ok: false,
      status: 400,
      error: 'connectionId and content are required (or provide contentId)',
    };
  }

  const finalPayload: Record<string, unknown> = { ...payload };

  // 1. Fetch content row
  const { data: mcc, error: mccErr } = await supabase
    .from('multi_channel_contents')
    .select('*')
    .eq('id', contentId)
    .maybeSingle();

  if (mccErr || !mcc) {
    return { ok: false, status: 400, error: 'Không tìm thấy nội dung' };
  }

  const mccRow = mcc as Record<string, any>;
  const channelContent = mccRow[socialMap.contentColumn] || mccRow.content || '';

  if (!channelContent || typeof channelContent !== 'string' || !channelContent.trim()) {
    return {
      ok: false,
      status: 400,
      error: `Bài chưa có nội dung cho ${socialMap.dbPlatform}. Vui lòng tạo nội dung kênh này trước.`,
    };
  }

  // 2. Lookup connection if missing
  if (!finalPayload.connectionId) {
    let connQuery = supabase
      .from('social_connections')
      .select('id')
      .eq('platform', socialMap.dbPlatform)
      .eq('is_active', true)
      .eq('organization_id', mccRow.organization_id);
    if (mccRow.brand_template_id) {
      connQuery = connQuery.eq('brand_template_id', mccRow.brand_template_id);
    }
    const { data: conn } = await connQuery.limit(1).maybeSingle();

    if (!conn?.id) {
      return {
        ok: false,
        status: 400,
        error: `Chưa kết nối ${socialMap.dbPlatform}. Vui lòng kết nối lại.`,
        errorCode: 'NO_CONNECTION',
      };
    }
    finalPayload.connectionId = conn.id;
  }

  // 3. Inject content + media
  finalPayload.content = channelContent;

  try {
    const channelImages = mccRow.channel_images as Record<string, any> | null;
    if (channelImages && typeof channelImages === 'object') {
      const imgs = channelImages[socialMap.channelKey];
      const urls: string[] = [];

      if (Array.isArray(imgs)) {
        // Legacy: array of strings or {url}/{image_url} objects
        for (const it of imgs) {
          const u = typeof it === 'string' ? it : it?.url || it?.image_url;
          if (typeof u === 'string' && u.trim()) urls.push(u);
        }
      } else if (imgs && typeof imgs === 'object') {
        // Production: single object {url, ...} from generate-brand-image
        const u = (imgs as any).url || (imgs as any).image_url;
        if (typeof u === 'string' && u.trim()) urls.push(u);
      } else if (typeof imgs === 'string' && imgs.trim()) {
        // Bulletproof: bare URL string
        urls.push(imgs);
      }

      if (urls.length > 0) {
        finalPayload.mediaUrls = urls;
        if (!finalPayload.mediaUrl) finalPayload.mediaUrl = urls[0];
      }
    }
  } catch {
    /* non-fatal */
  }

  if (mccRow.organization_id) finalPayload.organization_id = mccRow.organization_id;

  return { ok: true, payload: finalPayload };
}
