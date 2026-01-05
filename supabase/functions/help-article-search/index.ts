import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[help-article-search] Missing required environment variables");
      return new Response(JSON.stringify({ articles: [], error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`[help-article-search] Searching for: "${query}", route: ${currentRoute}, category: ${category}`);

    // Step 1: Generate embedding for the query
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 768,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error(`[help-article-search] Embedding API error: ${embeddingResponse.status}`, errorText);
      
      // Fallback to keyword search if embedding fails
      return await fallbackKeywordSearch(supabase, query, currentRoute, category, limit, corsHeaders);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      console.error("[help-article-search] No embedding returned");
      return await fallbackKeywordSearch(supabase, query, currentRoute, category, limit, corsHeaders);
    }

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
    });
  }
}
