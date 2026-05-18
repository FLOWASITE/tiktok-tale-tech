// ============================================
// Conversation Embedder - Utilities for indexing conversation history
// ============================================
import { callEmbedding } from "./embedding.ts";

const EMBEDDING_DIMENSIONS = 384; // matches pgvector column dimension
const MAX_CHUNK_LENGTH = 1500;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ConversationData {
  id: string;
  user_id: string;
  organization_id?: string;
  brand_template_id?: string;
  title?: string;
  summary?: string;
  session_learnings?: any[];
  messages: ConversationMessage[];
}

export interface EmbeddingRecord {
  conversation_id: string;
  message_id?: string;
  embedding_type: 'summary' | 'message' | 'exchange' | 'key_insight';
  content_text: string;
  embedding: number[];
  user_id: string;
  organization_id?: string;
  brand_template_id?: string;
  metadata: Record<string, any>;
}

/**
 * Generate embeddings using Lovable AI API
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: [text.slice(0, MAX_CHUNK_LENGTH * 2)],
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (error) {
    console.error('generateEmbedding error:', error);
    return null;
  }
}

/**
 * Extract key messages from a conversation
 * Prioritizes: user corrections, positive feedback, insights
 */
export function extractKeyMessages(messages: ConversationMessage[]): ConversationMessage[] {
  const keyMessages: ConversationMessage[] = [];
  
  for (const msg of messages) {
    const metadata = msg.metadata || {};
    
    // Include messages with positive feedback
    if (metadata.feedback === 'up') {
      keyMessages.push(msg);
      continue;
    }
    
    // Include user messages that contain corrections/preferences
    if (msg.role === 'user') {
      const lowerContent = msg.content.toLowerCase();
      const hasCorrection = 
        lowerContent.includes('không') ||
        lowerContent.includes('đừng') ||
        lowerContent.includes('thay') ||
        lowerContent.includes('sửa') ||
        lowerContent.includes('chỉnh') ||
        lowerContent.includes('don\'t') ||
        lowerContent.includes('instead') ||
        lowerContent.includes('prefer');
      
      if (hasCorrection && msg.content.length > 20) {
        keyMessages.push(msg);
      }
    }
    
    // Include assistant messages with tool results (actions taken)
    if (msg.role === 'assistant' && metadata.toolResults?.length > 0) {
      keyMessages.push(msg);
    }
  }
  
  // Limit to 10 most important
  return keyMessages.slice(0, 10);
}

/**
 * Create a summary of the conversation for embedding
 */
export function createConversationSummary(conversation: ConversationData): string {
  const parts: string[] = [];
  
  // Add title if available
  if (conversation.title) {
    parts.push(`Chủ đề: ${conversation.title}`);
  }
  
  // Add summary if available
  if (conversation.summary) {
    parts.push(`Tóm tắt: ${conversation.summary}`);
  }
  
  // Add key learnings
  if (conversation.session_learnings?.length) {
    const learnings = conversation.session_learnings
      .slice(0, 5)
      .map((l: any) => l.content)
      .join('; ');
    parts.push(`Insights: ${learnings}`);
  }
  
  // Add sample of conversation topics
  const userMessages = conversation.messages
    .filter(m => m.role === 'user')
    .slice(0, 5)
    .map(m => m.content.slice(0, 100));
  
  if (userMessages.length > 0) {
    parts.push(`Các câu hỏi: ${userMessages.join(' | ')}`);
  }
  
  return parts.join('\n').slice(0, MAX_CHUNK_LENGTH);
}

/**
 * Create exchange pairs (user question + assistant answer)
 * These provide better context for semantic search
 */
export function createExchangePairs(messages: ConversationMessage[]): Array<{
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
  text: string;
}> {
  const exchanges: Array<{
    userMessage: ConversationMessage;
    assistantMessage: ConversationMessage;
    text: string;
  }> = [];
  
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];
    
    if (current.role === 'user' && next.role === 'assistant') {
      // Prioritize exchanges with feedback or tool usage
      const hasValue = 
        next.metadata?.feedback === 'up' ||
        next.metadata?.toolResults?.length > 0 ||
        current.content.length > 50;
      
      if (hasValue) {
        const text = `Q: ${current.content.slice(0, 500)}\nA: ${next.content.slice(0, 1000)}`;
        exchanges.push({
          userMessage: current,
          assistantMessage: next,
          text,
        });
      }
    }
  }
  
  // Return top 5 most valuable exchanges
  return exchanges.slice(0, 5);
}

