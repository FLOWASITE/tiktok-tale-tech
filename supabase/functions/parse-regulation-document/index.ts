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

interface ParseDebugInfo {
  source: 'pdf' | 'html' | 'download';
  strategy?: string;
  textLength: number;
  legalScore?: number;
  sidebarPenalty?: number;
  qualityScore?: 'poor' | 'acceptable' | 'good' | 'excellent';
  pdfUrlFound?: boolean;
  timestamp: string;
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
  debug?: ParseDebugInfo;
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
 * Detect if text contains sidebar/layout artifacts (not main legal content)
 * Returns a penalty score - higher means more likely to be sidebar content
 */
function detectSidebarContent(text: string): number {
  let penalty = 0;
  
  const sidebarPatterns = [
    { pattern: /Các văn bản khác/gi, weight: 10 },
    { pattern: /văn bản này/gi, weight: 3 },
    { pattern: /Tìm kiếm/gi, weight: 5 },
    { pattern: /Đăng nhập/gi, weight: 5 },
    { pattern: /Đăng ký/gi, weight: 5 },
    { pattern: /Liên hệ/gi, weight: 3 },
    { pattern: /Trang chủ/gi, weight: 3 },
    { pattern: /Menu/gi, weight: 5 },
    { pattern: /Facebook|Twitter|Youtube/gi, weight: 5 },
    { pattern: /Bản quyền thuộc về/gi, weight: 5 },
    { pattern: /\[!\[\]\([^)]+\)/g, weight: 5 }, // Empty image links
  ];
  
  for (const { pattern, weight } of sidebarPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      penalty += matches.length * weight;
    }
  }
  
  return penalty;
}

/**
 * Detect if text contains legal document markers (main content indicators)
 * Returns a bonus score - higher means more likely to be actual legal content
 */
function detectLegalContent(text: string): number {
  let bonus = 0;
  
  const legalPatterns = [
    { pattern: /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/gi, weight: 20 },
    { pattern: /Độc lập - Tự do - Hạnh phúc/gi, weight: 15 },
    { pattern: /Điều\s+\d+/gi, weight: 5 },
    { pattern: /Chương\s+[IVX\d]+/gi, weight: 5 },
    { pattern: /QUYẾT ĐỊNH|NGHỊ ĐỊNH|THÔNG TƯ|LUẬT|CHỈ THỊ/gi, weight: 10 },
    { pattern: /Căn cứ/gi, weight: 3 },
    { pattern: /Xét đề nghị/gi, weight: 3 },
    { pattern: /Khoản\s+\d+/gi, weight: 3 },
    { pattern: /Nơi nhận:/gi, weight: 5 },
    { pattern: /BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH/gi, weight: 5 },
  ];
  
  for (const { pattern, weight } of legalPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      bonus += matches.length * weight;
    }
  }
  
  return bonus;
}

/**
 * Clean scraped HTML/Markdown content to remove website layout artifacts
 * Specific patterns for Vietnamese government websites
 * Enhanced: Avoids over-truncation and detects sidebar content
 */
