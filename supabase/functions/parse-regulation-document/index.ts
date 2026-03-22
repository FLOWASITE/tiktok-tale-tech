/**
 * Parse Regulation Document Edge Function
 * Downloads and parses PDF/DOCX files from official government sources
 * Returns extracted text content for further AI processing
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

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
 * UNIVERSAL SMART TRIMMER - Phase 3
 * Trim header content from ALL sources - find where legal content actually starts
 */
function trimUniversalHeader(text: string): string {
  // Legal content start patterns (priority order)
  const legalStartPatterns = [
    /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/i,
    /^##\s*(LUẬT|NGHỊ ĐỊNH|QUYẾT ĐỊNH|THÔNG TƯ|CHỈ THỊ)/m,
    /^(LUẬT|NGHỊ ĐỊNH|QUYẾT ĐỊNH|THÔNG TƯ|CHỈ THỊ)\s+(SỐ\s+)?[\d\/]+/mi,
    /QUỐC HỘI\s*[-—–_]{3,}/i,
    /CHÍNH PHỦ\s*[-—–_]{3,}/i,
    /^Điều\s+1[\.:]/mi,
    /Số:\s*\d+\/\d+\/(NĐ|QĐ|TT)-/i,
    /^##\s+Quốc hội/m,
    /^##\s+Chính phủ/m,
    /^#+\s*\*\*[^*]+\*\*$/m,  // ## **Luật Thuế...**
  ];
  
  let earliestPos = text.length;
  for (const pattern of legalStartPatterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined && match.index < earliestPos) {
      earliestPos = match.index;
    }
  }
  
  // Only trim if header < 40% of content and we found a valid start
  if (earliestPos > 0 && earliestPos < text.length * 0.4) {
    console.log(`[trim] Cutting universal header: 0-${earliestPos} (${earliestPos} chars)`);
    return text.substring(earliestPos);
  }
  return text;
}

/**
 * UNIVERSAL SMART TRIMMER - Phase 3
 * Trim footer content from ALL sources - cut from common footer patterns to end
 */
function trimUniversalFooter(text: string): string {
  // Universal footer patterns - match these to cut from match position to end
  const footerCutPatterns = [
    // === ChinhPhu.vn ===
    /© Cổng Thông tin điện tử Chính phủ[\s\S]*$/i,
    /Tổng Giám đốc:\s*\*?\*?[A-ZĐa-zđ\s]+[\s\S]*$/i,
    /Trụ sở:\s*\d+\s+[A-ZĐa-zđ\s]+[\s\S]*$/i,
    /Bản quyền thuộc Cổng Thông tin[\s\S]*$/i,
    /Ghi rõ nguồn .+Cổng Thông tin[\s\S]*$/i,
    /\[Giới thiệu[\s\S]*?Cổng TTĐT[\s\S]*$/i,
    /Tải ứng dụng:[\s\S]*$/i,
    /\[Nước CHXHCN[\s\S]*?chính phủ\]\([^)]+\)[\s\S]*$/i,
    
    // === VBPL.vn ===
    /CƠ SỞ DỮ LIỆU QUỐC GIA VỀ VĂN BẢN PHÁP LUẬT[\s\S]*$/i,
    /\[!\[Chung nhan Tin Nhiem Mang\][\s\S]*$/i,
    /Chung nhan Tin Nhiem Mang[\s\S]*$/i,
    /Tình huống pháp luật[\s\S]*$/i,
    /Thông cáo báo chí văn bản[\s\S]*$/i,
    /Lên đầu trang\s*Turn off more accessible[\s\S]*$/i,
    
    // === Common patterns across all sources ===
    /VĂN BẢN LIÊN QUAN\s*[-—]*[\s\S]*$/i,
    /Văn bản liên quan\s*\n\s*-\s*\[[\s\S]*$/i,
    /Các văn bản khác[\s\S]*$/i,
    /Văn bản được hướng dẫn[\s\S]*$/i,
    /VĂN BẢN GỐC[\s\S]*$/i,
    /LIÊN KẾT VĂN BẢN[\s\S]*$/i,
    /Nơi nhận:[\s\S]{0,800}$/i,  // Only cut if < 800 chars remaining (signature section)
    
    // === Navigation/utility footers ===
    /-\s*\[Tra cứu Văn bản\]\([^)]+\)[\s\S]*$/i,
    /-\s*\[Lịch Âm[\s\S]*$/i,
    /-\s*\[Giá Vàng[\s\S]*$/i,
    /Bài viết liên quan[\s\S]*$/i,
    /Xem thêm bài viết[\s\S]*$/i,
  ];
  
  let latestCut = text.length;
  for (const pattern of footerCutPatterns) {
    const match = text.match(pattern);
    if (match?.index !== undefined) {
      // Only cut if footer appears after 50% of content
      if (match.index > text.length * 0.5 && match.index < latestCut) {
        latestCut = match.index;
      }
    }
  }
  
  if (latestCut < text.length) {
    console.log(`[trim] Cutting universal footer at position ${latestCut}`);
    return text.substring(0, latestCut).trim();
  }
  return text;
}

/**
 * UNIVERSAL SMART TRIMMER - Phase 3
 * Clean navigation noise from ALL sources - menus, weather, accessibility links
 */
function cleanAllSiteNavigationNoise(text: string): string {
  const noisePatterns = [
    // === Accessibility and navigation links ===
    /^\s*Lên đầu trang\s*$/gm,
    /Turn on more accessible mode/gi,
    /Turn off more accessible mode/gi,
    /^\s*\[Liên hệ\]\([^)]+\)/gm,
    /^\s*\[Sơ đồ cổng thông tin\]\([^)]+\)/gm,
    /^\s*\[Hướng dẫn[^\]]*\]\([^)]+\)/gm,
    /^\s*\[Đăng nhập\]\([^)]+\)/gm,
    
    // === Breadcrumb/menu navigation links ===
    /^\s*-\s*\[Trang chủ\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Chính phủ\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Công dân\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Doanh nghiệp\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Kiều bào\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Tìm kiếm\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Tin tức\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Văn bản\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Hệ thống\]\([^)]+\)\s*$/gm,
    /^\s*-\s*\[Văn bản pháp luật\]\([^)]+\)\s*$/gm,
    /^\s*\*\s*\[[^\]]+\]\([^)]+\)\s*$/gm,  // * [Link](url)
    
    // === Date/weather headers (ChinhPhu specific) ===
    /^Thứ\s+[A-Za-zĐđÀ-ỹ]+,\s+\d{1,2}\/\d{1,2}\/\d{4}\s*$/gm,
    /\[Hà Nội\s*\d+°[^\]]*\]\([^)]+\)/gi,
    /\[[A-ZĐa-zđÀ-ỹ\s]+\d+°\s*-\s*\d+°\]\([^)]+\)/gi,
    /Hà Nội\s*\d+°\s*-\s*\d+°/gi,
    /Lai Châu\s*\d+°\s*-\s*\d+°/gi,
    
    // === Empty markdown elements ===
    /^\s*\|[\s\|]+\|\s*$/gm,
    /^\s*-\s*$/gm,
    /^\s*\*\s*$/gm,
    /^#+\s*$/gm,
    
    // === Logos, banners and empty image links ===
    /!\[[^\]]*\]\([^)]*banner[^)]*\)/gi,
    /!\[[^\]]*\]\([^)]*logo[^)]*\)/gi,
    /\[!\[\]\([^)]+\)\]\([^)]+\)/g,
    /!\[\]\([^)]+\)/g,
    
    // === ChinhPhu specific elements ===
    /\[Nước CHXHCN[\s\S]*?Việt Nam\]\([^)]+\)/gi,
    /\[Giới thiệu[\s\S]*?Chính phủ\]\([^)]+\)/gi,
    /\[Thư điện tử[\s\S]*?công vụ[^\]]*\]\([^)]+\)/gi,
    /\[Báo điện tử chính phủ\]\([^)]+\)/gi,
    /\[Văn phòng chính phủ\]\([^)]+\)/gi,
    /\[English\]\([^)]+\)/gi,
    /\[Tiếng Việt\]\([^)]+\)/gi,
    /\[中文\]\([^)]+\)/gi,
    
    // === Social/app download ===
    /\[App Store\]\([^)]+\)/gi,
    /\[Google Play\]\([^)]+\)/gi,
    /\[Facebook\]\([^)]+\)/gi,
    /\[Twitter\]\([^)]+\)/gi,
    /\[Youtube\]\([^)]+\)/gi,
    /\[Zalo\]\([^)]+\)/gi,
    
    // === VBPL specific navigation ===
    /\[Trang chủ\]\([^)]+\)/gi,
    /\[Văn bản pháp luật\]\([^)]+\)/gi,
  ];
  
  let cleaned = text;
  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up excessive whitespace from removals
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n').trim();
  
  return cleaned;
}

