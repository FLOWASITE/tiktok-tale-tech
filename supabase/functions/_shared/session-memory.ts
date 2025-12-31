/**
 * Cross-Session Memory Utilities
 * 
 * Fetches learnings from past conversations to inject into new sessions
 * This enables the AI to remember insights, corrections, and patterns from previous chats
 */

export interface SessionLearning {
  type: 'insight' | 'correction' | 'preference' | 'pattern' | 'warning';
  content: string;
  confidence: number; // 0-1
  learnedAt: string;
  source?: string; // e.g., "user feedback", "edit analysis"
}

export interface UserCorrection {
  original: string;
  corrected: string;
  correctionType: 'style' | 'fact' | 'tone' | 'length' | 'format';
  appliedAt: string;
}

export interface CrossSessionMemory {
  // Aggregated learnings from all past sessions
  insights: SessionLearning[];
  
  // User corrections that should be remembered
  corrections: UserCorrection[];
  
  // Summary of past conversations for context
  conversationSummaries: Array<{
    title: string;
    summary: string;
    contentGoal?: string;
    createdAt: string;
  }>;
  
  // Stats
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerSession: number;
}

/**
 * Fetch cross-session memory from past conversations
 */
export async function fetchCrossSessionMemory(
  supabase: any,
  userId: string,
  brandTemplateId?: string | null,
  organizationId?: string | null,
  limit: number = 10
): Promise<CrossSessionMemory | null> {
  try {
    // Build query for past conversations with learnings
    let query = supabase
      .from('chat_conversations')
      .select('id, title, summary, content_goal, session_learnings, user_corrections, message_count, created_at')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    // Filter by brand or org if provided
    if (brandTemplateId) {
      query = query.eq('brand_template_id', brandTemplateId);
    } else if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.warn('Error fetching session memory:', error);
      return null;
    }

    if (!conversations || conversations.length === 0) {
      return null;
    }

    // Aggregate learnings from all conversations
    const allInsights: SessionLearning[] = [];
    const allCorrections: UserCorrection[] = [];
    const summaries: Array<{ title: string; summary: string; contentGoal?: string; createdAt: string }> = [];
    let totalMessages = 0;

    for (const conv of conversations) {
      // Collect session learnings
      if (conv.session_learnings && Array.isArray(conv.session_learnings)) {
        for (const learning of conv.session_learnings) {
          if (learning.content && learning.type) {
            allInsights.push({
              type: learning.type,
              content: learning.content,
              confidence: learning.confidence || 0.5,
              learnedAt: learning.learnedAt || conv.created_at,
              source: learning.source,
            });
          }
        }
      }

      // Collect user corrections
      if (conv.user_corrections && Array.isArray(conv.user_corrections)) {
        for (const correction of conv.user_corrections) {
          if (correction.original && correction.corrected) {
            allCorrections.push({
              original: correction.original,
              corrected: correction.corrected,
              correctionType: correction.correctionType || 'style',
              appliedAt: correction.appliedAt || conv.created_at,
            });
          }
        }
      }

      // Collect summaries
      if (conv.summary) {
        summaries.push({
          title: conv.title || 'Untitled',
          summary: conv.summary,
          contentGoal: conv.content_goal,
          createdAt: conv.created_at,
        });
      }

      totalMessages += conv.message_count || 0;
    }

    // Sort and deduplicate insights by confidence
    const uniqueInsights = deduplicateLearnings(allInsights);
    const highConfidenceInsights = uniqueInsights
      .filter(i => i.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15);

    // Keep only recent, unique corrections
    const recentCorrections = allCorrections
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      .slice(0, 10);

    return {
      insights: highConfidenceInsights,
      corrections: recentCorrections,
      conversationSummaries: summaries.slice(0, 5),
      totalConversations: conversations.length,
      totalMessages,
      avgMessagesPerSession: totalMessages / conversations.length,
    };
  } catch (err) {
    console.error('Error in fetchCrossSessionMemory:', err);
    return null;
  }
}

/**
 * Deduplicate learnings by similar content
 */
