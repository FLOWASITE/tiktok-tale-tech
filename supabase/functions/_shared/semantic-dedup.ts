// ============================================
// Semantic Deduplication for AI Content Generation
// Prevents creating content semantically similar to existing content
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callEmbedding } from "./embedding.ts";

const EMBEDDING_DIMENSIONS = 384; // pgvector column dim

// Deduplication configuration
export const DEDUP_CONFIG = {
  // Similarity threshold - content with similarity >= this is considered duplicate
  SIMILARITY_THRESHOLD: 0.85,
  // Minimum threshold for warning (similar but not exact duplicate)
  WARNING_THRESHOLD: 0.75,
  // How many results to check
  MATCH_COUNT: 5,
  // Only check content from last N days
  LOOKBACK_DAYS: 90,
  // Minimum text length to check (short texts have high false positive)
  MIN_TEXT_LENGTH: 50,
} as const;

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  isWarning: boolean;
  similarity?: number;
  matchedContentId?: string;
  matchedContentPreview?: string;
  matchedContentType?: string;
  matchedContentTitle?: string;
  createdAt?: string;
}

export interface SimilarContent {
  id: string;
  content_id: string;
  content_type: string;
  content_text: string;
  similarity: number;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Generate embedding for text via shared multi-provider helper.
 * Returns 384-dim vector matching pgvector column.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const r = await callEmbedding({ text, dims: EMBEDDING_DIMENSIONS });
  return r.embedding;
}

/**
 * Search for similar content using vector similarity
 */
async function searchSimilarContent(
  supabase: any, // Use 'any' to avoid strict type checking for RPC calls
  embedding: number[],
  organizationId: string,
  brandTemplateId?: string,
  excludeContentId?: string,
  contentType?: string
): Promise<SimilarContent[]> {
  // Format embedding for pgvector
  const embeddingStr = `[${embedding.join(',')}]`;

  // Build the RPC call - use the search_embeddings function with correct param names
  // Based on the existing function signature in db-functions
  const { data, error } = await supabase.rpc('search_embeddings', {
    query_embedding: embeddingStr,
    match_organization_id: organizationId,
    match_brand_template_id: brandTemplateId || null,
    match_content_types: contentType ? [contentType] : null,
    match_threshold: DEDUP_CONFIG.WARNING_THRESHOLD,
    match_count: DEDUP_CONFIG.MATCH_COUNT,
  } as any); // Use 'as any' to bypass strict typing for RPC

  if (error) {
    console.error('Search embeddings error:', error);
    // If the function doesn't exist, return empty (graceful degradation)
    if (error.message?.includes('function') || error.message?.includes('does not exist')) {
      console.warn('search_embeddings function not available - skipping dedup');
      return [];
    }
    throw error;
  }

  // Filter out the content being checked (if provided)
  let results = (data || []) as SimilarContent[];
  
  if (excludeContentId) {
    results = results.filter(r => r.content_id !== excludeContentId);
  }
  
  if (contentType) {
    results = results.filter(r => r.content_type === contentType);
  }

  return results;
}

/**
 * Check if new content is semantically similar to existing content
 * 
 * @param supabase - Supabase client
 * @param newContent - The new content text to check
 * @param organizationId - Organization ID to scope the search
 * @param brandTemplateId - Optional brand template to scope further
 * @param excludeContentId - Content ID to exclude (for re-checking existing content)
 * @param contentType - Optional content type filter ('multichannel', 'script', 'carousel')
 */
export async function checkSemanticDuplicate(
  supabase: any, // Use 'any' to avoid strict type checking for RPC calls
  newContent: string,
  organizationId: string,
  brandTemplateId?: string,
  excludeContentId?: string,
  contentType?: string
): Promise<DuplicateCheckResult> {
  try {
    // Skip check for very short content
    if (!newContent || newContent.length < DEDUP_CONFIG.MIN_TEXT_LENGTH) {
      return { isDuplicate: false, isWarning: false };
    }

    // Generate embedding for new content
    const embedding = await generateEmbedding(newContent);

    // Search for similar content
    const similarContent = await searchSimilarContent(
      supabase,
      embedding,
      organizationId,
      brandTemplateId,
      excludeContentId,
      contentType
    );

    if (similarContent.length === 0) {
      return { isDuplicate: false, isWarning: false };
    }

    // Get the most similar content
    const topMatch = similarContent[0];
    const similarity = topMatch.similarity;

    // Check if it's a duplicate
    if (similarity >= DEDUP_CONFIG.SIMILARITY_THRESHOLD) {
      return {
        isDuplicate: true,
        isWarning: false,
        similarity,
        matchedContentId: topMatch.content_id,
        matchedContentPreview: topMatch.content_text?.substring(0, 200) + '...',
        matchedContentType: topMatch.content_type,
        matchedContentTitle: topMatch.metadata?.title,
        createdAt: topMatch.created_at,
      };
    }

    // Check if it's a warning (similar but not exact)
    if (similarity >= DEDUP_CONFIG.WARNING_THRESHOLD) {
      return {
        isDuplicate: false,
        isWarning: true,
        similarity,
        matchedContentId: topMatch.content_id,
        matchedContentPreview: topMatch.content_text?.substring(0, 200) + '...',
        matchedContentType: topMatch.content_type,
        matchedContentTitle: topMatch.metadata?.title,
        createdAt: topMatch.created_at,
      };
    }

    return { isDuplicate: false, isWarning: false };
  } catch (error) {
    console.error('Semantic duplicate check error:', error);
    // Fail open - allow content creation if check fails
    return { isDuplicate: false, isWarning: false };
  }
}

/**
 * Extract key content text from multichannel content for dedup check
 */
export function extractMultichannelText(channelContents: Record<string, string>): string {
  // Get all channel content and join them
  const texts = Object.entries(channelContents)
    .filter(([key, value]) => value && typeof value === 'string')
    .map(([key, value]) => value)
    .slice(0, 3); // Only check first 3 channels to reduce cost

  return texts.join(' ').substring(0, 2000);
}

/**
 * Build differentiation instruction when similar content is found
 */
export function buildDifferentiationInstruction(matchedContent: string): string {
  return `
⚠️ CẢNH BÁO: Đã phát hiện nội dung tương tự trong hệ thống.

## NỘI DUNG TƯƠNG TỰ ĐÃ TỒN TẠI:
"${matchedContent.substring(0, 300)}..."

## YÊU CẦU KHÁC BIỆT HÓA:
1. KHÔNG lặp lại góc nhìn/angle của nội dung trên
2. Sử dụng hook/opening khác biệt hoàn toàn
3. Đưa ra insights/số liệu mới
4. Thay đổi cấu trúc và flow
5. Nếu có thể, chọn góc tiếp cận đối lập

TẠO NỘI DUNG HOÀN TOÀN MỚI VÀ KHÁC BIỆT.
`;
}
