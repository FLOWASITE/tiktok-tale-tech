/**
 * Content formatting utilities for HTML-to-Markdown conversion
 * Used to ensure website content renders correctly in mockups
 */

/**
 * Detects if content contains HTML tags
 */
export function isHTMLContent(content: string): boolean {
  if (!content) return false;
  const htmlTagPattern = /<\/?(?:h[1-6]|p|div|span|strong|b|em|i|ul|ol|li|a|br|blockquote|hr)[^>]*>/i;
  return htmlTagPattern.test(content);
}

/**
 * Converts HTML content to Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  
  let md = html;
  
  // Headers (keep order: h1 first, then h2, etc.)
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Bold & Italic (handle nested cases)
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Lists - handle ul/ol containers first
  md = md.replace(/<ul[^>]*>/gi, '\n');
  md = md.replace(/<\/ul>/gi, '\n');
  md = md.replace(/<ol[^>]*>/gi, '\n');
  md = md.replace(/<\/ol>/gi, '\n');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Links
  md = md.replace(/<a[^>]*href=[\"']([^\"]*)[\"'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Line breaks & dividers
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n');
  
  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n');
  
  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '\"');
  md = md.replace(/&#39;/g, '\'');
  
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  
  return md;
}

/**
 * Strips SEO metadata lines that AI sometimes embeds directly in content body.
 * Removes lines like "**SEO Title:** ...", "Meta Description: ...", etc.
 */
export function stripSeoMetadata(content: string): string {
  if (!content) return '';
  
  const seoPatterns = [
    // English patterns
    /^(?:\*\*|#{1,3}\s*)?SEO\s*Title\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Meta\s*Description\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Focus\s*Keyword[s]?\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Slug\s*[:：]\s*\**.*\**\s*$/gim,
    // Vietnamese patterns
    /^(?:\*\*|#{1,3}\s*)?Tiêu\s*đề\s*SEO\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Mô\s*tả\s*Meta\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Từ\s*khóa\s*chính\s*[:：]\s*\**.*\**\s*$/gim,
    /^(?:\*\*|#{1,3}\s*)?Đường\s*dẫn\s*[:：]\s*\**.*\**\s*$/gim,
  ];
  
  let cleaned = content;
  for (const pattern of seoPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Clean up extra blank lines left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

/**
 * Ensures content is in Markdown format (auto-converts HTML if detected)
 */
export function ensureMarkdownFormat(content: string): string {
  if (!content) return '';
  if (isHTMLContent(content)) {
    console.log('[contentFormatter] HTML detected, converting to Markdown');
    return htmlToMarkdown(content);
  }
  return content;
}
