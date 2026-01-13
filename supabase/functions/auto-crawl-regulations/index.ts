// Auto-Crawl Regulations Edge Function
// Automatically crawls external regulation sources and updates Knowledge Graph
// v2.0 - Living System Upgrade: Download + Parse PDF/DOCX + AI Extract

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
  downloadUrl?: string; // Added for PDF/DOCX download
  fileType?: 'pdf' | 'docx' | 'html';
}

interface CrawlStats {
  source_id: string;
  results_count: number;
  changes_detected: number;
  new_regulations: number;
  updated_regulations: number;
  documents_parsed: number; // Added for tracking parsed docs
  documents_failed: number; // Added for tracking failed parses
}

// Category mapping: source.category -> industry_memory_packs.category_code
// Maps crawl source categories to the appropriate category_codes in industry_memory_packs
const CATEGORY_MAPPING: Record<string, string[]> = {
  // Tax sources -> Finance industry packs
  'tax': ['finance'],
  // Advertising sources -> Lifestyle, Commerce, Services packs
  'advertising': ['lifestyle', 'commerce', 'services'],
  // Land/Property sources -> Real Estate packs
  'land': ['realestate'],
  'property': ['realestate'],
  // Financial sources
  'finance': ['finance'],
  'banking': ['finance'],
  'insurance': ['finance'],
  // Technology sources
  'tech': ['technology'],
  'it': ['technology'],
  // Healthcare sources
  'health': ['lifestyle'],
  'medical': ['lifestyle'],
  // Commerce sources
  'commerce': ['commerce'],
  'retail': ['commerce'],
  // Food & Beverage
  'food': ['food'],
  'fnb': ['food'],
  // Education
  'education': ['education'],
};

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

// Find download link on detail page using Firecrawl
async function findDownloadLink(url: string): Promise<{ downloadUrl: string | null; fileType: 'pdf' | 'docx' | null }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { downloadUrl: null, fileType: null };
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['links', 'html'],
        timeout: 15000,
      }),
    });

    const data = await response.json();
    if (!data.success || !data.data?.links) {
      return { downloadUrl: null, fileType: null };
    }

    // Search for PDF/DOCX download links
    const links: string[] = data.data.links || [];
    
    // Priority patterns for Vietnamese gov sites
    const pdfPatterns = [
      /\.pdf$/i,
      /download.*pdf/i,
      /\/file\//i,
      /\/download\//i,
      /vbpq.*\.pdf/i,
    ];
    
    const docxPatterns = [
      /\.docx?$/i,
      /download.*doc/i,
    ];

    for (const link of links) {
      for (const pattern of pdfPatterns) {
        if (pattern.test(link)) {
          return { downloadUrl: link, fileType: 'pdf' };
        }
      }
    }
    
    for (const link of links) {
      for (const pattern of docxPatterns) {
        if (pattern.test(link)) {
          return { downloadUrl: link, fileType: 'docx' };
        }
      }
    }

    // Also check HTML content for embedded download links
    const html = data.data.html || '';
    const downloadMatch = html.match(/href=["']([^"']*\.(pdf|docx?)(\?[^"']*)?)["']/i);
    if (downloadMatch) {
      const fileType = downloadMatch[2].toLowerCase().startsWith('doc') ? 'docx' : 'pdf';
      let downloadUrl = downloadMatch[1];
      // Make absolute if relative
      if (downloadUrl.startsWith('/')) {
        const urlObj = new URL(url);
        downloadUrl = `${urlObj.origin}${downloadUrl}`;
      }
      return { downloadUrl, fileType };
    }

    return { downloadUrl: null, fileType: null };
  } catch (error) {
    console.log('[auto-crawl] findDownloadLink error:', error);
    return { downloadUrl: null, fileType: null };
  }
}

// Parse document using parse-regulation-document edge function
async function parseDocument(downloadUrl: string, nodeId?: string): Promise<{ success: boolean; text: string; fileType: string }> {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/parse-regulation-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: downloadUrl, node_id: nodeId }),
    });

    const data = await response.json();
    return {
      success: data.success && data.text?.length > 100,
      text: data.text || '',
      fileType: data.file_type || 'unknown',
    };
  } catch (error) {
    console.log('[auto-crawl] parseDocument error:', error);
    return { success: false, text: '', fileType: 'unknown' };
  }
}

