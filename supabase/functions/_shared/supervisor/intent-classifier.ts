// ============================================
// Intent Classifier for Supervisor
// Classifies user messages to determine agent routing
// Uses lightweight model (flash-lite) for speed
// ============================================

import { callAI } from "../ai-provider.ts";
import { WorkflowEvent } from "./state-machine.ts";

export type IntentType = 'chat' | 'research' | 'plan' | 'generate' | 'complex_workflow';

export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  suggestedAgents: string[];
  workflowEvent: WorkflowEvent;
}

// Fast classification using keyword heuristics first, LLM fallback
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  research: [
    /xu hướng|trending|trend|hot topic|viral|tin tức|news/i,
    /tìm kiếm|search|discover|khám phá|competitor|đối thủ/i,
    /เทรนด์|กำลังฮิต|ไวรัล|ข่าวล่าสุด/i,
  ],
  plan: [
    /lập kế hoạch|kế hoạch|plan|planning|lịch|calendar|30 ngày|7 ngày/i,
    /content plan|editorial|strategy|chiến lược|timeline/i,
    /วางแผน|กลยุทธ์|ปฏิทิน/i,
  ],
  generate: [
    /viết|tạo|generate|write|create|soạn|làm content/i,
    /script|carousel|post|bài viết|caption|email/i,
    /เขียน|สร้าง|โพสต์|แคปชัน/i,
  ],
  complex_workflow: [
    /tạo nội dung.*ngày|content.*tuần|toàn bộ|complete/i,
    /từ a.*z|end.to.end|full workflow/i,
    /research.*rồi.*tạo|tìm.*rồi.*viết/i,
  ],
  chat: [], // Default fallback
};

/**
 * Classify user intent using fast heuristics
 */
export function classifyIntentFast(message: string): ClassificationResult | null {
  const lowerMessage = message.toLowerCase();

  // Check complex_workflow first (highest priority)
  for (const pattern of INTENT_PATTERNS.complex_workflow) {
    if (pattern.test(lowerMessage)) {
      return {
        intent: 'complex_workflow',
        confidence: 0.85,
        reasoning: 'Complex workflow pattern detected',
        suggestedAgents: ['research-agent', 'strategy-agent', 'content-agent', 'reviewer-agent'],
        workflowEvent: 'classified_complex',
      };
    }
  }

  // Check other intents
  const intentScores: Record<IntentType, number> = {
    research: 0, plan: 0, generate: 0, complex_workflow: 0, chat: 0,
  };

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        intentScores[intent as IntentType] += 1;
      }
    }
  }

  const topIntent = Object.entries(intentScores)
    .filter(([k]) => k !== 'chat' && k !== 'complex_workflow')
    .sort((a, b) => b[1] - a[1])[0];

  if (topIntent && topIntent[1] > 0) {
    const intent = topIntent[0] as IntentType;
    const eventMap: Record<IntentType, WorkflowEvent> = {
      research: 'classified_research',
      plan: 'classified_plan',
      generate: 'classified_generate',
      chat: 'classified_chat',
      complex_workflow: 'classified_complex',
    };

    const agentMap: Record<IntentType, string[]> = {
      research: ['research-agent'],
      plan: ['strategy-agent'],
      generate: ['content-agent'],
      chat: ['content-agent'],
      complex_workflow: ['research-agent', 'strategy-agent', 'content-agent'],
    };

    return {
      intent,
      confidence: Math.min(0.9, 0.6 + topIntent[1] * 0.15),
      reasoning: `Keyword match for ${intent}`,
      suggestedAgents: agentMap[intent],
      workflowEvent: eventMap[intent],
    };
  }

  return null; // No clear pattern - will need LLM
}

/**
 * Classify user intent using LLM (for ambiguous cases)
 */
export async function classifyIntentLLM(
  message: string,
  organizationId?: string
): Promise<ClassificationResult> {
  try {
    const result = await callAI({
      functionName: 'intent-classifier',
      organizationId,
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier. Classify the user message into exactly one category.
Respond ONLY with valid JSON: {"intent": "chat|research|plan|generate|complex_workflow", "reasoning": "brief reason"}

Categories:
- chat: General conversation, Q&A, advice
- research: Finding trends, news, competitor info, data gathering
- plan: Content planning, calendars, strategy, scheduling
- generate: Creating specific content (posts, scripts, carousels)
- complex_workflow: Multi-step tasks combining research + planning + generation`,
        },
        { role: 'user', content: message },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
      temperatureOverride: 0.1,
    });

    if (result.success && result.data) {
      // Parse streaming response to get content
      const text = await streamToText(result.data);
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      
      const intent = parsed.intent as IntentType;
      const eventMap: Record<IntentType, WorkflowEvent> = {
        research: 'classified_research',
        plan: 'classified_plan',
        generate: 'classified_generate',
        chat: 'classified_chat',
        complex_workflow: 'classified_complex',
      };

      return {
        intent,
        confidence: 0.8,
        reasoning: parsed.reasoning || 'LLM classification',
        suggestedAgents: getAgentsForIntent(intent),
        workflowEvent: eventMap[intent] || 'classified_chat',
      };
    }
  } catch (err) {
    console.warn('[IntentClassifier] LLM classification failed:', err);
  }

  // Default to chat
  return {
    intent: 'chat',
    confidence: 0.5,
    reasoning: 'Fallback to chat',
    suggestedAgents: ['content-agent'],
    workflowEvent: 'classified_chat',
  };
}

/**
 * Classify intent: fast heuristic first, LLM fallback
 */
export async function classifyIntent(
  message: string,
  organizationId?: string
): Promise<ClassificationResult> {
  // Try fast classification first
  const fastResult = classifyIntentFast(message);
  if (fastResult && fastResult.confidence >= 0.7) {
    console.log(`[IntentClassifier] Fast classification: ${fastResult.intent} (${fastResult.confidence})`);
    return fastResult;
  }

  // Fall back to LLM for ambiguous messages
  console.log('[IntentClassifier] Using LLM for classification');
  return classifyIntentLLM(message, organizationId);
}

function getAgentsForIntent(intent: IntentType): string[] {
  switch (intent) {
    case 'research': return ['research-agent'];
    case 'plan': return ['strategy-agent'];
    case 'generate': return ['content-agent'];
    case 'complex_workflow': return ['research-agent', 'strategy-agent', 'content-agent', 'reviewer-agent'];
    default: return ['content-agent'];
  }
}

// Use shared utility
import { streamToText } from "../stream-utils.ts";
