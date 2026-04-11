// ============================================
// Orchestrator Node
// Central brain of the Graph Engine
// Fast-path heuristic + LLM planning fallback
// ============================================

import { GraphState, GraphPlan } from "./graph-state.ts";
import { TEMPLATE_PLANS } from "./graph-engine.ts";
import { BlackboardRetriever, formatRetrievedContext } from "./blackboard-retriever.ts";
import { memoryCache } from "../cache/memory-cache.ts";

// ---- Types ----

export interface OrchestratorOptions {
  organizationId?: string;
  /** Override default available node list */
  availableNodes?: string[];
  /** Force a specific template plan (bypass heuristic + LLM) */
  forceTemplate?: string;
  /** Blackboard retriever for cross-session memory */
  retriever?: BlackboardRetriever;
}

// ---- Intent Patterns (enhanced Vietnamese + English + Thai) ----

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  research: [
    /xu hướng|trending|trend|hot topic|viral|tin tức|news|dữ liệu|data/i,
    /tìm kiếm|search|discover|khám phá|competitor|đối thủ|đối\ thủ\ cạnh\ tranh/i,
    /phân tích|analyze|analysis|insight|nghiên cứu|research|survey|khảo sát/i,
    /thị trường|market|audience|khách hàng mục tiêu|target/i,
    /benchmark|so sánh|compare|comparison/i,
    /เทรนด์|กำลังฮิต|ไวรัล|ข่าวล่าสุด/i,
  ],
  plan: [
    /lập kế hoạch|kế hoạch|plan|planning|lịch|calendar|30 ngày|7 ngày|14 ngày/i,
    /content plan|editorial|strategy|chiến lược|timeline|roadmap|lộ trình/i,
    /content mix|phân bổ|distribution|tần suất|frequency|scheduling/i,
    /nên đăng (gì|bao nhiêu|khi nào)|should (i|we) post/i,
    /วางแผน|กลยุทธ์|ปฏิทิน/i,
  ],
  generate: [
    /viết|tạo|generate|write|create|soạn|làm content|draft/i,
    /script|carousel|post|bài viết|caption|email|newsletter|thread/i,
    /hook|headline|tiêu đề|mở bài|cta|call.to.action/i,
    /rewrite|chỉnh sửa|sửa lại|paraphrase|biến tấu|adapt/i,
    /เขียน|สร้าง|โพสต์|แคปชัน/i,
  ],
  topic_discovery: [
    /gợi ý.*(?:chủ đề|topic)|(?:chủ đề|topic).*gợi ý/i,
    /(?:tìm|cho|đề xuất|suggest|recommend)\s*(?:\d+\s*)?(?:chủ đề|topic|ý tưởng|idea)/i,
    /(?:chọn|chon)\s*\d+\s*(?:chủ đề|topic)/i,
    /brainstorm|ý tưởng|idea|ideation|inspiration|nguồn cảm hứng/i,
    /(?:\d+)\s*(?:chủ đề|topic|ý tưởng)/i,
    /viết (gì|về gì|chủ đề gì)|nên (viết|đăng|làm) (gì|về|cái gì)/i,
    /hết ý tưởng|không biết viết gì|bí ý|out of ideas/i,
    /หัวข้อ|ไอเดีย|brainstorm/i,
  ],
  complex_workflow: [
    /tạo nội dung.*ngày|content.*tuần|toàn bộ|complete|trọn gói/i,
    /từ a.*z|end.to.end|full workflow|full process/i,
    /research.*rồi.*tạo|tìm.*rồi.*viết|nghiên cứu.*viết/i,
    /chiến dịch.*hoàn chỉnh|complete campaign|full campaign/i,
    /làm hết|làm tất cả|do everything|handle everything/i,
  ],
  multi_step: [
    /nghiên cứu.*tạo.*phân tích|research.*create.*analyze/i,
    /bước 1.*bước 2|step 1.*step 2/i,
    /từ A đến Z|end-to-end|full pipeline/i,
    /nghiên cứu.*rồi.*lập kế hoạch.*rồi.*tạo/i,
    /phân tích đối thủ.*tạo chiến dịch|competitor.*campaign/i,
    /chiến dịch.*ngày.*ngành|campaign.*days.*industry/i,
    /(?:trước tiên|đầu tiên|first).*(?:sau đó|rồi|then)/i,
  ],
  image_generate: [
    /tạo ảnh|tạo hình|generate image|make image/i,
    /thiết kế ảnh|design image|tạo visual/i,
    /ảnh cho bài|image for post|thumbnail/i,
    /ảnh minh họa|illustration|banner|cover photo|poster/i,
    /สร้างภาพ|ออกแบบภาพ|ทำรูป/i,
  ],
  clarify_needed: [
    /^(tạo|viết|soạn|làm)\s*(content|nội dung|bài)?\s*$/i,
    /^(giúp|help)\s*(tôi|mình|me)?\s*$/i,
    /^(thêm|more|nữa|tiếp)\s*$/i,
    /^\?\s*$/i,
    /^(gì|what|huh)\s*\??$/i,
  ],
  conversational: [
    /^(xin chào|hello|hi|hey|chào|halo)\b/i,
    /^(cảm ơn|thanks|thank you|tks)\b/i,
    /bạn là ai|who are you|giới thiệu bản thân/i,
    /hướng dẫn|help me|tutorial|cách dùng|how to use/i,
    /giải thích|explain|là gì|what is|nghĩa là/i,
  ],
};

