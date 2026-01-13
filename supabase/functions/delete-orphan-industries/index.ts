import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Find all CORE industries without sub-industries
    const { data: orphanPacks, error: fetchError } = await supabase
      .from('industry_global_packs')
      .select(`
        id,
        industry_code,
        industry_level
      `)
      .eq('industry_level', 'core')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Failed to fetch packs: ${fetchError.message}`);
    }

    // Filter out packs that have sub-industries
    const { data: packsWithSubs } = await supabase
      .from('industry_global_packs')
      .select('parent_pack_id')
      .not('parent_pack_id', 'is', null);

    const parentIds = new Set((packsWithSubs || []).map(p => p.parent_pack_id));
    
    // Also filter out packs that have brand_templates referencing them
    const { data: packsWithBrands } = await supabase
      .from('brand_templates')
      .select('global_pack_id')
      .not('global_pack_id', 'is', null);

    const brandPackIds = new Set((packsWithBrands || []).map(p => p.global_pack_id));
    
    const orphanIds = orphanPacks
      .filter(p => !parentIds.has(p.id) && !brandPackIds.has(p.id))
      .map(p => p.id);

    const orphanCodes = orphanPacks
      .filter(p => !parentIds.has(p.id) && !brandPackIds.has(p.id))
      .map(p => p.industry_code);

    console.log(`Found ${orphanIds.length} orphan CORE industries:`, orphanCodes);

    if (orphanIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No orphan industries found',
        deleted: { packs: 0, profiles: 0, translations: 0, personas: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Delete personas first
    const { data: deletedPersonas, error: personasError } = await supabase
      .from('industry_personas_v2')
      .delete()
      .in('global_pack_id', orphanIds)
      .select('id');

    if (personasError) {
      console.error('Personas delete error:', personasError);
    }
    const personasCount = deletedPersonas?.length || 0;
    console.log(`Deleted ${personasCount} personas`);

    // Step 3: Delete jurisdiction profiles
    const { data: deletedProfiles, error: profilesError } = await supabase
      .from('industry_jurisdiction_profiles')
      .delete()
      .in('global_pack_id', orphanIds)
      .select('id');

    if (profilesError) {
      console.error('Profiles delete error:', profilesError);
    }
    const profilesCount = deletedProfiles?.length || 0;
    console.log(`Deleted ${profilesCount} jurisdiction profiles`);

    // Step 4: Delete translations
    const { data: deletedTranslations, error: translationsError } = await supabase
      .from('industry_pack_translations')
      .delete()
      .in('global_pack_id', orphanIds)
      .select('id');

    if (translationsError) {
      console.error('Translations delete error:', translationsError);
    }
    const translationsCount = deletedTranslations?.length || 0;
    console.log(`Deleted ${translationsCount} translations`);

    // Step 5: Delete the global packs themselves
    const { data: deletedPacks, error: packsError } = await supabase
      .from('industry_global_packs')
      .delete()
      .in('id', orphanIds)
      .select('id, industry_code');

    if (packsError) {
      throw new Error(`Failed to delete packs: ${packsError.message}`);
    }
    const packsCount = deletedPacks?.length || 0;
    console.log(`Deleted ${packsCount} global packs`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully deleted ${packsCount} orphan CORE industries`,
      deleted: {
        packs: packsCount,
        profiles: profilesCount,
        translations: translationsCount,
        personas: personasCount
      },
      deletedCodes: deletedPacks?.map(p => p.industry_code) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
