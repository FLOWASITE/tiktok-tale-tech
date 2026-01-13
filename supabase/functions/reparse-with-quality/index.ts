/**
 * Reparse Regulations with Quality Enforcement
 * Batch re-parses regulation nodes with AI post-processing to ensure high quality
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReparseRequest {
  node_ids?: string[];
  filter?: {
    min_quality?: number;
    max_quality?: number;
    has_artifacts?: boolean;
    needs_ai_clean?: boolean;
    parse_status?: string;
    limit?: number;
  };
  min_quality_threshold?: number; // Default 80
  force_ai_clean?: boolean;
  dry_run?: boolean;
}

interface ReparseResult {
  success: boolean;
  dry_run: boolean;
  total_processed: number;
  successful: number;
  improved: number;
  failed: number;
  skipped: number;
  avg_quality_before: number;
  avg_quality_after: number;
  details: Array<{
    node_id: string;
    node_key: string;
    status: 'success' | 'improved' | 'failed' | 'skipped';
    quality_before?: number;
    quality_after?: number;
    ai_processed?: boolean;
    reason?: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ReparseRequest = await req.json();
    const { 
      node_ids, 
      filter, 
      min_quality_threshold = 80,
      force_ai_clean = false,
      dry_run = false,
    } = body;

    console.log(`[reparse-quality] Starting with threshold=${min_quality_threshold}, force_ai=${force_ai_clean}, dry_run=${dry_run}`);

    // Build query to get nodes to reparse
    let query = supabase
      .from('industry_knowledge_nodes')
      .select('id, node_key, source_url, full_text, content_quality_score, quality_breakdown, parse_status')
      .eq('node_type', 'regulation');

    if (node_ids && node_ids.length > 0) {
      query = query.in('id', node_ids);
    } else if (filter) {
      if (filter.max_quality !== undefined) {
        query = query.lt('content_quality_score', filter.max_quality);
      }
      if (filter.min_quality !== undefined) {
        query = query.gte('content_quality_score', filter.min_quality);
      }
      if (filter.parse_status) {
        query = query.eq('parse_status', filter.parse_status);
      }
      if (filter.needs_ai_clean) {
        // Nodes with quality < 85 and high artifact penalty
        query = query.lt('content_quality_score', 85);
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      } else {
        query = query.limit(50); // Default limit
      }
    } else {
      // Default: get nodes with quality < threshold
      query = query.lt('content_quality_score', min_quality_threshold).limit(50);
    }

    // Also filter to only nodes with source_url
    query = query.not('source_url', 'is', null);

    const { data: nodes, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    if (!nodes || nodes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run,
          total_processed: 0,
          successful: 0,
          improved: 0,
          failed: 0,
          skipped: 0,
          avg_quality_before: 0,
          avg_quality_after: 0,
          details: [],
          message: 'No nodes found matching criteria',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[reparse-quality] Found ${nodes.length} nodes to process`);

    if (dry_run) {
      // Return preview of what would be processed
      const details = nodes.map(node => ({
        node_id: node.id,
        node_key: node.node_key,
        status: 'skipped' as const,
        quality_before: node.content_quality_score,
        reason: 'Dry run - no changes made',
      }));

      const avgBefore = nodes.reduce((sum, n) => sum + (n.content_quality_score || 0), 0) / nodes.length;

      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          total_processed: nodes.length,
          successful: 0,
          improved: 0,
          failed: 0,
          skipped: nodes.length,
          avg_quality_before: Math.round(avgBefore),
          avg_quality_after: 0,
          details,
          message: `Would process ${nodes.length} nodes`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process nodes
    const results: ReparseResult = {
      success: true,
      dry_run: false,
      total_processed: nodes.length,
      successful: 0,
      improved: 0,
      failed: 0,
      skipped: 0,
      avg_quality_before: 0,
      avg_quality_after: 0,
      details: [],
    };

    let totalQualityBefore = 0;
    let totalQualityAfter = 0;

    for (const node of nodes) {
      const qualityBefore = node.content_quality_score || 0;
      totalQualityBefore += qualityBefore;

      if (!node.source_url) {
        results.skipped++;
        results.details.push({
          node_id: node.id,
          node_key: node.node_key,
          status: 'skipped',
          quality_before: qualityBefore,
          reason: 'No source URL',
        });
        continue;
      }

      try {
        console.log(`[reparse-quality] Processing ${node.node_key} (quality=${qualityBefore})`);

        // Call parse-regulation-document with node_id to trigger full reparse + AI clean
        const parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-regulation-document`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: node.source_url,
            node_id: node.id,
          }),
        });

        if (!parseResponse.ok) {
          const errorText = await parseResponse.text();
          console.log(`[reparse-quality] Parse failed for ${node.node_key}: ${errorText}`);
          results.failed++;
          results.details.push({
            node_id: node.id,
            node_key: node.node_key,
            status: 'failed',
            quality_before: qualityBefore,
            reason: `Parse error: ${parseResponse.status}`,
          });
          continue;
        }

        const parseResult = await parseResponse.json();
        
        // Get updated quality score
        const { data: updatedNode } = await supabase
          .from('industry_knowledge_nodes')
          .select('content_quality_score, extracted_data')
          .eq('id', node.id)
          .single();

        const qualityAfter = updatedNode?.content_quality_score || 0;
        totalQualityAfter += qualityAfter;

        const aiProcessed = (updatedNode?.extracted_data as Record<string, unknown>)?.ai_post_processed === true;

        if (qualityAfter >= min_quality_threshold) {
          if (qualityAfter > qualityBefore) {
            results.improved++;
            results.details.push({
              node_id: node.id,
              node_key: node.node_key,
              status: 'improved',
              quality_before: qualityBefore,
              quality_after: qualityAfter,
              ai_processed: aiProcessed,
            });
          } else {
            results.successful++;
            results.details.push({
              node_id: node.id,
              node_key: node.node_key,
              status: 'success',
              quality_before: qualityBefore,
              quality_after: qualityAfter,
              ai_processed: aiProcessed,
            });
          }
        } else {
          // Quality still below threshold
          results.successful++;
          results.details.push({
            node_id: node.id,
            node_key: node.node_key,
            status: 'success',
            quality_before: qualityBefore,
            quality_after: qualityAfter,
            ai_processed: aiProcessed,
            reason: `Quality ${qualityAfter} still below threshold ${min_quality_threshold}`,
          });
        }

        console.log(`[reparse-quality] Completed ${node.node_key}: ${qualityBefore} -> ${qualityAfter}`);

      } catch (error) {
        console.error(`[reparse-quality] Error processing ${node.node_key}:`, error);
        results.failed++;
        results.details.push({
          node_id: node.id,
          node_key: node.node_key,
          status: 'failed',
          quality_before: qualityBefore,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Add small delay between requests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    results.avg_quality_before = Math.round(totalQualityBefore / nodes.length);
    results.avg_quality_after = Math.round(totalQualityAfter / (nodes.length - results.skipped) || 0);

    console.log(`[reparse-quality] Completed: ${results.successful} success, ${results.improved} improved, ${results.failed} failed, ${results.skipped} skipped`);
    console.log(`[reparse-quality] Quality: ${results.avg_quality_before} -> ${results.avg_quality_after}`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reparse-quality] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
