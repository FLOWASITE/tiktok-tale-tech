// ============================================
// Learning Agent V2
// Self-improvement through feedback analysis
// Pattern extraction + prompt adaptation
// ============================================

import { saveBrandMemory, searchBrandMemory } from "../supervisor/brand-memory.ts";
import { callAI } from "../ai-provider.ts";
import { streamToText } from "../stream-utils.ts";

export interface LearningInput {
  sessionId: string;
  brandTemplateId?: string;
  organizationId?: string;
  userFeedback?: 'up' | 'down';
  userEdits?: Array<{ original: string; edited: string }>;
  agentResults: Array<{ agentName: string; content: string; success: boolean }>;
  reviewScores?: { overall_score: number; relevance: number; creativity: number; brand_alignment: number };
}

interface Learning {
  type: string;
  content: string;
  confidence: number;
}

/**
 * Analyze workflow results and extract learnings
 * Runs asynchronously (fire-and-forget) after workflow completion
 */
export async function runLearningAgent(
  supabase: any,
  input: LearningInput
): Promise<void> {
  if (!input.brandTemplateId || !input.organizationId) {
    return; // Can't learn without brand context
  }

  try {
    const learnings: Learning[] = [];

    // 1. Analyze user edits
    if (input.userEdits?.length) {
      for (const edit of input.userEdits.slice(0, 5)) {
        learnings.push({
          type: 'correction',
          content: `User changed "${edit.original.slice(0, 100)}" to "${edit.edited.slice(0, 100)}"`,
          confidence: 0.7,
        });
      }
    }

    // 2. Analyze user feedback
    if (input.userFeedback === 'down') {
      const lastContent = input.agentResults
        .filter(r => r.success && r.content)
        .pop()?.content;
      
      if (lastContent) {
        learnings.push({
          type: 'style_preference',
          content: `User disliked content style: "${lastContent.slice(0, 150)}"`,
          confidence: 0.6,
        });
      }
    }

    if (input.userFeedback === 'up') {
      const lastContent = input.agentResults
        .filter(r => r.success && r.content)
        .pop()?.content;
      
      if (lastContent) {
        learnings.push({
          type: 'performance_pattern',
          content: `User approved content style: "${lastContent.slice(0, 150)}"`,
          confidence: 0.75,
        });
      }
    }

    // 3. Analyze review scores for patterns
    if (input.reviewScores) {
      const { overall_score, relevance, creativity, brand_alignment } = input.reviewScores;
      if (overall_score < 6) {
        const weakest = Object.entries({ relevance, creativity, brand_alignment })
          .sort((a, b) => (a[1] || 0) - (b[1] || 0))[0];
        learnings.push({
          type: 'quality_insight',
          content: `Content scored low (${overall_score}/10). Weakest: ${weakest[0]} (${weakest[1]}/10). Focus improvement here.`,
          confidence: 0.65,
        });
      }
    }

    // 4. Use LLM to extract deeper patterns (if enough data)
    if (input.userEdits?.length && input.userEdits.length >= 2) {
      try {
        const analysisResult = await callAI({
          functionName: 'learning-agent',
          organizationId: input.organizationId,
          messages: [
            {
              role: 'system',
              content: `Analyze user edits and extract style preferences. Output JSON array:
[{"type": "style_preference|correction|pattern", "content": "preference description", "confidence": 0.5-0.9}]`,
            },
            {
              role: 'user',
              content: `User edits:\n${input.userEdits.map(e => `Original: ${e.original.slice(0, 200)}\nEdited: ${e.edited.slice(0, 200)}`).join('\n---\n')}`,
            },
          ],
          modelOverride: 'google/gemini-2.5-flash-lite',
          temperatureOverride: 0.2,
        });

        if (analysisResult.success && analysisResult.data) {
          const text = await streamToText(analysisResult.data);
          try {
            const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
            if (Array.isArray(parsed)) {
              learnings.push(...parsed.filter((l: any) => l.type && l.content));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[LearningAgent] LLM analysis failed:', err);
      }
    }

    // 5. Save learnings to brand_memory
    for (const learning of learnings) {
      await saveBrandMemory(
        supabase,
        input.brandTemplateId,
        input.organizationId,
        learning.type,
        learning.content,
        'learning_agent',
        learning.confidence
      );
    }

    // 6. Pattern aggregation: summarize learnings into style rules when enough accumulate
    if (learnings.length > 0) {
      console.log(`[LearningAgent] Saved ${learnings.length} learnings for brand ${input.brandTemplateId}`);
      await analyzePatterns(supabase, input.brandTemplateId, input.organizationId);
    }
  } catch (err) {
    console.warn('[LearningAgent] Error:', err);
  }
}

/**
 * Analyze accumulated learnings and synthesize "brand style rules"
 * Only runs when >= 5 learnings exist for a brand
 */
async function analyzePatterns(
  supabase: any,
  brandTemplateId: string,
  organizationId: string
): Promise<void> {
  try {
    // Count existing learnings
    const { data: memories, error } = await supabase
      .from('brand_memory')
      .select('content, memory_type, confidence')
      .eq('brand_template_id', brandTemplateId)
      .in('memory_type', ['correction', 'style_preference', 'performance_pattern', 'quality_insight'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !memories || memories.length < 5) return;

    // Use LLM to synthesize rules
    const result = await callAI({
      functionName: 'learning-agent-patterns',
      organizationId,
      messages: [
        {
          role: 'system',
          content: `You are a brand style analyst. Given a list of user feedback and corrections, synthesize 2-3 concise brand style rules.
Output JSON: [{"rule": "brief rule description", "confidence": 0.6-0.95}]
Focus on actionable, specific rules like "Prefer short sentences under 15 words" or "Avoid formal Vietnamese, use casual tone".`,
        },
        {
          role: 'user',
          content: memories.map((m: any) => `[${m.memory_type}] ${m.content}`).join('\n'),
        },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
      temperatureOverride: 0.3,
    });

    if (result.success && result.data) {
      const text = await streamToText(result.data);
      try {
        const rules = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
        if (Array.isArray(rules)) {
          for (const rule of rules.slice(0, 3)) {
            await saveBrandMemory(
              supabase,
              brandTemplateId,
              organizationId,
              'learned_rule',
              rule.rule,
              'learning_agent_patterns',
              rule.confidence || 0.7
            );
          }
          console.log(`[LearningAgent] Synthesized ${rules.length} style rules for brand ${brandTemplateId}`);
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[LearningAgent] Pattern analysis failed:', err);
  }
}

/**
 * Build additional system prompt instructions from learned rules
 * Called by content-agent to inject learned preferences
 */
export async function getLearnedPromptRules(
  supabase: any,
  brandTemplateId: string
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('brand_memory')
      .select('content, confidence')
      .eq('brand_template_id', brandTemplateId)
      .eq('memory_type', 'learned_rule')
      .gte('confidence', 0.6)
      .order('confidence', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) return '';

    const rules = data.map((d: any) => `- ${d.content}`).join('\n');
    return `\n[Learned Style Rules]\n${rules}\n`;
  } catch {
    return '';
  }
}
