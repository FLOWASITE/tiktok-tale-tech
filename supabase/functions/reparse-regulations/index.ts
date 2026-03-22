/**
 * Reparse Regulations Edge Function
 * Re-parses existing regulation nodes with improved extraction logic
 * Cleans up HTML layout artifacts from previously crawled content
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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

Deno.Deno.serve(withPerf({ functionName: 'reparse-regulations', slowThresholdMs: 120000 }, async (req) => {
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

        // Call parse-regulation-document with retry logic
        // PDF extraction with OCR + AI fallback can take time, so we use extended timeout
        const MAX_RETRIES = 2;
        const TIMEOUT_MS = 180000; // 3 minutes timeout
        
        let parseResponse: Response | null = null;
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`[reparse-regulations] Retry attempt ${attempt} for ${nodeKey}`);
              // Exponential backoff: 5s, 10s
              await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
            
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
              
              // Success - exit retry loop
              if (parseResponse.ok) {
                break;
              }
              
              // Non-retryable errors
              const errorBody = await parseResponse.text();
              if (parseResponse.status === 546 || errorBody.includes('CPU Time')) {
                throw new Error('File too large or processing timeout - requires external PDF service');
              }
              
              // Retryable: 408 (timeout), 429 (rate limit), 502/503/504 (gateway errors)
              if ([408, 429, 502, 503, 504].includes(parseResponse.status)) {
                lastError = new Error(`Parse function returned ${parseResponse.status}: ${errorBody.slice(0, 100)}`);
                console.log(`[reparse-regulations] Retryable error for ${nodeKey}: ${parseResponse.status}`);
                continue;
              }
              
              // Non-retryable error
              throw new Error(`Parse function returned ${parseResponse.status}: ${errorBody.slice(0, 200)}`);
              
            } finally {
              clearTimeout(timeoutId);
            }
          } catch (retryError) {
            lastError = retryError as Error;
            if ((retryError as Error).name === 'AbortError') {
              console.log(`[reparse-regulations] Timeout on attempt ${attempt + 1} for ${nodeKey}`);
              continue;
            }
            // Non-retryable error
            throw retryError;
          }
        }
        
        if (!parseResponse || !parseResponse.ok) {
          throw lastError || new Error('All retry attempts failed');
        }

        // Try to parse JSON, handle connection closed errors gracefully
        let parseResult: { success: boolean; text_length?: number; text?: string; error?: string; file_type?: string; node_id?: string } | null = null;
        
        try {
          parseResult = await parseResponse.json();
        } catch (jsonError) {
          // Connection may have closed before response completed
          // This is common with large responses - DB update may still have succeeded
          console.log(`[reparse-regulations] JSON parse error for ${nodeKey}, checking DB for success`);
          
          // Wait a moment for any pending DB writes to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const { data: checkNode } = await supabase
            .from('industry_knowledge_nodes')
            .select('full_text, parse_status')
            .eq('id', node.id)
            .single();
          
          const checkLen = checkNode?.full_text?.length || 0;
          
          if (checkNode?.parse_status === 'parsed' && checkLen > textLengthBefore + 200) {
            // DB was updated successfully despite response error
            results.successful++;
            results.details.push({
              node_id: node.id,
              node_key: nodeKey,
              status: 'success',
              reason: 'Recovered: response interrupted but DB updated',
              text_length_before: textLengthBefore,
              text_length_after: checkLen,
            });
            console.log(`[reparse-regulations] ✓ ${displayName}: recovered from response error (${textLengthBefore} → ${checkLen} chars)`);
            continue; // Move to next node
          } else {
            // Truly failed
            results.failed++;
            results.details.push({
              node_id: node.id,
              node_key: nodeKey,
              status: 'failed',
              reason: `Response interrupted and DB not updated (status: ${checkNode?.parse_status}, length: ${checkLen})`,
              text_length_before: textLengthBefore,
            });
            console.log(`[reparse-regulations] ✗ ${displayName}: response error and DB check failed`);
            
            await supabase
              .from('industry_knowledge_nodes')
              .update({ parse_status: 'failed' })
              .eq('id', node.id);
            continue;
          }
        }

        if (parseResult?.success) {
          // Use text_length from response (new compact format) or fallback to text.length
          const textLengthAfter = parseResult.text_length || parseResult.text?.length || 0;
          
          results.successful++;
          results.details.push({
            node_id: node.id,
            node_key: nodeKey,
            status: 'success',
            text_length_before: textLengthBefore,
            text_length_after: textLengthAfter,
          });
          console.log(`[reparse-regulations] ✓ ${displayName}: ${textLengthBefore} → ${textLengthAfter} chars`);
        } else {
          // VBPL can succeed via fallback (DB updated) even if the response indicates a download error.
          // To avoid "false failed" UX, re-check the node once.
          const { data: refreshed } = await supabase
            .from('industry_knowledge_nodes')
            .select('full_text, parse_status')
            .eq('id', node.id)
            .single();

          const refreshedLen = refreshed?.full_text?.length || 0;
          const isRecovered = refreshed?.parse_status === 'parsed' && refreshedLen > textLengthBefore + 200;

          if (isRecovered) {
            results.successful++;
            results.details.push({
              node_id: node.id,
              node_key: nodeKey,
              status: 'success',
              text_length_before: textLengthBefore,
              text_length_after: refreshedLen,
            });
            console.log(`[reparse-regulations] ✓ ${displayName}: recovered via fallback (${textLengthBefore} → ${refreshedLen} chars)`);
          } else {
            // More detailed error logging
            const errorReason = parseResult?.error ||
              (parseResult?.text?.length && parseResult.text.length < 100 ? `Text too short: ${parseResult.text.length} chars` : null) ||
              `Parse returned success=false (file_type: ${parseResult?.file_type}, text_length: ${parseResult?.text?.length || 0})`;

            results.failed++;
            results.details.push({
              node_id: node.id,
              node_key: nodeKey,
              status: 'failed',
              reason: errorReason,
              text_length_before: textLengthBefore,
            });
            console.log(`[reparse-regulations] ✗ ${displayName}: ${errorReason}`);
            console.log(`[reparse-regulations] Full parse result:`, JSON.stringify(parseResult).slice(0, 500));
          }
        }
      } catch (error) {
        // Check DB before marking as failed - the operation might have succeeded
        const { data: checkNode } = await supabase
          .from('industry_knowledge_nodes')
          .select('full_text, parse_status')
          .eq('id', node.id)
          .single();
        
        const checkLen = checkNode?.full_text?.length || 0;
        
        if (checkNode?.parse_status === 'parsed' && checkLen > textLengthBefore + 200) {
          // Actually succeeded despite error
          results.successful++;
          results.details.push({
            node_id: node.id,
            node_key: nodeKey,
            status: 'success',
            reason: 'Recovered: request error but DB updated',
            text_length_before: textLengthBefore,
            text_length_after: checkLen,
          });
          console.log(`[reparse-regulations] ✓ ${displayName}: recovered from error (${textLengthBefore} → ${checkLen} chars)`);
        } else {
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
}));