/**
 * UNIVERSAL SMART TRIMMER - Phase 3
 * ChinhPhu.vn specific header cleanup
 */
function trimChinhPhuContent(text: string): string {
  // ChinhPhu-specific header patterns to remove
  const chinhPhuHeaderPatterns = [
    /^\|[\s\S]*?(?=CỘNG HÒA|NGHỊ ĐỊNH|QUYẾT ĐỊNH|THÔNG TƯ)/i,
    /^Thứ [A-Za-zĐđÀ-ỹ]+,[\s\S]*?(?=CỘNG HÒA|NGHỊ ĐỊNH)/i,
  ];
  
  let cleaned = text;
  for (const pattern of chinhPhuHeaderPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[0].length < cleaned.length * 0.4) {
      cleaned = cleaned.replace(pattern, '');
    }
  }
  
  // ChinhPhu footer patterns
  const chinhPhuFooterPatterns = [
    /© Cổng Thông tin điện tử Chính phủ[\s\S]*$/i,
    /Tổng Giám đốc:[\s\S]*$/i,
    /Trụ sở:\s*16\s+Lê Hồng Phong[\s\S]*$/i,
  ];
  
  for (const pattern of chinhPhuFooterPatterns) {
    const match = cleaned.match(pattern);
    if (match?.index !== undefined && match.index > cleaned.length * 0.5) {
      cleaned = cleaned.substring(0, match.index).trim();
    }
  }
  
  return cleaned;
}

/**
 * VBPL.vn specific header/footer cleanup
 */
function trimVbplContent(text: string): string {
  // VBPL header cleanup - find legal content start
  const headerPatterns = [
    /^[\s\S]*?(?=CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM)/i,
  ];
  
  let cleaned = text;
  for (const pattern of headerPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[0].length < cleaned.length * 0.3) {
      cleaned = cleaned.substring(match[0].length);
    }
  }
  
  // VBPL footer patterns
  const footerPatterns = [
    /CƠ SỞ DỮ LIỆU QUỐC GIA VỀ VĂN BẢN PHÁP LUẬT[\s\S]*$/i,
    /Lên đầu trang[\s\S]*$/i,
    /\[!\[Chung nhan Tin Nhiem Mang\][\s\S]*$/i,
  ];
  
  for (const pattern of footerPatterns) {
    const match = cleaned.match(pattern);
    if (match?.index !== undefined && match.index > cleaned.length * 0.5) {
      cleaned = cleaned.substring(0, match.index).trim();
    }
  }
  
  return cleaned;
}

/**
 * Clean scraped HTML/Markdown content to remove website layout artifacts
 * Specific patterns for Vietnamese government websites
 * Enhanced: Uses Universal Smart Trimmer for comprehensive cleanup
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
  
  // === NEW: Apply Universal Smart Trimmers for ALL sources ===
  
  // Step 1: Site-specific content trimming
  if (sourceUrl.includes('chinhphu.vn')) {
    cleaned = trimChinhPhuContent(cleaned);
  } else if (sourceUrl.includes('vbpl.vn')) {
    cleaned = trimVbplContent(cleaned);
  }
  
  // Step 2: Universal navigation noise removal (menus, weather, links)
  cleaned = cleanAllSiteNavigationNoise(cleaned);
  
  // Step 3: Universal header trim (find legal document start)
  cleaned = trimUniversalHeader(cleaned);
  
  // Step 4: Universal footer trim (remove footer from all sources)
  cleaned = trimUniversalFooter(cleaned);
  
  // Step 5: Try to extract main content between document markers - but be careful not to lose content
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
  
  // Step 6: Final cleanup - excessive newlines and whitespace
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
    
    // Even on revert, try universal trimmers as they're safer
    cleaned = cleanAllSiteNavigationNoise(cleaned);
    cleaned = trimUniversalHeader(cleaned);
    cleaned = trimUniversalFooter(cleaned);
  }
  
  console.log(`[parse-document] cleanScrapedContent: ${originalLength} -> ${cleaned.length} chars`);
  
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
      extractedText = cleanTvplContent(extractedText, url);
      
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
        markdown = cleanTvplContent(markdown, url);
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
 * Detect TVPL URL type for differentiated cleaning
 */
function detectTvplUrlType(url: string): 'analysis' | 'legal_document' {
  const urlLower = url.toLowerCase();
  // Bài viết phân tích (có tham vấn, bình luận)
  if (urlLower.includes('/chinh-sach-phap-luat-moi/')) return 'analysis';
  if (urlLower.includes('/ho-tro-phap-luat/')) return 'analysis';
  if (urlLower.includes('/tin-tuc/')) return 'analysis';
  if (urlLower.includes('/tham-khao/')) return 'analysis';
  if (urlLower.includes('/an-le/')) return 'analysis';
  // Văn bản gốc
  return 'legal_document';
}

/**
 * Trim TVPL header content - find where legal content actually starts
 */
