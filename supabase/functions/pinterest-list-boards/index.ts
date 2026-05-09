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
  cover_image_url?: string | null;
}

async function fetchBoardsWithFilter(accessToken: string, privacyFilter?: string) {
  const boards: PinterestBoard[] = [];
  let bookmark: string | null = null;
  const diagnostics: any[] = [];
  for (let i = 0; i < 5; i++) {
    const url = new URL('https://api.pinterest.com/v5/boards');
    url.searchParams.set('page_size', '100');
    if (privacyFilter) url.searchParams.set('privacy', privacyFilter);
    if (bookmark) url.searchParams.set('bookmark', bookmark);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const txt = await res.text();
    if (!res.ok) {
      diagnostics.push({ page: i, status: res.status, body: txt.slice(0, 300), filter: privacyFilter });
      throw new Error(`Pinterest API ${res.status}: ${txt.slice(0, 200)}`);
    }
    let data: any;
    try { data = JSON.parse(txt); } catch { data = {}; }
    const items: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.boards)
        ? data.boards
        : Array.isArray(data)
          ? data
          : [];
    diagnostics.push({ page: i, status: res.status, itemsCount: items.length, hasBookmark: !!data?.bookmark, filter: privacyFilter });
    for (const b of items) {
      boards.push({
        id: b.id,
        name: b.name,
        privacy: b.privacy,
        pin_count: b.pin_count,
        cover_image_url: b.media?.image_cover_url ?? b.media?.pin_thumbnail_urls?.[0] ?? null,
      });
    }
    bookmark = data?.bookmark || null;
    if (!bookmark) break;
  }
  return { boards, diagnostics };
}

Deno.serve(withPerf({ functionName: 'pinterest-list-boards' }, async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = getServiceClient();
    const { connectionId } = await req.json();
    if (!connectionId) throw new Error('connectionId is required');

    const { data: connection, error } = await supabase
      .from('social_connections')
      .select('id, organization_id, access_token, platform, platform_username')
      .eq('id', connectionId)
      .eq('platform', 'pinterest')
      .single();

    if (error || !connection) throw new Error('Pinterest connection not found');

    const accessToken = await decryptCredential(connection.access_token);
    if (!accessToken) throw new Error('Failed to decrypt access token');

    console.log('[pinterest-list-boards] start', {
      connectionId,
      username: connection.platform_username,
      organization_id: connection.organization_id,
    });

    // 1) Default fetch (no filter — should return all)
    let { boards, diagnostics } = await fetchBoardsWithFilter(accessToken);

    // 2) Fallback: explicitly try ALL / PUBLIC / PROTECTED / SECRET in case account default hides some
    if (boards.length === 0) {
      console.warn('[pinterest-list-boards] default returned 0 boards — trying ALL filter');
      const all = await fetchBoardsWithFilter(accessToken, 'ALL');
      boards = all.boards;
      diagnostics = diagnostics.concat(all.diagnostics);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    boards = boards.filter((b) => (b.id && !seen.has(b.id) ? (seen.add(b.id), true) : false));

    console.log('[pinterest-list-boards] fetched boards:', { count: boards.length, diagnostics });

    // Persist into pinterest_boards so the brand selector can read them
    if (boards.length > 0) {
      const rows = boards.map((b) => ({
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

      const ids = boards.map((b) => b.id);
      const { error: delErr } = await supabase
        .from('pinterest_boards')
        .delete()
        .eq('connection_id', connectionId)
        .not('board_id', 'in', `(${ids.map((i) => `"${i}"`).join(',')})`);
      if (delErr) {
        console.error('[pinterest-list-boards] cleanup error:', delErr);
      }
    } else {
      await supabase.from('pinterest_boards').delete().eq('connection_id', connectionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        boards,
        boardCount: boards.length,
        username: connection.platform_username,
        hint: boards.length === 0
          ? 'Tài khoản Pinterest này hiện không trả về board nào. Vui lòng tạo ít nhất 1 board public trên pinterest.com (đảm bảo board không phải Secret), sau đó bấm Đồng bộ lại. Nếu vừa tạo board, đợi 1-2 phút để Pinterest đồng bộ.'
          : null,
        diagnostics,
      }),
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