// ---- Ambiguity Detection ----

interface AmbiguityCheck {
  isAmbiguous: boolean;
  missingInfo: string[];
  suggestedAction: 'ask_clarify' | 'proceed' | 'research_first';
}

function detectAmbiguity(message: string): AmbiguityCheck {
  const lower = message.toLowerCase().trim();
  const missingInfo: string[] = [];

  // Follow-up references — never ambiguous
  const followUpPatterns = /^(thêm|more|nữa|tiếp|ok|được|yes|vâng|ừ|đồng ý|tốt|hay|continue|next|go|lại|giống|tương tự|like that|same)/i;
  if (followUpPatterns.test(lower)) {
    return { isAmbiguous: false, missingInfo: [], suggestedAction: 'proceed' };
  }

  // "thêm X cái nữa" pattern — needs context from conversation
  const addMorePattern = /thêm\s*(\d+)?\s*(cái|topic|chủ đề|bài|ý tưởng|version|phiên bản)?\s*(nữa|thêm)?/i;
  if (addMorePattern.test(lower)) {
    return { isAmbiguous: false, missingInfo: [], suggestedAction: 'proceed' };
  }

  // Conversational — never ambiguous, just chat
  const isConversational = INTENT_PATTERNS.conversational?.some(p => p.test(lower));
  if (isConversational) {
    return { isAmbiguous: false, missingInfo: [], suggestedAction: 'proceed' };
  }

  // Very short messages with no context
  if (lower.length < 15) {
    missingInfo.push('message_too_short');
  }

  // Has generate intent but no topic, no channel, no format
  const hasGenerateVerb = /viết|tạo|soạn|làm|generate|create|write|draft/i.test(lower);
  const hasContentNoun = /content|nội dung|bài|post|caption|script|carousel/i.test(lower);
  
  if (hasGenerateVerb && hasContentNoun) {
    if (!hasExplicitTopic(message)) {
      missingInfo.push('no_topic');
    }
    const hasChannel = /facebook|instagram|tiktok|linkedin|youtube|twitter|threads|email|blog|website|zalo|fb|ig|tt|yt/i.test(lower);
    if (!hasChannel) {
      missingInfo.push('no_channel');
    }
  }

  // Vague question patterns: "làm sao để...", "nên làm gì..." — route to chat, not ambiguous
  const vagueQuestion = /^(làm sao|làm thế nào|how|nên|should)\s/i;
  if (vagueQuestion.test(lower)) {
    return { isAmbiguous: false, missingInfo: [], suggestedAction: 'proceed' };
  }

  const isAmbiguous = missingInfo.length >= 2;
  return {
    isAmbiguous,
    missingInfo,
    suggestedAction: isAmbiguous ? 'ask_clarify' : missingInfo.includes('no_topic') ? 'research_first' : 'proceed',
  };
}

// ---- Heuristic Topic Detection ----