// Extract structured content using extract-regulation-content edge function
async function extractContent(
  text: string, 
  category: string, 
  jurisdiction: string,
  nodeId?: string
): Promise<{ success: boolean; data: any }> {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-regulation-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, category, jurisdiction, node_id: nodeId }),
    });

    const data = await response.json();
    return {
      success: data.success,
      data: data.data,
    };
  } catch (error) {
    console.log('[auto-crawl] extractContent error:', error);
    return { success: false, data: null };
  }
}

// Process a single source
async function processSource(
  supabase: any,
  source: RegulationSource,
  enableFullParsing: boolean = true
): Promise<CrawlStats> {
  const stats: CrawlStats = {
    source_id: source.id,
    results_count: 0,
    changes_detected: 0,
    new_regulations: 0,
    updated_regulations: 0,
    documents_parsed: 0,
    documents_failed: 0,
  };

  console.log(`[auto-crawl] Processing source: ${source.source_name}`);

  // Build search query
  const searchQuery = source.search_query || `${source.category} regulations site:${source.source_url}`;
  const lang = source.jurisdiction === 'VN' ? 'vi' : 'en';

  // Execute search
  const results = await searchWithFirecrawl(searchQuery, {
    limit: 10,
    lang,
    tbs: 'qdr:m', // Changed to last month for better coverage
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
              parse_status: 'pending',
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`[auto-crawl] Failed to insert node: ${insertError.message}`);
            continue;
          }

          stats.new_regulations++;
          stats.changes_detected++;

          // === LIVING SYSTEM: Try to find and parse document ===
          if (enableFullParsing && newNode) {
            console.log(`[auto-crawl] Looking for download link for: ${result.url}`);
            const { downloadUrl, fileType } = await findDownloadLink(result.url);
            
            if (downloadUrl) {
              console.log(`[auto-crawl] Found ${fileType} at: ${downloadUrl}`);
              
              // Update node with document URL
              await supabase
                .from('industry_knowledge_nodes')
                .update({ 
                  document_url: downloadUrl, 
                  document_type: fileType,
                  parse_status: 'parsing' 
                })
                .eq('id', newNode.id);
              
              // Parse document
              const parseResult = await parseDocument(downloadUrl, newNode.id);
              
              if (parseResult.success && parseResult.text.length > 200) {
                console.log(`[auto-crawl] Parsed ${parseResult.text.length} chars, extracting content...`);
                
                // Extract structured content
                const extractResult = await extractContent(
                  parseResult.text,
                  source.category,
                  source.jurisdiction,
                  newNode.id
                );
                
                if (extractResult.success) {
                  stats.documents_parsed++;
                  console.log(`[auto-crawl] Extraction complete, confidence: ${extractResult.data?.confidence_score}`);
                } else {
                  stats.documents_failed++;
                }
              } else {
                stats.documents_failed++;
                await supabase
                  .from('industry_knowledge_nodes')
                  .update({ parse_status: 'failed' })
                  .eq('id', newNode.id);
              }
            } else {
              // No download link found, skip parsing
              await supabase
                .from('industry_knowledge_nodes')
                .update({ parse_status: 'skipped' })
                .eq('id', newNode.id);
            }
          }
          // === END LIVING SYSTEM ===

// Create propagation log for new regulation
          if (newNode) {
            // Get mapped category codes from CATEGORY_MAPPING
            const mappedCategories = CATEGORY_MAPPING[source.category.toLowerCase()] || [source.category];
            
            // Build OR filter for all mapped categories  
            const categoryFilters = mappedCategories.map(c => `category_code.eq.${c}`).join(',');
            
            const { data: affectedPack } = await supabase
              .from('industry_memory_packs')
              .select('id, name, category_code')
              .or(`${categoryFilters},name.ilike.%${source.category}%,code.ilike.%${source.category}%`)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle();
            
            console.log(`[auto-crawl] Category mapping: ${source.category} -> ${mappedCategories.join(', ')}, matched pack: ${affectedPack?.name || 'none'}`);

            const { data: propagationLog } = await supabase.from('regulation_propagation_log').insert({
              source_node_id: newNode.id,
              affected_pack_id: affectedPack?.id || null,
              change_type: 'new',
              change_summary: `New regulation detected: ${result.title}`,
              propagation_status: 'pending',
              priority,
              review_status: 'pending', // Added for admin review
              impact_analysis: {
                auto_detected: true,
                source: source.source_name,
                source_id: source.id,
                crawl_url: result.url,
                has_full_text: stats.documents_parsed > 0,
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
          // === LIVING SYSTEM: Re-parse updated document ===
          let documentUrl: string | null = null;
          let documentType: string | null = null;
          let fullText: string | null = null;
          let extractedData: any = null;
          let effectiveDate: string | null = null;
          let aiConfidenceScore: number | null = null;

          // 1. Find new download link
          const downloadInfo = await findDownloadLink(result.url);
          if (downloadInfo.downloadUrl) {
            documentUrl = downloadInfo.downloadUrl;
            documentType = downloadInfo.fileType;
            console.log(`[auto-crawl] [UPDATE] Found download link: ${documentUrl} (${documentType})`);

            // 2. Parse document
            const parseResult = await parseDocument(downloadInfo.downloadUrl);
            if (parseResult.success && parseResult.text) {
              fullText = parseResult.text;
              stats.documents_parsed++;
              console.log(`[auto-crawl] [UPDATE] Document parsed successfully (${fullText.length} chars)`);

              // 3. Extract content with LLM
              const extractResult = await extractContent(
                parseResult.text,
                source.category,
                source.jurisdiction
              );
              if (extractResult.success && extractResult.data) {
                extractedData = extractResult.data;
                effectiveDate = extractResult.data.effective_date || null;
                aiConfidenceScore = extractResult.data.confidence_score || null;
                console.log(`[auto-crawl] [UPDATE] Content extracted successfully (confidence: ${aiConfidenceScore})`);
              }
            } else {
              stats.documents_failed++;
              console.log(`[auto-crawl] [UPDATE] Document parse failed`);
            }
          }

          // Update existing node WITH Living System data
          await supabase
            .from('industry_knowledge_nodes')
            .update({
              content_hash: contentHash,
              last_verified_at: new Date().toISOString(),
              description: extractedData?.summary 
                ? { vi: extractedData.summary, en: extractedData.summary }
                : { vi: result.description, en: result.description },
              properties: {
                jurisdiction: source.jurisdiction,
                category: source.category,
                published_date: result.publishedDate,
                auto_crawled: true,
                crawled_at: new Date().toISOString(),
                previous_hash: existingByUrl.content_hash,
              },
              // Living System fields
              document_url: documentUrl,
              document_type: documentType,
              full_text: fullText,
              extracted_data: extractedData,
              effective_date: effectiveDate,
              parse_status: fullText ? 'parsed' : 'pending',
            })
            .eq('id', existingByUrl.id);

          stats.updated_regulations++;
          stats.changes_detected++;

          // Find affected pack based on category mapping
          const mappedCategories = CATEGORY_MAPPING[source.category.toLowerCase()] || [source.category];
          const categoryFilters = mappedCategories.map(c => `category_code.eq.${c}`).join(',');
          
          const { data: affectedPack } = await supabase
            .from('industry_memory_packs')
            .select('id, name, category_code')
            .or(`${categoryFilters},name.ilike.%${source.category}%,code.ilike.%${source.category}%`)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          
          console.log(`[auto-crawl] Category mapping (update): ${source.category} -> ${mappedCategories.join(', ')}, matched pack: ${affectedPack?.name || 'none'}`);

          // Create propagation log for updated regulation WITH Living System fields
          const { data: propagationLog } = await supabase.from('regulation_propagation_log').insert({
            source_node_id: existingByUrl.id,
            affected_pack_id: affectedPack?.id || null,
            change_type: 'updated',
            change_summary: `Regulation updated: ${result.title}`,
            propagation_status: 'pending',
            priority,
            review_status: 'pending',  // Living System: require review
            ai_confidence_score: aiConfidenceScore,
            document_diff: {
              previous_hash: existingByUrl.content_hash,
              new_hash: contentHash,
              has_full_text: !!fullText,
              document_url: documentUrl,
            },
            impact_analysis: {
              auto_detected: true,
              source: source.source_name,
              source_id: source.id,
              crawl_url: result.url,
              previous_hash: existingByUrl.content_hash,
              new_hash: contentHash,
              has_full_text: !!fullText,
              document_url: documentUrl,
              extracted_data: extractedData ? {
                has_summary: !!extractedData.summary,
                has_key_points: !!extractedData.key_points?.length,
                has_affected_industries: !!extractedData.affected_industries?.length,
                confidence: aiConfidenceScore,
              } : null,
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
