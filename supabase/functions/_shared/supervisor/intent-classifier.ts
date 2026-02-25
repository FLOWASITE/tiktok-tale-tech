// ============================================
// Intent Classifier for Supervisor
// Classifies user messages to determine agent routing
// Uses lightweight model (flash-lite) for speed
// ============================================

import { callAI } from "../ai-provider.ts";
import { WorkflowEvent } from "./state-machine.ts";

export type IntentType = 'chat' | 'research' | 'plan' | 'generate' | 'complex_workflow' | 'multi_step' | 'image_generate';

export interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  suggestedAgents: string[];
  workflowEvent: WorkflowEvent;
  /** For multi_step intent: ordered list of sub-tasks */
  steps?: string[];
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
  multi_step: [
    /nghiên cứu.*tạo.*phân tích|research.*create.*analyze/i,
    /bước 1.*bước 2|step 1.*step 2/i,
    /từ A đến Z|end-to-end|full pipeline/i,
    /nghiên cứu.*rồi.*lập kế hoạch.*rồi.*tạo/i,
    /phân tích đối thủ.*tạo chiến dịch|competitor.*campaign/i,
    /chiến dịch.*ngày.*ngành|campaign.*days.*industry/i,
  ],
  image_generate: [
    /tạo ảnh|tạo hình|generate image|make image/i,
    /thiết kế ảnh|design image|tạo visual/i,
    /ảnh cho bài|image for post|thumbnail/i,
    /ảnh minh họa|illustration|banner|cover photo/i,
    /สร้างภาพ|ออกแบบภาพ|ทำรูป/i,
  ],
  chat: [], // Default fallback
};

/**
 * Classify user intent using fast heuristics
 */
