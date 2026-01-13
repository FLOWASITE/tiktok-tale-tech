// Auto-Crawl Regulations Edge Function
// Automatically crawls external regulation sources and updates Knowledge Graph

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegulationSource {
  id: string;
  source_name: string;
  source_url: string;
  jurisdiction: string;
  category: string;
  search_query: string;
  crawl_frequency: string;
  last_crawled_at: string | null;
  is_active: boolean;
  properties: Record<string, unknown>;
}

interface CrawlResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  publishedDate?: string;
}

interface CrawlStats {
  source_id: string;
  results_count: number;
  changes_detected: number;
  new_regulations: number;
  updated_regulations: number;
}

// Critical keywords for priority detection (Vietnamese)
const CRITICAL_KEYWORDS_VN = [
  'xử phạt', 'cấm', 'bắt buộc', 'nghiêm cấm',
  'hình sự', 'phạt tiền', 'đình chỉ', 'thu hồi',
  'tạm dừng', 'chấm dứt', 'hủy bỏ'
];

// Critical keywords (English)
const CRITICAL_KEYWORDS_EN = [
  'penalty', 'prohibited', 'mandatory', 'forbidden',
  'criminal', 'fine', 'suspend', 'revoke',
  'terminate', 'cancel', 'void'
];

// Simple MD5-like hash for change detection
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Detect if content contains critical keywords
function detectPriority(content: string, jurisdiction: string): 'low' | 'medium' | 'high' | 'critical' {
  const lowerContent = content.toLowerCase();
  const keywords = jurisdiction === 'VN' ? CRITICAL_KEYWORDS_VN : CRITICAL_KEYWORDS_EN;
  
  let criticalCount = 0;
  for (const keyword of keywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      criticalCount++;
    }
  }
  
  if (criticalCount >= 3) return 'critical';
  if (criticalCount >= 2) return 'high';
  if (criticalCount >= 1) return 'medium';
  return 'low';
}

// Generate deterministic node key for regulations
function generateRegulationKey(jurisdiction: string, category: string, title: string): string {
  const sanitizedTitle = title
    .substring(0, 50)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `reg_${jurisdiction.toLowerCase()}_${category}_${sanitizedTitle}`;
}

// Search using Firecrawl
async function searchWithFirecrawl(
  query: string,
  options: { limit?: number; lang?: string; tbs?: string }
): Promise<CrawlResult[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    return [];
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: options.limit || 10,
        lang: options.lang,
        tbs: options.tbs || 'qdr:w', // Default: last week
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      console.error('Firecrawl search error:', data);
      return [];
    }

    return (data.data || []).map((item: any) => ({
      url: item.url,
      title: item.title || item.metadata?.title || 'Untitled',
      description: item.description || item.metadata?.description || '',
      markdown: item.markdown,
      publishedDate: item.metadata?.publishedDate,
    }));
  } catch (error) {
    console.error('Firecrawl search failed:', error);
    return [];
  }
}

