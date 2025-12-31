import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationRequest {
  action: 'create' | 'get' | 'list' | 'update' | 'delete' | 'add_message' | 'get_messages';
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
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header for user context
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
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

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
});
