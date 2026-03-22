import { withPerf, getServiceClient, getAuthClient } from "../_shared/middleware/perf.ts";
import { callAIWithMetrics } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { createPromptManager } from "../_shared/prompt-integration.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SummarizeRequest {
  conversationId: string;
  force?: boolean; // Force re-summarize even if summary exists
}

Deno.serve(withPerf({ functionName: 'summarize-conversation' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getAuthClient(authHeader);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SummarizeRequest = await req.json();
    const { conversationId, force = false } = body;

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversationId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, summary, message_count, content_goal')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already summarized and not forced
    if (conversation.summary && !force) {
      return new Response(JSON.stringify({ 
        summary: conversation.summary,
        skipped: true,
        reason: 'Already summarized' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only summarize if conversation has enough messages
    if (conversation.message_count < 6) {
      return new Response(JSON.stringify({ 
        summary: null,
        skipped: true,
        reason: 'Not enough messages to summarize' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all messages
    const { data: messages, error: msgError } = await supabase
      .from('chat_conversation_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError || !messages?.length) {
      return new Response(JSON.stringify({ error: 'No messages found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build conversation text for summarization
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Try to fetch system prompt from registry
    let baseSummaryPrompt = '';
    try {
      const serviceSupabase = getServiceClient();
      const promptManager = createPromptManager(serviceSupabase, 'summarize-conversation');
      baseSummaryPrompt = await promptManager.get('system_summarize', {
        messageCount: messages.length.toString(),
      });
    } catch (err) {
      console.warn('[summarize-conversation] Failed to fetch prompt from registry, using hardcoded');
    }

    // Generate summary using AI
    const summaryPrompt = baseSummaryPrompt || `Summarize this content marketing conversation in 2-3 concise sentences. Focus on:
1. Main topic/themes discussed
2. Key decisions or topics suggested
3. Format preferences if any

Conversation:
${conversationText.slice(0, 4000)}

Provide summary in Vietnamese. Be brief and factual.`;

    const aiConfig = await getAIConfig('summarize-conversation');
    const adminModel = aiConfig?.model || undefined;

    const serviceSupabase = getServiceClient();
    
    // Use semantic cache for summarization
    const cachedResult = await withSemanticCache(
      serviceSupabase,
      summaryPrompt,
      { functionName: 'summarize-conversation' },
      async () => {
        const aiResult = await callAIWithMetrics(serviceSupabase, {
          functionName: 'summarize-conversation',
          userId: user.id,
          messages: [
            { role: 'user', content: summaryPrompt }
          ],
          modelOverride: adminModel,
          maxTokensOverride: aiConfig?.max_tokens || 200,
          temperatureOverride: aiConfig?.temperature || 0.3,
        });
        return aiResult;
      },
      7,
    );

    const aiResult = cachedResult.data;
    if (cachedResult.fromCache) {
      console.log('[summarize-conversation] Using cached result, similarity:', cachedResult.similarity);
    }

    if (!aiResult.success) {
      console.error('AI summarization error:', aiResult.error);
      throw new Error('Failed to generate summary');
    }

    const summary = aiResult.data?.choices?.[0]?.message?.content?.trim() || '';

    if (!summary) {
      throw new Error('Empty summary generated');
    }

    // Generate title if not set
    let title = conversation.title;
    if (!title || title.length > 100) {
      // Use first user message as title, truncated
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        title = firstUserMessage.content.slice(0, 80);
        if (firstUserMessage.content.length > 80) {
          title += '...';
        }
      }
    }

    // Update conversation with summary
    const { error: updateError } = await supabase
      .from('chat_conversations')
      .update({ 
        summary,
        title: title || conversation.title,
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation summary:', updateError);
    }

    console.log('Generated summary for conversation:', conversationId, {
      messageCount: messages.length,
      summaryLength: summary.length,
    });

    return new Response(JSON.stringify({ 
      summary,
      title,
      messageCount: messages.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Summarize-conversation error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
