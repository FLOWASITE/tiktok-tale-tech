/**
 * Reparse Regulations with Quality Enforcement
 * Batch re-parses regulation nodes with AI post-processing to ensure high quality
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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
    source_domain?: string; // Filter by source domain: 'thuvienphapluat.vn', 'vbpl.vn', etc.
    has_text?: boolean; // Filter nodes that have full_text but may need quality scoring
    no_quality_score?: boolean; // Filter nodes without quality score
    limit?: number;
  };
  min_quality_threshold?: number; // Default 80
  force_ai_clean?: boolean;
  dry_run?: boolean;
  calculate_quality_only?: boolean; // Only recalculate quality score, no re-parsing
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

Deno.Deno.serve(withPerf({ functionName: 'reparse-with-quality', slowThresholdMs: 120000 }, async (req) => {
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
      calculate_quality_only = false,
    } = body;

    console.log(`[reparse-quality] Starting with threshold=${min_quality_threshold}, force_ai=${force_ai_clean}, dry_run=${dry_run}, quality_only=${calculate_quality_only}`);

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
      // Source domain filter for site-specific reparse
      if (filter.source_domain) {
        query = query.ilike('source_url', `%${filter.source_domain}%`);
        console.log(`[reparse-quality] Filtering by source_domain: ${filter.source_domain}`);
      }
      // Filter nodes with text but possibly no quality score
      if (filter.has_text) {
        query = query.not('full_text', 'is', null);
        console.log(`[reparse-quality] Filtering by has_text: true`);
      }
      // Filter nodes without quality score
      if (filter.no_quality_score) {
        query = query.is('content_quality_score', null);
        console.log(`[reparse-quality] Filtering by no_quality_score: true`);
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

    // Only filter to nodes with source_url when NOT in calculate_quality_only mode
    if (!calculate_quality_only) {
      query = query.not('source_url', 'is', null);
    } else {
      // For quality-only mode, require full_text to exist
      query = query.not('full_text', 'is', null);
    }

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

    // === CALCULATE QUALITY ONLY MODE ===
    if (calculate_quality_only) {
      console.log(`[reparse-quality] Running in QUALITY_ONLY mode for ${nodes.length} nodes`);
      
      for (const node of nodes) {
        const qualityBefore = node.content_quality_score || 0;
        totalQualityBefore += qualityBefore;
        
        if (!node.full_text || node.full_text.length < 100) {
          results.skipped++;
          results.details.push({
            node_id: node.id,
            node_key: node.node_key,
            status: 'skipped',
            quality_before: qualityBefore,
            reason: 'No full_text or too short',
          });
          continue;
        }
        
        try {
          // Calculate quality score locally (simplified version of parse function's logic)
          const qualityResult = calculateContentQualitySimple(node.full_text);
          const qualityAfter = qualityResult.overall;
          totalQualityAfter += qualityAfter;
          
          // Update node with new quality score
          const { error: updateError } = await supabase
            .from('industry_knowledge_nodes')
            .update({
              content_quality_score: qualityAfter,
              quality_breakdown: qualityResult.breakdown,
            })
            .eq('id', node.id);
          
          if (updateError) {
            throw updateError;
          }
          
          if (qualityAfter > qualityBefore) {
            results.improved++;
            results.details.push({
              node_id: node.id,
              node_key: node.node_key,
              status: 'improved',
              quality_before: qualityBefore,
              quality_after: qualityAfter,
            });
          } else {
            results.successful++;
            results.details.push({
              node_id: node.id,
              node_key: node.node_key,
              status: 'success',
              quality_before: qualityBefore,
              quality_after: qualityAfter,
            });
          }
          
          console.log(`[reparse-quality] Quality calculated for ${node.node_key}: ${qualityBefore} -> ${qualityAfter}`);
          
        } catch (error) {
          console.error(`[reparse-quality] Error calculating quality for ${node.node_key}:`, error);
          results.failed++;
          results.details.push({
            node_id: node.id,
            node_key: node.node_key,
            status: 'failed',
            quality_before: qualityBefore,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      
      results.avg_quality_before = Math.round(totalQualityBefore / nodes.length);
      results.avg_quality_after = Math.round(totalQualityAfter / (nodes.length - results.skipped) || 0);
      
      console.log(`[reparse-quality] QUALITY_ONLY completed: ${results.successful} success, ${results.improved} improved, ${results.failed} failed, ${results.skipped} skipped`);
      
      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === FULL REPARSE MODE ===
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
}));

// ============= Helper function for quality calculation =============
// This is a simplified version of the parse-regulation-document's calculateContentQuality
// Used in calculate_quality_only mode to avoid calling the full parse function

interface ContentQualityResult {
  overall: number;
  breakdown: {
    artifact_penalty: number;
    legal_structure: number;
    completeness: number;
    readability: number;
  };
}

const ARTIFACT_PATTERNS = [
  // General artifacts
  { pattern: /!\[[^\]]*\]\([^)]+\)/g, penalty: 5 },
  { pattern: /\|\s*---+\s*\|/g, penalty: 3 },
  { pattern: /\[\s*\]\([^)]+\)/g, penalty: 3 },
  { pattern: /Đăng nhập|Đăng ký/gi, penalty: 4 },
  { pattern: /Tìm kiếm/gi, penalty: 3 },
  { pattern: /Facebook|Twitter|Zalo/gi, penalty: 4 },
  { pattern: /reCAPTCHA/gi, penalty: 5 },
  { pattern: /Copyright|Bản quyền/gi, penalty: 3 },
  { pattern: /Xem thêm|Đọc thêm/gi, penalty: 2 },
  { pattern: /\d+ lượt xem/gi, penalty: 2 },
  
  // TVPL specific
  { pattern: /cdn\.thuvienphapluat\.vn/gi, penalty: 4 },
  { pattern: /\[Lịch Âm \d+\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /\[Giá Vàng[^\]]*\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /Chủ quản: Công ty/gi, penalty: 5 },
  { pattern: /Giấy phép[^\.]+Sở TTTT/gi, penalty: 5 },
  { pattern: /Hãy để chúng tôi hỗ trợ bạn!/gi, penalty: 4 },
  { pattern: /028 3930 3279/gi, penalty: 4 },
  { pattern: /Centre Point/gi, penalty: 4 },
  
  // VBPL specific  
  { pattern: /Turn on more accessible mode/gi, penalty: 5 },
  { pattern: /VB liên quan/gi, penalty: 3 },
  
  // ChinhPhu specific
  { pattern: /\[!\[Cổng thông tin điện tử Chính phủ\][^\]]*\]\([^)]+\)/g, penalty: 5 },
];

function calculateContentQualitySimple(text: string): ContentQualityResult {
  if (!text || text.length < 100) {
    return {
      overall: 0,
      breakdown: { artifact_penalty: 0, legal_structure: 0, completeness: 0, readability: 0 },
    };
  }

  let score = 100;
  const breakdown = {
    artifact_penalty: 0,
    legal_structure: 0,
    completeness: 0,
    readability: 0,
  };

  // Artifact detection
  for (const { pattern, penalty } of ARTIFACT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      breakdown.artifact_penalty += matches.length * penalty;
    }
  }
  score -= Math.min(breakdown.artifact_penalty, 70);

  // Legal structure detection
  const legalPatterns = [
    { pattern: /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/gi, bonus: 10 },
    { pattern: /Độc lập - Tự do - Hạnh phúc/gi, bonus: 5 },
    { pattern: /Điều\s+\d+/gi, bonus: 2 },
    { pattern: /Chương\s+[IVX\d]+/gi, bonus: 3 },
    { pattern: /QUYẾT ĐỊNH|NGHỊ ĐỊNH|THÔNG TƯ|LUẬT|CHỈ THỊ/gi, bonus: 5 },
  ];

  for (const { pattern, bonus } of legalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      breakdown.legal_structure += Math.min(matches.length * bonus, 25);
    }
  }
  score = Math.min(100, score + Math.min(breakdown.legal_structure, 20));

  // Completeness check
  const hasHeader = /CỘNG HÒA|Độc lập - Tự do/i.test(text);
  const hasBody = /Điều\s+\d+/i.test(text);
  const hasSignature = /Nơi nhận:|BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH/i.test(text);
  
  if (hasHeader) breakdown.completeness += 5;
  if (hasBody) breakdown.completeness += 10;
  if (hasSignature) breakdown.completeness += 5;
  score = Math.min(100, score + breakdown.completeness);

  // Readability
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const avgLineLength = text.length / (lines.length || 1);
  
  if (avgLineLength > 50 && avgLineLength < 200) {
    breakdown.readability += 5;
  }
  if (text.length > 5000) {
    breakdown.readability += 2;
  }
  score = Math.min(100, score + breakdown.readability);

  // Hard clamps for severe artifacts
  if (breakdown.artifact_penalty > 200) {
    score = Math.min(score, 70);
  } else if (breakdown.artifact_penalty > 100) {
    score = Math.min(score, 80);
  }

  return {
    overall: Math.max(0, Math.min(100, Math.round(score))),
    breakdown,
  };
}