// Process a single source
async function processSource(
  supabase: any,
  source: RegulationSource
): Promise<CrawlStats> {
  const stats: CrawlStats = {
    source_id: source.id,
    results_count: 0,
    changes_detected: 0,
    new_regulations: 0,
    updated_regulations: 0,
  };

  console.log(`[auto-crawl] Processing source: ${source.source_name}`);

  // Build search query
  const searchQuery = source.search_query || `${source.category} regulations site:${source.source_url}`;
  const lang = source.jurisdiction === 'VN' ? 'vi' : 'en';

  // Execute search
  const results = await searchWithFirecrawl(searchQuery, {
    limit: 10,
    lang,
    tbs: 'qdr:w', // Last week
  });

  stats.results_count = results.length;
  console.log(`[auto-crawl] Found ${results.length} results for ${source.source_name}`);

  for (const result of results) {
    try {
      // Check if node already exists by URL
      const { data: existingByUrl } = await supabase
        .from('industry_knowledge_nodes')
        .select('id, content_hash, node_key')
        .eq('source_url', result.url)
        .maybeSingle();

      // Compute content hash
      const contentToHash = `${result.title}|${result.description}|${result.markdown?.substring(0, 1000) || ''}`;
      const contentHash = simpleHash(contentToHash);

      // Detect priority
      const priority = detectPriority(
        `${result.title} ${result.description} ${result.markdown || ''}`,
        source.jurisdiction
      );

      if (!existingByUrl) {
        // Create new regulation node
        const nodeKey = generateRegulationKey(source.jurisdiction, source.category, result.title);
        
        // Check if node_key already exists
        const { data: existingByKey } = await supabase
          .from('industry_knowledge_nodes')
          .select('id')
          .eq('node_key', nodeKey)
          .maybeSingle();

        if (existingByKey) {
          console.log(`[auto-crawl] Node key already exists: ${nodeKey}, updating...`);
          
          // Update existing node with new URL
          await supabase
            .from('industry_knowledge_nodes')
            .update({
              source_url: result.url,
              source_id: source.id,
              content_hash: contentHash,
              last_verified_at: new Date().toISOString(),
              description: {
                vi: result.description,
                en: result.description,
              },
              properties: {
                ...existingByKey.properties,
                auto_crawled: true,
                crawled_at: new Date().toISOString(),
                jurisdiction: source.jurisdiction,
                category: source.category,
              },
            })
            .eq('id', existingByKey.id);
            
          stats.updated_regulations++;
          stats.changes_detected++;
        } else {
          // Create new node
          const { data: newNode, error: insertError } = await supabase
            .from('industry_knowledge_nodes')
            .insert({
              node_type: 'regulation',
              node_key: nodeKey,
              display_name: {
                vi: result.title,
                en: result.title,
              },
              description: {
                vi: result.description,
                en: result.description,
              },
              properties: {
                jurisdiction: source.jurisdiction,
                category: source.category,
                published_date: result.publishedDate,
                auto_crawled: true,
                crawled_at: new Date().toISOString(),
              },
              source_url: result.url,
              source_id: source.id,
              content_hash: contentHash,
              last_verified_at: new Date().toISOString(),
              is_active: true,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`[auto-crawl] Failed to insert node: ${insertError.message}`);
            continue;
          }

          stats.new_regulations++;
          stats.changes_detected++;

// Create propagation log for new regulation
          if (newNode) {
            // Find affected pack based on category_code
            const { data: affectedPack } = await supabase
              .from('industry_memory_packs')
              .select('id')
              .or(`category_code.eq.${source.category},name.ilike.%${source.category}%`)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();

            const { data: propagationLog } = await supabase.from('regulation_propagation_log').insert({
              source_node_id: newNode.id,
              affected_pack_id: affectedPack?.id || null,
              change_type: 'new',
              change_summary: `New regulation detected: ${result.title}`,
              propagation_status: 'pending',
              priority,
              impact_analysis: {
                auto_detected: true,
                source: source.source_name,
                source_id: source.id,
                crawl_url: result.url,
                disclaimer: source.jurisdiction === 'VN' 
                  ? '⚠️ Quy định này được phát hiện tự động và cần được xác minh bởi chuyên gia pháp lý trước khi áp dụng.'
                  : '⚠️ This regulation was auto-detected and requires verification by legal experts before application.',
              },
            }).select('id').single();

            // Trigger analyze-regulation-impact for new regulations
            if (propagationLog && priority !== 'low') {
              try {
                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-regulation-impact`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ propagation_id: propagationLog.id }),
                });
              } catch (e) {
                console.log('[auto-crawl] analyze-regulation-impact trigger failed (non-blocking):', e);
              }
            }
          }
        }
      } else {
        // Check if content changed
        if (existingByUrl.content_hash !== contentHash) {
          // Update existing node
          await supabase
            .from('industry_knowledge_nodes')
            .update({
              content_hash: contentHash,
              last_verified_at: new Date().toISOString(),
              description: {
                vi: result.description,
                en: result.description,
              },
              properties: {
                jurisdiction: source.jurisdiction,
                category: source.category,
                published_date: result.publishedDate,
                auto_crawled: true,
                crawled_at: new Date().toISOString(),
                previous_hash: existingByUrl.content_hash,
              },
            })
            .eq('id', existingByUrl.id);

          stats.updated_regulations++;
          stats.changes_detected++;

// Find affected pack based on category_code
          const { data: affectedPack } = await supabase
            .from('industry_memory_packs')
            .select('id')
            .or(`category_code.eq.${source.category},name.ilike.%${source.category}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          // Create propagation log for updated regulation
          const { data: propagationLog } = await supabase.from('regulation_propagation_log').insert({
            source_node_id: existingByUrl.id,
            affected_pack_id: affectedPack?.id || null,
            change_type: 'updated',
            change_summary: `Regulation updated: ${result.title}`,
            propagation_status: 'pending',
            priority,
            impact_analysis: {
              auto_detected: true,
              source: source.source_name,
              source_id: source.id,
              crawl_url: result.url,
              previous_hash: existingByUrl.content_hash,
              new_hash: contentHash,
              disclaimer: source.jurisdiction === 'VN' 
                ? '⚠️ Cập nhật quy định được phát hiện tự động và cần được xác minh.'
                : '⚠️ Regulation update auto-detected and requires verification.',
            },
          }).select('id').single();

          // Trigger analyze-regulation-impact for updated regulations
          if (propagationLog && priority !== 'low') {
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/analyze-regulation-impact`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ propagation_id: propagationLog.id }),
              });
            } catch (e) {
              console.log('[auto-crawl] analyze-regulation-impact trigger failed (non-blocking):', e);
            }
          }
        } else {
          // Just update last_verified_at
          await supabase
            .from('industry_knowledge_nodes')
            .update({ last_verified_at: new Date().toISOString() })
            .eq('id', existingByUrl.id);
        }
      }
    } catch (error) {
      console.error(`[auto-crawl] Error processing result ${result.url}:`, error);
    }
  }

  return stats;
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

    const url = new URL(req.url);
    const method = req.method;

    // GET - List sources and stats
    if (method === 'GET') {
      const { data: sources, error } = await supabase
        .from('regulation_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get recent crawl history
      const { data: recentCrawls } = await supabase
        .from('regulation_crawl_history')
        .select('*')
        .order('crawl_started_at', { ascending: false })
        .limit(10);

      return new Response(
        JSON.stringify({
          success: true,
          sources: sources || [],
          recent_crawls: recentCrawls || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Trigger crawl
    if (method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { source_id, crawl_all = false } = body;

      // Get sources to crawl
      let sourcesQuery = supabase
        .from('regulation_sources')
        .select('*')
        .eq('is_active', true);

      if (source_id && !crawl_all) {
        sourcesQuery = sourcesQuery.eq('id', source_id);
      }

      const { data: sources, error: sourcesError } = await sourcesQuery;

      if (sourcesError) throw sourcesError;
      if (!sources || sources.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'No active sources found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allStats: CrawlStats[] = [];

      for (const source of sources) {
        // Create crawl history record
        const { data: crawlRecord, error: crawlError } = await supabase
          .from('regulation_crawl_history')
          .insert({
            source_id: source.id,
            status: 'running',
          })
          .select('id')
          .single();

        if (crawlError) {
          console.error(`[auto-crawl] Failed to create crawl record: ${crawlError.message}`);
          continue;
        }

        try {
          // Process source
          const stats = await processSource(supabase, source);
          allStats.push(stats);

          // Update crawl history
          await supabase
            .from('regulation_crawl_history')
            .update({
              status: 'completed',
              crawl_completed_at: new Date().toISOString(),
              results_count: stats.results_count,
              changes_detected: stats.changes_detected,
              new_regulations: stats.new_regulations,
              updated_regulations: stats.updated_regulations,
            })
            .eq('id', crawlRecord.id);

          // Update source last_crawled_at and next_crawl_at
          const { data: nextCrawl } = await supabase.rpc('calculate_next_crawl_at', {
            frequency: source.crawl_frequency,
            last_crawled: new Date().toISOString(),
          });

          await supabase
            .from('regulation_sources')
            .update({
              last_crawled_at: new Date().toISOString(),
              next_crawl_at: nextCrawl,
            })
            .eq('id', source.id);

        } catch (error) {
          // Update crawl history with error
          await supabase
            .from('regulation_crawl_history')
            .update({
              status: 'failed',
              crawl_completed_at: new Date().toISOString(),
              error_message: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', crawlRecord.id);

          console.error(`[auto-crawl] Source ${source.source_name} failed:`, error);
        }
      }

      // Calculate totals
      const totals = allStats.reduce(
        (acc, stats) => ({
          total_results: acc.total_results + stats.results_count,
          total_changes: acc.total_changes + stats.changes_detected,
          total_new: acc.total_new + stats.new_regulations,
          total_updated: acc.total_updated + stats.updated_regulations,
        }),
        { total_results: 0, total_changes: 0, total_new: 0, total_updated: 0 }
      );

      return new Response(
        JSON.stringify({
          success: true,
          sources_processed: sources.length,
          stats: allStats,
          totals,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-crawl-regulations] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