const NON_TOPIC_TERMS = new Set([
  // Platforms (full + abbreviations)
  'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'threads', 'youtube', 'zalo', 'pinterest',
  'fb', 'ig', 'tt', 'li', 'yt', 'tw', 'x',
  // Channel nouns
  'kênh', 'channel', 'social', 'mxh', 'online', 'platform', 'nền', 'tảng',
  // Content nouns
  'bài', 'post', 'content', 'nội', 'dung', 'noi',
  // Action verbs (Vietnamese + English) — these describe WHAT to do, not WHAT ABOUT
  'viết', 'tạo', 'soạn', 'làm', 'generate', 'create', 'write', 'make', 'draft', 'build',
  'đăng', 'đăng', 'publish', 'share', 'chia', 'sẻ', 'upload', 'up', 'gửi', 'send',
  'chỉnh', 'sửa', 'edit', 'update', 'xóa', 'delete',
  // Prepositions / filler
  'cho', 'về', 'about', 'the', 'a', 'an', 'một', 'mot', 'của', 'với', 'for', 'with', 'to', 'in', 'on',
  // Content format terms
  'carousel', 'script', 'kịch', 'bản', 'video', 'reel', 'reels', 'story', 'stories',
  'multichannel', 'đa', 'multi', 'thread', 'newsletter', 'email', 'blog',
  // Common filler words
  'giúp', 'help', 'tôi', 'mình', 'me', 'hãy', 'please', 'cần', 'need', 'muốn', 'want',
  'gợi', 'ý', 'suggest', 'đề', 'xuất', 'hôm', 'nay', 'today', 'ngày', 'tuần', 'tháng',
  'mới', 'new', 'hay', 'good', 'tốt', 'best', 'thêm', 'more', 'nữa', 'tiếp', 'next',
  // Journey/role terms (not topics)
  'seed', 'sprout', 'harvest', 'awareness', 'engagement', 'conversion',
]);

export function hasExplicitTopic(message: string): boolean {
  const lowerMsg = message.toLowerCase();

  const hasRealWords = (raw: string): boolean => {
    const words = raw.toLowerCase().replace(/[^\w\u00C0-\u1EF9\s]/g, ' ').split(/\s+/).filter(Boolean);
    return words.filter(w => w.length >= 3 && !NON_TOPIC_TERMS.has(w)).length > 0;
  };

  const quoted = message.match(/["'「]([^"'」]{5,})["'」]/);
  if (quoted && hasRealWords(quoted[1])) return true;

  const veMatch = lowerMsg.match(/về\s+([^.,!?\n]+)/i);
  if (veMatch && hasRealWords(veMatch[1])) return true;

  const aboutMatch = lowerMsg.match(/about\s+([^.,!?\n]+)/i);
  if (aboutMatch && hasRealWords(aboutMatch[1])) return true;

  // "topic: [value]" or "chủ đề: [value]" pattern
  const colonMatch = message.match(/(?:topic|chủ đề|subject)\s*[:：]\s*([^.,!?\n]{3,})/i);
  if (colonMatch && hasRealWords(colonMatch[1])) return true;

  // General colon pattern
  const generalColon = message.match(/:\s*([^.,!?\n]{3,})/);
  if (generalColon && hasRealWords(generalColon[1])) return true;

  const contentMatch = lowerMsg.match(/(?:bài|content|nội dung|post|script|carousel)\s+(?:về\s+)?([^.,!?\n]+)/i);
  if (contentMatch && hasRealWords(contentMatch[1])) return true;

  // Hashtag as topic indicator
  const hashtagMatch = message.match(/#(\w{3,})/);
  if (hashtagMatch) return true;

  const words = lowerMsg.replace(/[^\w\u00C0-\u1EF9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.filter(w => w.length >= 3 && !NON_TOPIC_TERMS.has(w)).length >= 2;
}

/** Extract requested topic count from message (e.g., "5 chủ đề" → 5) */
function extractRequestedCount(message: string): number | null {
  const match = message.match(/(\d+)\s*(?:chủ đề|topic|ý tưởng|idea|cái)/i);
  return match ? parseInt(match[1], 10) : null;
}

// ---- Fast-path heuristic ----

interface FastPathResult {
  intent: string;
  confidence: number;
}

function matchIntent(message: string): FastPathResult | null {
  const lower = message.toLowerCase();

  // Priority order: conversational > multi_step > complex_workflow > image > topic_discovery > others

  // Conversational — simple chat, no workflow needed
  if (INTENT_PATTERNS.conversational?.some(p => p.test(lower))) {
    return { intent: 'conversational', confidence: 0.95 };
  }

  for (const p of INTENT_PATTERNS.multi_step) {
    if (p.test(lower)) return { intent: 'multi_step', confidence: 0.88 };
  }
  for (const p of INTENT_PATTERNS.complex_workflow) {
    if (p.test(lower)) return { intent: 'complex_workflow', confidence: 0.85 };
  }
  for (const p of INTENT_PATTERNS.image_generate) {
    if (p.test(lower)) return { intent: 'image_generate', confidence: 0.88 };
  }
  // Topic discovery
  for (const p of INTENT_PATTERNS.topic_discovery) {
    if (p.test(lower)) return { intent: 'topic_discovery', confidence: 0.9 };
  }
  // Ambiguity check — very short or missing info prompts
  for (const p of INTENT_PATTERNS.clarify_needed) {
    if (p.test(lower)) {
      const ambiguity = detectAmbiguity(message);
      if (ambiguity.isAmbiguous) {
        return { intent: 'clarify_needed', confidence: 0.8 };
      }
    }
  }

  // Score remaining intents
  const skipIntents = ['multi_step', 'complex_workflow', 'image_generate', 'topic_discovery', 'clarify_needed', 'conversational'];
  const scores: Record<string, number> = { research: 0, plan: 0, generate: 0 };
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (skipIntents.includes(intent)) continue;
    for (const p of patterns) {
      if (p.test(lower)) scores[intent] = (scores[intent] || 0) + 1;
    }
  }

  // Multi-intent detection: if both research and generate score, it's likely complex
  if (scores.research >= 1 && scores.generate >= 1) {
    return { intent: 'complex_workflow', confidence: 0.82 };
  }

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] > 0) {
    return { intent: top[0], confidence: Math.min(0.9, 0.6 + top[1] * 0.15) };
  }

  return null;
}

