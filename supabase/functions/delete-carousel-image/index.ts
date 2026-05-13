import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'delete-carousel-image', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth gate ──────────────────────────────────────────────
    // Previously this function ran with SERVICE_ROLE_KEY without checking
    // JWT → anyone with a public storage URL could delete cross-tenant.
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = userData.user.id;

    const { imageUrl, carouselId, slideNumber } = await req.json();
    if (!imageUrl || !carouselId) {
      return new Response(
        JSON.stringify({ error: 'imageUrl and carouselId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Ownership check: caller must be in the carousel's organization ──
    const { data: carousel, error: cErr } = await supabase
      .from('carousels')
      .select('id, organization_id, user_id')
      .eq('id', carouselId)
      .maybeSingle();

    if (cErr || !carousel) {
      return new Response(
        JSON.stringify({ error: 'Carousel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let allowed = carousel.user_id === userId;
    if (!allowed && carousel.organization_id) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', carousel.organization_id)
        .eq('user_id', userId)
        .maybeSingle();
      allowed = !!member;
    }
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Extract storage path ────────────────────────────────────
    const urlParts = imageUrl.split('/carousel-images/');
    if (urlParts.length !== 2) {
      return new Response(
        JSON.stringify({ error: 'Invalid image URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const filePath = urlParts[1];

    // ── Delete storage object (best-effort) ─────────────────────
    const { error: storageErr } = await supabase.storage
      .from('carousel-images')
      .remove([filePath]);
    if (storageErr) {
      console.warn('[delete-carousel-image] storage remove warning:', storageErr.message);
      // Continue to DB cleanup — file may already be gone.
    }

    // ── Clean up DB rows (was missing → orphans) ────────────────
    let dbQuery = supabase
      .from('carousel_images')
      .delete()
      .eq('carousel_id', carouselId)
      .eq('image_url', imageUrl);
    if (typeof slideNumber === 'number') {
      dbQuery = dbQuery.eq('slide_number', slideNumber);
    }
    const { error: dbErr } = await dbQuery;
    if (dbErr) {
      console.error('[delete-carousel-image] DB delete error:', dbErr);
      return new Response(
        JSON.stringify({ error: 'Failed to delete image record: ' + dbErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, deletedFile: filePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[delete-carousel-image] Unexpected error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Unexpected error: ' + msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