function trimTvplHeader(text: string): string {
  // Legal content start patterns (priority order)
  const legalStartPatterns = [
    /^#+\s*\*\*[^*]+\*\*$/m,  // ## **Luật Thuế...**
    /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/i,
    /^##\s+Quốc hội/m,
    /^##\s+Chính phủ/m,
    /^Điều\s+1\./m,
    /QUYẾT ĐỊNH:/i,
    /NGHỊ ĐỊNH:/i,
    /THÔNG TƯ:/i,
    /LUẬT\s+[A-ZĐÀẢÃÁẠÈẺẼÉẸ]/i,
  ];
  
  let earliestPos = text.length;
  for (const pattern of legalStartPatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined && match.index < earliestPos) {
      earliestPos = match.index;
    }
  }
  
  // Only trim if header is < 30% of content and we found a valid start
  if (earliestPos > 0 && earliestPos < text.length * 0.3 && earliestPos < text.length) {
    return text.substring(earliestPos);
  }
  return text;
}

/**
 * Trim TVPL footer content - remove company info, licenses, etc.
 * Enhanced v5: More robust footer detection with earlier position threshold
 */
function trimTvplFooter(text: string): string {
  // Strong footer start patterns - match these greedily to end
  // v7: Enhanced with lower position threshold (30%), more patterns, and final cleanup check
  const footerPatterns = [
    // === LOGIN/CONCURRENCY MODAL - highest priority ===
    /CẢNH BÁO ĐĂNG NHẬP[\s\S]*$/i,
    /Tài khoản của Quý Khách đã đăng nhập[\s\S]*$/i,
    /Tài khoản của Quý khách đã đăng nhập quá nhiều[\s\S]*$/i,
    /Tài khoản hiện đã đủ người dùng cùng thời điểm[\s\S]*$/i,
    /Bạn vừa bị Đăng xuất[\s\S]*$/i,
    /Cảm ơn đã dùng ThuVienPhapLuat\.vn[\s\S]*$/i,
    /Cảm ơn bạn đã dùng[\s\S]*ThuVienPhapLuat[\s\S]*$/i,
    /Xin Quý khách đăng nhập lại[\s\S]*$/i,
    /Quý khách đã đăng nhập quá nhiều lần[\s\S]*$/i,
    /\*\*Thoát\*\*\s*\*\*Đồng ý\*\*[\s\S]*$/i,
    /Thoát\s+Đồng ý[\s\S]*$/i,
    /Quý khách có đồng ý không[\s\S]*$/i,
    /để được đăng nhập[\s\S]*$/i,
    /đăng nhập cùng lúc[\s\S]*$/i,
    
    // === reCAPTCHA blocks ===
    /protected by reCAPTCHA[\s\S]*$/i,
    /reCAPTCHA[\s\S]*Terms[\s\S]*$/i,
    /This site is protected[\s\S]*$/i,
    /Google Privacy Policy[\s\S]*$/i,
    /Privacy Policy and Terms of Service[\s\S]*$/i,
    
    // === Company footer info ===
    /Chủ quản: Công ty[\s\S]*$/i,
    /Chủ quản:\s*\n*Công ty[\s\S]*$/i,
    /Giấy phép số:[\s\S]*$/i,
    /Giấy phép MXH[\s\S]*$/i,
    /Chịu trách nhiệm chính:[\s\S]*$/i,
    /Số điện thoại liên hệ:[\s\S]*$/i,
    /Địa chỉ:.*Centre Point[\s\S]*$/i,
    /Centre Point[\s\S]*$/i,
    /Chứng nhận bản quyền[\s\S]*$/i,
    /028 3930 3279[\s\S]*$/i,
    /\(028\)\s*3930[\s\S]*$/i,
    /Địa điểm Kinh Doanh[\s\S]*$/i,
    /P\.\d+[A-Z]?\s*,\s*Tòa nhà[\s\S]*$/i,
    /Công ty TNHH Thư Viện Pháp Luật[\s\S]*$/i,
    /THƯ VIỆN PHÁP LUẬT\s*\n*Giấy phép[\s\S]*$/i,
    
    // === Notification/support blocks ===
    /##### Thông báo[\s\S]*$/i,
    /##### Thông báo\s*Bạn không có thông báo nào[\s\S]*$/i,
    /Hãy để chúng tôi hỗ trợ bạn![\s\S]*$/i,
    /Chúng tôi sẽ liên hệ[\s\S]*$/i,
    
    // === Sidebar utility links ===
    /-\s*\[Tra cứu Văn bản\][\s\S]*$/i,
    /- \[Lịch Âm \d{4}\][\s\S]*$/i,
    /- \[Giá Vàng Hôm Nay\][\s\S]*$/i,
    /-\s*\[Lịch Âm[\s\S]*$/i,
    /-\s*\[Giá Vàng[\s\S]*$/i,
    /-\s*\[Tra cứu[\s\S]*$/i,
    /-\s*\[Thuật ngữ pháp lý\][\s\S]*$/i,
    /-\s*\[Cộng đồng ngành luật\][\s\S]*$/i,
    
    // === Related content ===
    /Bài viết liên quan[\s\S]*$/i,
    /Xem thêm bài viết[\s\S]*$/i,
  ];
  
  let latestCut = text.length;
  for (const pattern of footerPatterns) {
    const match = text.match(pattern);
    if (match && match.index !== undefined) {
      // Lower threshold to 30% for more aggressive footer removal (was 50%)
      if (match.index > text.length * 0.3 && match.index < latestCut) {
        latestCut = match.index;
      }
    }
  }
  
  let result = latestCut < text.length ? text.substring(0, latestCut).trim() : text;
  
  // === FINAL CHECK: Scan last 500 chars for any remaining hard artifacts ===
  // This catches artifacts that might not match footer patterns exactly
  const hardFooterMarkers = [
    'Chủ quản:',
    '028 3930 3279',
    'Centre Point',
    'reCAPTCHA',
    'Hãy để chúng tôi hỗ trợ bạn!',
    'CẢNH BÁO ĐĂNG NHẬP',
    'Tài khoản của Quý Khách',
    'Giấy phép số:',
    'Công ty TNHH',
    'Privacy Policy',
    'Terms of Service',
  ];
  
  if (result.length > 600) {
    const last500 = result.substring(result.length - 500);
    for (const marker of hardFooterMarkers) {
      const markerPos = last500.indexOf(marker);
      if (markerPos >= 0) {
        // Find in full text and cut there
        const fullTextPos = result.length - 500 + markerPos;
        if (fullTextPos > result.length * 0.3) {
          result = result.substring(0, fullTextPos).trim();
          break; // One cut is enough
        }
      }
    }
  }
  
  return result;
}

/**
 * Clean TVPL-specific artifacts from extracted text
 * Enhanced v4: Complete artifact removal for all TVPL content types
 */
function cleanTvplContent(text: string, url: string = ''): string {
  const urlType = detectTvplUrlType(url);
  
  // TVPL-specific patterns to remove (comprehensive v4)
  const tvplRemovePatterns = [
    // === Login/Registration prompts ===
    /Bạn Chưa Đăng Nhập Thành Viên!/gi,
    /Đăng nhập\/Đăng ký\s*/gi,
    /Đăng nhập để xem/gi,
    /Xem văn bản đầy đủ/gi,
    /Click vào đây/gi,
    /Dùng tài khoản \*\*LawNet\*\*.*?Đăng ký mới\]/gis,
    /Dùng tài khoản LawNet.*?Đăng ký mới/gis,
    
    // === Copyright/ownership notices ===
    /Bản dịch này thuộc quyền sở hữu của \*{4}\..*?trí tuệ\./gis,
    /Bản dịch này thuộc quyền sở hữu của.*?sở hữu trí tuệ\./gis,
    
    // === Branding ===
    /THƯ VIỆN PHÁP LUẬT/gi,
    /Mọi hành vi sao chép.*?vi phạm pháp luật/gi,
    /Copyright.*thuvienphapluat\.vn/gi,
    /©.*thuvienphapluat/gi,
    
    // === Header navigation links (markdown) ===
    /^\s*-\s*\[Pháp luật\].*$/gim,
    /^\s*-\s*\[Pháp luật vừa ban hành\].*$/gim,
    /^\s*-\s*\[Chính sách mới\].*$/gim,
    /^\s*-\s*\[Tra cứu\].*$/gim,
    /^\s*-\s*\[Công cụ\].*$/gim,
    /^\s*-\s*\[Dịch vụ\].*$/gim,
    /^\s*-\s*\[Hỏi đáp\].*$/gim,
    /^\s*-\s*\[Biểu mẫu\].*$/gim,
    /^\s*-\s*\[Lĩnh vực Pháp luật\].*$/gim,
    /^\s*-\s*\[Chủ đề Pháp luật nổi bật\].*$/gim,
    
    // === Sidebar utility links ===
    /\[Lịch Âm \d+\]\([^)]+\)/gi,
    /\[Giá Vàng[^\]]*\]\([^)]+\)/gi,
    /\[Tra cứu[^\]]*\]\([^)]+\)/gi,
    /\[Tìm kiếm[^\]]*luật sư\]\([^)]+\)/gi,
    /\[Thuật\\?\n?ngữ pháp lý\]\([^)]+\)/gi,
    /\[Bảng giá\\?\n?đất\]\([^)]+\)/gi,
    /\[Cộng đồng ngành luật\]\([^)]+\)/gi,
    /\[Biểu thuế WTO\]\([^)]+\)/gi,
    /\[Tra cứu Văn bản\]\([^)]+\)/gi,
    /\[Tra cứu Công văn\]\([^)]+\)/gi,
    
    // === Breadcrumb patterns ===
    /\[Chính sách mới[^\]]*\]\([^)]+\)/gi,
    /\[Pháp luật[^\]]*\]\([^)]+\)/gi,
    /\[Pháp luật vừa ban hành\]\([^)]+\)/gi,
    /^\s*\[[A-ZĐ][^\]]+\]\s*>>\s*\[[^\]]+\]\([^)]+\)/gim,
    /Chính sách mới >> /gi,
    
    // === Quick search patterns ===
    /Tra cứu nhanh\s*:.*?\n/gi,
    /Từ khoá:.*?Văn Bản\.+/gis,
    /Văn bản PL.*?Dự thảo.*?Công văn.*?TCVN/gis,
    
    // === Action buttons/links ===
    /\[Hỏi đáp pháp luật\]/gi,
    /Download\s*(PDF|Word)/gi,
    /Chia sẻ:/gi,
    /Báo cáo sai sót/gi,
    /Lưu vào danh sách/gi,
    /In văn bản/gi,
    /So sánh văn bản/gi,
    /Tiện ích khác/gi,
    /Bản tiếng Anh/gi,
    /Văn bản gốc/gi,
    /Xem thêm/gi,
    /Đọc thêm/gi,
    
    // === Document metadata (status, dates) ===
    /Văn bản liên quan/gi,
    /Văn bản đang xem/gi,
    /Đang cập nhật/gi,
    /Tình trạng hiệu lực[^:]*:[^\n]+/gi,
    /Cập nhật:[^\n]+/gi,
    /Hiệu lực:[^\n]+/gi,
    
    // === Footer company info ===
    /Chủ quản: Công ty[^\.]+\./gi,
    /Giấy phép[^\.]+Sở TTTT[^\.]+\./gi,
    /Giấy phép số:[^\.]+\./gi,
    /Chịu trách nhiệm chính:[^\.]+/gi,
    /Số điện thoại liên hệ:[^\n]+/gi,
    /028 3930 3279/gi,
    /Địa chỉ:[^;]+;/gi,
    /Địa điểm Kinh Doanh:[^;]+;/gi,
    /P\.\d+[A-Z]?\s*,\s*Centre Point[^;]+;/gi,
    /Chứng nhận bản quyền[^\.]+\./gi,
    /cấp bởi Bộ Văn hoá[^\.]+/gi,
    
    // === Interactive elements ===
    /Hãy để chúng tôi hỗ trợ bạn!/gi,
    /Bạn không có thông báo nào/gi,
    /##### Thông báo/gi,
    /reCAPTCHA/gi,
    /protected by reCAPTCHA/gi,
    /This site is protected by reCAPTCHA/gi,
    /Google Privacy Policy/gi,
    /Terms of Service apply/gi,
    /Privacy Policy and Terms of Service/gi,
    
    // === Contact info ===
    /hotline:[^\n]+/gi,
    /\(028\)[^\n]+/gi,
    
    // === Social media ===
    /\[Facebook\]/gi,
    /\[Zalo\]/gi,
    /\[Print\]/gi,
    /\[Twitter\]/gi,
    
    // === Image markdown (CDN and icons) ===
    /!\[\]\(https:\/\/thuvienphapluat\.vn\/Images\/[^)]+\)/gi,
    /!\[\]\(https?:\/\/cdn\.thuvienphapluat\.vn\/[^)]+\)/gi,
    /!\[Mục lục bài viết\].*$/gim,
    /!\[[^\]]*\]\(https?:\/\/cdn\.thuvienphapluat\.vn[^)]+\)/gi,
    /!\[\]\([^)]+\)/g,
    /\[!\[\]\([^)]+\)\]\([^)]+\)/g,
    
    // === reCAPTCHA full block removal ===
    /This site is protected[\s\S]*?Terms of Service apply\./gi,
    /protected by reCAPTCHA[\s\S]*?apply\./gi,
    /reCAPTCHA[\s\S]*?Google[\s\S]*?apply\./gi,
    /reCAPTCHA[\s\S]{0,500}Privacy Policy[\s\S]{0,200}Terms of Service/gi,
    
    // === LOGIN WARNING / CONCURRENCY MODAL ===
    /CẢNH BÁO ĐĂNG NHẬP[\s\S]*?(?:Đồng ý|close|Thoát)/gi,
    /Tài khoản của Quý Khách đã đăng nhập[\s\S]*?(?:Đồng ý|close|Thoát)/gi,
    /Tài khoản của Quý khách đã đăng nhập quá nhiều[\s\S]*?(?:Đồng ý|Thoát|$)/gi,
    /Tài khoản hiện đã đủ người dùng[\s\S]*?(?:Đồng ý|Thoát|$)/gi,
    /Bạn vừa bị Đăng xuất[\s\S]*?(?:Đồng ý|close|$)/gi,
    /Cảm ơn đã dùng ThuVienPhapLuat\.vn[\s\S]*?(?:\n\n|$)/gi,
    /Cảm ơn bạn đã dùng[\s\S]*?ThuVienPhapLuat[\s\S]*?(?:\n\n|$)/gi,
    /Xin Quý khách đăng nhập lại[\s\S]*?(?:\n\n|$)/gi,
    /\*\*Thoát\*\*\s*\*\*Đồng ý\*\*/gi,
    /Thoát\s+Đồng ý/gi,
    
    // === Empty/malformed tables ===
    /\|\s*\|\s*\|\s*\|\s*\|\s*\|/g,
    /\|\s*---\s*\|\s*---\s*\|/g,
    /(\|\s*\|[\s\|]*\n)+/g,
    /\|\s*---[\s\|\-]+\n/g,
    /^\|[\s\|]+\|$/gm,
    
    // === Menu-style lists ===
    /^-\s*\[[^\]]+\]\([^)]+\)\s*$/gim,
    /^\*\s*\[[^\]]+\]\([^)]+\)\s*$/gim,
    
    // === Rating/vote patterns ===
    /Bạn đánh giá.*?sao/gi,
    /\d+ lượt xem/gi,
    /\d+ lượt đánh giá/gi,
    
    // === Related articles at end ===
    /Bài viết liên quan[\s\S]*?$/gi,
    /Xem thêm bài viết[\s\S]*?$/gi,
    
    // === Empty markdown headers ===
    /^#+\s*$/gm,
    
    // === Table of contents at start ===
    /^Mục lục[\s\S]*?(?=CỘNG HÒA|Điều 1|Chương I)/gi,
  ];
  
  let cleaned = text;
  
  // Apply all patterns
  for (const pattern of tvplRemovePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Apply header/footer trimming
  cleaned = trimTvplHeader(cleaned);
  cleaned = trimTvplFooter(cleaned);
  
  // === Analysis-specific cleaning ===
  if (urlType === 'analysis') {
    // Remove consultant/author info
    cleaned = cleaned.replace(/^Tham vấn bởi Luật sư \*\*[^*]+\*\*\s*\n/gm, '');
    cleaned = cleaned.replace(/^Chuyên viên pháp lý \*\*[^*]+\*\*\s*\n/gm, '');
    cleaned = cleaned.replace(/Tham vấn bởi Luật sư[^\n]+\n/gi, '');
    cleaned = cleaned.replace(/Chuyên viên pháp lý[^\n]+\n/gi, '');
    
    // Remove website timestamps
    cleaned = cleaned.replace(/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*[AP]M\s*$/gim, '');
    cleaned = cleaned.replace(/\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*[AP]M\n/gi, '');
  }
  
  // Apply general markdown artifacts cleaner
  cleaned = cleanMarkdownArtifacts(cleaned);
  
  // === NEW: Apply universal trimmers for additional robustness ===
  cleaned = cleanAllSiteNavigationNoise(cleaned);
  cleaned = trimUniversalHeader(cleaned);
  cleaned = trimUniversalFooter(cleaned);
  
  // Clean up whitespace
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s*[-*•]\s*$/gm, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  return cleaned;
}

