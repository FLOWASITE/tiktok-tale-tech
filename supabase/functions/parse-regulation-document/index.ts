/**
 * Parse Regulation Document Edge Function
 * Downloads and parses PDF/DOCX files from official government sources
 * Returns extracted text content for further AI processing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  url: string;
  node_id?: string; // Optional: update node directly after parsing
}

interface ParseResult {
  success: boolean;
  text: string;
  pages?: number;
  file_type: 'pdf' | 'docx' | 'html' | 'unknown';
  file_size?: number;
  error?: string;
  metadata?: {
    title?: string;
    author?: string;
    created_date?: string;
    actual_pdf_url?: string;
    note?: string;
  };
}

/**
 * Detect file type from URL or content-type header
 */
function detectFileType(url: string, contentType?: string): 'pdf' | 'docx' | 'html' | 'unknown' {
  const urlLower = url.toLowerCase();
  
  // Check URL extension first
  if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) {
    return 'pdf';
  }
  if (urlLower.endsWith('.docx') || urlLower.endsWith('.doc') || urlLower.includes('.docx?')) {
    return 'docx';
  }
  if (urlLower.endsWith('.html') || urlLower.endsWith('.htm')) {
    return 'html';
  }
  
  // Check content-type header
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes('pdf')) return 'pdf';
    if (ct.includes('word') || ct.includes('msword') || ct.includes('openxmlformats-officedocument')) return 'docx';
    if (ct.includes('html')) return 'html';
  }
  
  return 'unknown';
}

/**
 * Download file from URL with retry logic
 */
async function downloadFile(url: string): Promise<{ buffer: ArrayBuffer; contentType: string; size: number }> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,*/*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || '';
      
      return {
        buffer,
        contentType,
        size: buffer.byteLength,
      };
    } catch (error) {
      lastError = error as Error;
      console.log(`[parse-document] Download attempt ${attempt + 1} failed:`, error);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  
  throw lastError || new Error('Failed to download file');
}

/**
 * Parse PDF file using pdf.js via Cloudflare worker or direct text extraction
 * Note: In Deno edge functions, we use a simplified approach with external API
 */
