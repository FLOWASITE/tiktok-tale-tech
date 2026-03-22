// ============================================
// Analyze Regulation Impact Edge Function
// AI analysis of regulatory changes and their impact
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  propagation_id: string;
}

interface ImpactAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affected_content_types: string[];
  recommended_actions: string[];
  estimated_effort: string;
  summary: string;
}

interface AffectedRule {
  rule_id?: string;
  rule_text: string;
  impact_type: 'modify' | 'remove' | 'add';
  suggested_change?: string;
}

// Call AI for analysis
async function analyzeWithAI(context: string): Promise<{ impact_analysis: ImpactAnalysis; affected_rules: AffectedRule[] }> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const systemPrompt = `You are a regulatory compliance expert specializing in content marketing and advertising regulations.
Analyze the regulatory change and its impact on content creation guidelines.

Return a JSON object with:
1. impact_analysis: {
   severity: "low" | "medium" | "high" | "critical",
   affected_content_types: ["social_media", "ads", "email", etc.],
   recommended_actions: ["action1", "action2"],
   estimated_effort: "1-2 hours" | "1-2 days" | "1 week+",
   summary: "Brief summary of impact"
}
2. affected_rules: [
   {
     rule_text: "The rule that needs to change",
     impact_type: "modify" | "remove" | "add",
     suggested_change: "What should be done"
   }
]

Be specific and actionable. Focus on practical content creation implications.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Analyze] AI error:', response.status, errorData);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    return JSON.parse(content);
  } catch {
    console.error('[Analyze] Failed to parse AI response:', content);
    return {
      impact_analysis: {
        severity: 'medium',
        affected_content_types: ['general'],
        recommended_actions: ['Review and update content guidelines'],
        estimated_effort: '1-2 days',
        summary: 'Unable to fully analyze. Manual review recommended.',
      },
      affected_rules: [],
    };
  }
}

Deno.Deno.serve(withPerf({ functionName: 'analyze-regulation-impact', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { propagation_id }: AnalyzeRequest = await req.json();

    if (!propagation_id) {
      return new Response(
        JSON.stringify({ error: 'propagation_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Analyze] Processing propagation:', propagation_id);

    // Fetch propagation details
    const { data: propagation, error: fetchError } = await supabase
      .from('regulation_propagation_log')
      .select(`
        *,
        source_node:industry_knowledge_nodes!source_node_id(
          node_key, display_name, description, properties
        ),
        affected_pack:industry_global_packs!affected_pack_id(
          industry_code, global_compliance_rules
        )
      `)
      .eq('id', propagation_id)
      .single();

    if (fetchError || !propagation) {
      console.error('[Analyze] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Propagation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context for AI analysis
    const context = `
## Regulatory Change Analysis Request

### Change Details
- Type: ${propagation.change_type}
- Summary: ${propagation.change_summary || 'No summary provided'}
- Priority: ${propagation.priority}

### Source Regulation
${propagation.source_node ? `
- Key: ${propagation.source_node.node_key}
- Name: ${JSON.stringify(propagation.source_node.display_name)}
- Description: ${JSON.stringify(propagation.source_node.description)}
- Properties: ${JSON.stringify(propagation.source_node.properties)}
` : 'No source regulation linked'}

### Affected Industry Pack
${propagation.affected_pack ? `
- Industry Code: ${propagation.affected_pack.industry_code}
- Current Compliance Rules: ${JSON.stringify(propagation.affected_pack.global_compliance_rules)}
` : 'No affected pack details'}

Please analyze this regulatory change and provide:
1. Impact severity and scope
2. Which content types are affected
3. Recommended actions
4. Specific rules that need modification
`;

    console.log('[Analyze] Context length:', context.length);

    // Perform AI analysis
    const analysis = await analyzeWithAI(context);

    console.log('[Analyze] Analysis complete:', analysis.impact_analysis.severity);

    // Update propagation with analysis results and set status to 'ready'
    const { error: updateError } = await supabase
      .from('regulation_propagation_log')
      .update({
        propagation_status: 'ready',
        impact_analysis: {
          ...propagation.impact_analysis,
          ...analysis.impact_analysis,
          analyzed_at: new Date().toISOString(),
        },
        affected_rules: analysis.affected_rules,
        priority: analysis.impact_analysis.severity === 'critical' ? 'critical' 
                : analysis.impact_analysis.severity === 'high' ? 'high'
                : analysis.impact_analysis.severity === 'medium' ? 'medium' : 'low',
      })
      .eq('id', propagation_id);

    if (updateError) {
      console.error('[Analyze] Update error:', updateError);
      throw new Error('Failed to save analysis results');
    }

    console.log('[Analyze] Propagation updated to ready status');

    return new Response(
      JSON.stringify({
        success: true,
        propagation_id,
        status: 'ready',
        ...analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Analyze] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