function cleanScrapedContent(text: string, sourceUrl: string): string {
  const originalLength = text.length;
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
    // Remove header navigation - but only if we find legal content after it
    const headerCutMatch = cleaned.match(/^[\s\S]*?(?=CỘNG HÒA|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH|LUẬT|CHỈ THỊ)/i);
    if (headerCutMatch && headerCutMatch[0].length < cleaned.length * 0.3) {
      // Only cut if header is less than 30% of content
      cleaned = cleaned.replace(/^[\s\S]*?(?=CỘNG HÒA|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH|LUẬT|CHỈ THỊ)/i, '');
    }
    
    // Remove "Văn bản liên quan" sections - but only if they appear in the LAST 30% of the document
    const relatedDocsPatterns = [
      /Văn bản liên quan/i,
      /Văn bản được hướng dẫn/i,
      /Văn bản bị thay thế/i,
      /Các văn bản khác/i,
    ];
    
    for (const pattern of relatedDocsPatterns) {
      const match = cleaned.match(pattern);
      if (match && match.index !== undefined) {
        // Only cut if this appears in the last 30% of the document
        if (match.index > cleaned.length * 0.7) {
          cleaned = cleaned.substring(0, match.index);
        }
      }
    }
  }
  
  // Site-specific cleaning for vbpl.vn
  if (sourceUrl.includes('vbpl.vn')) {
    // Remove vbpl.vn sidebar navigation and metadata
    const vbplRemovePatterns = [
      /Các văn bản khác/gi,
      /VB liên quan/gi,
      /Thuộc tính\s*văn bản/gi,
      /Lược đồ\s*văn bản/gi,
      /Tải về/gi,
      /In văn bản/gi,
      /Gửi văn bản/gi,
      /Lưu văn bản/gi,
      /Ban hành:\s*\d{2}\/\d{2}\/\d{4}/gi,
      /Hiệu lực:\s*\d{2}\/\d{2}\/\d{4}/gi,
      /Trạng thái:[^\n]+/gi,
      /Loại văn bản:[^\n]+/gi,
      /Số ký hiệu:[^\n]+/gi,
      /Cơ quan ban hành:[^\n]+/gi,
      /Người ký:[^\n]+/gi,
      /Ngày ban hành:[^\n]+/gi,
      /Ngày hiệu lực:[^\n]+/gi,
      /Lĩnh vực:[^\n]+/gi,
      /Đơn vị soạn thảo:[^\n]+/gi,
      // Navigation elements
      /\[Trang chủ\]\([^)]+\)/gi,
      /\[Văn bản pháp luật\]\([^)]+\)/gi,
      /\[Hệ thống\]\([^)]+\)/gi,
      // Empty table cells
      /\|\s*\|\s*\|/g,
    ];
    
    for (const pattern of vbplRemovePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Try to extract main legal content section
    const legalStartMatch = cleaned.match(/(CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|QUYẾT ĐỊNH:|THÔNG TƯ:|NGHỊ ĐỊNH:|LUẬT:)/i);
    if (legalStartMatch && legalStartMatch.index !== undefined) {
      // Keep content from legal document start
      const beforeContent = cleaned.substring(0, legalStartMatch.index);
      // Only remove if before content is less than 30% of total
      if (beforeContent.length < cleaned.length * 0.3) {
        cleaned = cleaned.substring(legalStartMatch.index);
      }
    }
    
    // Remove trailing sections (related documents, etc.)
    const trailingPatterns = [
      /VĂN BẢN GỐC[\s\S]*$/i,
      /LIÊN KẾT VĂN BẢN[\s\S]*$/i,
      /VĂN BẢN LIÊN QUAN[\s\S]*$/i,
    ];
    
    for (const pattern of trailingPatterns) {
      const match = cleaned.match(pattern);
      if (match && match.index !== undefined && match.index > cleaned.length * 0.7) {
        cleaned = cleaned.substring(0, match.index);
      }
    }
  }
  
  // Site-specific cleaning for thuvienphapluat.vn (TVPL)
  if (sourceUrl.includes('thuvienphapluat.vn')) {
    const tvplRemovePatterns = [
      /Bạn Chưa Đăng Nhập Thành Viên!/gi,
      /THƯ VIỆN PHÁP LUẬT/gi,
      /Mọi hành vi sao chép.*?vi phạm pháp luật/gi,
      /\[Hỏi đáp pháp luật\]/gi,
      /Download\s*(PDF|Word)/gi,
      /Chia sẻ:/gi,
      /Văn bản liên quan/gi,
      /Đang cập nhật/gi,
      /Văn bản đang xem/gi,
      /Báo cáo sai sót/gi,
      /Lưu vào danh sách/gi,
      /In văn bản/gi,
      /So sánh văn bản/gi,
      /Tiện ích khác/gi,
      /Bản tiếng Anh/gi,
      /Văn bản gốc/gi,
      /Tình trạng hiệu lực[^:]*:[^\n]+/gi,
      /Đăng nhập để xem/gi,
      /Xem văn bản đầy đủ/gi,
      /Click vào đây/gi,
      /hotline:[^\n]+/gi,
      /\(028\)[^\n]+/gi,
      /Copyright.*thuvienphapluat\.vn/gi,
      /©.*thuvienphapluat/gi,
      /Xem thêm/gi,
      /Đọc thêm/gi,
    ];
    
    for (const pattern of tvplRemovePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Try to extract main legal content section
    const legalStartMatch = cleaned.match(/(CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|QUYẾT ĐỊNH:|THÔNG TƯ:|NGHỊ ĐỊNH:|LUẬT:)/i);
    if (legalStartMatch && legalStartMatch.index !== undefined) {
      const beforeContent = cleaned.substring(0, legalStartMatch.index);
      if (beforeContent.length < cleaned.length * 0.3) {
        cleaned = cleaned.substring(legalStartMatch.index);
      }
    }
  }
  
  // Try to extract main content between document markers - but be careful not to lose content
  const mainContentMarkers = [
    // Vietnamese legal document markers
    { pattern: /(?:CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM[\s\S]*?)((?:Điều\s+\d+|Chương\s+[IVX]+)[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i, minLength: 2000 },
    // Decree/Decision content
    { pattern: /(QUYẾT ĐỊNH:[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i, minLength: 1000 },
    // Circular content  
    { pattern: /(THÔNG TƯ:[\s\S]*?)(?:Nơi nhận:|\.\/\.|$)/i, minLength: 1000 },
  ];
  
  for (const { pattern, minLength } of mainContentMarkers) {
    const match = cleaned.match(pattern);
    if (match && match[0] && match[0].length > minLength) {
      // Only use extracted content if it's substantial
      const extracted = match[0];
      // Guard rail: don't reduce content by more than 50%
      if (extracted.length >= cleaned.length * 0.5) {
        cleaned = extracted;
        break;
      }
    }
  }
  
  // Clean up excessive newlines and whitespace
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s*[-*]\s*$/gm, '') // Empty list items
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // Guard rail: if cleaning reduced content by more than 60%, revert to original with basic cleanup
  if (cleaned.length < originalLength * 0.4) {
    console.log(`[parse-document] Warning: cleaning reduced content from ${originalLength} to ${cleaned.length} chars, reverting`);
    cleaned = text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .replace(/\[\s*\]\([^)]+\)/g, '') // Remove empty links
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
  }
  
  return cleaned;
}

/**
 * Try to find direct PDF link from Vietnamese gov sites
 * Priority check for datafiles.chinhphu.vn (most reliable source)
 * Enhanced: Uses multiple formats and waits for JS rendering
 * v3: Improved VBPL.VN support with FileData URL construction
 */
async function findDirectPdfLink(url: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  
  try {
    console.log(`[parse-document] Searching for PDF link on: ${url}`);
    
    // === PRIORITY 0: VBPL.VN specific handling ===
    if (url.includes('vbpl.vn')) {
      const itemId = extractVbplItemId(url);
      const domain = extractVbplDomain(url);
      
      // Try PDF page first (vbpq-van-ban-goc.aspx)
      if (url.includes('vbpq-toanvan.aspx')) {
        const pdfPageUrl = url.replace('vbpq-toanvan.aspx', 'vbpq-van-ban-goc.aspx');
        console.log(`[parse-document] VBPL: Converting to PDF page: ${pdfPageUrl}`);
        
        const pdfLink = await scrapeVbplForPdf(pdfPageUrl);
        if (pdfLink) {
          return pdfLink;
        }
      }
      
      // Also check current page
      const pdfLink = await scrapeVbplForPdf(url);
      if (pdfLink) {
        return pdfLink;
      }
      
      // Try constructing URLs based on common patterns
      if (itemId) {
        console.log(`[parse-document] VBPL: Trying constructed download URLs for ItemID ${itemId}`);
        
        // Try common VBPL filename patterns by probing
        const possibleUrls = [
          buildVbplDownloadUrl(itemId, `${itemId}m.signed.pdf`, domain),
          buildVbplDownloadUrl(itemId, `${itemId}.signed.pdf`, domain),
          buildVbplDownloadUrl(itemId, `${itemId}m.pdf`, domain),
          buildVbplDownloadUrl(itemId, `${itemId}.pdf`, domain),
        ];
        
        // Probe each URL to find a working one
        for (const probeUrl of possibleUrls) {
          try {
            const headResponse = await fetch(probeUrl, {
              method: 'HEAD',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            });
            
            if (headResponse.ok) {
              const contentType = headResponse.headers.get('content-type') || '';
              if (contentType.includes('pdf') || contentType.includes('octet-stream') || contentType.includes('msword')) {
                console.log(`[parse-document] VBPL: Found working download URL: ${probeUrl}`);
                return probeUrl;
              }
            }
          } catch (probeError) {
            // Continue to next URL
          }
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
        formats: ['rawHtml', 'html', 'links'], // Include rawHtml for JS-rendered content
        onlyMainContent: false, // CRITICAL: Include all page content to find PDF links
        waitFor: 3000, // Wait for JS rendering
        timeout: 25000,
      }),
    });
    
    if (!response.ok) {
      console.log(`[parse-document] findDirectPdfLink scrape failed: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const links: string[] = data.data?.links || [];
    const html: string = data.data?.html || '';
    const rawHtml: string = data.data?.rawHtml || '';
    const allHtml = html + ' ' + rawHtml;
    
    console.log(`[parse-document] Found ${links.length} links, searching for PDF...`);
    
    // Priority 1: datafiles.chinhphu.vn PDF (official document server)
    for (const link of links) {
      if (link.includes('datafiles.chinhphu.vn') && link.toLowerCase().includes('.pdf')) {
        console.log(`[parse-document] Found official PDF from links: ${link}`);
        return link;
      }
    }
    
    // Priority 2: Check HTML/rawHtml for embedded datafiles link (covers JS-rendered links)
    const datafilesPatterns = [
      /href=["'](https?:\/\/datafiles\.chinhphu\.vn[^"']*\.pdf)["']/gi,
      /src=["'](https?:\/\/datafiles\.chinhphu\.vn[^"']*\.pdf)["']/gi,
      /(https?:\/\/datafiles\.chinhphu\.vn[^"'\s<>]*\.pdf)/gi,
    ];
    
    for (const pattern of datafilesPatterns) {
      const matches = allHtml.matchAll(pattern);
      for (const match of matches) {
        const pdfUrl = match[1] || match[0];
        if (pdfUrl && pdfUrl.toLowerCase().includes('.pdf')) {
          console.log(`[parse-document] Found embedded official PDF: ${pdfUrl}`);
          return pdfUrl;
        }
      }
    }
    
    // Priority 3: Other PDF link patterns from Vietnamese gov sites
    const pdfPatterns = [
      /vbpq[^"'\s]*\.pdf/i,
      /\/file\/[^"'\s]*\.pdf/i,
      /download[^"'\s]*\.pdf/i,
      /\.signed\.pdf/i,
      /vbpqpl[^"'\s]*\.pdf/i,
      /tailieu[^"'\s]*\.pdf/i,
    ];
    
    for (const link of links) {
      for (const pattern of pdfPatterns) {
        if (pattern.test(link)) {
          console.log(`[parse-document] Found PDF link via pattern: ${link}`);
          return link;
        }
      }
    }
    
    // Priority 4: Generic PDF extension check in links
    for (const link of links) {
      if (link.toLowerCase().endsWith('.pdf') || link.toLowerCase().includes('.pdf?')) {
        console.log(`[parse-document] Found generic PDF link: ${link}`);
        return link;
      }
    }
    
    // Priority 5: Search in raw HTML for any PDF URL
    const genericPdfMatch = allHtml.match(/(https?:\/\/[^"'\s<>]+\.pdf)(?=["'\s<>]|$)/i);
    if (genericPdfMatch) {
      console.log(`[parse-document] Found PDF in HTML: ${genericPdfMatch[1]}`);
      return genericPdfMatch[1];
    }
    
    console.log('[parse-document] No PDF link found');
    return null;
  } catch (error) {
    console.log('[parse-document] findDirectPdfLink error:', error);
    return null;
  }
}

/**
 * Build VBPL download URL from ItemID and filename
 * VBPL URL structure: /FileData/{DOMAIN}/Lists/vbpq/Attachments/{ItemID}/{filename}
 */
function buildVbplDownloadUrl(itemId: string, filename: string, domain: string = 'TW'): string {
  const encodedFilename = encodeURIComponent(filename.trim());
  return `https://vbpl.vn/FileData/${domain}/Lists/vbpq/Attachments/${itemId}/${encodedFilename}`;
}

/**
 * Extract VBPL domain from URL (TW, botaichinh, nganhangnhanuoc, etc.)
 */
function extractVbplDomain(url: string): string {
  const domainMatch = url.match(/vbpl\.vn\/([^\/]+)/i);
  if (domainMatch && !['Pages', 'TW'].includes(domainMatch[1])) {
    return domainMatch[1];
  }
  return 'TW';
}

/**
 * Extract ItemID from VBPL URL
 */
function extractVbplItemId(url: string): string | null {
  const match = url.match(/ItemID=(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Generate possible download URLs for VBPL documents
 * Based on observed patterns from VBPL.vn
 */
function generateVbplDownloadUrls(itemId: string, domain: string, documentTitle: string): string[] {
  const urls: string[] = [];
  
  // Normalize title for filename construction
  const normalizedTitle = documentTitle
    .replace(/\s+/g, ' ')
    .replace(/[\/\\:*?"<>|]/g, '')
    .trim();
  
  // Common VBPL filename patterns
  const filenamePatterns = [
    `VanBanGoc_${normalizedTitle}.signed.pdf`,
    `VanBanGoc_${normalizedTitle}.pdf`,
    `${normalizedTitle}.signed.pdf`,
    `${normalizedTitle}.pdf`,
    `${itemId}.signed.pdf`,
    `${itemId}.pdf`,
    `VanBanGoc_${itemId}.signed.pdf`,
    `VanBanGoc_${itemId}.pdf`,
  ];
  
  // Try both specific domain and TW
  const domains = domain === 'TW' ? ['TW'] : [domain, 'TW'];
  
  for (const d of domains) {
    for (const filename of filenamePatterns) {
      urls.push(buildVbplDownloadUrl(itemId, filename, d));
    }
  }
  
  return urls;
}

/**
 * Scrape VBPL.VN page to find PDF/DOC download link
 * Enhanced v3: Better pattern matching for FileData URLs and filename extraction
 */
async function scrapeVbplForPdf(pageUrl: string): Promise<string | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;
  
  try {
    console.log(`[parse-document] VBPL: Scraping for PDF: ${pageUrl}`);
    
    const itemId = extractVbplItemId(pageUrl);
    const domain = extractVbplDomain(pageUrl);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: pageUrl,
        formats: ['links', 'rawHtml', 'markdown'],
        onlyMainContent: false,
        waitFor: 5000, // Wait longer for JS rendering (increased from 3s)
        timeout: 30000,
      }),
    });
    
    if (!response.ok) {
      console.log(`[parse-document] VBPL: Scrape failed: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const links: string[] = data.data?.links || [];
    const html: string = data.data?.rawHtml || '';
    const markdown: string = data.data?.markdown || '';
    const allContent = html + ' ' + markdown;
    
    // === PRIORITY 1: Direct FileData URLs (most reliable) ===
    const fileDataPatterns = [
      /https?:\/\/vbpl\.vn\/FileData\/[^"'\s<>]+\.(?:pdf|docx?)/gi,
      /href=["']([^"']*FileData[^"']*\.(?:pdf|docx?))["']/gi,
    ];
    
    for (const pattern of fileDataPatterns) {
      const matches = allContent.matchAll(pattern);
      for (const match of matches) {
        const url = match[1] || match[0];
        if (url && url.includes('FileData')) {
          let cleanUrl = url.startsWith('http') ? url : `https://vbpl.vn${url}`;
          console.log(`[parse-document] VBPL: Found FileData URL: ${cleanUrl}`);
          return cleanUrl;
        }
      }
    }
    
    // === PRIORITY 2: Check links array for PDF/DOC ===
    for (const link of links) {
      if (link.match(/\.(pdf|docx?)$/i) || link.includes('FileData')) {
        console.log(`[parse-document] VBPL: Found document in links: ${link}`);
        return link;
      }
    }
    
    // === PRIORITY 3: Extract filename from divShowDialogDownload or attachment area ===
    const filenamePatterns = [
      // Match filename text near download/attachment elements
      /id="VanBanGoc[^"]*"[^>]*>[^<]*<[^>]*>([^<]+\.(?:pdf|docx?))/i,
      /VanBanGoc[_\s]?([^"<>\s]+\.(?:pdf|docx?))/i,
      /sourcedoc=[^"]*Attachments\/\d+\/([^"&]+\.(?:pdf|docx?))/i,
      /Attachments\/\d+\/([^"'\s<>&]+\.(?:pdf|docx?))/i,
      // Signed PDF patterns
      /(\d+[a-z]*m?\.signed\.pdf)/i,
      /([A-Za-z0-9_-]+\.signed\.pdf)/i,
      // Generic PDF filename in content
      /([A-Za-zÀ-ỹ0-9_\-\s]+\.(?:pdf|docx?))/i,
    ];
    
    for (const pattern of filenamePatterns) {
      const match = allContent.match(pattern);
      if (match && match[1] && itemId) {
        const filename = decodeURIComponent(match[1].trim());
        // Skip if filename is too generic or too short
        if (filename.length > 5 && !filename.match(/^\.pdf$/i)) {
          const downloadUrl = buildVbplDownloadUrl(itemId, filename, domain);
          console.log(`[parse-document] VBPL: Constructed URL from filename "${filename}": ${downloadUrl}`);
          return downloadUrl;
        }
      }
    }
    
    // === PRIORITY 4: WopiFrame.aspx patterns (extract from preview URLs) ===
    // Convert WopiFrame preview URLs to direct FileData download URLs
    const wopiPatterns = [
      /WopiFrame\.aspx\?sourcedoc=([^"'&\s]+)/gi,
      /sourcedoc=([^"'&\s]+)/gi,
    ];
    
    for (const pattern of wopiPatterns) {
      const matches = allContent.matchAll(pattern);
      for (const match of matches) {
        if (match && match[1]) {
          // The sourcedoc contains the file path
          const sourcedoc = decodeURIComponent(match[1]);
          console.log(`[parse-document] VBPL: Found sourcedoc: ${sourcedoc}`);
          
          // Extract domain and path from sourcedoc
          // Pattern: /TW/Lists/vbpq/Attachments/178299/filename.docx
          const filePathMatch = sourcedoc.match(/\/([^\/]+)\/Lists\/vbpq\/Attachments\/(\d+)\/([^"'&\s]+)/i);
          if (filePathMatch) {
            const [, extractedDomain, extractedItemId, filename] = filePathMatch;
            // Build direct FileData URL
            const downloadUrl = `https://vbpl.vn/FileData/${extractedDomain}/Lists/vbpq/Attachments/${extractedItemId}/${encodeURIComponent(filename)}`;
            console.log(`[parse-document] VBPL: Converted WopiFrame to FileData URL: ${downloadUrl}`);
            return downloadUrl;
          }
          
          // Alternative pattern: just Attachments/{id}/{filename}
          const simplePathMatch = sourcedoc.match(/Attachments\/(\d+)\/([^"'&\s]+)/);
          if (simplePathMatch) {
            const [, extractedItemId, filename] = simplePathMatch;
            const downloadUrl = buildVbplDownloadUrl(extractedItemId, filename, domain);
            console.log(`[parse-document] VBPL: Extracted from WopiFrame: ${downloadUrl}`);
            return downloadUrl;
          }
        }
      }
    }
    
    // === PRIORITY 5: Generic PDF/DOC patterns in HTML ===
    const docPatterns = [
      /href=["']([^"']*\.pdf)["']/i,
      /href=["']([^"']*\.docx?)["']/i,
      /href=["']([^"']*Download[^"']*ItemID=\d+[^"']*)["']/i,
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
        console.log(`[parse-document] VBPL: Found document via pattern: ${docUrl}`);
        return docUrl;
      }
    }
    
    // === PRIORITY 6: Look for any PDF/DOC URL in content ===
    const genericDocMatch = allContent.match(/(https?:\/\/[^"'\s<>]+\.(?:pdf|docx?))(?=["'\s<>]|$)/i);
    if (genericDocMatch) {
      console.log(`[parse-document] VBPL: Found document via generic pattern: ${genericDocMatch[1]}`);
      return genericDocMatch[1];
    }
    
    console.log('[parse-document] VBPL: No document link found via scraping');
    return null;
  } catch (error) {
    console.log('[parse-document] VBPL: scrapeVbplForPdf error:', error);
    return null;
  }
}

/**
 * Try to extract full content from VBPL "toan van" (full text) page
 * This is a fallback when PDF is not available
 */
async function extractVbplToanVan(url: string): Promise<{ text: string; success: boolean }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return { text: '', success: false };
  
  try {
    // Convert to toan-van page if not already
    let toanVanUrl = url;
    if (url.includes('vbpq-van-ban-goc.aspx')) {
      toanVanUrl = url.replace('vbpq-van-ban-goc.aspx', 'vbpq-toanvan.aspx');
    } else if (!url.includes('vbpq-toanvan.aspx')) {
      const itemId = extractVbplItemId(url);
      if (itemId) {
        toanVanUrl = `https://vbpl.vn/TW/Pages/vbpq-toanvan.aspx?ItemID=${itemId}`;
      }
    }
    
    console.log(`[parse-document] VBPL: Extracting toan-van from: ${toanVanUrl}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: toanVanUrl,
        formats: ['markdown', 'html', 'rawHtml'],
        onlyMainContent: false, // Get full page to capture all content
        waitFor: 5000, // Wait for JS rendering
        timeout: 60000,
      }),
    });
    
    if (!response.ok) {
      console.log(`[parse-document] VBPL: Toan-van scrape failed: HTTP ${response.status}`);
      return { text: '', success: false };
    }
    
    const data = await response.json();
    const markdown: string = data.data?.markdown || '';
    const html: string = data.data?.rawHtml || data.data?.html || '';
    
    // Try to extract content from specific VBPL content divs
    let extractedText = '';
    
    // Look for fulltext div content
    const fullTextMatch = html.match(/<div[^>]*class="[^"]*fulltext[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (fullTextMatch) {
      extractedText = fullTextMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Look for content div
    if (!extractedText || extractedText.length < 1000) {
      const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (contentMatch && contentMatch[1].length > extractedText.length) {
        extractedText = contentMatch[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    // Fallback to markdown if HTML extraction didn't work well
    if (!extractedText || extractedText.length < 1000) {
      extractedText = cleanScrapedContent(markdown, toanVanUrl);
    }
    
    // Validate content quality
    const legalScore = detectLegalContent(extractedText);
    const sidebarPenalty = detectSidebarContent(extractedText);
    
    console.log(`[parse-document] VBPL: Toan-van extracted ${extractedText.length} chars, legal=${legalScore}, sidebar=${sidebarPenalty}`);
    
    if (extractedText.length >= 1000 && legalScore >= 5 && sidebarPenalty < 20) {
      return { text: extractedText, success: true };
    }
    
    return { text: extractedText, success: extractedText.length >= 500 };
  } catch (error) {
    console.log('[parse-document] VBPL: extractVbplToanVan error:', error);
    return { text: '', success: false };
  }
}

/**
 * Extract full text content from ThưViệnPhápLuật.vn (TVPL)
 * TVPL provides clean HTML full text - easier to parse than PDF sources
 */
async function extractTvplContent(url: string): Promise<{ text: string; success: boolean }> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  
  try {
    console.log(`[parse-document] TVPL: Extracting content from: ${url}`);
    
    // TVPL has good HTML structure - try direct fetch first (faster)
    const directHtml = await fetchHtmlDirectly(url);
    
    if (directHtml && directHtml.length > 1000) {
      let extractedText = '';
      
      // TVPL-specific content selectors (priority order)
      const tvplContentPatterns = [
        // Main content div - most reliable
        /<div[^>]*class="[^"]*content1[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*(?:footer|sidebar|menu)/gi,
        /<div[^>]*id="[^"]*noidung[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class="[^"]*noidungvb[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class="[^"]*div-text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        /<div[^>]*class="[^"]*fulltext[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
        // Article content
        /<article[^>]*>([\s\S]*?)<\/article>/gi,
      ];
      
      for (const pattern of tvplContentPatterns) {
        const matches = directHtml.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > extractedText.length) {
            // Clean HTML tags and extract text
            extractedText = match[1]
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, '\n')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#\d+;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        }
      }
      
      // Clean TVPL-specific artifacts
      extractedText = cleanTvplContent(extractedText);
      
      const legalScore = detectLegalContent(extractedText);
      const sidebarPenalty = detectSidebarContent(extractedText);
      
      console.log(`[parse-document] TVPL: Direct extraction got ${extractedText.length} chars, legal=${legalScore}, sidebar=${sidebarPenalty}`);
      
      if (extractedText.length >= 1000 && legalScore >= 5 && sidebarPenalty < 15) {
        return { text: extractedText, success: true };
      }
    }
    
    // Fallback: Use Firecrawl for JS-rendered content
    if (apiKey) {
      console.log('[parse-document] TVPL: Trying Firecrawl scrape');
      
      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 3000,
          timeout: 30000,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        let markdown = data.data?.markdown || '';
        
        // Clean TVPL artifacts from markdown
        markdown = cleanTvplContent(markdown);
        markdown = cleanScrapedContent(markdown, url);
        
        const legalScore = detectLegalContent(markdown);
        const sidebarPenalty = detectSidebarContent(markdown);
        
        console.log(`[parse-document] TVPL: Firecrawl got ${markdown.length} chars, legal=${legalScore}`);
        
        if (markdown.length >= 800 && legalScore >= 5) {
          return { text: markdown, success: true };
        }
      }
    }
    
    return { text: '', success: false };
  } catch (error) {
    console.log('[parse-document] TVPL: extractTvplContent error:', error);
    return { text: '', success: false };
  }
}

/**
 * Clean TVPL-specific artifacts from extracted text
 */
function cleanTvplContent(text: string): string {
  // TVPL-specific patterns to remove
  const tvplRemovePatterns = [
    /Bạn Chưa Đăng Nhập Thành Viên!/gi,
    /THƯ VIỆN PHÁP LUẬT/gi,
    /Mọi hành vi sao chép.*?vi phạm pháp luật/gi,
    /\[Hỏi đáp pháp luật\]/gi,
    /Download\s*(PDF|Word)/gi,
    /Chia sẻ:/gi,
    /Văn bản liên quan/gi,
    /Đang cập nhật/gi,
    /Văn bản đang xem/gi,
    /Báo cáo sai sót/gi,
    /Lưu vào danh sách/gi,
    /In văn bản/gi,
    /So sánh văn bản/gi,
    /Tiện ích khác/gi,
    /Bản tiếng Anh/gi,
    /Văn bản gốc/gi,
    /Tình trạng hiệu lực[^:]*:[^\n]+/gi,
    /Cập nhật:[^\n]+/gi,
    /Hiệu lực:[^\n]+/gi,
    /Đăng nhập để xem/gi,
    /Xem văn bản đầy đủ/gi,
    /Click vào đây/gi,
    /hotline:[^\n]+/gi,
    /\(028\)[^\n]+/gi,
    /Copyright.*thuvienphapluat\.vn/gi,
    /©.*thuvienphapluat/gi,
  ];
  
  let cleaned = text;
  for (const pattern of tvplRemovePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s*[-*•]\s*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Fetch HTML directly using native fetch (bypass Firecrawl)
 * Used when Firecrawl times out or fails
 */
async function fetchHtmlDirectly(url: string): Promise<string | null> {
  try {
    console.log(`[parse-document] Fetching HTML directly: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      console.log(`[parse-document] Direct fetch got ${html.length} chars`);
      return html;
    }
    
    console.log(`[parse-document] Direct fetch failed: HTTP ${response.status}`);
    return null;
  } catch (error) {
    console.log(`[parse-document] Direct fetch error:`, error);
    return null;
  }
}

/**
 * Extract legal content from HTML using Lovable AI (Gemini 2.5 Flash)
 * Used as fallback when Firecrawl fails or times out
 */
async function extractWithAI(html: string, url: string): Promise<{ text: string; success: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[parse-document] LOVABLE_API_KEY not configured, skipping AI extraction');
    return { text: '', success: false };
  }
  
  try {
    console.log(`[parse-document] AI extraction: sending ${Math.min(html.length, 100000)} chars to Gemini`);
    
    // Truncate HTML if too large (Gemini has context limits)
    const truncatedHtml = html.length > 100000 ? html.substring(0, 100000) : html;
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5", // Best model for accurate legal text extraction
        messages: [
          {
            role: "system",
            content: `Bạn là chuyên gia trích xuất văn bản pháp luật Việt Nam.

NHIỆM VỤ: Trích xuất toàn bộ nội dung văn bản pháp luật từ HTML, giữ nguyên cấu trúc và nội dung đầy đủ.

PHẢI GIỮ LẠI:
- Tiêu đề, số hiệu văn bản (VD: "NGHỊ ĐỊNH 15/2024/NĐ-CP")
- Quốc hiệu: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
- Các Chương, Mục, Điều, Khoản, Điểm - với đầy đủ nội dung
- Ngày ban hành, ngày hiệu lực
- Cơ quan ban hành, người ký
- Căn cứ ban hành
- Nội dung chi tiết của từng Điều

PHẢI LOẠI BỎ:
- Menu điều hướng, sidebar, footer
- Quảng cáo, banner, links điều hướng
- CSS, JavaScript, HTML tags
- Breadcrumb, metadata website
- "Tìm kiếm", "Đăng nhập", "Trang chủ"
- "Văn bản liên quan", "Download", "In"

ĐỊNH DẠNG OUTPUT:
- Text thuần túy, không markdown
- Giữ nguyên xuống dòng tự nhiên
- Các Điều, Khoản phải có dòng trống phân cách`
          },
          {
            role: "user",
            content: `Trích xuất nội dung văn bản pháp luật từ trang ${url}:\n\n${truncatedHtml}`
          }
        ],
        max_tokens: 16000,
        temperature: 0.1, // Low temperature for accurate extraction
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[parse-document] AI extraction failed: HTTP ${response.status}`, errorText.slice(0, 200));
      
      // Handle rate limit or credits exhausted
      if (response.status === 429 || response.status === 402) {
        console.log(`[parse-document] AI rate limit or credits exhausted`);
      }
      
      return { text: '', success: false };
    }
    
    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';
    
    console.log(`[parse-document] AI extraction got ${extractedText.length} chars`);
    
    // Validate extraction quality
    const legalScore = detectLegalContent(extractedText);
    
    if (extractedText.length >= 500 && legalScore >= 5) {
      console.log(`[parse-document] AI extraction success: ${extractedText.length} chars, legal score=${legalScore}`);
      return { text: extractedText, success: true };
    }
    
    console.log(`[parse-document] AI extraction quality too low: ${extractedText.length} chars, legal=${legalScore}`);
    return { text: extractedText, success: extractedText.length >= 300 };
    
  } catch (error) {
    console.log(`[parse-document] AI extraction error:`, error);
    return { text: '', success: false };
  }
}

/**
 * Multi-strategy PDF extraction configuration
 * Each strategy uses different Firecrawl parameters to maximize content extraction
 */
interface ExtractionStrategy {
  name: string;
  formats: string[];
  onlyMainContent: boolean;
  waitFor?: number;
  timeout: number;
}

const PDF_EXTRACTION_STRATEGIES: ExtractionStrategy[] = [
  {
    // Strategy 1: Full document extraction with all formats
    name: 'full_multi_format',
    formats: ['markdown', 'html', 'rawHtml'],
    onlyMainContent: false,
    timeout: 120000, // 2 minutes for large PDFs
  },
  {
    // Strategy 2: Markdown only with longer timeout (may trigger OCR)
    name: 'markdown_extended',
    formats: ['markdown'],
    onlyMainContent: false,
    waitFor: 5000, // Wait for processing
    timeout: 150000, // 2.5 minutes
  },
  {
    // Strategy 3: Raw HTML extraction (sometimes captures more)
    name: 'raw_html_only',
    formats: ['rawHtml'],
    onlyMainContent: false,
    timeout: 90000,
  },
];

/**
 * Quality thresholds for PDF extraction
 */
const MIN_ACCEPTABLE_LENGTH = 500; // Minimum chars to consider successful
const GOOD_EXTRACTION_LENGTH = 5000; // Chars indicating good extraction
const EXCELLENT_EXTRACTION_LENGTH = 15000; // Chars indicating complete extraction

/**
 * Use Firecrawl to extract content from PDF with multi-strategy retry
 * Tries multiple extraction strategies to maximize content capture
 */
async function extractPdfWithFirecrawl(pdfUrl: string): Promise<{ 
  success: boolean; 
  text?: string; 
  error?: string;
  strategy?: string;
  qualityScore?: 'poor' | 'acceptable' | 'good' | 'excellent';
}> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'Firecrawl not configured' };
  }

  console.log(`[parse-document] Starting multi-strategy PDF extraction: ${pdfUrl}`);
  
  let bestResult = { 
    text: '', 
    strategy: '', 
    length: 0 
  };

  for (const strategy of PDF_EXTRACTION_STRATEGIES) {
    try {
      console.log(`[parse-document] Trying strategy: ${strategy.name}`);
      
      const requestBody: Record<string, unknown> = {
        url: pdfUrl,
        formats: strategy.formats,
        onlyMainContent: strategy.onlyMainContent,
        timeout: strategy.timeout,
      };
      
      if (strategy.waitFor) {
        requestBody.waitFor = strategy.waitFor;
      }

      const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log(`[parse-document] Strategy ${strategy.name} failed: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      const extractedText = extractBestText(data);
      
      console.log(`[parse-document] Strategy ${strategy.name} extracted ${extractedText.length} chars`);

      // Keep track of best result
      if (extractedText.length > bestResult.length) {
        bestResult = {
          text: extractedText,
          strategy: strategy.name,
          length: extractedText.length,
        };
      }

      // If we got excellent content, stop trying more strategies
      if (extractedText.length >= EXCELLENT_EXTRACTION_LENGTH) {
        console.log(`[parse-document] Excellent extraction achieved with ${strategy.name}, stopping`);
        break;
      }

      // If we got good content and it's not the last strategy, continue trying
      // but don't wait too long
      if (extractedText.length >= GOOD_EXTRACTION_LENGTH) {
        console.log(`[parse-document] Good extraction with ${strategy.name}, trying one more strategy`);
        continue;
      }

    } catch (error) {
      console.log(`[parse-document] Strategy ${strategy.name} error:`, error);
      continue;
    }
  }

  if (bestResult.length < MIN_ACCEPTABLE_LENGTH) {
    console.log(`[parse-document] All strategies yielded insufficient content: ${bestResult.length} chars`);
    return { 
      success: false, 
      error: `Extraction incomplete: only ${bestResult.length} chars extracted. PDF may be scanned/image-based requiring OCR service.`,
      text: bestResult.text || undefined,
      strategy: bestResult.strategy || undefined,
      qualityScore: 'poor',
    };
  }

  // Determine quality score
  let qualityScore: 'poor' | 'acceptable' | 'good' | 'excellent' = 'acceptable';
  if (bestResult.length >= EXCELLENT_EXTRACTION_LENGTH) {
    qualityScore = 'excellent';
  } else if (bestResult.length >= GOOD_EXTRACTION_LENGTH) {
    qualityScore = 'good';
  }

  console.log(`[parse-document] Best extraction: ${bestResult.length} chars via ${bestResult.strategy} (${qualityScore})`);
  
  return { 
    success: true, 
    text: bestResult.text,
    strategy: bestResult.strategy,
    qualityScore,
  };
}

/**
 * Extract best text content from Firecrawl response
 * Compares markdown, html, and rawHtml to find the most complete version
 */
function extractBestText(data: Record<string, unknown>): string {
  const dataObj = (data.data || data) as Record<string, unknown>;
  
  const markdown: string = (dataObj.markdown || '').toString().trim();
  const html: string = (dataObj.html || '').toString();
  const rawHtml: string = (dataObj.rawHtml || '').toString();

  const stripHtml = (input: string): string =>
    input
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

  const candidates = [
    { kind: 'markdown', text: markdown },
    { kind: 'html', text: stripHtml(html) },
    { kind: 'rawHtml', text: stripHtml(rawHtml) },
  ].filter(c => c.text.length > 0);

  if (candidates.length === 0) {
    return '';
  }

  // Sort by length and return the longest
  candidates.sort((a, b) => b.text.length - a.text.length);
  
  const best = candidates[0];
  console.log(`[parse-document] Best format: ${best.kind} with ${best.text.length} chars`);
  
  return best.text;
}

/**
 * HTML extraction strategies for multi-strategy approach
 */
interface HtmlExtractionStrategy {
  name: string;
  onlyMainContent: boolean;
  formats: string[];
  waitFor?: number;
  timeout: number;
}

const HTML_EXTRACTION_STRATEGIES: HtmlExtractionStrategy[] = [
  {
    name: 'main_content_markdown',
    onlyMainContent: true,
    formats: ['markdown'],
    timeout: 30000,
  },
  {
    name: 'full_page_markdown',
    onlyMainContent: false,
    formats: ['markdown'],
    waitFor: 2000,
    timeout: 40000,
  },
  {
    name: 'full_page_html',
    onlyMainContent: false,
    formats: ['html', 'rawHtml'],
    waitFor: 3000,
    timeout: 45000,
  },
];

/**
 * Try to use Firecrawl for better extraction if available
 * Uses multi-strategy approach to find the best content
 */
async function tryFirecrawlScrape(url: string): Promise<{ 
  success: boolean; 
  text?: string; 
  pdfUrl?: string;
  debug?: {
    source: 'pdf' | 'html';
    strategy?: string;
    textLength: number;
    legalScore: number;
    sidebarPenalty: number;
  };
}> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    return { success: false };
  }
  
  try {
    // First, try to find direct PDF link
    const pdfUrl = await findDirectPdfLink(url);
    if (pdfUrl) {
      console.log(`[parse-document] Found PDF link, attempting extraction: ${pdfUrl}`);
      // Try to extract PDF content using Firecrawl
      const pdfResult = await extractPdfWithFirecrawl(pdfUrl);
      if (pdfResult.success && pdfResult.text) {
        return { 
          success: true, 
          text: pdfResult.text,
          debug: {
            source: 'pdf',
            strategy: pdfResult.strategy,
            textLength: pdfResult.text.length,
            legalScore: detectLegalContent(pdfResult.text),
            sidebarPenalty: detectSidebarContent(pdfResult.text),
          },
        };
      }
      // If Firecrawl fails, return pdfUrl for local parsing attempt
      return { success: false, pdfUrl };
    }
    
    console.log('[parse-document] No PDF link found, trying HTML multi-strategy extraction');
    
    // Multi-strategy HTML extraction
    let bestResult = {
      text: '',
      strategy: '',
      score: -Infinity,
    };
    
    for (const strategy of HTML_EXTRACTION_STRATEGIES) {
      try {
        console.log(`[parse-document] HTML strategy: ${strategy.name}`);
        
        const requestBody: Record<string, unknown> = {
          url,
          formats: strategy.formats,
          onlyMainContent: strategy.onlyMainContent,
          timeout: strategy.timeout,
        };
        
        if (strategy.waitFor) {
          requestBody.waitFor = strategy.waitFor;
        }
        
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          console.log(`[parse-document] HTML strategy ${strategy.name} failed: HTTP ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        let extractedText = '';
        
        // Get text from available formats
        if (data.data?.markdown) {
          extractedText = data.data.markdown;
        } else if (data.data?.html) {
          extractedText = extractBestText(data);
        } else if (data.data?.rawHtml) {
          extractedText = extractBestText(data);
        }
        
        if (!extractedText || extractedText.length < 100) {
          continue;
        }
        
        // Clean and score the content
        const cleanedText = cleanScrapedContent(extractedText, url);
        const legalScore = detectLegalContent(cleanedText);
        const sidebarPenalty = detectSidebarContent(cleanedText);
        
        // Combined score: length + legal markers - sidebar penalty
        const score = cleanedText.length + (legalScore * 100) - (sidebarPenalty * 200);
        
        console.log(`[parse-document] HTML strategy ${strategy.name}: ${cleanedText.length} chars, legal=${legalScore}, sidebar=${sidebarPenalty}, score=${score}`);
        
        // Reject if it looks like sidebar content (high penalty, low legal markers)
        if (sidebarPenalty > 10 && legalScore < 5) {
          console.log(`[parse-document] Rejecting ${strategy.name}: sidebar content detected`);
          continue;
        }
        
        if (score > bestResult.score) {
          bestResult = {
            text: cleanedText,
            strategy: strategy.name,
            score,
          };
        }
        
        // If we got excellent content, stop trying
        if (cleanedText.length >= GOOD_EXTRACTION_LENGTH && legalScore >= 20) {
          console.log(`[parse-document] Excellent HTML extraction with ${strategy.name}, stopping`);
          break;
        }
        
      } catch (error) {
        console.log(`[parse-document] HTML strategy ${strategy.name} error:`, error);
        continue;
      }
    }
    
    if (bestResult.text.length > 300) {
      const legalScore = detectLegalContent(bestResult.text);
      const sidebarPenalty = detectSidebarContent(bestResult.text);
      
      return {
        success: true,
        text: bestResult.text,
        debug: {
          source: 'html',
          strategy: bestResult.strategy,
          textLength: bestResult.text.length,
          legalScore,
          sidebarPenalty,
        },
      };
    }
    
    // === TVPL PRIORITY: ThưViệnPhápLuật.vn has easy HTML extraction ===
    if (url.includes('thuvienphapluat.vn')) {
      console.log('[parse-document] TVPL: Detected ThưViệnPhápLuật.vn, using direct extraction');
      const tvplResult = await extractTvplContent(url);
      if (tvplResult.success && tvplResult.text.length > 500) {
        return {
          success: true,
          text: tvplResult.text,
          debug: {
            source: 'html',
            strategy: 'tvpl_direct',
            textLength: tvplResult.text.length,
            legalScore: detectLegalContent(tvplResult.text),
            sidebarPenalty: detectSidebarContent(tvplResult.text),
          },
        };
      }
    }
    
    // === VBPL FALLBACK: Try toan-van extraction if other methods failed ===
    if (url.includes('vbpl.vn')) {
      console.log('[parse-document] VBPL: Trying toan-van fallback extraction');
      const toanVanResult = await extractVbplToanVan(url);
      if (toanVanResult.success && toanVanResult.text.length > 500) {
        return {
          success: true,
          text: toanVanResult.text,
          debug: {
            source: 'html',
            strategy: 'vbpl_toanvan_fallback',
            textLength: toanVanResult.text.length,
            legalScore: detectLegalContent(toanVanResult.text),
            sidebarPenalty: detectSidebarContent(toanVanResult.text),
          },
        };
      }
    }
    
    // === AI FALLBACK: Use Gemini to extract from raw HTML ===
    console.log('[parse-document] Firecrawl strategies failed, trying AI extraction fallback');
    const rawHtml = await fetchHtmlDirectly(url);
    if (rawHtml && rawHtml.length > 1000) {
      const aiResult = await extractWithAI(rawHtml, url);
      if (aiResult.success && aiResult.text.length > 500) {
        const legalScore = detectLegalContent(aiResult.text);
        const sidebarPenalty = detectSidebarContent(aiResult.text);
        
        console.log(`[parse-document] AI extraction succeeded: ${aiResult.text.length} chars`);
        return {
          success: true,
          text: aiResult.text,
          debug: {
            source: 'html',
            strategy: 'ai_gemini_extraction',
            textLength: aiResult.text.length,
            legalScore,
            sidebarPenalty,
          },
        };
      }
    }
    
    return { success: false };
  } catch (error) {
    console.log('[parse-document] tryFirecrawlScrape error:', error);
    
    // === AI FALLBACK on error: Try native fetch + AI extraction ===
    console.log('[parse-document] Attempting AI fallback after Firecrawl error');
    try {
      const rawHtml = await fetchHtmlDirectly(url);
      if (rawHtml && rawHtml.length > 1000) {
        const aiResult = await extractWithAI(rawHtml, url);
        if (aiResult.success && aiResult.text.length > 500) {
          return {
            success: true,
            text: aiResult.text,
            debug: {
              source: 'html',
              strategy: 'ai_gemini_fallback_on_error',
              textLength: aiResult.text.length,
              legalScore: detectLegalContent(aiResult.text),
              sidebarPenalty: detectSidebarContent(aiResult.text),
            },
          };
        }
      }
    } catch (fallbackError) {
      console.log('[parse-document] AI fallback also failed:', fallbackError);
    }
    
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
    // IMPORTANT: WopiFrame.aspx URLs are NOT direct downloads - they are preview wrappers
    const isWopiFrame = url.includes('WopiFrame.aspx');
    const isDirectDownload = !isWopiFrame && /\.(pdf|docx?)(\?.*)?$/i.test(url);
    
    // Handle WopiFrame URLs by extracting the actual file path
    if (isWopiFrame) {
      console.log('[parse-document] Detected WopiFrame preview URL, extracting real file path...');
      const sourcedocMatch = url.match(/sourcedoc=([^&]+)/i);
      if (sourcedocMatch) {
        // IMPORTANT: sourcedoc is URL-encoded. Do NOT decode before extracting, otherwise spaces break regex matching.
        const sourcedocEncoded = sourcedocMatch[1];
        const filePathMatch = sourcedocEncoded.match(/\/?([^/]+)\/Lists\/vbpq\/Attachments\/(\d+)\/([^&]+)/i);
        if (filePathMatch) {
          const [, extractedDomain, itemId, filenameEncoded] = filePathMatch;
          const filename = encodeURIComponent(decodeURIComponent(filenameEncoded));
          targetUrl = `https://vbpl.vn/FileData/${extractedDomain}/Lists/vbpq/Attachments/${itemId}/${filename}`;
          console.log(`[parse-document] Converted WopiFrame to FileData: ${targetUrl}`);
        }
      }
    }
    
    if (!isDirectDownload && !isWopiFrame) {
      // Try Firecrawl for HTML pages - may find PDF link or extract content
      console.log('[parse-document] Checking for PDF link on page...');
      const firecrawlResult = await tryFirecrawlScrape(url);
      
      if (firecrawlResult.pdfUrl) {
        // Found a PDF link - use that instead
        // Check if it's a WopiFrame URL and convert it
        let pdfUrl = firecrawlResult.pdfUrl;
        if (pdfUrl.includes('WopiFrame.aspx')) {
          const sourcedocMatch = pdfUrl.match(/sourcedoc=([^&]+)/i);
          if (sourcedocMatch) {
            const sourcedocEncoded = sourcedocMatch[1];
            const filePathMatch = sourcedocEncoded.match(/\/?([^/]+)\/Lists\/vbpq\/Attachments\/(\d+)\/([^&]+)/i);
            if (filePathMatch) {
              const [, extractedDomain, itemId, filenameEncoded] = filePathMatch;
              const filename = encodeURIComponent(decodeURIComponent(filenameEncoded));
              pdfUrl = `https://vbpl.vn/FileData/${extractedDomain}/Lists/vbpq/Attachments/${itemId}/${filename}`;
              console.log(`[parse-document] Converted WopiFrame to FileData: ${pdfUrl}`);
            }
          }
        }
        console.log(`[parse-document] Found PDF, switching to: ${pdfUrl}`);
        targetUrl = pdfUrl;
      } else if (firecrawlResult.success && firecrawlResult.text) {
        // Successfully extracted clean HTML content
        console.log(`[parse-document] Using cleaned Firecrawl extraction (${firecrawlResult.text.length} chars)`);
        
        const debugInfo: ParseDebugInfo = {
          source: firecrawlResult.debug?.source || 'html',
          strategy: firecrawlResult.debug?.strategy,
          textLength: firecrawlResult.text.length,
          legalScore: firecrawlResult.debug?.legalScore,
          sidebarPenalty: firecrawlResult.debug?.sidebarPenalty,
          qualityScore: firecrawlResult.text.length >= 15000 ? 'excellent' : 
                        firecrawlResult.text.length >= 5000 ? 'good' : 
                        firecrawlResult.text.length >= 500 ? 'acceptable' : 'poor',
          pdfUrlFound: false,
          timestamp: new Date().toISOString(),
        };
        
        result = {
          success: true,
          text: cleanText(firecrawlResult.text),
          file_type: 'html',
          debug: debugInfo,
        };
        
        // Skip to node update
        if (node_id && result.success) {
          await updateKnowledgeNode(node_id, url, result);
          
          // Return small response when node_id is present (avoid connection closed)
          return new Response(
            JSON.stringify({
              success: true,
              node_id,
              text_length: result.text.length,
              file_type: result.file_type,
              debug: result.debug,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Download and parse file (PDF, DOCX, or HTML)
    console.log(`[parse-document] Downloading: ${targetUrl}`);
    
    // Check file size before downloading (5MB limit for edge functions)
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    
    try {
      // First, do a HEAD request to check file size
      try {
        const headResponse = await fetch(targetUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        const contentLength = headResponse.headers.get('content-length');
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > MAX_FILE_SIZE) {
            console.log(`[parse-document] File too large: ${size} bytes (max: ${MAX_FILE_SIZE})`);
            return new Response(
              JSON.stringify({
                success: false,
                text: '',
                file_type: 'pdf',
                file_size: size,
                error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum allowed: 5MB. Large documents require external PDF parsing service.`,
                metadata: {
                  note: 'Consider using a dedicated PDF service for large documents',
                  actual_pdf_url: targetUrl,
                },
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (headError) {
        console.log('[parse-document] HEAD request failed, proceeding with download:', headError);
      }
      
      const { buffer, contentType, size } = await downloadFile(targetUrl);
      const fileType = detectFileType(targetUrl, contentType);
      
      console.log(`[parse-document] Downloaded ${size} bytes, type: ${fileType}`);
      
      // Double-check size after download
      if (size > MAX_FILE_SIZE) {
        console.log(`[parse-document] Downloaded file too large: ${size} bytes`);
        return new Response(
          JSON.stringify({
            success: false,
            text: '',
            file_type: fileType,
            file_size: size,
            error: `File too large (${(size / 1024 / 1024).toFixed(1)}MB). Maximum allowed: 5MB.`,
            metadata: {
              actual_pdf_url: targetUrl,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
      
      // Check if extracted text is insufficient (common with WopiFrame wrapper responses)
      if (extractedText.length < 500 && url.includes('vbpl.vn')) {
        console.log(`[parse-document] VBPL: Extracted text too short (${extractedText.length} chars), trying toan-van fallback`);
        
        // Extract ItemID from original URL or targetUrl
        const itemId = extractVbplItemId(url) || extractVbplItemId(targetUrl);
        if (itemId) {
          const toanVanResult = await extractVbplToanVan(url);
          if (toanVanResult.success && toanVanResult.text.length > extractedText.length) {
            console.log(`[parse-document] VBPL: Toan-van fallback succeeded with ${toanVanResult.text.length} chars`);
            extractedText = toanVanResult.text;
          }
        }
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
      
      // For VBPL URLs, try toan-van fallback before failing
      if (url.includes('vbpl.vn')) {
        console.log('[parse-document] VBPL: Download failed, trying toan-van fallback');
        const toanVanResult = await extractVbplToanVan(url);
        if (toanVanResult.success && toanVanResult.text.length > 500) {
          result = {
            success: true,
            text: cleanText(toanVanResult.text),
            file_type: 'html',
            metadata: {
              note: 'Extracted from toan-van page (download failed)',
            },
          };
        } else {
          result = {
            success: false,
            text: '',
            file_type: 'unknown',
            error: downloadError instanceof Error ? downloadError.message : 'Failed to download or parse document',
          };
        }
      } else {
        result = {
          success: false,
          text: '',
          file_type: 'unknown',
          error: downloadError instanceof Error ? downloadError.message : 'Failed to download or parse document',
        };
      }
    }
    
    // Optionally update the knowledge node directly
    if (node_id && result.success) {
      // If we ended up using HTML/toan-van fallback, keep the original page URL as document_url
      const documentUrlForNode = result.file_type === 'html' ? url : targetUrl;
      await updateKnowledgeNode(node_id, documentUrlForNode, result);
      
      // Return small response when node_id is present (avoid connection closed)
      return new Response(
        JSON.stringify({
          success: true,
          node_id,
          text_length: result.text.length,
          file_type: result.file_type,
          debug: result.debug,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
 * Includes debug information for diagnostics
 */
async function updateKnowledgeNode(nodeId: string, documentUrl: string, result: ParseResult): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const parseStatus = result.success && result.text.length > 100 ? 'parsed' : 'failed';
    
    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
      full_text: result.text,
      document_url: documentUrl,
      document_type: result.file_type,
      parse_status: parseStatus,
    };
    
    // Add parse debug info to extracted_data if available
    if (result.debug) {
      // Get current extracted_data to merge
      const { data: currentNode } = await supabase
        .from('industry_knowledge_nodes')
        .select('extracted_data')
        .eq('id', nodeId)
        .single();
      
      const currentExtractedData = (currentNode?.extracted_data as Record<string, unknown>) || {};
      updatePayload.extracted_data = {
        ...currentExtractedData,
        parse_debug: result.debug,
      };
    }
    
    await supabase
      .from('industry_knowledge_nodes')
      .update(updatePayload)
      .eq('id', nodeId);
      
    console.log(`[parse-document] Updated node ${nodeId} with status: ${parseStatus}, debug: ${JSON.stringify(result.debug)}`);
  } catch (updateError) {
    console.error('[parse-document] Node update error:', updateError);
    // Don't fail the response for update errors
  }
}