/**
 * Clean generic markdown artifacts from extracted text
 * Removes images, empty tables, and navigation-style lists
 */
function cleanMarkdownArtifacts(text: string): string {
  let cleaned = text;
  
  // Remove all image references completely (including tooltip images)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  
  // Remove empty or malformed tables
  cleaned = cleaned.replace(/(\|\s*\|[\s\|]*\n)+/g, '\n');
  cleaned = cleaned.replace(/\|\s*---[\s\|\-]+\n/g, '');
  cleaned = cleaned.replace(/^\s*\|[\s\|]*\|\s*$/gm, '');
  
  // Remove navigation-style list items (just links with no content)
  cleaned = cleaned.replace(/^-\s*\[[^\]]+\]\([^)]+\)\s*$/gim, '');
  cleaned = cleaned.replace(/^\*\s*\[[^\]]+\]\([^)]+\)\s*$/gim, '');
  
  // Remove arrow tooltip images pattern
  cleaned = cleaned.replace(/\[!\[]\(https?:\/\/[^\)]+\)\]\([^\)]+\)/g, '');
  
  // Remove standalone URLs on their own lines
  cleaned = cleaned.replace(/^\s*https?:\/\/[^\s]+\s*$/gm, '');
  
  // Clean up excessive whitespace after removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Count artifacts in text to assess quality
 * Higher count = more cleanup needed
 */
