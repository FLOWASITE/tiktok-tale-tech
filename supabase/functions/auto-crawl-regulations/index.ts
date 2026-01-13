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
// Enhanced v2: Priority detection for Vietnamese government document servers
// v2.1: Added VBPL.VN support
async function findDownloadLink(url: string): Promise<{ downloadUrl: string | null; fileType: 'pdf' | 'docx' | null; extractedMarkdown?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { downloadUrl: null, fileType: null };
  }

  try {
    // === PRIORITY 0: VBPL.VN specific patterns ===
    if (url.includes('vbpl.vn')) {
      // Extract ItemID from URL
      const itemIdMatch = url.match(/ItemID=(\d+)/i);
      if (itemIdMatch) {
        const itemId = itemIdMatch[1];
        // Convert to PDF page URL (vbpq-van-ban-goc.aspx contains download links)
        const pdfPageUrl = `https://vbpl.vn/TW/Pages/vbpq-van-ban-goc.aspx?ItemID=${itemId}`;
        console.log(`[auto-crawl] VBPL: Converting to PDF page: ${pdfPageUrl}`);
        
        // Scrape the PDF page to find actual download link
        const vbplPdfUrl = await scrapeVbplPdfPage(pdfPageUrl);
        if (vbplPdfUrl) {
          const isDoc = vbplPdfUrl.toLowerCase().match(/\.docx?$/);
          return { downloadUrl: vbplPdfUrl, fileType: isDoc ? 'docx' : 'pdf' };
        }
      }
    }

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['links', 'html', 'markdown'],
        onlyMainContent: true, // Get cleaner content
        timeout: 20000,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      return { downloadUrl: null, fileType: null };
    }

    const links: string[] = data.data?.links || [];
    const html: string = data.data?.html || '';
    const markdown: string = data.data?.markdown || '';
    
    // === PRIORITY 0.5: VBPL.VN DOC/PDF links from page ===
    if (url.includes('vbpl.vn')) {
      for (const link of links) {
        if (link.includes('vbpl.vn') && (link.match(/\.docx?$/i) || link.match(/\.pdf$/i))) {
          const isDoc = link.toLowerCase().match(/\.docx?$/);
          console.log(`[auto-crawl] VBPL: Found document link: ${link}`);
          return { downloadUrl: link, fileType: isDoc ? 'docx' : 'pdf' };
        }
      }
      // Check HTML for embedded download links
      const vbplDocMatch = html.match(/href=["']([^"']*\.(?:pdf|docx?))["']/i);
      if (vbplDocMatch) {
        let docUrl = vbplDocMatch[1];
        if (docUrl.startsWith('/')) {
          docUrl = `https://vbpl.vn${docUrl}`;
        }
        const isDoc = docUrl.toLowerCase().match(/\.docx?$/);
        console.log(`[auto-crawl] VBPL: Found embedded doc: ${docUrl}`);
        return { downloadUrl: docUrl, fileType: isDoc ? 'docx' : 'pdf' };
      }
    }
    
    // === PRIORITY 1: datafiles.chinhphu.vn PDF (most reliable for VN gov docs) ===
    for (const link of links) {
      if (link.includes('datafiles.chinhphu.vn') && link.toLowerCase().endsWith('.pdf')) {
        console.log(`[auto-crawl] Found official PDF from datafiles: ${link}`);
        return { downloadUrl: link, fileType: 'pdf' };
      }
    }
    
    // Check HTML for embedded datafiles link (sometimes not in links array)
    const datafilesMatch = html.match(
      /href=["'](https?:\/\/datafiles\.chinhphu\.vn[^"']*\.pdf)["']/i
    );
    if (datafilesMatch) {
      console.log(`[auto-crawl] Found embedded official PDF: ${datafilesMatch[1]}`);
      return { downloadUrl: datafilesMatch[1], fileType: 'pdf' };
    }

    // === PRIORITY 2: Signed PDF patterns (official digitally signed documents) ===
    const signedPdfPatterns = [
      /\.signed\.pdf$/i,
      /signed_.*\.pdf$/i,
      /\.ky\.pdf$/i, // Vietnamese "ký" = signed
    ];
    
    for (const link of links) {
      for (const pattern of signedPdfPatterns) {
        if (pattern.test(link)) {
          console.log(`[auto-crawl] Found signed PDF: ${link}`);
          return { downloadUrl: link, fileType: 'pdf' };
        }
      }
    }

    // === PRIORITY 3: Other PDF patterns for VN gov sites ===
    const pdfPatterns = [
      /vbpq.*\.pdf/i,           // vanban.chinhphu.vn pattern
      /\/file\/.*\.pdf/i,       // Common file path
      /\/download\/.*\.pdf/i,   // Download path
      /attach.*\.pdf/i,         // Attachment pattern
      /document.*\.pdf/i,       // Document pattern
    ];
    
    for (const link of links) {
      for (const pattern of pdfPatterns) {
        if (pattern.test(link)) {
          console.log(`[auto-crawl] Found PDF: ${link}`);
          return { downloadUrl: link, fileType: 'pdf' };
        }
      }
    }
    
    // === PRIORITY 4: Generic PDF extension check ===
    for (const link of links) {
      if (link.toLowerCase().endsWith('.pdf')) {
        console.log(`[auto-crawl] Found generic PDF: ${link}`);
        return { downloadUrl: link, fileType: 'pdf' };
      }
    }
    
    // === PRIORITY 5: DOCX patterns ===
    const docxPatterns = [
      /\.docx?$/i,
      /download.*\.docx?/i,
      /attach.*\.docx?/i,
    ];

    for (const link of links) {
      for (const pattern of docxPatterns) {
        if (pattern.test(link)) {
          console.log(`[auto-crawl] Found DOCX: ${link}`);
          return { downloadUrl: link, fileType: 'docx' };
        }
      }
    }

    // === PRIORITY 6: Check HTML for any embedded download links ===
    const downloadMatch = html.match(/href=["']([^"']*\.(pdf|docx?)(\?[^"']*)?)["']/i);
    if (downloadMatch) {
      const fileType = downloadMatch[2].toLowerCase().startsWith('doc') ? 'docx' : 'pdf';
      let downloadUrl = downloadMatch[1];
      // Make absolute if relative
      if (downloadUrl.startsWith('/')) {
        try {
          const urlObj = new URL(url);
          downloadUrl = `${urlObj.origin}${downloadUrl}`;
        } catch { /* ignore invalid URL */ }
      }
      console.log(`[auto-crawl] Found embedded download link: ${downloadUrl}`);
      return { downloadUrl, fileType };
    }

    // === FALLBACK: Return cleaned markdown if no download link found ===
    // This allows using scraped content when PDF isn't available
    if (markdown && markdown.length > 500) {
      console.log(`[auto-crawl] No download link found, returning extracted markdown (${markdown.length} chars)`);
      return { downloadUrl: null, fileType: null, extractedMarkdown: cleanExtractedMarkdown(markdown, url) };
    }

    return { downloadUrl: null, fileType: null };
  } catch (error) {
    console.log('[auto-crawl] findDownloadLink error:', error);
    return { downloadUrl: null, fileType: null };
  }
}

