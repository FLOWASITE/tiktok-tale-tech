import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Embedding model config
const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIMENSIONS = 768;
const MAX_CHUNK_LENGTH = 2000; // Characters per chunk
const MAX_BATCH_SIZE = 100;

interface EmbeddingRequest {
  action: 'embed_single' | 'embed_batch' | 'index_content' | 'index_all' | 'index_conversation';
  texts?: string[];
  contentType?: 'topic' | 'script' | 'carousel' | 'multichannel';
  contentId?: string;
  conversationId?: string;
  organizationId: string;
  brandTemplateId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Split long text into chunks
function chunkText(text: string, maxLength: number = MAX_CHUNK_LENGTH): string[] {
  if (text.length <= maxLength) return [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text.substring(0, maxLength)];
}

// Generate embeddings using Lovable AI API
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log(`Generating embeddings for ${texts.length} texts`);
  
  // Use Gemini embedding model via Lovable AI gateway
  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Embedding API error:', response.status, errorText);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

// Fetch content from database by type and ID
async function fetchContent(
  supabase: any,
  contentType: string,
  contentId: string
): Promise<{ text: string; metadata: Record<string, any> } | null> {
  let query;
  
  switch (contentType) {
    case 'topic':
      query = supabase
        .from('topic_history')
        .select('topic, category, pillar, content_goal, format, performance_score')
        .eq('id', contentId)
        .single();
      break;
    case 'script':
      query = supabase
        .from('scripts')
        .select('title, topic, script_content, hook, purpose, video_type')
        .eq('id', contentId)
        .single();
      break;
    case 'carousel':
      query = supabase
        .from('carousels')
        .select('title, topic, slides_content, caption_suggestion')
        .eq('id', contentId)
        .single();
      break;
    case 'multichannel':
      query = supabase
        .from('multi_channel_contents')
        .select('title, topic, channel_contents, content_goal')
        .eq('id', contentId)
        .single();
      break;
    default:
      return null;
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error(`Error fetching ${contentType}:`, error);
    return null;
  }

  // Extract text and metadata based on content type
  let text = '';
  let metadata: Record<string, any> = { content_type: contentType };

  switch (contentType) {
    case 'topic':
      text = data.topic;
      metadata = { 
        ...metadata, 
        category: data.category, 
        pillar: data.pillar,
        content_goal: data.content_goal,
        format: data.format,
        performance_score: data.performance_score
      };
      break;
    case 'script':
      text = `${data.title || ''} ${data.topic || ''} ${data.hook || ''} ${data.script_content || ''}`.trim();
      metadata = { 
        ...metadata, 
        purpose: data.purpose, 
        video_type: data.video_type 
      };
      break;
    case 'carousel':
      const slidesText = typeof data.slides_content === 'string' 
        ? data.slides_content 
        : JSON.stringify(data.slides_content);
      text = `${data.title || ''} ${data.topic || ''} ${slidesText} ${data.caption_suggestion || ''}`.trim();
      break;
    case 'multichannel':
      const channelsText = typeof data.channel_contents === 'string'
        ? data.channel_contents
        : JSON.stringify(data.channel_contents);
      text = `${data.title || ''} ${data.topic || ''} ${channelsText}`.trim();
      metadata = { ...metadata, content_goal: data.content_goal };
      break;
  }

  return { text, metadata };
}

// Upsert embeddings into database
async function upsertEmbeddings(
  supabase: any,
  contentType: string,
  contentId: string,
  chunks: string[],
  embeddings: number[][],
  organizationId: string,
  brandTemplateId?: string,
  metadata?: Record<string, any>
): Promise<number> {
  const records = chunks.map((text, index) => ({
    content_type: contentType,
    content_id: contentId,
    chunk_index: index,
    content_text: text,
    embedding: `[${embeddings[index].join(',')}]`,
    organization_id: organizationId,
    brand_template_id: brandTemplateId || null,
    metadata: metadata || {},
  }));

  // Delete existing embeddings for this content
  await supabase
    .from('content_embeddings')
    .delete()
    .eq('content_type', contentType)
    .eq('content_id', contentId);

  // Insert new embeddings
  const { error } = await supabase
    .from('content_embeddings')
    .insert(records);

  if (error) {
    console.error('Error upserting embeddings:', error);
    throw error;
  }

  return records.length;
}

// Index all content for an organization
async function indexAllContent(
  supabase: any,
  organizationId: string,
  brandTemplateId?: string
): Promise<{ indexed: number; errors: string[] }> {
  let totalIndexed = 0;
  const errors: string[] = [];

  // Index topics
  const { data: topics } = await supabase
    .from('topic_history')
    .select('id, topic, category, pillar, performance_score, brand_template_id')
    .eq('organization_id', organizationId)
    .eq('was_used', true)
    .limit(500);

  if (topics) {
    for (const topic of topics) {
      try {
        const chunks = chunkText(topic.topic);
        const embeddings = await generateEmbeddings(chunks);
        await upsertEmbeddings(
          supabase,
          'topic',
          topic.id,
          chunks,
          embeddings,
          organizationId,
          topic.brand_template_id,
          { category: topic.category, pillar: topic.pillar, performance_score: topic.performance_score }
        );
        totalIndexed++;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        errors.push(`topic:${topic.id}: ${errorMessage}`);
      }
    }
  }

  console.log(`Indexed ${totalIndexed} items with ${errors.length} errors`);
  return { indexed: totalIndexed, errors };
}

Deno.serve(withPerf({ functionName: 'generate-embedding', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EmbeddingRequest = await req.json();
    const { action, texts, contentType, contentId, conversationId, organizationId, brandTemplateId, userId, metadata } = body;

    if (!organizationId && action !== 'index_conversation') {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (action) {
      case 'embed_single':
      case 'embed_batch': {
        if (!texts || texts.length === 0) {
          return new Response(
            JSON.stringify({ error: 'texts array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const batchTexts = texts.slice(0, MAX_BATCH_SIZE);
        const embeddings = await generateEmbeddings(batchTexts);

        return new Response(
          JSON.stringify({ success: true, embeddings }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'index_content': {
        if (!contentType || !contentId) {
          return new Response(
            JSON.stringify({ error: 'contentType and contentId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const content = await fetchContent(supabase, contentType, contentId);
        if (!content) {
          return new Response(
            JSON.stringify({ error: 'Content not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const chunks = chunkText(content.text);
        const embeddings = await generateEmbeddings(chunks);
        const indexed = await upsertEmbeddings(
          supabase,
          contentType,
          contentId,
          chunks,
          embeddings,
          organizationId,
          brandTemplateId,
          { ...content.metadata, ...metadata }
        );

        return new Response(
          JSON.stringify({ success: true, indexed, chunks: chunks.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'index_all': {
        const result = await indexAllContent(supabase, organizationId, brandTemplateId);
        return new Response(
          JSON.stringify({ success: true, ...result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'index_conversation': {
        if (!conversationId || !userId) {
          return new Response(
            JSON.stringify({ error: 'conversationId and userId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Import conversation embedder
        const conversationEmbedder = await import('../_shared/conversation-embedder.ts');
        const { indexConversation } = conversationEmbedder;
        
        // Fetch conversation with messages
        const { data: conversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('id, user_id, organization_id, brand_template_id, title, summary, session_learnings')
          .eq('id', conversationId)
          .single();
        
        if (convError || !conversation) {
          return new Response(
            JSON.stringify({ error: 'Conversation not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Fetch messages
        const { data: messages } = await supabase
          .from('chat_conversation_messages')
          .select('id, role, content, metadata, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        
        const conversationData = {
          ...conversation,
          messages: messages || [],
        };
        
        const result = await indexConversation(supabase, conversationData);
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('generate-embedding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
