/**
 * Reparse Regulations Edge Function
 * Re-parses existing regulation nodes with improved extraction logic
 * Cleans up HTML layout artifacts from previously crawled content
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReparseRequest {
  node_ids?: string[];        // Specific node IDs to reparse
  filter?: {
    with_html_artifacts?: boolean;  // Filter nodes with HTML layout artifacts
    parse_status?: string;          // Filter by current parse status
    limit?: number;                 // Limit number of nodes to process
  };
  dry_run?: boolean;          // If true, only report what would be reparsed
}

interface ReparseResult {
  success: boolean;
  total_processed: number;
  successful: number;
  failed: number;
  skipped: number;
  details: Array<{
    node_id: string;
    node_key: string;
    status: 'success' | 'failed' | 'skipped';
    reason?: string;
    text_length_before?: number;
    text_length_after?: number;
  }>;
  error?: string;
}

/**
 * Detect if text contains HTML layout artifacts
 * Returns true if the text appears to have website layout elements
 */
function hasHtmlLayoutArtifacts(text: string | null): boolean {
  if (!text || text.length < 100) return false;
  
  const patterns = [
    // Markdown table artifacts
    /\|\s*---+\s*\|/,
    /\|\s*\|/,
    // Government site banners
    /\[!\[Cổng thông tin[^\]]*\]/i,
    /\[!\[Logo[^\]]*\]/i,
    // Navigation elements
    /Trang chủ.*Chính phủ/i,
    /- \[!\[\]\([^)]+\)/,
    // Common menu items
    /\*\*Tìm kiếm\*\*/gi,
    /\*\*Đăng nhập\*\*/gi,
    // Language switches
    /\[English\]\([^)]+\)/gi,
    /\[Tiếng Việt\]\([^)]+\)/gi,
    // Footer patterns
    /Bản quyền thuộc về/i,
    /Copyright ©/i,
    // Empty markdown links
    /\[\s*\]\([^)]+\)/,
  ];
  
  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matchCount++;
    }
  }
  
  // If 2 or more patterns match, likely has layout artifacts
  return matchCount >= 2;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ReparseRequest = await req.json();
    const { node_ids, filter, dry_run = false } = body;

    console.log('[reparse-regulations] Request:', { node_ids_count: node_ids?.length, filter, dry_run });

    // Build query to fetch nodes to reparse
    let query = supabase
      .from('industry_knowledge_nodes')
      .select('id, node_key, node_type, source_url, full_text, parse_status, display_name')
      .eq('node_type', 'regulation');

    // Apply filters
    if (node_ids && node_ids.length > 0) {
      query = query.in('id', node_ids);
    } else if (filter) {
      if (filter.parse_status) {
        query = query.eq('parse_status', filter.parse_status);
      }
      // Limit results
      query = query.limit(filter.limit || 50);
    } else {
      // Default: get recently parsed nodes
      query = query.in('parse_status', ['parsed', 'failed']).limit(50);
    }

    const { data: nodes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch nodes: ${fetchError.message}`);
    }

    if (!nodes || nodes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          total_processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          details: [],
          message: 'No nodes found matching the criteria',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter nodes with HTML artifacts if requested
    let nodesToProcess = nodes;
    if (filter?.with_html_artifacts) {
      nodesToProcess = nodes.filter(node => hasHtmlLayoutArtifacts(node.full_text));
    }

    console.log(`[reparse-regulations] Found ${nodes.length} nodes, ${nodesToProcess.length} to process`);

    // If dry run, just return what would be processed
    if (dry_run) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          total_found: nodes.length,
          nodes_with_artifacts: nodesToProcess.length,
          nodes: nodesToProcess.map(n => ({
            id: n.id,
            node_key: n.node_key,
            has_artifacts: hasHtmlLayoutArtifacts(n.full_text),
            source_url: n.source_url,
            current_status: n.parse_status,
            text_length: n.full_text?.length || 0,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ReparseResult = {
      success: true,
      total_processed: nodesToProcess.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    // Process each node
    for (const node of nodesToProcess) {
      const nodeKey = node.node_key;
      const displayName = node.display_name?.vi || node.display_name?.en || nodeKey;
      
      // Skip if no source URL
      if (!node.source_url) {
        results.skipped++;
        results.details.push({
          node_id: node.id,
          node_key: nodeKey,
          status: 'skipped',
          reason: 'No source_url available',
        });
        continue;
      }

      const textLengthBefore = node.full_text?.length || 0;

      try {
        // Reset parse status to pending
        await supabase
          .from('industry_knowledge_nodes')
          .update({ parse_status: 'parsing' })
          .eq('id', node.id);

        // Call parse-regulation-document with the source URL and timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout
        
        let parseResponse: Response;
        try {
          parseResponse = await fetch(`${supabaseUrl}/functions/v1/parse-regulation-document`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              url: node.source_url,
              node_id: node.id, // This will update the node directly
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!parseResponse.ok) {
          // Check if it's a known size/timeout issue
          const errorBody = await parseResponse.text();
          if (parseResponse.status === 546 || errorBody.includes('CPU Time')) {
            throw new Error('File too large or processing timeout - requires external PDF service');
          }
          throw new Error(`Parse function returned ${parseResponse.status}: ${errorBody.slice(0, 200)}`);
        }

        const parseResult = await parseResponse.json();

        if (parseResult.success) {
          results.successful++;
          results.details.push({
            node_id: node.id,
            node_key: nodeKey,
            status: 'success',
            text_length_before: textLengthBefore,
            text_length_after: parseResult.text?.length || 0,
          });
          console.log(`[reparse-regulations] ✓ ${displayName}: ${textLengthBefore} → ${parseResult.text?.length || 0} chars`);
        } else {
          results.failed++;
          results.details.push({
            node_id: node.id,
            node_key: nodeKey,
            status: 'failed',
            reason: parseResult.error || 'Parse returned success=false',
            text_length_before: textLengthBefore,
          });
          console.log(`[reparse-regulations] ✗ ${displayName}: ${parseResult.error}`);
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          node_id: node.id,
          node_key: nodeKey,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
          text_length_before: textLengthBefore,
        });
        console.error(`[reparse-regulations] Error processing ${nodeKey}:`, error);
        
        // Reset status to failed
        await supabase
          .from('industry_knowledge_nodes')
          .update({ parse_status: 'failed' })
          .eq('id', node.id);
      }
    }

    console.log(`[reparse-regulations] Completed: ${results.successful} success, ${results.failed} failed, ${results.skipped} skipped`);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[reparse-regulations] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
