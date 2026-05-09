import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { decryptCredential } from "../_shared/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PinterestBoard {
  id: string;
  name: string;
  privacy: string;
  pin_count?: number;
}

Deno.serve(withPerf({ functionName: 'pinterest-list-boards' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('id, organization_id, access_token, platform')
      .eq('id', connectionId)
      .eq('platform', 'pinterest')
      .single();

    if (error || !connection) throw new Error('Pinterest connection not found');

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Failed to decrypt access token');

    // Pinterest may paginate; fetch up to 250 boards (5 pages of 50)
    const boards: PinterestBoard[] = [];
    let bookmark: string | null = null;
    for (let i = 0; i < 5; i++) {
      const url = new URL('https://api.pinterest.com/v5/boards');
      url.searchParams.set('page_size', '50');
      if (bookmark) url.searchParams.set('bookmark', bookmark);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Pinterest API ${res.status}: ${txt.slice(0, 200)}`);
      }

      const data = await res.json();
      for (const b of data.items || []) {
        boards.push({
          id: b.id,
          name: b.name,
          privacy: b.privacy,
          pin_count: b.pin_count,
          // @ts-ignore extra field used for upsert
          cover_image_url: b.media?.image_cover_url ?? b.media?.pin_thumbnail_urls?.[0] ?? null,
        });
      }
      bookmark = data.bookmark || null;
      if (!bookmark) break;
    }

    // Persist into pinterest_boards so the brand selector can read them
    if (boards.length > 0) {
      const rows = boards.map((b: any) => ({
        connection_id: connectionId,
        organization_id: connection.organization_id ?? null,
        board_id: b.id,
        name: b.name,
        privacy: b.privacy ?? null,
        pin_count: typeof b.pin_count === 'number' ? b.pin_count : 0,
        cover_image_url: b.cover_image_url ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error: upsertErr } = await supabase
        .from('pinterest_boards')
        .upsert(rows, { onConflict: 'connection_id,board_id' });
      if (upsertErr) {
        console.error('[pinterest-list-boards] upsert error:', upsertErr);
      }

      // Remove boards that no longer exist on Pinterest for this connection
      const ids = boards.map((b: any) => b.id);
      const { error: delErr } = await supabase
        .from('pinterest_boards')
        .delete()
        .eq('connection_id', connectionId)
        .not('board_id', 'in', `(${ids.map((i) => `"${i}"`).join(',')})`);
      if (delErr) {
        console.error('[pinterest-list-boards] cleanup error:', delErr);
      }
    } else {
      // No boards on Pinterest → clear the cache
      await supabase.from('pinterest_boards').delete().eq('connection_id', connectionId);
    }

    return new Response(
      JSON.stringify({ success: true, boards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[pinterest-list-boards] error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