function countArtifacts(text: string): number {
  let count = 0;
  
  // Count remaining image references
  const imageMatches = text.match(/!\[[^\]]*\]\([^)]+\)/g);
  if (imageMatches) count += imageMatches.length * 2;
  
  // Count empty table cells
  const emptyTableMatches = text.match(/\|\s*\|\s*\|/g);
  if (emptyTableMatches) count += emptyTableMatches.length;
  
  // Count navigation-style links on their own lines
  const navLinkMatches = text.match(/^-\s*\[[^\]]+\]\([^)]+\)\s*$/gim);
  if (navLinkMatches) count += navLinkMatches.length;
  
  // Count login/register prompts
  const loginMatches = text.match(/đăng nhập|đăng ký|chưa đăng nhập/gi);
  if (loginMatches) count += loginMatches.length * 3;
  
  // Count download/share buttons
  const buttonMatches = text.match(/download|chia sẻ|lưu vào|in văn bản/gi);
  if (buttonMatches) count += buttonMatches.length;
  
  // Count CDN image URLs
  const cdnMatches = text.match(/cdn\.thuvienphapluat\.vn/gi);
  if (cdnMatches) count += cdnMatches.length * 2;
  
  return count;
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
    // === TVPL PRIORITY FIRST: Extract before trying other strategies ===
    // ThưViệnPhápLuật.vn has clean HTML - parse directly for best results
    if (url.includes('thuvienphapluat.vn')) {
      console.log('[parse-document] TVPL: Detected ThưViệnPhápLuật.vn, using direct extraction FIRST');
      const tvplResult = await extractTvplContent(url);
      if (tvplResult.success && tvplResult.text.length > 500) {
        const legalScore = detectLegalContent(tvplResult.text);
        const sidebarPenalty = detectSidebarContent(tvplResult.text);
        
        // Additional quality check - reject if too many artifacts remain
        const artifactCount = countArtifacts(tvplResult.text);
        if (artifactCount > 15) {
          console.log(`[parse-document] TVPL: Too many artifacts (${artifactCount}), trying AI extraction`);
          const rawHtml = await fetchHtmlDirectly(url);
          if (rawHtml && rawHtml.length > 1000) {
            const aiResult = await extractWithAI(rawHtml, url);
            if (aiResult.success && aiResult.text.length > 500) {
              return {
                success: true,
                text: aiResult.text,
                debug: {
                  source: 'html',
                  strategy: 'tvpl_ai_fallback',
                  textLength: aiResult.text.length,
                  legalScore: detectLegalContent(aiResult.text),
                  sidebarPenalty: detectSidebarContent(aiResult.text),
                },
              };
            }
          }
        }
        
        return {
          success: true,
          text: tvplResult.text,
          debug: {
            source: 'html',
            strategy: 'tvpl_direct_priority',
            textLength: tvplResult.text.length,
            legalScore,
            sidebarPenalty,
          },
        };
      }
    }
    
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
    
    // Note: TVPL check moved to top of function for priority handling
    
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

