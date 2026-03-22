import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { callAI as callAIProvider } from "../_shared/ai-provider.ts";
import { getAIConfig } from "../_shared/ai-config.ts";
import { withSemanticCache } from "../_shared/cache/semantic-cache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionLearning {
  type: 'insight' | 'correction' | 'preference' | 'pattern' | 'warning';
  content: string;
  confidence: number;
  learnedAt: string;
  source?: string;
}

interface UserCorrection {
  original: string;
  corrected: string;
  correctionType: 'style' | 'fact' | 'tone' | 'length' | 'format';
  appliedAt: string;
}

interface ConversationRequest {
  action: 'create' | 'get' | 'list' | 'update' | 'delete' | 'add_message' | 'get_messages' | 'save_learnings' | 'extract_learnings';
  conversationId?: string;
  brandTemplateId?: string;
  organizationId?: string;
  contentGoal?: string;
  title?: string;
  summary?: string;
  isArchived?: boolean;
  message?: {
    role: 'user' | 'assistant';
    content: string;
    metadata?: Record<string, any>;
  };
  learnings?: SessionLearning[];
  correction?: UserCorrection;
  limit?: number;
  offset?: number;
}

Deno.serve(withPerf({ functionName: 'chat-conversations' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header for user context
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    // Validate JWT using getUser with explicit token (works in Edge runtime)
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ConversationRequest = await req.json();
    const { action } = body;

    console.log('Chat-conversations request:', { action, userId: user.id, conversationId: body.conversationId });

    switch (action) {
      case 'create': {
        // Create new conversation
        const { brandTemplateId, organizationId, contentGoal, title } = body;
        
        const { data, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            brand_template_id: brandTemplateId || null,
            organization_id: organizationId || null,
            content_goal: contentGoal || null,
            title: title || null,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Created conversation:', data.id);
        return new Response(JSON.stringify({ conversation: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get': {
        // Get single conversation
        const { conversationId } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ conversation: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        // List conversations with optional filters
        const { brandTemplateId, organizationId, limit = 20, offset = 0 } = body;
        
        let query = supabase
          .from('chat_conversations')
          .select('id, title, summary, message_count, last_message_at, content_goal, brand_template_id, is_archived, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (brandTemplateId) {
          query = query.eq('brand_template_id', brandTemplateId);
        }
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ conversations: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'update': {
        // Update conversation (title, summary, archive status)
        const { conversationId, title, summary, isArchived } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updates: Record<string, any> = {};
        if (title !== undefined) updates.title = title;
        if (summary !== undefined) updates.summary = summary;
        if (isArchived !== undefined) updates.is_archived = isArchived;

        const { data, error } = await supabase
          .from('chat_conversations')
          .update(updates)
          .eq('id', conversationId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ conversation: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        // Delete conversation
        const { conversationId } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('id', conversationId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_message': {
        // Add message to conversation
        const { conversationId, message } = body;
        if (!conversationId || !message) {
          return new Response(JSON.stringify({ error: 'conversationId and message required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('chat_conversation_messages')
          .insert({
            conversation_id: conversationId,
            role: message.role,
            content: message.content,
            metadata: message.metadata || {},
          })
          .select()
          .single();

        if (error) {
          console.error('Error adding message:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ message: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get_messages': {
        // Get messages for a conversation
        const { conversationId, limit = 50, offset = 0 } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabase
          .from('chat_conversation_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ messages: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'save_learnings': {
        // Save learnings to conversation
        const { conversationId, learnings, correction } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fetch existing data
        const { data: conv, error: fetchError } = await supabase
          .from('chat_conversations')
          .select('session_learnings, user_corrections')
          .eq('id', conversationId)
          .single();

        if (fetchError) {
          return new Response(JSON.stringify({ error: fetchError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const updates: Record<string, any> = {};

        // Merge learnings
        if (learnings && learnings.length > 0) {
          const existing = Array.isArray(conv?.session_learnings) ? conv.session_learnings : [];
          const merged = [...existing, ...learnings];
          // Deduplicate by content
          const seen = new Map<string, SessionLearning>();
          for (const l of merged) {
            const key = l.content?.toLowerCase().slice(0, 100) || '';
            const existing = seen.get(key);
            if (!existing || (l.confidence || 0) > (existing.confidence || 0)) {
              seen.set(key, l);
            }
          }
          updates.session_learnings = Array.from(seen.values()).slice(-30); // Keep last 30
        }

        // Add correction
        if (correction) {
          const existing = Array.isArray(conv?.user_corrections) ? conv.user_corrections : [];
          updates.user_corrections = [...existing, correction].slice(-20); // Keep last 20
        }

        const { data, error: updateError } = await supabase
          .from('chat_conversations')
          .update(updates)
          .eq('id', conversationId)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Saved learnings to conversation:', conversationId, {
          learningsCount: learnings?.length || 0,
          hasCorrection: !!correction,
        });

        return new Response(JSON.stringify({ 
          success: true,
          learningsSaved: learnings?.length || 0,
          correctionSaved: !!correction,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'extract_learnings': {
        // AI-powered extraction of learnings from conversation
        const { conversationId } = body;
        if (!conversationId) {
          return new Response(JSON.stringify({ error: 'conversationId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get conversation to retrieve organization_id for AI config
        const { data: convData } = await supabase
          .from('chat_conversations')
          .select('organization_id')
          .eq('id', conversationId)
          .single();

        // Get messages
        const { data: messages, error: msgError } = await supabase
          .from('chat_conversation_messages')
          .select('role, content, metadata')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgError || !messages?.length || messages.length < 4) {
          return new Response(JSON.stringify({ 
            learnings: [],
            skipped: true,
            reason: 'Not enough messages',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Build conversation text
        const conversationText = messages
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n\n')
          .slice(0, 6000);

        // Extract learnings using AI
        const extractionPrompt = `Analyze this content marketing conversation and extract learnings for future sessions.

Conversation:
${conversationText}

Extract learnings in these categories:
1. **correction** - User corrections to AI output (e.g., "don't use emoji", "too formal")
2. **preference** - User preferences discovered (e.g., prefers short content, likes casual tone)
3. **pattern** - Content patterns that worked (e.g., user likes listicles, carousel format)
4. **insight** - General insights about user's brand/style
5. **warning** - Things to avoid (e.g., avoid certain topics, don't mention competitors)

Return JSON array of learnings:
[
  {
    "type": "preference|correction|pattern|insight|warning",
    "content": "Clear, actionable statement",
    "confidence": 0.5-1.0 (how confident based on evidence)
  }
]

Rules:
- Only include learnings with clear evidence in conversation
- Be specific and actionable
- Max 5 learnings
- Return empty array [] if no significant learnings found
- Return ONLY valid JSON array, no markdown`;

        // Get AI config from Admin Panel
        const aiConfig = await getAIConfig('chat-conversations', convData?.organization_id);
        console.log('[chat-conversations] extract_learnings using AI config:', { model: aiConfig.model });

        // Call AI via multi-provider system with semantic cache
        const serviceSupabase = getServiceClient();
        const cacheInputText = `extract-learnings:${conversationText.substring(0, 300)}`;

        const semanticResult = await withSemanticCache(
          serviceSupabase,
          cacheInputText,
          { functionName: 'chat-conversations', organizationId: convData?.organization_id, similarityThreshold: 0.90 },
          async () => {
            return await callAIProvider({
              functionName: 'chat-conversations',
              organizationId: convData?.organization_id,
              messages: [{ role: 'user', content: extractionPrompt }],
              modelOverride: aiConfig.model || undefined,
              maxTokensOverride: 500,
              temperatureOverride: 0.3,
            });
          },
          3, // TTL 3 days
        );

        if (semanticResult.fromCache) {
          console.log(`[chat-conversations] Semantic cache hit for extract_learnings (similarity: ${semanticResult.similarity?.toFixed(3)})`);
        }

        const result = semanticResult.data;

        if (!result.success) {
          console.error('AI extraction error:', result.error);
          return new Response(JSON.stringify({ learnings: [], error: 'AI error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('[chat-conversations] AI response from provider:', result.provider, 'model:', result.model);
        const rawContent = result.data?.choices?.[0]?.message?.content?.trim() || '[]';
        
        let learnings: SessionLearning[] = [];
        try {
          // Clean markdown if present
          const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            learnings = parsed.map((l: any) => ({
              type: l.type || 'insight',
              content: l.content || '',
              confidence: l.confidence || 0.5,
              learnedAt: new Date().toISOString(),
              source: 'ai_extraction',
            })).filter((l: SessionLearning) => l.content);
          }
        } catch (e) {
          console.warn('Failed to parse learnings:', e);
        }

        // Auto-save if learnings found
        if (learnings.length > 0) {
          const { data: conv } = await supabase
            .from('chat_conversations')
            .select('session_learnings')
            .eq('id', conversationId)
            .single();

          const existing = Array.isArray(conv?.session_learnings) ? conv.session_learnings : [];
          const merged = [...existing, ...learnings];
          
          await supabase
            .from('chat_conversations')
            .update({ session_learnings: merged.slice(-30) })
            .eq('id', conversationId);

          console.log('Auto-saved extracted learnings:', learnings.length);
        }

        return new Response(JSON.stringify({ 
          learnings,
          extracted: learnings.length,
          autoSaved: learnings.length > 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Chat-conversations error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}));