/** Map intent to template plan key */
function intentToTemplate(intent: string, message: string): string {
  switch (intent) {
    case 'image_generate':
      return 'image_generate';
    case 'research':
    case 'topic_discovery':
      return 'research_only';
    case 'plan':
      return 'generate_with_research';
    case 'generate':
      return hasExplicitTopic(message) ? 'generate_simple' : 'generate_with_research';
    case 'complex_workflow':
    case 'multi_step':
      return 'full_pipeline';
    case 'clarify_needed':
      return 'chat';
    case 'conversational':
      return 'chat';
    default:
      return 'chat';
  }
}

/**
 * Try fast-path: heuristic intent → template plan.
 * Returns null if confidence < 0.7 (should use LLM).
 */
function tryFastPath(message: string): GraphPlan | null {
  const match = matchIntent(message);
  if (!match || match.confidence < 0.7) return null;

  const templateKey = intentToTemplate(match.intent, message);
  const plan = TEMPLATE_PLANS[templateKey];
  if (!plan) return null;

  console.log(`[Orchestrator] Fast-path: intent=${match.intent} → template=${templateKey} (confidence=${match.confidence})`);
  return { ...plan, fastPath: true };
}

// ---- LLM Planning ----

/** Node descriptions for the orchestrator LLM */
const NODE_DESCRIPTIONS = `Available nodes:
- research: Web search, topic discovery, competitor analysis, trend finding. Also provides data/facts for Core Content generation.
- brand_memory: Load brand context, voice guidelines, industry knowledge (lightweight, always safe to run parallel)
- compliance: Rule-based legal/industry compliance pre-check (lightweight, always safe to run parallel)
- strategy: Content planning, channel strategy, editorial calendar
- content: Generate multichannel content. Internally runs a 3-step pipeline: (1) Core Content generation (base article using topic + angle + length), (2) Content Role assignment (seed/sprout/harvest), (3) Channel Transformation (convert Core Content to platform-specific posts for N channels). Uses generate_multichannel tool which handles all 3 steps automatically.
- reviewer: Quality check, compliance, brand voice verification
- governor: Token budget gate + quality early-exit (always runs after reviewer)
- image: AI image generation and editing`;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator of Flowa's AI content creation system.
Given the user's message and current context, create an optimal execution graph plan.