/**
 * Index a full conversation - creates multiple embedding records
 */
export async function indexConversation(
  supabase: any,
  conversation: ConversationData
): Promise<{ success: boolean; recordsCreated: number; error?: string }> {
  const records: EmbeddingRecord[] = [];
  
  try {
    // 1. Create summary embedding
    const summaryText = createConversationSummary(conversation);
    if (summaryText.length > 50) {
      const summaryEmbedding = await generateEmbedding(summaryText);
      if (summaryEmbedding) {
        records.push({
          conversation_id: conversation.id,
          embedding_type: 'summary',
          content_text: summaryText,
          embedding: summaryEmbedding,
          user_id: conversation.user_id,
          organization_id: conversation.organization_id,
          brand_template_id: conversation.brand_template_id,
          metadata: {
            title: conversation.title,
            message_count: conversation.messages.length,
          },
        });
      }
    }
    
    // 2. Create exchange embeddings
    const exchanges = createExchangePairs(conversation.messages);
    for (const exchange of exchanges) {
      const embedding = await generateEmbedding(exchange.text);
      if (embedding) {
        records.push({
          conversation_id: conversation.id,
          message_id: exchange.assistantMessage.id,
          embedding_type: 'exchange',
          content_text: exchange.text,
          embedding,
          user_id: conversation.user_id,
          organization_id: conversation.organization_id,
          brand_template_id: conversation.brand_template_id,
          metadata: {
            user_message_id: exchange.userMessage.id,
            has_feedback: exchange.assistantMessage.metadata?.feedback,
            has_tools: exchange.assistantMessage.metadata?.toolResults?.length > 0,
          },
        });
      }
    }
    
    // 3. Create key insight embeddings from session learnings
    if (conversation.session_learnings?.length) {
      for (const learning of conversation.session_learnings.slice(0, 3)) {
        const learningText = `${learning.type}: ${learning.content}`;
        const embedding = await generateEmbedding(learningText);
        if (embedding) {
          records.push({
            conversation_id: conversation.id,
            embedding_type: 'key_insight',
            content_text: learningText,
            embedding,
            user_id: conversation.user_id,
            organization_id: conversation.organization_id,
            brand_template_id: conversation.brand_template_id,
            metadata: {
              learning_type: learning.type,
              confidence: learning.confidence,
            },
          });
        }
      }
    }
    
    if (records.length === 0) {
      return { success: true, recordsCreated: 0 };
    }
    
    // Delete existing embeddings for this conversation
    await supabase
      .from('conversation_embeddings')
      .delete()
      .eq('conversation_id', conversation.id);
    
    // Insert new embeddings
    const insertRecords = records.map(r => ({
      ...r,
      embedding: `[${r.embedding.join(',')}]`,
    }));
    
    const { error: insertError } = await supabase
      .from('conversation_embeddings')
      .insert(insertRecords);
    
    if (insertError) {
      console.error('Error inserting conversation embeddings:', insertError);
      return { success: false, recordsCreated: 0, error: insertError.message };
    }
    
    // Update conversation indexed_at timestamp
    await supabase
      .from('chat_conversations')
      .update({ embeddings_indexed_at: new Date().toISOString() })
      .eq('id', conversation.id);
    
    console.log(`Indexed conversation ${conversation.id}: ${records.length} embeddings created`);
    return { success: true, recordsCreated: records.length };
    
  } catch (error) {
    console.error('indexConversation error:', error);
    return { 
      success: false, 
      recordsCreated: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if a conversation should be indexed
 */
export function shouldIndexConversation(conversation: {
  message_count?: number;
  is_archived?: boolean;
  embeddings_indexed_at?: string;
  updated_at?: string;
  session_learnings?: any[];
}): boolean {
  // Must have at least 4 messages
  if (!conversation.message_count || conversation.message_count < 4) {
    return false;
  }
  
  // Already indexed recently (within 1 hour of last update)
  if (conversation.embeddings_indexed_at && conversation.updated_at) {
    const indexedAt = new Date(conversation.embeddings_indexed_at).getTime();
    const updatedAt = new Date(conversation.updated_at).getTime();
    if (indexedAt >= updatedAt) {
      return false;
    }
  }
  
  // Prioritize archived conversations or those with learnings
  if (conversation.is_archived || conversation.session_learnings?.length) {
    return true;
  }
  
  // Index if has enough messages
  return conversation.message_count >= 6;
}