export function classifyIntentFast(message: string): ClassificationResult | null {
  const lowerMessage = message.toLowerCase();

  // Check multi_step first (highest priority — supersedes complex_workflow)
  for (const pattern of INTENT_PATTERNS.multi_step) {
    if (pattern.test(lowerMessage)) {
      const steps = extractMultiSteps(lowerMessage);
      return {
        intent: 'multi_step',
        confidence: 0.88,
        reasoning: 'Multi-step workflow pattern detected',
        suggestedAgents: ['research-agent', 'strategy-agent', 'content-agent', 'reviewer-agent'],
        workflowEvent: 'classified_multi_step',
        steps,
      };
    }
  }

  // Check complex_workflow second
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
  // Check image_generate before other intents (higher priority than generate)
  for (const pattern of INTENT_PATTERNS.image_generate) {
    if (pattern.test(lowerMessage)) {
      return {
        intent: 'image_generate',
        confidence: 0.88,
        reasoning: 'Image generation pattern detected',
        suggestedAgents: ['image-agent'],
        workflowEvent: 'classified_image_generate',
      };
    }
  }

  const intentScores: Record<IntentType, number> = {
    research: 0, plan: 0, generate: 0, complex_workflow: 0, multi_step: 0, image_generate: 0, chat: 0,
  };

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        intentScores[intent as IntentType] += 1;
      }
    }
  }

  const topIntent = Object.entries(intentScores)
    .filter(([k]) => k !== 'chat' && k !== 'complex_workflow' && k !== 'multi_step' && k !== 'image_generate')
    .sort((a, b) => b[1] - a[1])[0];

  if (topIntent && topIntent[1] > 0) {
    const intent = topIntent[0] as IntentType;
    const eventMap: Record<IntentType, WorkflowEvent> = {
      research: 'classified_research',
      plan: 'classified_plan',
      generate: 'classified_generate',
      chat: 'classified_chat',
      complex_workflow: 'classified_complex',
      multi_step: 'classified_multi_step',
      image_generate: 'classified_image_generate',
    };

    const agentMap: Record<IntentType, string[]> = {
      research: ['research-agent'],
      plan: ['strategy-agent'],
      generate: ['content-agent'],
      chat: ['content-agent'],
      complex_workflow: ['research-agent', 'strategy-agent', 'content-agent'],
      multi_step: ['research-agent', 'strategy-agent', 'content-agent', 'reviewer-agent'],
      image_generate: ['image-agent'],
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
Respond ONLY with valid JSON: {"intent": "chat|research|plan|generate|image_generate|complex_workflow|multi_step", "reasoning": "brief reason", "steps": ["step1","step2"]}
Note: "steps" is only needed for multi_step intent.

Categories:
- chat: General conversation, Q&A, advice
- research: Finding trends, news, competitor info, data gathering
- plan: Content planning, calendars, strategy, scheduling
- generate: Creating specific content (posts, scripts, carousels)
- image_generate: Creating/editing images, visuals, thumbnails, banners
- complex_workflow: Multi-step tasks combining research + planning + generation
- multi_step: Explicit multi-step requests with distinct phases (e.g. "research then plan then create")`,
        },
        { role: 'user', content: message },
      ],
      modelOverride: 'google/gemini-2.5-flash-lite',
      temperatureOverride: 0.1,
    });

    if (result.success && result.data) {
      // Handle both streaming and non-streaming responses
      let text: string;
      if (result.data instanceof ReadableStream) {
        text = await streamToText(result.data);
      } else if (result.data?.choices?.[0]?.message?.content) {
        text = result.data.choices[0].message.content;
      } else if (typeof result.data === 'string') {
        text = result.data;
      } else {
        text = JSON.stringify(result.data);
      }
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
      
      const intent = parsed.intent as IntentType;
      const eventMap: Record<IntentType, WorkflowEvent> = {
        research: 'classified_research',
        plan: 'classified_plan',
        generate: 'classified_generate',
        chat: 'classified_chat',
        complex_workflow: 'classified_complex',
        multi_step: 'classified_multi_step',
        image_generate: 'classified_image_generate',
      };

      return {
        intent,
        confidence: 0.8,
        reasoning: parsed.reasoning || 'LLM classification',
        suggestedAgents: getAgentsForIntent(intent),
        workflowEvent: eventMap[intent] || 'classified_chat',
        steps: parsed.steps,
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
 * Check if a "generate" intent message has an explicit topic
 * If not, upgrade to complex_workflow so Research Agent finds topics first
 */
function hasExplicitTopic(message: string): boolean {
  const lowerMsg = message.toLowerCase();

  const nonTopicTerms = new Set([
    'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'threads', 'youtube',
    'kênh', 'channel', 'social', 'mxh', 'online',
    'bài', 'post', 'content', 'nội', 'dung', 'noi',
    'viết', 'tạo', 'soạn', 'làm', 'generate', 'create', 'write', 'make',
    'cho', 'về', 'about', 'the', 'a', 'an', 'một', 'mot'
  ]);

  const hasRealTopicWords = (raw: string): boolean => {
    const words = raw
      .toLowerCase()
      .replace(/[^\w\u00C0-\u1EF9\s]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(Boolean);

    const meaningful = words.filter(w => w.length >= 3 && !nonTopicTerms.has(w));
    return meaningful.length > 0;
  };

  // Check for quoted topic: "topic here" or 'topic here'
  const quoted = message.match(/["'「]([^"'」]{5,})["'」]/);
  if (quoted && hasRealTopicWords(quoted[1])) return true;

  // Check for "về + topic" pattern (Vietnamese: "viết về skincare")
  const veMatch = lowerMsg.match(/về\s+([^.,!?\n]+)/i);
  if (veMatch && hasRealTopicWords(veMatch[1])) return true;

  // Check for "about + topic" pattern
  const aboutMatch = lowerMsg.match(/about\s+([^.,!?\n]+)/i);
  if (aboutMatch && hasRealTopicWords(aboutMatch[1])) return true;

  // Check for ": topic" pattern
  const colonMatch = message.match(/:\s*([^.,!?\n]{3,})/);
  if (colonMatch && hasRealTopicWords(colonMatch[1])) return true;

  // Check content phrase but ignore platform-only/generic targets
  const contentTopicMatch = lowerMsg.match(/(?:bài|content|nội dung|post|script|carousel)\s+(?:về\s+)?([^.,!?\n]+)/i);
  if (contentTopicMatch && hasRealTopicWords(contentTopicMatch[1])) return true;

  // Fallback heuristic: enough non-generic words in full message
  const words = lowerMsg
    .replace(/[^\w\u00C0-\u1EF9\s]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean);
  const meaningfulWords = words.filter(w => w.length >= 3 && !nonTopicTerms.has(w));
  return meaningfulWords.length >= 2;
}

/**
 * Classify intent: fast heuristic first, LLM fallback
 * Auto-upgrade: generate without topic → complex_workflow (research first)
 */
export async function classifyIntent(
  message: string,
  organizationId?: string
): Promise<ClassificationResult> {
  // Try fast classification first
  const fastResult = classifyIntentFast(message);
  if (fastResult && fastResult.confidence >= 0.7) {
    // AUTO-UPGRADE: If generate but no explicit topic, route through Research Agent first
    if (fastResult.intent === 'generate' && !hasExplicitTopic(message)) {
      console.log(`[IntentClassifier] Auto-upgrade: generate → complex_workflow (no explicit topic detected)`);
      return {
        intent: 'complex_workflow',
        confidence: 0.82,
        reasoning: 'Generate intent without explicit topic - routing through Research Agent first',
        suggestedAgents: ['research-agent', 'content-agent'],
        workflowEvent: 'classified_complex',
      };
    }
    
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
    case 'multi_step': return ['research-agent', 'strategy-agent', 'content-agent', 'reviewer-agent'];
    case 'image_generate': return ['image-agent'];
    default: return ['content-agent'];
  }
}

/**
 * Extract ordered steps from multi-step user message
 */
function extractMultiSteps(message: string): string[] {
  const steps: string[] = [];
  
  // Check for explicit step mentions
  const stepMatches = message.match(/bước\s*\d+[:\s]+([^.]+)/gi);
  if (stepMatches && stepMatches.length >= 2) {
    return stepMatches.map(s => s.replace(/bước\s*\d+[:\s]+/i, '').trim());
  }

  // Detect implicit steps from keywords
  if (/nghiên cứu|research|tìm kiếm|phân tích đối thủ/i.test(message)) steps.push('research');
  if (/kế hoạch|plan|chiến lược|strategy/i.test(message)) steps.push('plan');
  if (/tạo|viết|generate|create|content/i.test(message)) steps.push('generate');
  if (/tối ưu|optimize|review|kiểm tra/i.test(message)) steps.push('review');
  if (/ảnh|hình ảnh|image|visual|thumbnail|banner/i.test(message)) steps.push('image');

  return steps.length >= 2 ? steps : ['research', 'plan', 'generate'];
}

// Use shared utility
import { streamToText } from "../stream-utils.ts";