${NODE_DESCRIPTIONS}

## Content Creation Pipeline (4-step process)
The system follows a strict 4-step workflow to create multichannel content:

**Step 1 — Topic Selection (Orchestrator responsibility):**
- User must provide a Content Goal (1 of 5: education, awareness, engagement, expertise, conversion) + Topic (min 10 chars).
- If user provides NO specific topic → you MUST include "research" node FIRST to discover a suitable topic.
- The "research" node finds trending topics, competitor insights, and relevant data.

**Step 2 — Core Content Generation (handled by "content" node):**
- Uses topic + Content Angle (educational, storytelling, promotional, social_proof, behind_the_scenes, qa_faq) + Length Mode.
- Research node output feeds into this step as supporting data/facts.

**Step 3 — Content Role Assignment (handled by "content" node):**
- Assigns strategic role: seed (awareness), sprout (trust-building), or harvest (conversion).
- Must be consistent with Goal + Angle chosen.

**Step 4 — Multi-channel Transform (handled by "content" node):**
- Converts Core Content into platform-specific posts for N channels (facebook, instagram, tiktok, twitter, youtube, linkedin, zalo, telegram, threads, email, website, google_maps).
- Each channel gets optimized content with appropriate length, tone, and format.

→ The "content" node handles steps 2-4 internally via the generate_multichannel tool.
→ The "research" node handles step 1 (topic discovery) when user has no specific topic.
→ When user provides a topic, you can skip "research" and go directly to "content".

Rules:
1. For simple chat/Q&A/greetings/explanations, use only the "content" node.
2. brand_memory should run in parallel with the first substantive node when brand context matters.
3. reviewer should come after content generation.
4. image should only be included when visual content is explicitly requested (e.g., "tạo ảnh", "design image").
5. Minimize nodes — don't include unnecessary steps.
6. Use parallelWith for nodes that can run simultaneously.
7. Use dependsOn for nodes that need results from previous nodes.
8. compliance should run in parallel with research/brand_memory (lightweight, rule-based).
9. governor should always be the last node after reviewer for quality gating.

Intent Classification Guidelines:
- If user asks "viết gì / nên đăng gì" → topic_discovery → use research node
- If user provides a specific topic (e.g., "viết bài về skincare mùa hè") → generate directly
- If user message is vague with no topic AND no channel → research first, then generate
- If user says "thêm", "nữa", "tiếp" → these are follow-ups, treat as simple generate
- If user asks a question about marketing/content strategy → use content node only (chat mode)
- If user explicitly chains steps ("nghiên cứu rồi tạo") → multi_step / full_pipeline
- IMPORTANT: Extract the topic from the message if present, even if embedded in a longer sentence
- CRITICAL: If the user does NOT provide a specific topic (e.g., "Tạo nội dung FB", "Viết 1 bài cho Instagram"), you MUST include the "research" node FIRST to discover a suitable topic. NEVER skip research when there is no explicit topic.
- Platform abbreviations count as channels, NOT topics: FB=Facebook, IG=Instagram, TT=TikTok, YT=YouTube