function deduplicateLearnings(learnings: SessionLearning[]): SessionLearning[] {
  const seen = new Map<string, SessionLearning>();
  
  for (const learning of learnings) {
    const key = learning.content.toLowerCase().slice(0, 100);
    const existing = seen.get(key);
    
    if (!existing || learning.confidence > existing.confidence) {
      seen.set(key, learning);
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Build cross-session memory prompt section
 */
export function buildCrossSessionMemorySection(memory: CrossSessionMemory | null): string {
  if (!memory) {
    return '';
  }

  // Skip if no meaningful data
  if (memory.insights.length === 0 && memory.corrections.length === 0 && memory.conversationSummaries.length === 0) {
    return '';
  }

  const parts: string[] = [];
  parts.push(`\n## 🧠 CROSS-SESSION MEMORY (Nhớ từ các cuộc trò chuyện trước)`);
  parts.push(`\nDựa trên ${memory.totalConversations} cuộc trò chuyện trước với user này:`);

  // Learnings/Insights
  if (memory.insights.length > 0) {
    parts.push(`\n### Insights đã học:`);
    
    const insightsByType = groupBy(memory.insights, 'type');
    
    if (insightsByType.correction) {
      parts.push(`\n**Điều chỉnh cần nhớ:**`);
      insightsByType.correction.slice(0, 3).forEach(i => {
        parts.push(`- ⚠️ ${i.content}`);
      });
    }
    
    if (insightsByType.preference) {
      parts.push(`\n**Sở thích đã biết:**`);
      insightsByType.preference.slice(0, 3).forEach(i => {
        parts.push(`- 👤 ${i.content}`);
      });
    }
    
    if (insightsByType.pattern) {
      parts.push(`\n**Patterns đã nhận ra:**`);
      insightsByType.pattern.slice(0, 3).forEach(i => {
        parts.push(`- 📊 ${i.content}`);
      });
    }
    
    if (insightsByType.insight) {
      parts.push(`\n**Insights khác:**`);
      insightsByType.insight.slice(0, 2).forEach(i => {
        parts.push(`- 💡 ${i.content}`);
      });
    }
    
    if (insightsByType.warning) {
      parts.push(`\n**Cảnh báo:**`);
      insightsByType.warning.slice(0, 2).forEach(i => {
        parts.push(`- 🚫 ${i.content}`);
      });
    }
  }

  // User corrections (style examples)
  if (memory.corrections.length > 0) {
    parts.push(`\n### User Corrections (Học từ cách user chỉnh sửa):`);
    memory.corrections.slice(0, 5).forEach(c => {
      parts.push(`- "${c.original}" → "${c.corrected}" (${c.correctionType})`);
    });
    parts.push(`→ ÁP DỤNG style tương tự để match với preference của user`);
  }

  // Recent conversation context (summaries)
  if (memory.conversationSummaries.length > 0) {
    parts.push(`\n### Chủ đề đã thảo luận gần đây:`);
    memory.conversationSummaries.slice(0, 3).forEach(s => {
      const goalLabel = s.contentGoal ? ` [${s.contentGoal}]` : '';
      parts.push(`- **${s.title}**${goalLabel}: ${s.summary?.slice(0, 150)}...`);
    });
    parts.push(`→ Có thể tham khảo hoặc tiếp nối các chủ đề này nếu phù hợp`);
  }

  // Stats insight
  if (memory.avgMessagesPerSession > 10) {
    parts.push(`\n💬 User thường chat dài (avg ${Math.round(memory.avgMessagesPerSession)} tin/session) - có thể đi sâu vào chi tiết`);
  } else if (memory.avgMessagesPerSession < 4) {
    parts.push(`\n⚡ User thường chat ngắn gọn - trả lời súc tích, action-oriented`);
  }

  return parts.join('\n');
}

/**
 * Helper: Group array by key
 */
function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Save learnings to a conversation
 */
export async function saveSessionLearnings(
  supabase: any,
  conversationId: string,
  learnings: SessionLearning[]
): Promise<boolean> {
  try {
    // Fetch existing learnings
    const { data: conv, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('session_learnings')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      console.warn('Error fetching conversation:', fetchError);
      return false;
    }

    // Merge with existing
    const existing = Array.isArray(conv?.session_learnings) ? conv.session_learnings : [];
    const merged = [...existing, ...learnings];

    // Update
    const { error: updateError } = await supabase
      .from('chat_conversations')
      .update({ session_learnings: merged })
      .eq('id', conversationId);

    if (updateError) {
      console.warn('Error saving session learnings:', updateError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in saveSessionLearnings:', err);
    return false;
  }
}

/**
 * Save user correction to a conversation
 */
export async function saveUserCorrection(
  supabase: any,
  conversationId: string,
  correction: UserCorrection
): Promise<boolean> {
  try {
    // Fetch existing corrections
    const { data: conv, error: fetchError } = await supabase
      .from('chat_conversations')
      .select('user_corrections')
      .eq('id', conversationId)
      .single();

    if (fetchError) {
      console.warn('Error fetching conversation:', fetchError);
      return false;
    }

    // Add new correction
    const existing = Array.isArray(conv?.user_corrections) ? conv.user_corrections : [];
    const merged = [...existing, correction];

    // Update (keep only last 20)
    const { error: updateError } = await supabase
      .from('chat_conversations')
      .update({ user_corrections: merged.slice(-20) })
      .eq('id', conversationId);

    if (updateError) {
      console.warn('Error saving user correction:', updateError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in saveUserCorrection:', err);
    return false;
  }
}
