import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withPerf({ functionName: 'delete-orphan-industries' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { includeBrands = false } = await req.json().catch(() => ({}));

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
    
    let orphanIds = orphanPacks
      .filter(p => !parentIds.has(p.id))
      .map(p => p.id);

    let orphanCodes = orphanPacks
      .filter(p => !parentIds.has(p.id))
      .map(p => p.industry_code);

    console.log(`Found ${orphanIds.length} orphan CORE industries:`, orphanCodes);

    if (orphanIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No orphan industries found',
        deleted: { packs: 0, profiles: 0, translations: 0, personas: 0, brands: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let brandsCount = 0;

    // If includeBrands, delete brands first
    if (includeBrands) {
      // Delete related brand data first (in correct order for FK constraints)
      // 1. brand_products
      const { data: brandIds } = await supabase
        .from('brand_templates')
        .select('id')
        .in('global_pack_id', orphanIds);

      const brandIdList = (brandIds || []).map(b => b.id);

      if (brandIdList.length > 0) {
        // Delete brand_products
        await supabase.from('brand_products').delete().in('brand_template_id', brandIdList);
        // Delete brand_channel_optimizations
        await supabase.from('brand_channel_optimizations').delete().in('brand_template_id', brandIdList);
        // Delete brand_voice_variants
        await supabase.from('brand_voice_variants').delete().in('brand_template_id', brandIdList);
        // Delete customer_personas
        await supabase.from('customer_personas').delete().in('brand_template_id', brandIdList);
        // Delete brand_preferences_learned
        await supabase.from('brand_preferences_learned').delete().in('brand_template_id', brandIdList);
        // Delete content_embeddings
        await supabase.from('content_embeddings').delete().in('brand_template_id', brandIdList);
        // Delete ai_response_cache
        await supabase.from('ai_response_cache').delete().in('brand_template_id', brandIdList);
        // Delete ai_metrics
        await supabase.from('ai_metrics').delete().in('brand_template_id', brandIdList);
      }

      // Now delete brand_templates
      const { data: deletedBrands, error: brandsError } = await supabase
        .from('brand_templates')
        .delete()
        .in('global_pack_id', orphanIds)
        .select('id');

      if (brandsError) {
        console.error('Brands delete error:', brandsError);
        throw new Error(`Failed to delete brands: ${brandsError.message}`);
      }
      brandsCount = deletedBrands?.length || 0;
      console.log(`Deleted ${brandsCount} brands`);
    } else {
      // If not including brands, filter out packs that have brands
      const { data: packsWithBrands } = await supabase
        .from('brand_templates')
        .select('global_pack_id')
        .not('global_pack_id', 'is', null);

      const brandPackIds = new Set((packsWithBrands || []).map(p => p.global_pack_id));
      
      orphanIds = orphanIds.filter(id => !brandPackIds.has(id));
      orphanCodes = orphanPacks
        .filter(p => orphanIds.includes(p.id))
        .map(p => p.industry_code);

      if (orphanIds.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'All remaining orphan industries have brands. Use includeBrands=true to delete them.',
          deleted: { packs: 0, profiles: 0, translations: 0, personas: 0, brands: 0 }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Step 2: Delete personas
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
      message: `Successfully deleted ${packsCount} orphan CORE industries` + (brandsCount > 0 ? ` and ${brandsCount} brands` : ''),
      deleted: {
        packs: packsCount,
        profiles: profilesCount,
        translations: translationsCount,
        personas: personasCount,
        brands: brandsCount
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
}));
