// ============================================
// Learning Agent
// Self-improvement through feedback analysis
// Runs async after workflow completion
// ============================================

import { saveBrandMemory } from "../supervisor/brand-memory.ts";
import { callAI } from "../ai-provider.ts";
import { BlackboardClient } from "../supervisor/blackboard.ts";

export interface LearningInput {
  sessionId: string;
  brandTemplateId?: string;
  organizationId?: string;
  userFeedback?: 'up' | 'down';
  userEdits?: Array<{ original: string; edited: string }>;
  agentResults: Array<{ agentName: string; content: string; success: boolean }>;
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
    const learnings: Array<{ type: string; content: string; confidence: number }> = [];

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

    // 3. Use LLM to extract deeper patterns (if enough data)
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

    // 4. Save learnings to brand_memory
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

    if (learnings.length > 0) {
      console.log(`[LearningAgent] Saved ${learnings.length} learnings for brand ${input.brandTemplateId}`);
    }
  } catch (err) {
    console.warn('[LearningAgent] Error:', err);
  }
}

// Use shared utility
import { streamToText } from "../stream-utils.ts";
