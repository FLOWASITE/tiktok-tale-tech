// ============================================
// Help Article Search Edge Function  
// Uses Supabase.ai.Session with gte-small model (384 dimensions)
// ============================================

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize gte-small embedding model (384 dimensions)
const model = new Supabase.ai.Session('gte-small');

interface SearchRequest {
  query: string;
  currentRoute?: string;
  category?: string;
  limit?: number;
}

interface ArticleResult {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  similarity: number;
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string | null;
  keywords: string[] | null;
}

// Generate embedding using Supabase.ai.Session
async function generateEmbedding(text: string): Promise<number[]> {
  const output = await model.run(text, {
    mean_pool: true,
    normalize: true,
  });
  
  return Array.from(output as Float32Array);
}

Deno.serve(withPerf({ functionName: 'help-article-search' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, currentRoute, category, limit = 3 }: SearchRequest = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ articles: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[help-article-search] Missing required environment variables");
      return new Response(JSON.stringify({ articles: [], error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[help-article-search] Searching for: "${query}", route: ${currentRoute}, category: ${category}`);

    // Step 1: Generate embedding for the query using gte-small
    try {
      const queryEmbedding = await generateEmbedding(query);

      // Step 2: Search using the database function
      const { data: articles, error: searchError } = await supabase.rpc('search_help_articles', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_route: currentRoute || null,
        match_category: category || null,
        match_threshold: 0.5,
        match_count: limit
      });

      if (searchError) {
        console.error("[help-article-search] Search RPC error:", searchError);
        return await fallbackKeywordSearch(supabase, query, currentRoute, category, limit, corsHeaders);
      }

      console.log(`[help-article-search] Found ${articles?.length || 0} articles via semantic search`);

      // If semantic search returns no results, try keyword search
      if (!articles || articles.length === 0) {
        return await fallbackKeywordSearch(supabase, query, currentRoute, category, limit, corsHeaders);
      }

      return new Response(JSON.stringify({ 
        articles: articles as ArticleResult[],
        searchType: 'semantic'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (embeddingError) {
      console.error("[help-article-search] Embedding error:", embeddingError);
      return await fallbackKeywordSearch(supabase, query, currentRoute, category, limit, corsHeaders);
    }

  } catch (error) {
    console.error("[help-article-search] Error:", error);
    return new Response(JSON.stringify({ 
      articles: [],
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function fallbackKeywordSearch(
  supabase: SupabaseClient<any>,
  query: string,
  currentRoute: string | undefined,
  category: string | undefined,
  limit: number,
  corsHeaders: Record<string, string>
): Promise<Response> {
  console.log("[help-article-search] Using keyword fallback search");
  
  try {
    // Normalize query for keyword matching
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    
    let queryBuilder = supabase
      .from('help_articles')
      .select('id, title, content, category, keywords')
      .eq('is_published', true)
      .order('priority', { ascending: false })
      .limit(limit);

    // Filter by category if provided
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    // Filter by route context if provided
    if (currentRoute) {
      queryBuilder = queryBuilder.contains('route_context', [currentRoute]);
    }

    const { data: articles, error } = await queryBuilder;

    if (error) {
      console.error("[help-article-search] Keyword search error:", error);
      return new Response(JSON.stringify({ articles: [], searchType: 'fallback' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score articles by keyword matches
    const scoredArticles = ((articles || []) as HelpArticle[]).map(article => {
      let score = 0;
      const titleLower = (article.title || '').toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      const articleKeywords = (article.keywords || []).map((k: string) => k.toLowerCase());

      keywords.forEach(keyword => {
        if (titleLower.includes(keyword)) score += 3;
        if (contentLower.includes(keyword)) score += 1;
        if (articleKeywords.some((k: string) => k.includes(keyword))) score += 2;
      });

      return { ...article, similarity: score / 10 };
    })
    .filter(a => a.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

    console.log(`[help-article-search] Found ${scoredArticles.length} articles via keyword search`);

    return new Response(JSON.stringify({ 
      articles: scoredArticles,
      searchType: 'keyword'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[help-article-search] Fallback search error:", error);
    return new Response(JSON.stringify({ articles: [], searchType: 'error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }));
  }
}