async function parsePDF(buffer: ArrayBuffer): Promise<{ text: string; pages: number; metadata?: Record<string, string> }> {
  // Use pdf-parse compatible approach or external service
  // For now, we'll use a simplified text extraction
  
  try {
    // Convert buffer to base64 for potential external API
    const uint8Array = new Uint8Array(buffer);
    
    // Try to extract text using basic PDF structure parsing
    // This is a simplified approach - production would use pdf.js or external service
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between stream/endstream markers (simplified PDF text extraction)
    const textMatches = rawText.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g) || [];
    let extractedText = '';
    
    for (const match of textMatches) {
      // Try to decode text content
      const content = match.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, '');
      // Filter to printable characters
      const printable = content.replace(/[^\x20-\x7E\u00C0-\u1EF9\s]/g, ' ');
      if (printable.trim().length > 50) {
        extractedText += printable + '\n';
      }
    }
    
    // Also try to extract text from /Contents markers
    const contentsMatches = rawText.match(/\(([^)]+)\)/g) || [];
    for (const match of contentsMatches) {
      const content = match.slice(1, -1);
      if (content.length > 20 && /[a-zA-ZÀ-ỹ]/.test(content)) {
        extractedText += content + ' ';
      }
    }
    
    // Count pages (approximate)
    const pageMatches = rawText.match(/\/Type\s*\/Page[^s]/g) || [];
    const pageCount = pageMatches.length || 1;
    
    // Clean up extracted text
    const cleanText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+/g, '$1\n')
      .trim();
    
    if (cleanText.length < 100) {
      // If extraction failed, return indication that external service is needed
      return {
        text: '[PDF parsing requires external service - text extraction limited]',
        pages: pageCount,
        metadata: {
          note: 'Consider using Firecrawl or dedicated PDF parsing service for full text extraction'
        }
      };
    }
    
    return {
      text: cleanText,
      pages: pageCount,
    };
  } catch (error) {
    console.error('[parse-document] PDF parsing error:', error);
    throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse DOCX file by extracting text from XML content
 */
async function parseDOCX(buffer: ArrayBuffer): Promise<{ text: string; metadata?: Record<string, string> }> {
  try {
    // DOCX is a ZIP file containing XML
    // We need to extract document.xml and parse it
    
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder('utf-8', { fatal: false });
    
    // Find the local file header for document.xml
    // ZIP local file header signature: 0x04034b50
    let documentXml = '';
    
    // Simple approach: look for XML content in the buffer
    const rawContent = decoder.decode(uint8Array);
    
    // Extract text from w:t tags (Word text runs)
    const textMatches = rawContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const extractedTexts: string[] = [];
    
    for (const match of textMatches) {
      const text = match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '');
      if (text.trim()) {
        extractedTexts.push(text);
      }
    }
    
    // Also try to find paragraph breaks
    const paragraphMatches = rawContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g) || [];
    
    let structuredText = '';
    for (const para of paragraphMatches) {
      const paraTexts = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const paraContent = paraTexts
        .map(t => t.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join('');
      if (paraContent.trim()) {
        structuredText += paraContent.trim() + '\n';
      }
    }
    
    const finalText = structuredText || extractedTexts.join(' ');
    
    if (finalText.length < 50) {
      return {
        text: '[DOCX parsing limited - document may be encrypted or use complex formatting]',
        metadata: {
          note: 'Consider using mammoth or dedicated DOCX parsing service for full text extraction'
        }
      };
    }
    
    return {
      text: finalText.trim(),
    };
  } catch (error) {
    console.error('[parse-document] DOCX parsing error:', error);
    throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse HTML content - extract text from body
 */
function parseHTML(buffer: ArrayBuffer): { text: string } {
  const decoder = new TextDecoder('utf-8');
  const html = decoder.decode(buffer);
  
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return { text };
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    // Remove excessive whitespace
    .replace(/ +/g, ' ')
    .replace(/\n +/g, '\n')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim
    .trim();
}

/**
 * Clean scraped HTML/Markdown content to remove website layout artifacts
 * Specific patterns for Vietnamese government websites
 */
function cleanScrapedContent(text: string, sourceUrl: string): string {
  let cleaned = text;
  
  // Remove common Vietnamese gov site layout patterns
  const removePatterns = [
    // Markdown table artifacts
    /\|\s*---+\s*\|/g,
    /\|\s*\|/g,
    // Banner/logo images
    /\[!\[Cổng thông tin[^\]]*\]\([^)]+\)\]/gi,
    /\[!\[Logo[^\]]*\]\([^)]+\)\]/gi,
    /!\[[^\]]*\]\([^)]+\)/g, // All markdown images
    // Language switches
    /\[English\]\([^)]+\)/gi,
    /\[Tiếng Việt\]\([^)]+\)/gi,
    /\[中文\]\([^)]+\)/gi,
    // Menu/nav items
    /- \[!\[\]\([^)]+\)[^\]]*\]\([^)]+\)/g,
    /\*\*Tìm kiếm\*\*/gi,
    /\*\*Đăng nhập\*\*/gi,
    /\*\*Đăng ký\*\*/gi,
    // Common footer patterns
    /Bản quyền thuộc về.*$/gm,
    /Copyright ©.*$/gm,
    /Địa chỉ:.*Điện thoại:.*$/gm,
    // Social media links
    /\[Facebook\]\([^)]+\)/gi,
    /\[Twitter\]\([^)]+\)/gi,
    /\[Youtube\]\([^)]+\)/gi,
    // Breadcrumb patterns
    /Trang chủ\s*>\s*/gi,
    /Home\s*>\s*/gi,
    // Empty links and placeholders
    /\[\s*\]\([^)]+\)/g,
    /\[#\]\([^)]+\)/g,
  ];
  
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Site-specific cleaning for vanban.chinhphu.vn
  if (sourceUrl.includes('chinhphu.vn')) {
    // Remove header navigation
    cleaned = cleaned.replace(/^[\s\S]*?(?=(?:CỘNG HÒA|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH|LUẬT|CHỈ THỊ|VĂN BẢN))/i, '');
    // Remove "Văn bản liên quan" sections
    cleaned = cleaned.replace(/Văn bản liên quan[\s\S]*$/i, '');
    cleaned = cleaned.replace(/Văn bản được hướng dẫn[\s\S]*$/i, '');
    cleaned = cleaned.replace(/Văn bản bị thay thế[\s\S]*$/i, '');
  }
  
  // Try to extract main content between document markers
  const mainContentMarkers = [
    // Vietnamese legal document markers
    /(?:CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM[\s\S]*?)((?:Điều\s+\d+|Chương\s+[IVX]+)[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i,
    // Decree/Decision content
    /(QUYẾT ĐỊNH:[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i,
    // Circular content  
    /(THÔNG TƯ:[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i,
    // General regulation content
    /(NỘI DUNG VĂN BẢN[\s\S]*?)(?:VĂN BẢN LIÊN QUAN|$)/i,
  ];
  
  for (const pattern of mainContentMarkers) {
    const match = cleaned.match(pattern);
    if (match && match[1] && match[1].length > 500) {
      cleaned = match[0];
      break;
    }
  }
  
  // Clean up excessive newlines and whitespace
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s*[-*]\s*$/gm, '') // Empty list items
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Try to find direct PDF link from Vietnamese gov sites
 * Priority check for datafiles.chinhphu.vn (most reliable source)
 */
async function findDirectPdfLink(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['html', 'links'],
        timeout: 15000,
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const links: string[] = data.data?.links || [];
    const html: string = data.data?.html || '';
    
    // Priority 1: datafiles.chinhphu.vn PDF (official document server)
    for (const link of links) {
      if (link.includes('datafiles.chinhphu.vn') && link.toLowerCase().endsWith('.pdf')) {
        console.log(`[parse-document] Found official PDF: ${link}`);
        return link;
      }
    }
    
    // Priority 2: Check HTML for embedded datafiles link
    const datafilesMatch = html.match(
      /href=["'](https?:\/\/datafiles\.chinhphu\.vn[^"']*\.pdf)["']/i
    );
    if (datafilesMatch) {
      console.log(`[parse-document] Found embedded official PDF: ${datafilesMatch[1]}`);
      return datafilesMatch[1];
    }
    
    // Priority 3: Any PDF link with common patterns
    const pdfPatterns = [
      /vbpq.*\.pdf/i,
      /\/file\/.*\.pdf/i,
      /download.*\.pdf/i,
      /\.signed\.pdf/i,
    ];
    
    for (const link of links) {
      for (const pattern of pdfPatterns) {
        if (pattern.test(link)) {
          console.log(`[parse-document] Found PDF link: ${link}`);
          return link;
        }
      }
    }
    
    // Priority 4: Generic PDF extension check
    for (const link of links) {
      if (link.toLowerCase().endsWith('.pdf')) {
        console.log(`[parse-document] Found generic PDF: ${link}`);
        return link;
      }
    }
    
    return null;
  } catch (error) {
    console.log('[parse-document] findDirectPdfLink error:', error);
    return null;
  }
}

/**
 * Try to use Firecrawl for better extraction if available
 * Uses onlyMainContent to exclude headers/footers
 */
async function tryFirecrawlScrape(url: string): Promise<{ success: boolean; text?: string; pdfUrl?: string }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { success: false };
  }
  
  try {
    // First, try to find direct PDF link
    const pdfUrl = await findDirectPdfLink(url);
    if (pdfUrl) {
      // If PDF found, return it for proper parsing
      return { success: false, pdfUrl };
    }
    
    // Scrape HTML with onlyMainContent for cleaner extraction
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true, // CRITICAL: Exclude headers, navs, footers
        timeout: 30000,
      }),
    });
    
    if (!response.ok) {
      return { success: false };
    }
    
    const data = await response.json();
    if (data.success && data.data?.markdown) {
      // Apply additional cleaning for gov sites
      const cleanedText = cleanScrapedContent(data.data.markdown, url);
      
      // Only return if we have meaningful content
      if (cleanedText.length > 300) {
        return {
          success: true,
          text: cleanedText,
        };
      }
    }
    
    return { success: false };
  } catch {
    return { success: false };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { url, node_id }: ParseRequest = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`[parse-document] Processing: ${url}`);
    
    let result: ParseResult;
    let targetUrl = url;
    
    // Check if URL is already a direct PDF/DOCX link
    const isDirectDownload = /\.(pdf|docx?)(\?.*)?$/i.test(url);
    
    if (!isDirectDownload) {
      // Try Firecrawl for HTML pages - may find PDF link or extract content
      console.log('[parse-document] Checking for PDF link on page...');
      const firecrawlResult = await tryFirecrawlScrape(url);
      
      if (firecrawlResult.pdfUrl) {
        // Found a PDF link - use that instead
        console.log(`[parse-document] Found PDF, switching to: ${firecrawlResult.pdfUrl}`);
        targetUrl = firecrawlResult.pdfUrl;
      } else if (firecrawlResult.success && firecrawlResult.text) {
        // Successfully extracted clean HTML content
        console.log(`[parse-document] Using cleaned Firecrawl extraction (${firecrawlResult.text.length} chars)`);
        result = {
          success: true,
          text: cleanText(firecrawlResult.text),
          file_type: 'html',
        };
        
        // Skip to node update
        if (node_id && result.success) {
          await updateKnowledgeNode(node_id, url, result);
        }
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Download and parse file (PDF, DOCX, or HTML)
    console.log(`[parse-document] Downloading: ${targetUrl}`);
    
    try {
      const { buffer, contentType, size } = await downloadFile(targetUrl);
      const fileType = detectFileType(targetUrl, contentType);
      
      console.log(`[parse-document] Downloaded ${size} bytes, type: ${fileType}`);
      
      let extractedText = '';
      let pages: number | undefined;
      let metadata: Record<string, string> | undefined;
      
      switch (fileType) {
        case 'pdf':
          const pdfResult = await parsePDF(buffer);
          extractedText = pdfResult.text;
          pages = pdfResult.pages;
          metadata = pdfResult.metadata;
          break;
          
        case 'docx':
          const docxResult = await parseDOCX(buffer);
          extractedText = docxResult.text;
          metadata = docxResult.metadata;
          break;
          
        case 'html':
          const htmlResult = parseHTML(buffer);
          // Apply cleaning for gov site HTML
          extractedText = cleanScrapedContent(htmlResult.text, url);
          break;
          
        default:
          // Try as HTML fallback with cleaning
          const fallbackResult = parseHTML(buffer);
          extractedText = cleanScrapedContent(fallbackResult.text, url);
      }
      
      result = {
        success: extractedText.length > 100,
        text: cleanText(extractedText),
        pages,
        file_type: fileType,
        file_size: size,
        metadata,
      };
      
      // If PDF parsing returned limited text, note the actual download URL
      if (fileType === 'pdf' && targetUrl !== url) {
        result.metadata = {
          ...result.metadata,
          actual_pdf_url: targetUrl,
        };
      }
    } catch (downloadError) {
      console.error('[parse-document] Download/parse error:', downloadError);
      result = {
        success: false,
        text: '',
        file_type: 'unknown',
        error: downloadError instanceof Error ? downloadError.message : 'Failed to download or parse document',
      };
    }
    
    // Optionally update the knowledge node directly
    if (node_id && result.success) {
      await updateKnowledgeNode(node_id, targetUrl, result);
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[parse-document] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        text: '',
        file_type: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

/**
 * Helper function to update knowledge node with parse results
 */
async function updateKnowledgeNode(nodeId: string, documentUrl: string, result: ParseResult): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const parseStatus = result.success && result.text.length > 100 ? 'parsed' : 'failed';
    
    await supabase
      .from('industry_knowledge_nodes')
      .update({
        full_text: result.text,
        document_url: documentUrl,
        document_type: result.file_type,
        parse_status: parseStatus,
      })
      .eq('id', nodeId);
      
    console.log(`[parse-document] Updated node ${nodeId} with status: ${parseStatus}`);
  } catch (updateError) {
    console.error('[parse-document] Node update error:', updateError);
    // Don't fail the response for update errors
  }
}
