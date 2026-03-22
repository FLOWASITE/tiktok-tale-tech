// ============================================
// Apply Regulation Propagation Edge Function
// Apply analyzed regulatory changes to industry packs
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplyRequest {
  propagation_id: string;
}

interface AffectedRule {
  rule_id?: string;
  rule_text: string;
  impact_type: 'modify' | 'remove' | 'add';
  suggested_change?: string;
}

Deno.Deno.serve(withPerf({ functionName: 'apply-regulation-propagation' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !claims.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { propagation_id }: ApplyRequest = await req.json();

    if (!propagation_id) {
      return new Response(
        JSON.stringify({ error: 'propagation_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Apply] Processing propagation:', propagation_id, 'by user:', claims.user.id);

    // Fetch propagation with analysis
    const { data: propagation, error: fetchError } = await supabase
      .from('regulation_propagation_log')
      .select('*')
      .eq('id', propagation_id)
      .single();

    if (fetchError || !propagation) {
      return new Response(
        JSON.stringify({ error: 'Propagation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check status
    if (propagation.propagation_status !== 'ready') {
      return new Response(
        JSON.stringify({ error: 'Propagation not ready for application. Current status: ' + propagation.propagation_status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const affectedRules = (propagation.affected_rules || []) as AffectedRule[];
    const appliedChanges: string[] = [];

    // Check if affected_pack_id exists
    if (!propagation.affected_pack_id) {
      console.log('[Apply] No affected_pack_id, marking as applied without pack changes');
      
      // Update propagation status to applied (no pack changes needed)
      await supabase
        .from('regulation_propagation_log')
        .update({
          propagation_status: 'applied',
          reviewed_by: claims.user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Applied without pack changes (no affected_pack_id)',
        })
        .eq('id', propagation_id);
      
      return new Response(
        JSON.stringify({
          success: true,
          changes_applied: 0,
          details: ['No affected pack specified - propagation marked as reviewed'],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch current pack compliance rules
    const { data: pack, error: packError } = await supabase
      .from('industry_global_packs')
      .select('global_compliance_rules')
      .eq('id', propagation.affected_pack_id)
      .single();

    if (packError) {
      console.error('[Apply] Pack fetch error:', packError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch affected pack: ' + packError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process affected rules
    const currentRules = (pack?.global_compliance_rules as Record<string, unknown>) || {};
    const updatedRules = { ...currentRules };
    const rulesArray = (updatedRules.rules || []) as string[];

    for (const rule of affectedRules) {
      switch (rule.impact_type) {
        case 'add':
          if (rule.suggested_change) {
            rulesArray.push(rule.suggested_change);
            appliedChanges.push(`Added: ${rule.suggested_change.substring(0, 50)}...`);
          }
          break;
          
        case 'remove':
          const removeIndex = rulesArray.findIndex(r => 
            r.toLowerCase().includes(rule.rule_text.toLowerCase().substring(0, 30))
          );
          if (removeIndex >= 0) {
            const removed = rulesArray.splice(removeIndex, 1)[0];
            appliedChanges.push(`Removed: ${removed.substring(0, 50)}...`);
          }
          break;
          
        case 'modify':
          const modifyIndex = rulesArray.findIndex(r => 
            r.toLowerCase().includes(rule.rule_text.toLowerCase().substring(0, 30))
          );
          if (modifyIndex >= 0 && rule.suggested_change) {
            const old = rulesArray[modifyIndex];
            rulesArray[modifyIndex] = rule.suggested_change;
            appliedChanges.push(`Modified: "${old.substring(0, 30)}..." → "${rule.suggested_change.substring(0, 30)}..."`);
          }
          break;
      }
    }

    updatedRules.rules = rulesArray;
    updatedRules.last_updated = new Date().toISOString();
    updatedRules.last_propagation_id = propagation_id;

    // Update pack with new rules
    const { error: updateError } = await supabase
      .from('industry_global_packs')
      .update({ 
        global_compliance_rules: updatedRules,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propagation.affected_pack_id);

    if (updateError) {
      console.error('[Apply] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update pack rules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update propagation status
    await supabase
      .from('regulation_propagation_log')
      .update({
        propagation_status: 'applied',
        reviewed_by: claims.user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: `Applied ${appliedChanges.length} changes`,
      })
      .eq('id', propagation_id);

    console.log('[Apply] Applied', appliedChanges.length, 'changes');

    return new Response(
      JSON.stringify({
        success: true,
        changes_applied: appliedChanges.length,
        details: appliedChanges,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Apply] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
