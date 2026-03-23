/**
 * Heuristic SEO score calculator for website channel content.
 * Evaluates content structure without requiring an edge function.
 */

export function calculateSEOScore(content: string): number {
  if (!content || content.length < 20) return 0;

  let score = 0;

  // 1. Headings structure (max 20)
  const h1Count = (content.match(/^#\s+/gm) || []).length;
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;
  if (h1Count >= 1) score += 8;
  if (h2Count >= 2) score += 7;
  else if (h2Count >= 1) score += 4;
  if (h3Count >= 1) score += 5;

  // 2. Content length / word count (max 20)
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (words >= 800) score += 20;
  else if (words >= 500) score += 16;
  else if (words >= 300) score += 12;
  else if (words >= 150) score += 6;

  // 3. Meta-like intro — first paragraph acts as meta description (max 15)
  const firstParagraph = content.split('\n').find(l => l.trim() && !l.startsWith('#'));
  if (firstParagraph) {
    const introLen = firstParagraph.trim().length;
    if (introLen >= 50 && introLen <= 160) score += 15;
    else if (introLen >= 30 && introLen <= 300) score += 10;
    else score += 5;
  }

  // 4. Links (max 15)
  const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  const urlCount = (content.match(/https?:\/\/\S+/g) || []).length;
  const totalLinks = linkCount + urlCount;
  if (totalLinks >= 3) score += 15;
  else if (totalLinks >= 1) score += 10;

  // 5. Keyword density — check if any word appears 3+ times (max 15)
  const wordFreq: Record<string, number> = {};
  const lowerWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  lowerWords.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
  const repeatedKeywords = Object.values(wordFreq).filter(c => c >= 3).length;
  if (repeatedKeywords >= 3) score += 15;
  else if (repeatedKeywords >= 1) score += 10;

  // 6. Structured paragraphs — multiple paragraphs with whitespace (max 15)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length >= 5) score += 15;
  else if (paragraphs.length >= 3) score += 10;
  else if (paragraphs.length >= 2) score += 5;

  return Math.min(100, score);
}
