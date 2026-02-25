// ============================================
// Orchestrator Node
// Central brain of the Graph Engine
// Fast-path heuristic + LLM planning fallback
// ============================================

import { GraphState, GraphPlan } from "./graph-state.ts";
import { TEMPLATE_PLANS } from "./graph-engine.ts";

// ---- Types ----

export interface OrchestratorOptions {
  organizationId?: string;
  /** Override default available node list */
  availableNodes?: string[];
  /** Force a specific template plan (bypass heuristic + LLM) */
  forceTemplate?: string;
}

// ---- Intent Patterns (reused from intent-classifier.ts) ----

const INTENT_PATTERNS: Record<string, RegExp[]> = {
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
};

// ---- Heuristic Topic Detection ----

const NON_TOPIC_TERMS = new Set([
  'facebook', 'instagram', 'tiktok', 'linkedin', 'twitter', 'threads', 'youtube',
  'kênh', 'channel', 'social', 'mxh', 'online',
  'bài', 'post', 'content', 'nội', 'dung', 'noi',
  'viết', 'tạo', 'soạn', 'làm', 'generate', 'create', 'write', 'make',
  'cho', 'về', 'about', 'the', 'a', 'an', 'một', 'mot',
]);

function hasExplicitTopic(message: string): boolean {
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

  const colonMatch = message.match(/:\s*([^.,!?\n]{3,})/);
  if (colonMatch && hasRealWords(colonMatch[1])) return true;

  const contentMatch = lowerMsg.match(/(?:bài|content|nội dung|post|script|carousel)\s+(?:về\s+)?([^.,!?\n]+)/i);
  if (contentMatch && hasRealWords(contentMatch[1])) return true;

  const words = lowerMsg.replace(/[^\w\u00C0-\u1EF9\s]/g, ' ').split(/\s+/).filter(Boolean);
  return words.filter(w => w.length >= 3 && !NON_TOPIC_TERMS.has(w)).length >= 2;
}

// ---- Fast-path heuristic ----

interface FastPathResult {
  intent: string;
  confidence: number;
}

function matchIntent(message: string): FastPathResult | null {
  const lower = message.toLowerCase();

  // Priority order: multi_step > complex_workflow > image_generate > others
  for (const p of INTENT_PATTERNS.multi_step) {
    if (p.test(lower)) return { intent: 'multi_step', confidence: 0.88 };
  }
  for (const p of INTENT_PATTERNS.complex_workflow) {
    if (p.test(lower)) return { intent: 'complex_workflow', confidence: 0.85 };
  }
  for (const p of INTENT_PATTERNS.image_generate) {
    if (p.test(lower)) return { intent: 'image_generate', confidence: 0.88 };
  }

  // Score remaining intents
  const scores: Record<string, number> = { research: 0, plan: 0, generate: 0 };
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (['multi_step', 'complex_workflow', 'image_generate'].includes(intent)) continue;
    for (const p of patterns) {
      if (p.test(lower)) scores[intent] = (scores[intent] || 0) + 1;
    }
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
      return 'research_only';
    case 'plan':
      return 'generate_with_research'; // planning needs research context
    case 'generate':
      return hasExplicitTopic(message) ? 'generate_simple' : 'generate_with_research';
    case 'complex_workflow':
    case 'multi_step':
      return 'full_pipeline';
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
- research: Web search, topic discovery, competitor analysis, trend finding
- brand_memory: Load brand context, voice guidelines, industry knowledge (lightweight, always safe to run parallel)
- strategy: Content planning, channel strategy, editorial calendar
- content: Generate content (posts, scripts, carousels, emails)
- reviewer: Quality check, compliance, brand voice verification
- image: AI image generation and editing`;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the Orchestrator of Flowa's AI content creation system.
Given the user's message and current context, create an optimal execution graph plan.

${NODE_DESCRIPTIONS}

Rules:
1. For simple chat/Q&A, use only the "content" node.
2. brand_memory should run in parallel with the first substantive node when brand context matters.
3. reviewer should come after content generation.
4. image should only be included when visual content is explicitly requested.
5. Minimize nodes — don't include unnecessary steps.
6. Use parallelWith for nodes that can run simultaneously.
7. Use dependsOn for nodes that need results from previous nodes.

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
                enum: ["research", "brand_memory", "strategy", "content", "reviewer", "image"],
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: ORCHESTRATOR_SYSTEM_PROMPT },
          {
            role: "user",
            content: `User message: "${state.userMessage}"${userContext}`,
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

    console.log(`[Orchestrator] LLM plan: ${plan.steps.length} steps, reasoning: ${plan.reasoning}`);
    return plan;
  } catch (err) {
    console.error("[Orchestrator] LLM planning failed:", err);
    return { ...TEMPLATE_PLANS.full_pipeline, fastPath: false };
  }
}

// ---- Plan Validation ----

const VALID_NODES = new Set(["research", "brand_memory", "strategy", "content", "reviewer", "image"]);

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
