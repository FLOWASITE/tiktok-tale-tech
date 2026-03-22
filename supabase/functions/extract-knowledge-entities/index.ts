// ============================================
// Extract Knowledge Entities Edge Function
// Extracts regulation and term nodes from industry_global_packs
// Creates nodes and edges in the knowledge graph
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  action: 'status' | 'extract_regulations' | 'extract_terms' | 'extract_all';
  batch_size?: number;
  industry_pack_id?: string;
}

interface ExtractionStatus {
  total_industry_packs: number;
  packs_with_regulations: number;
  packs_with_terms: number;
  regulation_nodes: number;
  term_nodes: number;
  regulated_by_edges: number;
  uses_term_edges: number;
}

interface ExtractionResult {
  nodes_created: number;
  edges_created: number;
  errors: string[];
  duration_ms: number;
}

interface ComplianceRule {
  rule: string;
  category?: string;
  severity?: string;
}

interface Terminology {
  forbidden_terms_global?: string[];
  preferred_terms?: Record<string, string>;
  forbidden_words_by_lang?: Record<string, string[]>;
}

// Generate a deterministic node key for regulations
function generateRegulationKey(industryCode: string, rule: string): string {
  const hash = rule.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `reg_${industryCode}_${hash}`;
}

// Generate a deterministic node key for terms
function generateTermKey(term: string): string {
  return `term_${term.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
}

// Get extraction status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getExtractionStatus(supabase: any): Promise<ExtractionStatus> {
  // Count industry packs
  const { count: totalPacks } = await supabase
    .from('industry_global_packs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Count packs with regulations
  const { count: packsWithReg } = await supabase
    .from('industry_global_packs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('global_compliance_rules', 'is', null);

  // Count packs with terms
  const { count: packsWithTerms } = await supabase
    .from('industry_global_packs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('global_terminology', 'is', null);

  // Count regulation nodes
  const { count: regNodes } = await supabase
    .from('industry_knowledge_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('node_type', 'regulation')
    .eq('is_active', true);

  // Count term nodes
  const { count: termNodes } = await supabase
    .from('industry_knowledge_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('node_type', 'term')
    .eq('is_active', true);

  // Count regulated_by edges
  const { count: regEdges } = await supabase
    .from('industry_knowledge_edges')
    .select('*', { count: 'exact', head: true })
    .eq('edge_type', 'regulated_by');

  // Count uses_term edges
  const { count: termEdges } = await supabase
    .from('industry_knowledge_edges')
    .select('*', { count: 'exact', head: true })
    .eq('edge_type', 'uses_term');

  return {
    total_industry_packs: totalPacks || 0,
    packs_with_regulations: packsWithReg || 0,
    packs_with_terms: packsWithTerms || 0,
    regulation_nodes: regNodes || 0,
    term_nodes: termNodes || 0,
    regulated_by_edges: regEdges || 0,
    uses_term_edges: termEdges || 0,
  };
}

// Extract regulations from industry packs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractRegulations(
  supabase: any,
  batchSize: number,
  specificPackId?: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let nodesCreated = 0;
  let edgesCreated = 0;

  // Fetch industry packs with regulations
  let query = supabase
    .from('industry_global_packs')
    .select('id, industry_code, global_compliance_rules')
    .eq('is_active', true)
    .not('global_compliance_rules', 'is', null)
    .limit(batchSize);

  if (specificPackId) {
    query = query.eq('id', specificPackId);
  }

  const { data: packs, error: fetchError } = await query;

  if (fetchError) {
    return { nodes_created: 0, edges_created: 0, errors: [fetchError.message], duration_ms: Date.now() - startTime };
  }

  if (!packs || packs.length === 0) {
    return { nodes_created: 0, edges_created: 0, errors: [], duration_ms: Date.now() - startTime };
  }

  // Find industry nodes for linking
  const industryCodes = packs.map((p: { industry_code: string }) => p.industry_code);
  const { data: industryNodes } = await supabase
    .from('industry_knowledge_nodes')
    .select('id, node_key')
    .eq('node_type', 'industry')
    .in('node_key', industryCodes);

  const industryNodeMap = new Map(
    (industryNodes || []).map((n: { id: string; node_key: string }) => [n.node_key, n.id])
  );

  for (const pack of packs) {
    const rules = pack.global_compliance_rules as ComplianceRule[];
    if (!Array.isArray(rules)) continue;

    const industryNodeId = industryNodeMap.get(pack.industry_code);

    for (const rule of rules) {
      if (!rule.rule) continue;

      const nodeKey = generateRegulationKey(pack.industry_code, rule.rule);
      
      // Check if node already exists
      const { data: existingNode } = await supabase
        .from('industry_knowledge_nodes')
        .select('id')
        .eq('node_key', nodeKey)
        .single();

      if (existingNode) {
        console.log(`[Extract] Regulation node already exists: ${nodeKey}`);
        continue;
      }

      // Create regulation node
      const { data: newNode, error: insertError } = await supabase
        .from('industry_knowledge_nodes')
        .insert({
          global_pack_id: pack.id,
          node_type: 'regulation',
          node_key: nodeKey,
          display_name: {
            vi: rule.rule.substring(0, 100),
            en: `Regulation: ${rule.category || 'general'}`,
          },
          description: {
            vi: rule.rule,
            en: `Compliance rule for ${pack.industry_code}`,
          },
          properties: {
            category: rule.category || 'general',
            severity: rule.severity || 'medium',
            industry_code: pack.industry_code,
            full_rule: rule.rule,
          },
          is_active: true,
        })
        .select('id')
        .single();

      if (insertError) {
        errors.push(`Failed to create regulation node: ${insertError.message}`);
        continue;
      }

      nodesCreated++;
      console.log(`[Extract] Created regulation node: ${nodeKey}`);

      // Create edge from industry to regulation
      if (industryNodeId && newNode) {
        const { error: edgeError } = await supabase
          .from('industry_knowledge_edges')
          .insert({
            source_node_id: industryNodeId,
            target_node_id: newNode.id,
            edge_type: 'regulated_by',
            weight: rule.severity === 'critical' ? 1.0 : rule.severity === 'high' ? 0.8 : 0.5,
            properties: {
              category: rule.category,
              severity: rule.severity,
            },
          });

        if (!edgeError) {
          edgesCreated++;
        } else {
          errors.push(`Failed to create edge: ${edgeError.message}`);
        }
      }
    }
  }

  return {
    nodes_created: nodesCreated,
    edges_created: edgesCreated,
    errors: errors.slice(0, 10),
    duration_ms: Date.now() - startTime,
  };
}

// Extract terms from industry packs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractTerms(
  supabase: any,
  batchSize: number,
  specificPackId?: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let nodesCreated = 0;
  let edgesCreated = 0;

  // Fetch industry packs with terminology
  let query = supabase
    .from('industry_global_packs')
    .select('id, industry_code, global_terminology')
    .eq('is_active', true)
    .not('global_terminology', 'is', null)
    .limit(batchSize);

  if (specificPackId) {
    query = query.eq('id', specificPackId);
  }

  const { data: packs, error: fetchError } = await query;

  if (fetchError) {
    return { nodes_created: 0, edges_created: 0, errors: [fetchError.message], duration_ms: Date.now() - startTime };
  }

  if (!packs || packs.length === 0) {
    return { nodes_created: 0, edges_created: 0, errors: [], duration_ms: Date.now() - startTime };
  }

  // Find industry nodes for linking
  const industryCodes = packs.map((p: { industry_code: string }) => p.industry_code);
  const { data: industryNodes } = await supabase
    .from('industry_knowledge_nodes')
    .select('id, node_key')
    .eq('node_type', 'industry')
    .in('node_key', industryCodes);

  const industryNodeMap = new Map(
    (industryNodes || []).map((n: { id: string; node_key: string }) => [n.node_key, n.id])
  );

  // Track unique terms across packs (terms can be shared)
  const processedTerms = new Set<string>();

  for (const pack of packs) {
    const terminology = pack.global_terminology as Terminology;
    if (!terminology) continue;

    const industryNodeId = industryNodeMap.get(pack.industry_code);
    const forbiddenTerms = terminology.forbidden_terms_global || [];

    for (const term of forbiddenTerms) {
      if (!term || term.length < 2) continue;

      const nodeKey = generateTermKey(term);
      
      // Skip if already processed in this batch
      if (processedTerms.has(nodeKey)) {
        // Still create edge if industry node exists
        const { data: existingTermNode } = await supabase
          .from('industry_knowledge_nodes')
          .select('id')
          .eq('node_key', nodeKey)
          .single();

        if (existingTermNode && industryNodeId) {
          // Check if edge exists
          const { data: existingEdge } = await supabase
            .from('industry_knowledge_edges')
            .select('id')
            .eq('source_node_id', industryNodeId)
            .eq('target_node_id', existingTermNode.id)
            .eq('edge_type', 'uses_term')
            .single();

          if (!existingEdge) {
            const { error: edgeError } = await supabase
              .from('industry_knowledge_edges')
              .insert({
                source_node_id: industryNodeId,
                target_node_id: existingTermNode.id,
                edge_type: 'uses_term',
                weight: 1.0,
                properties: { term_type: 'forbidden' },
              });

            if (!edgeError) edgesCreated++;
          }
        }
        continue;
      }

      processedTerms.add(nodeKey);

      // Check if node already exists
      const { data: existingNode } = await supabase
        .from('industry_knowledge_nodes')
        .select('id')
        .eq('node_key', nodeKey)
        .single();

      let termNodeId = existingNode?.id;

      if (!existingNode) {
        // Create term node
        const { data: newNode, error: insertError } = await supabase
          .from('industry_knowledge_nodes')
          .insert({
            node_type: 'term',
            node_key: nodeKey,
            display_name: {
              vi: term,
              en: term,
            },
            description: {
              vi: `Thuật ngữ cấm: ${term}`,
              en: `Forbidden term: ${term}`,
            },
            properties: {
              term_type: 'forbidden',
              original_term: term,
            },
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) {
          errors.push(`Failed to create term node: ${insertError.message}`);
          continue;
        }

        nodesCreated++;
        termNodeId = newNode?.id;
        console.log(`[Extract] Created term node: ${nodeKey}`);
      }

      // Create edge from industry to term
      if (industryNodeId && termNodeId) {
        // Check if edge exists
        const { data: existingEdge } = await supabase
          .from('industry_knowledge_edges')
          .select('id')
          .eq('source_node_id', industryNodeId)
          .eq('target_node_id', termNodeId)
          .eq('edge_type', 'uses_term')
          .single();

        if (!existingEdge) {
          const { error: edgeError } = await supabase
            .from('industry_knowledge_edges')
            .insert({
              source_node_id: industryNodeId,
              target_node_id: termNodeId,
              edge_type: 'uses_term',
              weight: 1.0,
              properties: { term_type: 'forbidden' },
            });

          if (!edgeError) {
            edgesCreated++;
          } else {
            errors.push(`Failed to create edge: ${edgeError.message}`);
          }
        }
      }
    }
  }

  return {
    nodes_created: nodesCreated,
    edges_created: edgesCreated,
    errors: errors.slice(0, 10),
    duration_ms: Date.now() - startTime,
  };
}

Deno.Deno.serve(withPerf({ functionName: 'extract-knowledge-entities', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ExtractRequest = await req.json();
    const { action, batch_size = 20, industry_pack_id } = body;

    console.log('[Extract] Action:', action, 'Batch size:', batch_size);

    // Get status
    if (action === 'status') {
      const status = await getExtractionStatus(supabase);
      return new Response(
        JSON.stringify(status),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract regulations
    if (action === 'extract_regulations') {
      const result = await extractRegulations(supabase, batch_size, industry_pack_id);
      const status = await getExtractionStatus(supabase);
      return new Response(
        JSON.stringify({ result, status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract terms
    if (action === 'extract_terms') {
      const result = await extractTerms(supabase, batch_size, industry_pack_id);
      const status = await getExtractionStatus(supabase);
      return new Response(
        JSON.stringify({ result, status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract all
    if (action === 'extract_all') {
      const regResult = await extractRegulations(supabase, batch_size, industry_pack_id);
      const termResult = await extractTerms(supabase, batch_size, industry_pack_id);
      const status = await getExtractionStatus(supabase);
      
      return new Response(
        JSON.stringify({
          result: {
            nodes_created: regResult.nodes_created + termResult.nodes_created,
            edges_created: regResult.edges_created + termResult.edges_created,
            errors: [...regResult.errors, ...termResult.errors],
            duration_ms: regResult.duration_ms + termResult.duration_ms,
            regulations: regResult,
            terms: termResult,
          },
          status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: status, extract_regulations, extract_terms, extract_all' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Extract] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
