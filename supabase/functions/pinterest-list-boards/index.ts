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
      .select('*')
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
        });
      }
      bookmark = data.bookmark || null;
      if (!bookmark) break;
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
