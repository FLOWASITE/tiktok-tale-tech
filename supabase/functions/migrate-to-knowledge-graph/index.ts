// ============================================
// Migrate Industry Data to Knowledge Graph
// Creates nodes for industries and edges for relationships
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndustryPack {
  id: string;
  industry_code: string;
  industry_level: string;
  parent_pack_id: string | null;
  related_industries: string[] | null;
  is_active: boolean;
}

interface Translation {
  global_pack_id: string;
  language_code: string;
  name: string;
  short_name: string | null;
}

Deno.serve(withPerf({ functionName: 'migrate-to-knowledge-graph', slowThresholdMs: 120000 }, async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action = "migrate", dry_run = false } = await req.json();

    console.log(`Starting migration with action: ${action}, dry_run: ${dry_run}`);

    // Fetch all active industry packs
    const { data: packs, error: packsError } = await supabase
      .from("industry_global_packs")
      .select("id, industry_code, industry_level, parent_pack_id, related_industries, is_active")
      .eq("is_active", true);

    if (packsError) throw packsError;

    // Fetch translations for display names
    const { data: translations, error: transError } = await supabase
      .from("industry_pack_translations")
      .select("global_pack_id, language_code, name, short_name");

    if (transError) throw transError;

    // Build translation map
    const translationMap = new Map<string, { vi?: string; en?: string }>();
    (translations as Translation[])?.forEach((t) => {
      const existing = translationMap.get(t.global_pack_id) || {};
      if (t.language_code === "vi") {
        existing.vi = t.name;
      } else if (t.language_code === "en") {
        existing.en = t.name;
      }
      translationMap.set(t.global_pack_id, existing);
    });

    const stats = {
      nodes_created: 0,
      nodes_skipped: 0,
      edges_created: 0,
      edges_skipped: 0,
      parent_edges: 0,
      related_edges: 0,
    };

    const nodesToCreate: any[] = [];
    const edgesToCreate: any[] = [];

    // Phase 1: Create nodes for each industry pack
    for (const pack of packs as IndustryPack[]) {
      const translation = translationMap.get(pack.id) || {};
      
      // Check if node already exists
      const { data: existingNode } = await supabase
        .from("industry_knowledge_nodes")
        .select("id")
        .eq("global_pack_id", pack.id)
        .eq("node_type", "industry")
        .single();

      if (existingNode) {
        stats.nodes_skipped++;
        continue;
      }

      nodesToCreate.push({
        global_pack_id: pack.id,
        node_type: "industry",
        node_key: pack.industry_code,
        display_name: {
          vi: translation.vi || pack.industry_code,
          en: translation.en || pack.industry_code,
        },
        description: {},
        properties: {
          industry_level: pack.industry_level,
          migrated_from: "industry_global_packs",
          migrated_at: new Date().toISOString(),
        },
        is_active: true,
      });
    }

    // Insert nodes
    if (!dry_run && nodesToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("industry_knowledge_nodes")
        .insert(nodesToCreate);

      if (insertError) throw insertError;
      stats.nodes_created = nodesToCreate.length;
    } else {
      stats.nodes_created = nodesToCreate.length;
    }

    // Fetch all nodes for edge creation
    const { data: allNodes, error: nodesError } = await supabase
      .from("industry_knowledge_nodes")
      .select("id, global_pack_id, node_key")
      .eq("node_type", "industry")
      .eq("is_active", true);

    if (nodesError) throw nodesError;

    // Build node lookup maps
    const nodeByPackId = new Map<string, string>();
    const nodeByCode = new Map<string, string>();
    (allNodes || []).forEach((n: any) => {
      if (n.global_pack_id) nodeByPackId.set(n.global_pack_id, n.id);
      nodeByCode.set(n.node_key, n.id);
    });

    // Phase 2: Create edges for parent-child relationships
    for (const pack of packs as IndustryPack[]) {
      if (!pack.parent_pack_id) continue;

      const childNodeId = nodeByPackId.get(pack.id);
      const parentNodeId = nodeByPackId.get(pack.parent_pack_id);

      if (!childNodeId || !parentNodeId) continue;

      // Check if edge already exists
      const { data: existingEdge } = await supabase
        .from("industry_knowledge_edges")
        .select("id")
        .eq("source_node_id", parentNodeId)
        .eq("target_node_id", childNodeId)
        .eq("edge_type", "parent_of")
        .single();

      if (existingEdge) {
        stats.edges_skipped++;
        continue;
      }

      edgesToCreate.push({
        source_node_id: parentNodeId,
        target_node_id: childNodeId,
        edge_type: "parent_of",
        weight: 1.0,
        properties: {
          migrated_from: "parent_pack_id",
          migrated_at: new Date().toISOString(),
        },
        is_bidirectional: false,
      });
      stats.parent_edges++;
    }

    // Phase 3: Create edges for related_industries
    for (const pack of packs as IndustryPack[]) {
      if (!pack.related_industries || pack.related_industries.length === 0) continue;

      const sourceNodeId = nodeByPackId.get(pack.id);
      if (!sourceNodeId) continue;

      for (const relatedCode of pack.related_industries) {
        const targetNodeId = nodeByCode.get(relatedCode);
        if (!targetNodeId || sourceNodeId === targetNodeId) continue;

        // Check if edge already exists (in either direction for related_to)
        const { data: existingEdge } = await supabase
          .from("industry_knowledge_edges")
          .select("id")
          .or(`and(source_node_id.eq.${sourceNodeId},target_node_id.eq.${targetNodeId}),and(source_node_id.eq.${targetNodeId},target_node_id.eq.${sourceNodeId})`)
          .eq("edge_type", "related_to")
          .single();

        if (existingEdge) {
          stats.edges_skipped++;
          continue;
        }

        edgesToCreate.push({
          source_node_id: sourceNodeId,
          target_node_id: targetNodeId,
          edge_type: "related_to",
          weight: 0.7,
          properties: {
            migrated_from: "related_industries",
            migrated_at: new Date().toISOString(),
          },
          is_bidirectional: true,
        });
        stats.related_edges++;
      }
    }

    // Insert edges
    if (!dry_run && edgesToCreate.length > 0) {
      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < edgesToCreate.length; i += batchSize) {
        const batch = edgesToCreate.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from("industry_knowledge_edges")
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting edge batch ${i}:`, insertError);
        }
      }
      stats.edges_created = edgesToCreate.length;
    } else {
      stats.edges_created = edgesToCreate.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        dry_run,
        stats,
        message: dry_run 
          ? `Dry run complete. Would create ${stats.nodes_created} nodes and ${stats.edges_created} edges.`
          : `Migration complete. Created ${stats.nodes_created} nodes and ${stats.edges_created} edges.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Migration error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}));