You MUST call the create_graph_plan tool with your plan.`;

const CREATE_GRAPH_PLAN_TOOL = {
  type: "function" as const,
  function: {
    name: "create_graph_plan",
    description: "Create an execution graph plan for the workflow",
    parameters: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              node: {
                type: "string",
                enum: ["research", "brand_memory", "compliance", "strategy", "content", "reviewer", "governor", "image"],
              },
              parallelWith: {
                type: "array",
                items: { type: "string" },
                description: "Nodes to run in parallel with this one",
              },
              dependsOn: {
                type: "array",
                items: { type: "string" },
                description: "Nodes that must complete before this one starts",
              },
            },
            required: ["node"],
            additionalProperties: false,
          },
        },
        skipNodes: {
          type: "array",
          items: { type: "string" },
          description: "Nodes to skip entirely",
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of why this plan was chosen",
        },
        extracted_topic: {
          type: "string",
          description: "The main topic extracted from user message, if any. E.g. 'skincare routine for oily skin'",
        },
      },
      required: ["steps", "skipNodes", "reasoning"],
      additionalProperties: false,
    },
  },
};

/**
 * Plan workflow using LLM with tool calling.
 * Fallback: returns full_pipeline template if LLM fails.
 */
async function planWithLLM(
  state: GraphState,
  _options: OrchestratorOptions
): Promise<GraphPlan> {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("[Orchestrator] No LOVABLE_API_KEY, falling back to full_pipeline");
      return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
    }

    const userContext = state.brandMemoryContext
      ? `\n\nBrand context available: ${state.brandMemoryContext.slice(0, 500)}`
      : '';

    // Blackboard v2: inject cross-session memory into orchestrator context
    let crossSessionContext = '';
    if (_options.retriever) {
      try {
        const pastEntries = await _options.retriever.retrieveCrossSession(state.userMessage, 3);
        if (pastEntries.length > 0) {
          crossSessionContext = `\n\nPast session context (from previous workflows for this brand):\n${
            pastEntries.map((e: any) => `- [${e.nodeName || e.contentType}] ${e.contentText.slice(0, 300)}`).join('\n')
          }`;
        }
      } catch (err) {
        console.warn('[Orchestrator] Cross-session memory lookup failed:', err);
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: `User message: "${state.userMessage}"${userContext}${crossSessionContext}`,
          },
        ],
        tools: [CREATE_GRAPH_PLAN_TOOL],
        tool_choice: { type: "function", function: { name: "create_graph_plan" } },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Orchestrator] LLM error (${response.status}): ${errText}`);
      return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.warn("[Orchestrator] LLM returned no tool call, falling back");
      return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
    }

    const planArgs = JSON.parse(toolCall.function.arguments);
    const plan = validatePlan(planArgs);

    console.log(`[Orchestrator] LLM plan: ${plan.steps.length} steps, reasoning: ${plan.reasoning}${plan.extractedTopic ? `, topic: ${plan.extractedTopic}` : ''}`);
    return plan;
  } catch (err) {
    console.error("[Orchestrator] LLM planning failed:", err);
    return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
  }
}

// ---- Plan Validation ----

const VALID_NODES = new Set(["research", "brand_memory", "compliance", "strategy", "content", "reviewer", "governor", "image"]);

function validatePlan(raw: any): GraphPlan {
  const steps = (raw.steps || [])
    .filter((s: any) => s.node && VALID_NODES.has(s.node))
    .map((s: any) => ({
      node: s.node,
      parallelWith: (s.parallelWith || []).filter((n: string) => VALID_NODES.has(n)),
      dependsOn: (s.dependsOn || []).filter((n: string) => VALID_NODES.has(n)),
    }));

  if (steps.length === 0) {
    return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
  }

  return {
    steps,
    skipNodes: (raw.skipNodes || []).filter((n: string) => VALID_NODES.has(n)),
    reasoning: raw.reasoning || "LLM-generated plan",
    fastPath: false,
    extractedTopic: raw.extracted_topic || undefined,
  };
}

// ---- Main Orchestrator ----

/**
 * Orchestrate workflow: decide which nodes to run and in what order.
 *
 * 1. If forceTemplate is set, use that template directly.
 * 2. Try fast-path heuristic (no LLM cost).
 * 3. Fall back to LLM planning for complex/ambiguous intents.
 */
export async function orchestrateWorkflow(
  state: GraphState,
  options: OrchestratorOptions = {}
): Promise<GraphPlan> {
  // 1. Forced template
  if (options.forceTemplate && TEMPLATE_PLANS[options.forceTemplate]) {
    console.log(`[Orchestrator] Forced template: ${options.forceTemplate}`);
    return { ...TEMPLATE_PLANS[options.forceTemplate], fastPath: true };
  }

  // 2. Fast-path heuristic
  const fastPlan = tryFastPath(state.userMessage);
  if (fastPlan) return fastPlan;

  // 3. LLM planning
  console.log("[Orchestrator] No fast-path match, using LLM planning");
  return planWithLLM(state, options);
}