Deno.Deno.serve(withPerf({ functionName: 'parse-regulation-document' }, async (req) => {
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
    
    // URL validation - reject invalid URLs early
    const urlValidation = isValidRegulationUrl(url);
    if (!urlValidation.valid) {
      console.log(`[parse-document] Invalid URL rejected: ${urlValidation.reason}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: urlValidation.reason,
          text: '',
          file_type: 'unknown',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
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
 * Calculate content quality score (0-100)
 * Measures how clean and complete the legal document content is
 */
interface ContentQualityResult {
  overall: number;
  breakdown: {
    artifact_penalty: number;
    legal_structure: number;
    completeness: number;
    readability: number;
  };
}

/**
 * Enhanced artifact patterns for comprehensive detection
 * Includes VBPL, chinhphu.vn, TVPL specific patterns
 * v4: Comprehensive TVPL-specific patterns added
 */
const COMPREHENSIVE_ARTIFACT_PATTERNS = [
  // Empty/broken image links
  { pattern: /\[!\[\]\([^)]+\)\]/g, penalty: 5 },
  { pattern: /!\[[^\]]*\]\([^)]+\)/g, penalty: 3 },
  
  // Login/auth prompts
  { pattern: /Đăng nhập|Đăng ký|Tìm kiếm/gi, penalty: 3 },
  { pattern: /Bạn Chưa Đăng Nhập/gi, penalty: 5 },
  { pattern: /Đăng nhập\/Đăng ký/gi, penalty: 5 },
  
  // Social media
  { pattern: /Facebook|Twitter|Youtube|Zalo/gi, penalty: 2 },
  
  // Copyright/footer
  { pattern: /Copyright|Bản quyền thuộc về/gi, penalty: 2 },
  
  // Empty tables
  { pattern: /^\|[\s\|]+\|$/gm, penalty: 2 },
  { pattern: /\|\s*---+\s*\|/g, penalty: 2 },
  
  // Navigation
  { pattern: /Văn bản liên quan|Xem thêm|Đọc thêm/gi, penalty: 2 },
  { pattern: /Trang chủ\s*>/gi, penalty: 3 },
  { pattern: /Menu|Sidebar|Footer|Header/gi, penalty: 3 },
  
  // Contact info
  { pattern: /Liên hệ|Hotline|Điện thoại:/gi, penalty: 2 },
  
  // Rating/stats
  { pattern: /Bạn đánh giá.*?sao/gi, penalty: 3 },
  { pattern: /\d+ lượt xem/gi, penalty: 2 },
  { pattern: /\d+ lượt đánh giá/gi, penalty: 2 },
  
  // Related content
  { pattern: /Bài viết liên quan/gi, penalty: 3 },
  { pattern: /Mục lục/gi, penalty: 1 },
  
  // VBPL specific
  { pattern: /Turn on more accessible mode/gi, penalty: 5 },
  { pattern: /Turn off more accessible mode/gi, penalty: 5 },
  { pattern: /\[\d{4} đến \d{4}\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[Tòa án nhân dân[^\]]*\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[Quốc hội\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[Chính phủ\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[Thủ tướng Chính phủ\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[Các Bộ, cơ quan ngang Bộ\]\([^)]+\)/g, penalty: 3 },
  { pattern: /Các văn bản khác/gi, penalty: 4 },
  { pattern: /VB liên quan/gi, penalty: 3 },
  { pattern: /Thuộc tính\s*văn bản/gi, penalty: 3 },
  
  // chinhphu.vn specific
  { pattern: /\[!\[Cổng thông tin điện tử Chính phủ\][^\]]*\]\([^)]+\)/g, penalty: 5 },
  { pattern: /\[English\]\([^)]+\)/g, penalty: 2 },
  { pattern: /\[中文\]\([^)]+\)/g, penalty: 2 },
  { pattern: /!\[.*?quoc-huy\.png.*?\]/g, penalty: 5 },
  
  // === TVPL specific patterns (v4) ===
  { pattern: /cdn\.thuvienphapluat\.vn/gi, penalty: 4 },
  { pattern: /\[Lịch Âm \d+\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /\[Giá Vàng[^\]]*\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /\[Tra cứu[^\]]*\]\([^)]+\)/gi, penalty: 3 },
  { pattern: /Chủ quản: Công ty/gi, penalty: 5 },
  { pattern: /Giấy phép[^\.]+Sở TTTT/gi, penalty: 5 },
  { pattern: /reCAPTCHA/gi, penalty: 5 },
  { pattern: /Hãy để chúng tôi hỗ trợ bạn!/gi, penalty: 4 },
  { pattern: /Tham vấn bởi Luật sư/gi, penalty: 3 },
  { pattern: /Chuyên viên pháp lý/gi, penalty: 3 },
  { pattern: /\[Thuật\\?\n?ngữ pháp lý\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /\[Cộng đồng ngành luật\]\([^)]+\)/gi, penalty: 4 },
  { pattern: /028 3930 3279/gi, penalty: 4 },
  { pattern: /Centre Point/gi, penalty: 4 },
  { pattern: /Chính sách mới >> /gi, penalty: 3 },
  { pattern: /\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*[AP]M/gi, penalty: 3 },
  
  // Empty links
  { pattern: /\[\s*\]\([^)]+\)/g, penalty: 3 },
  { pattern: /\[#\]\([^)]+\)/g, penalty: 3 },
  
  // Navigation list items
  { pattern: /^-\s*\[[^\]]+\]\([^)]+\)\s*$/gm, penalty: 2 },
];

function calculateContentQuality(text: string): ContentQualityResult {
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

  // Artifact detection using comprehensive patterns
  for (const { pattern, penalty } of COMPREHENSIVE_ARTIFACT_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      breakdown.artifact_penalty += matches.length * penalty;
    }
  }
  
  // v2: Increased artifact penalty cap from 50 to 70, plus hard clamps for severe artifacts
  score -= Math.min(breakdown.artifact_penalty, 70);
  
  // v2: Hard clamp for severe artifact contamination
  // If artifact_penalty > 100, cap overall at 80 max
  // If artifact_penalty > 200, cap overall at 70 max
  // This ensures heavily contaminated docs don't get "good" scores

  // Legal structure detection (positive)
  const legalPatterns = [
    { pattern: /CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM/gi, bonus: 10 },
    { pattern: /Độc lập - Tự do - Hạnh phúc/gi, bonus: 5 },
    { pattern: /Điều\s+\d+/gi, bonus: 2 },
    { pattern: /Chương\s+[IVX\d]+/gi, bonus: 3 },
    { pattern: /Khoản\s+\d+/gi, bonus: 1 },
    { pattern: /QUYẾT ĐỊNH|NGHỊ ĐỊNH|THÔNG TƯ|LUẬT|CHỈ THỊ/gi, bonus: 5 },
    { pattern: /Căn cứ/gi, bonus: 2 },
    { pattern: /Xét đề nghị/gi, bonus: 2 },
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
  const hasSignature = /Nơi nhận:|BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH|GIÁM ĐỐC/i.test(text);
  
  if (hasHeader) breakdown.completeness += 5;
  if (hasBody) breakdown.completeness += 10;
  if (hasSignature) breakdown.completeness += 5;
  score = Math.min(100, score + breakdown.completeness);

  // Readability (text quality)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const avgLineLength = text.length / (lines.length || 1);
  
  // Good legal documents have moderate line lengths
  if (avgLineLength > 50 && avgLineLength < 200) {
    breakdown.readability += 5;
  }
  
  // Check for proper paragraph structure
  const paragraphCount = (text.match(/\n\n/g) || []).length;
  if (paragraphCount > 5 && paragraphCount < text.length / 500) {
    breakdown.readability += 3;
  }
  
  // Check content length is substantial
  if (text.length > 5000) {
    breakdown.readability += 2;
  }
  
  score = Math.min(100, score + breakdown.readability);
  
  // v2: Apply hard clamps for severe artifacts (AFTER all bonuses calculated)
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

/**
 * AI Post-Processing Clean - Uses AI to remove artifacts when quality is too low
 * Only triggered when content_quality_score < threshold
 * v6: Force AI clean for TVPL if artifacts > 20, force use AI output for severe contamination
 */
async function aiPostProcessClean(text: string, url: string): Promise<{ cleanedText: string; wasProcessed: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.log('[parse-document] LOVABLE_API_KEY not configured, skipping AI post-process clean');
    return { cleanedText: text, wasProcessed: false };
  }
  
  // Pre-check quality - stricter threshold for TVPL
  const isTvpl = url.includes('thuvienphapluat.vn');
  const isVbpl = url.includes('vbpl.vn');
  const isChinhPhu = url.includes('chinhphu.vn');
  const qualityThreshold = isTvpl ? 90 : 85;
  const artifactThreshold = isTvpl ? 15 : (isVbpl ? 20 : 25);
  
  const preCheck = calculateContentQuality(text);
  console.log(`[parse-document] AI Post-Process: Pre-check quality=${preCheck.overall}, artifacts=${preCheck.breakdown.artifact_penalty}, source=${isTvpl ? 'TVPL' : (isVbpl ? 'VBPL' : 'other')}`);
  
  // Force AI clean for sources with artifact threshold exceeded
  const forceAiClean = preCheck.breakdown.artifact_penalty > artifactThreshold;
  // Force USE AI output without comparison if artifacts are severe
  const forceTakeAiOutput = preCheck.breakdown.artifact_penalty > 100;
  
  if (!forceAiClean && preCheck.overall >= qualityThreshold) {
    console.log('[parse-document] AI Post-Process: Quality already good, skipping');
    return { cleanedText: text, wasProcessed: false };
  }
  
  if (forceAiClean) {
    console.log(`[parse-document] AI Post-Process: FORCE AI clean (artifacts=${preCheck.breakdown.artifact_penalty}, forceTake=${forceTakeAiOutput})`);
  }
  
  try {
    console.log(`[parse-document] AI Post-Process: Cleaning ${text.length} chars from ${url}`);
    
    // Truncate if too large
    const truncatedText = text.length > 80000 ? text.substring(0, 80000) : text;
    
    // TVPL-specific system prompt with detailed artifact patterns
    const tvplSystemPrompt = `NHIỆM VỤ: Làm sạch bài viết pháp luật từ ThưViệnPhápLuật.vn

BẮT BUỘC LOẠI BỎ:
- Header navigation: "Đăng nhập/Đăng ký", "[Pháp luật](...)", "- [Chính sách mới]"
- Breadcrumbs: "[Chính sách mới >> ...]", "Chính sách mới >> "
- Sidebar links: "[Lịch Âm 2026]", "[Giá Vàng Hôm Nay]", "[Tra cứu...]", "[Thuật ngữ pháp lý]"
- Sidebar links: "[Cộng đồng ngành luật]", "[Bảng giá đất]", "[Biểu thuế WTO]"
- Consultant info: "Tham vấn bởi Luật sư...", "Chuyên viên pháp lý..."
- Website timestamps: "02/01/2026 06:31 AM", "dd/mm/yyyy hh:mm AM/PM"
- All images: ![Mục lục bài viết](...), ![](https://cdn.thuvienphapluat.vn/...)
- Footer: "Chủ quản: Công ty THƯ VIỆN PHÁP LUẬT", địa chỉ, giấy phép, "028 3930 3279"
- Footer: "Centre Point", "Giấy phép số:", "Chịu trách nhiệm chính:", "Chứng nhận bản quyền"
- Interactive: "reCAPTCHA", "Hãy để chúng tôi hỗ trợ bạn!", "##### Thông báo"
- Utility links: "[Tra cứu Công văn]", "[Tìm kiếm luật sư]", "[Tra cứu Văn bản]"
- Menu items: "- [Pháp luật](...)", "- [Tra cứu](...)", "- [Công cụ](...)"
- Actions: "In văn bản", "So sánh văn bản", "Lưu vào danh sách", "Báo cáo sai sót"
- Statistics: "X lượt xem", "X lượt đánh giá", "Bạn đánh giá...sao"
- Empty tables: | | |, |---|---|
- Related articles: "Bài viết liên quan...", "Xem thêm bài viết..."
- All markdown links that are navigation: [Link text](url) on their own lines

GIỮ LẠI NGUYÊN VẸN:
- Tiêu đề văn bản pháp luật: "LUẬT THUẾ...", "NGHỊ ĐỊNH..."
- Quốc hiệu: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
- Toàn bộ nội dung Điều, Khoản, Điểm, Chương, Mục
- Thông tin cơ quan ban hành, người ký
- Ngày hiệu lực, số hiệu văn bản
- Căn cứ ban hành
- Nội dung phân tích, bình luận (nếu là bài viết phân tích)
- "Nơi nhận:", danh sách nơi nhận

OUTPUT: Text thuần túy, không markdown, giữ nguyên xuống dòng và cấu trúc pháp lý.
KHÔNG thêm bất kỳ giải thích nào, chỉ trả về văn bản đã làm sạch.`;

    const genericSystemPrompt = `NHIỆM VỤ: Làm sạch văn bản pháp luật Việt Nam.

BẮT BUỘC LOẠI BỎ:
- Menu điều hướng, sidebar, breadcrumb
- Links markdown rỗng: [](url), [![](url)]
- Bảng rỗng: | | |, |---|---|
- "Trang chủ >", "Đăng nhập", "Đăng ký", "Tìm kiếm"
- "Văn bản liên quan", "Xem thêm", "Bài viết liên quan"
- "Copyright", "Bản quyền", "Facebook", "Zalo", "Hotline"
- "Turn on/off more accessible mode"
- Links đến các năm: [2020 đến 2024](url)
- Metadata website: "Số lượt xem", "Đánh giá"
- Image markdown: ![...](...)

BẮT BUỘC GIỮ LẠI:
- Toàn bộ nội dung pháp lý
- Quốc hiệu: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
- Các Điều, Khoản, Chương với nội dung đầy đủ
- Thông tin ban hành, người ký
- "Nơi nhận:", danh sách nơi nhận

OUTPUT: Text thuần túy, giữ nguyên xuống dòng và cấu trúc pháp lý.
KHÔNG thêm bất kỳ giải thích nào, chỉ trả về văn bản đã làm sạch.`;
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: isTvpl ? tvplSystemPrompt : genericSystemPrompt
          },
          {
            role: "user",
            content: `Làm sạch văn bản sau:\n\n${truncatedText}`
          }
        ],
        max_completion_tokens: 24000, // Increased from 16000 for longer documents
        temperature: 0.1,
      }),
    }));
    
    if (!response.ok) {
      console.log(`[parse-document] AI Post-Process: API error ${response.status}`);
      return { cleanedText: text, wasProcessed: false };
    }
    
    const data = await response.json();
    const cleanedText = data.choices?.[0]?.message?.content || '';
    
    if (!cleanedText || cleanedText.length < text.length * 0.3) {
      console.log('[parse-document] AI Post-Process: Cleaned text too short, keeping original');
      return { cleanedText: text, wasProcessed: false };
    }
    
    // Post-check quality
    const postCheck = calculateContentQuality(cleanedText);
    console.log(`[parse-document] AI Post-Process: Post-check quality=${postCheck.overall}, artifacts=${postCheck.breakdown.artifact_penalty}`);
    
    // v6: Force take AI output if original has severe contamination (artifact_penalty > 100)
    if (forceTakeAiOutput && cleanedText.length > text.length * 0.3) {
      console.log(`[parse-document] AI Post-Process: FORCE taking AI output (severe artifacts in original: ${preCheck.breakdown.artifact_penalty})`);
      return { cleanedText: cleanedText, wasProcessed: true };
    }
    
    // Only use cleaned version if it's actually better
    if (postCheck.overall > preCheck.overall || postCheck.breakdown.artifact_penalty < preCheck.breakdown.artifact_penalty * 0.5) {
      console.log(`[parse-document] AI Post-Process: Improved quality ${preCheck.overall} -> ${postCheck.overall}, artifacts ${preCheck.breakdown.artifact_penalty} -> ${postCheck.breakdown.artifact_penalty}`);
      return { cleanedText: cleanedText, wasProcessed: true };
    } else {
      console.log('[parse-document] AI Post-Process: No improvement, keeping original');
      return { cleanedText: text, wasProcessed: false };
    }
    
  } catch (error) {
    console.log(`[parse-document] AI Post-Process error:`, error);
    return { cleanedText: text, wasProcessed: false };
  }
}

/**
 * Validate if URL is a valid regulation document URL
 * Rejects search pages, listing pages, and invalid URLs
 */
function isValidRegulationUrl(url: string): { valid: boolean; reason?: string } {
  const urlLower = url.toLowerCase();
  
  // Reject search/listing pages
  if (urlLower.includes('search=') || urlLower.includes('keyword=')) {
    return { valid: false, reason: 'Search page URL - not a regulation document' };
  }
  
  if (urlLower.includes('ivanban.aspx') || urlLower.includes('timkiem.aspx')) {
    return { valid: false, reason: 'Search results page - not a regulation document' };
  }
  
  // Reject related documents pages
  if (urlLower.includes('vanbanlienquan.aspx')) {
    return { valid: false, reason: 'Related documents page - not a regulation document' };
  }
  
  // Reject category/listing pages
  if (urlLower.includes('/pages/cacbo.aspx') || urlLower.includes('/pages/home.aspx')) {
    return { valid: false, reason: 'Category listing page - not a regulation document' };
  }
  
  // Reject pure domain URLs without document path
  const urlPath = new URL(url).pathname;
  if (!urlPath || urlPath === '/' || urlPath.length < 5) {
    return { valid: false, reason: 'No document path in URL' };
  }
  
  return { valid: true };
}

/**
 * Helper function to update knowledge node with parse results
 * Includes debug information, content quality scoring, and AI post-processing
 */
async function updateKnowledgeNode(nodeId: string, documentUrl: string, result: ParseResult): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let finalText = result.text;
    let aiProcessed = false;
    
    // Calculate initial quality score
    let qualityResult = calculateContentQuality(result.text);
    
    // Determine if AI post-processing is needed
    // v6: Trigger based on BOTH quality score AND artifact penalty (especially for TVPL)
    const isTvpl = documentUrl.includes('thuvienphapluat.vn');
    const qualityThreshold = isTvpl ? 90 : 85;
    const artifactThreshold = isTvpl ? 20 : 30; // Lower threshold for TVPL
    
    const needsAiClean = result.success && (
      qualityResult.overall < qualityThreshold ||
      qualityResult.breakdown.artifact_penalty > artifactThreshold
    );
    
    if (needsAiClean) {
      console.log(`[parse-document] Node ${nodeId}: Needs AI clean (quality=${qualityResult.overall}, artifacts=${qualityResult.breakdown.artifact_penalty}, isTVPL=${isTvpl})`);
      
      const aiCleanResult = await aiPostProcessClean(result.text, documentUrl);
      if (aiCleanResult.wasProcessed) {
        finalText = aiCleanResult.cleanedText;
        aiProcessed = true;
        // Recalculate quality after AI processing
        qualityResult = calculateContentQuality(finalText);
        console.log(`[parse-document] Node ${nodeId}: After AI clean, quality = ${qualityResult.overall}, artifacts = ${qualityResult.breakdown.artifact_penalty}`);
      }
    }
    
    const parseStatus = result.success && finalText.length > 100 ? 'parsed' : 'failed';
    
    // Prepare update payload
    const updatePayload: Record<string, unknown> = {
      full_text: finalText,
      document_url: documentUrl,
      document_type: result.file_type,
      parse_status: parseStatus,
      content_quality_score: qualityResult.overall,
      quality_breakdown: qualityResult.breakdown,
    };
    
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
      quality_score: qualityResult.overall,
      quality_breakdown: qualityResult.breakdown,
      ai_post_processed: aiProcessed,
      text_length: finalText.length,
      parsed_at: new Date().toISOString(),
    };
    
    await supabase
      .from('industry_knowledge_nodes')
      .update(updatePayload)
      .eq('id', nodeId);
      
    console.log(`[parse-document] Updated node ${nodeId}: status=${parseStatus}, quality=${qualityResult.overall}, ai_processed=${aiProcessed}, length=${finalText.length}`);
  } catch (updateError) {
    console.error('[parse-document] Node update error:', updateError);
    // Don't fail the response for update errors
  }
}