/**
 * Scrape VBPL.VN PDF page to find actual download link
 */
async function scrapeVbplPdfPage(pdfPageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  
  try {
    console.log(`[auto-crawl] VBPL: Scraping PDF page: ${pdfPageUrl}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pdfPageUrl,
        formats: ['links', 'rawHtml', 'markdown'],
        onlyMainContent: false,
        waitFor: 3000, // Wait longer for JS rendering
        timeout: 20000,
      }),
    });
    
    if (!response.ok) {
      console.log(`[auto-crawl] VBPL: Scrape failed: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const links: string[] = data.data?.links || [];
    const html: string = data.data?.rawHtml || '';
    const markdown: string = data.data?.markdown || '';
    
    // === PRIORITY 1: Check links array for PDF/DOC ===
    for (const link of links) {
      if (link.match(/\.(pdf|docx?)$/i)) {
        console.log(`[auto-crawl] VBPL: Found document in links: ${link}`);
        return link;
      }
    }
    
    // === PRIORITY 2: Find .signed.pdf pattern in HTML/markdown (common VBPL pattern) ===
    // Pattern: 66qhm.signed.pdf or similar
    const signedPdfPatterns = [
      /href=["']([^"']*\.signed\.pdf)["']/i,
      /href=["']([^"']*m\.signed\.pdf)["']/i,
      /src=["']([^"']*\.signed\.pdf)["']/i,
      // Look for filename mentions in text (VBPL shows filename as text near download icon)
      /(\d+[a-z]*m?\.signed\.pdf)/i,
      /([A-Za-z0-9_-]+\.signed\.pdf)/i,
    ];
    
    const allContent = html + ' ' + markdown;
    for (const pattern of signedPdfPatterns) {
      const match = allContent.match(pattern);
      if (match && match[1]) {
        let docUrl = match[1];
        // Build absolute URL
        if (!docUrl.startsWith('http')) {
          // Extract ItemID from page URL to construct proper download path
          const itemIdMatch = pdfPageUrl.match(/ItemID=(\d+)/i);
          if (itemIdMatch) {
            // VBPL PDF download pattern: /TW/Pages/File/... or similar
            // Try common VBPL download paths
            const tryPaths = [
              `https://vbpl.vn/TW/Pages/File/${docUrl}`,
              `https://vbpl.vn/botaichinh/Pages/File/${docUrl}`,
              `https://vbpl.vn/TW/VBPQ/${docUrl}`,
              `https://vbpl.vn/${docUrl}`,
            ];
            // Use first constructed path (will be validated by actual download)
            docUrl = tryPaths[0];
            console.log(`[auto-crawl] VBPL: Constructed PDF URL from filename: ${docUrl}`);
          } else if (docUrl.startsWith('/')) {
            docUrl = `https://vbpl.vn${docUrl}`;
          } else {
            docUrl = `https://vbpl.vn/${docUrl}`;
          }
        }
        console.log(`[auto-crawl] VBPL: Found signed PDF: ${docUrl}`);
        return docUrl;
      }
    }
    
    // === PRIORITY 3: Generic PDF/DOC patterns in HTML ===
    const docPatterns = [
      /href=["']([^"']*\.pdf)["']/i,
      /href=["']([^"']*\.docx?)["']/i,
      /href=["']([^"']*Download[^"']*ItemID=\d+[^"']*)["']/i,
      /href=["']([^"']*tailieu[^"']*\.(?:pdf|docx?))["']/i,
    ];
    
    for (const pattern of docPatterns) {
      const match = html.match(pattern);
      if (match) {
        let docUrl = match[1];
        if (docUrl.startsWith('/')) {
          docUrl = `https://vbpl.vn${docUrl}`;
        } else if (!docUrl.startsWith('http')) {
          docUrl = `https://vbpl.vn/${docUrl}`;
        }
        console.log(`[auto-crawl] VBPL: Found document via pattern: ${docUrl}`);
        return docUrl;
      }
    }
    
    // === PRIORITY 4: Look for any PDF/DOC URL in content ===
    const genericDocMatch = allContent.match(/(https?:\/\/[^"'\s<>]+\.(?:pdf|docx?))(?=["'\s<>]|$)/i);
    if (genericDocMatch) {
      console.log(`[auto-crawl] VBPL: Found document via generic pattern: ${genericDocMatch[1]}`);
      return genericDocMatch[1];
    }
    
    console.log('[auto-crawl] VBPL: No document link found on PDF page');
    return null;
  } catch (error) {
    console.log('[auto-crawl] VBPL: scrapeVbplPdfPage error:', error);
    return null;
  }
}

// Clean extracted markdown content from gov sites
function cleanExtractedMarkdown(markdown: string, sourceUrl: string): string {
  let cleaned = markdown;
  
  // Remove common layout artifacts
  const removePatterns = [
    /!\[[^\]]*\]\([^)]+\)/g,           // Images
    /\[!\[[^\]]*\]\([^)]+\)\]/g,       // Nested image links
    /\[English\]\([^)]+\)/gi,          // Language switchers
    /\[Tiếng Việt\]\([^)]+\)/gi,
    /\[中文\]\([^)]+\)/gi,
    /\|\s*---+\s*\|/g,                 // Table separators
    /\*\*Tìm kiếm\*\*/gi,              // Search labels
    /\*\*Đăng nhập\*\*/gi,             // Login labels
    /Bản quyền thuộc về.*$/gm,         // Copyright
    /Copyright ©.*$/gm,
    /Trang chủ\s*>\s*/gi,              // Breadcrumbs
  ];
  
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Site-specific cleaning
  if (sourceUrl.includes('chinhphu.vn')) {
    // Try to extract main document content
    const docMatch = cleaned.match(
      /((?:CỘNG HÒA|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH|LUẬT)[\s\S]*?)(?:Văn bản liên quan|Nơi nhận:|$)/i
    );
    if (docMatch && docMatch[1].length > 300) {
      cleaned = docMatch[1];
    }
  }
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s*[-*]\s*$/gm, '')
    .trim();
    
  return cleaned;
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

  // Execute search (default: last month)
  let results = await searchWithFirecrawl(searchQuery, {
    limit: 10,
    lang,
    tbs: 'qdr:m',
  });

  // Fallback: broaden time range + relax overly-specific site paths (common for VBPL/LuatVietnam)
  if (results.length === 0) {
    const relaxedQuery = searchQuery.replace(/site:([^\s]+)/i, (_m, site) => {
      const relaxedSite = String(site).replace(/\/(van-ban|TW\/Pages).*$/i, '');
      return `site:${relaxedSite}`;
    });

    results = await searchWithFirecrawl(relaxedQuery, {
      limit: 15,
      lang,
      tbs: 'qdr:y',
    });
  }

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
            
            let textContent: string | null = null;
            let docType: string = 'html';
            let docUrl: string | null = null;
            
            if (downloadUrl) {
              // Priority 1: Parse PDF/DOCX
              console.log(`[auto-crawl] Found ${fileType} at: ${downloadUrl}`);
              docUrl = downloadUrl;
              docType = fileType || 'pdf';
              
              await supabase
                .from('industry_knowledge_nodes')
                .update({ 
                  document_url: downloadUrl, 
                  document_type: docType,
                  parse_status: 'parsing' 
                })
                .eq('id', newNode.id);
              
              const parseResult = await parseDocument(downloadUrl, newNode.id);
              if (parseResult.success && parseResult.text.length > 200) {
                textContent = parseResult.text;
              }
            }
            
            // Priority 2: Use markdown from Firecrawl search results
            if (!textContent && result.markdown && result.markdown.length > 500) {
              console.log(`[auto-crawl] Using markdown from search (${result.markdown.length} chars)`);
              textContent = result.markdown;
              docType = 'html';
              docUrl = result.url;
              
              // Update node with full_text directly
              await supabase
                .from('industry_knowledge_nodes')
                .update({ 
                  full_text: textContent,
                  document_url: result.url,
                  document_type: 'html',
                  parse_status: 'parsed' 
                })
                .eq('id', newNode.id);
            }
            
            // Priority 3: Scrape HTML from original URL
            if (!textContent) {
              console.log(`[auto-crawl] Fallback: scraping HTML from ${result.url}`);
              const parseResult = await parseDocument(result.url, newNode.id);
              if (parseResult.success && parseResult.text.length > 200 && 
                  !parseResult.text.includes('Không tìm thấy văn bản')) {
                textContent = parseResult.text;
                docType = 'html';
                docUrl = result.url;
              }
            }
            
            // Extract structured content if we have text
            if (textContent && textContent.length > 300) {
              console.log(`[auto-crawl] Extracting content from ${textContent.length} chars...`);
              
              const extractResult = await extractContent(
                textContent,
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

          // Priority 1: Find new download link (PDF/DOCX)
          const downloadInfo = await findDownloadLink(result.url);
          if (downloadInfo.downloadUrl) {
            documentUrl = downloadInfo.downloadUrl;
            documentType = downloadInfo.fileType;
            console.log(`[auto-crawl] [UPDATE] Found download link: ${documentUrl} (${documentType})`);

            const parseResult = await parseDocument(downloadInfo.downloadUrl);
            if (parseResult.success && parseResult.text && parseResult.text.length > 200) {
              fullText = parseResult.text;
              stats.documents_parsed++;
              console.log(`[auto-crawl] [UPDATE] Document parsed successfully (${fullText.length} chars)`);
            }
          }

          // Priority 2: Use markdown from Firecrawl search results
          if (!fullText && result.markdown && result.markdown.length > 500) {
            console.log(`[auto-crawl] [UPDATE] Using markdown from search (${result.markdown.length} chars)`);
            fullText = result.markdown;
            documentType = 'html';
            documentUrl = result.url;
          }

          // Priority 3: Scrape HTML from original URL
          if (!fullText) {
            console.log(`[auto-crawl] [UPDATE] Fallback: scraping HTML from ${result.url}`);
            const parseResult = await parseDocument(result.url);
            if (parseResult.success && parseResult.text && parseResult.text.length > 200 &&
                !parseResult.text.includes('Không tìm thấy văn bản')) {
              fullText = parseResult.text;
              documentType = 'html';
              documentUrl = result.url;
            }
          }

          // Extract content with LLM if we have text
          if (fullText && fullText.length > 300) {
            const extractResult = await extractContent(
              fullText,
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
            console.log(`[auto-crawl] [UPDATE] No valid text content found`);
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
      
      // Normalize inputs safely - support both snake_case and camelCase
      const sourceId = body.source_id || body.sourceId || null;
      const rawCrawlAll = body.crawl_all ?? body.crawlAll ?? null;
      
      // Parse crawl_all as boolean strictly
      const crawlAll = rawCrawlAll === true || rawCrawlAll === 'true' || rawCrawlAll === 1 || rawCrawlAll === '1';
      
      console.log('[auto-crawl] Raw body:', JSON.stringify(body));
      console.log('[auto-crawl] Normalized params:', { sourceId, crawlAll, rawCrawlAll });

      // DECISION LOGIC - fix "crawl all by default" bug:
      // 1. If source_id provided → ONLY crawl that source (ignore crawl_all)
      // 2. If no source_id AND crawl_all === true → crawl all active sources
      // 3. If no source_id AND crawl_all !== true → return 400 (prevent accidental mass crawl)
      
      let sourcesQuery = supabase
        .from('regulation_sources')
        .select('*')
        .eq('is_active', true);

      if (sourceId && typeof sourceId === 'string' && sourceId.trim() !== '') {
        // Case 1: Single source crawl
        console.log('[auto-crawl] ▶ SINGLE SOURCE CRAWL:', sourceId);
        sourcesQuery = sourcesQuery.eq('id', sourceId.trim());
      } else if (crawlAll === true) {
        // Case 2: Explicit crawl all
        console.log('[auto-crawl] ▶ CRAWL ALL SOURCES (explicit request)');
      } else {
        // Case 3: Bad request - no source_id and no explicit crawl_all
        console.log('[auto-crawl] ✖ BAD REQUEST: missing source_id or crawl_all');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required parameter: provide source_id to crawl a single source, or crawl_all=true to crawl all sources',
            received: { source_id: sourceId, crawl_all: rawCrawlAll }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
