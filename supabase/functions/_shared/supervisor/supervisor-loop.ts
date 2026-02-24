// ============================================
// Supervisor Loop
// Orchestrates multi-agent workflow using State Machine
// With Token Budget Controller + Graceful Degradation
// ============================================

import {
  createWorkflowContext,
  transition,
  isTerminalState,
  WorkflowContext,
  WorkflowEvent,
} from "./state-machine.ts";
import { classifyIntent, ClassificationResult } from "./intent-classifier.ts";
import { getAgent, AgentConfig, getTotalTokenBudget } from "./agent-registry.ts";
import { createBlackboard, BlackboardClient, buildBlackboardContext } from "./blackboard.ts";
import { searchBrandMemory, buildBrandMemoryContext } from "./brand-memory.ts";
import { executeAgent, AgentResult, AgentExecutionContext } from "../agents/agent-base.ts";
import { createResearchTask } from "../agents/research-agent.ts";
import { createStrategyTask } from "../agents/strategy-agent.ts";
import { createContentTask } from "../agents/content-agent.ts";
import { createReviewerTask } from "../agents/reviewer-agent.ts";
import { runLearningAgent } from "../agents/learning-agent.ts";
import { AgentSSEEvent } from "../agentic-loop.ts";

export interface SupervisorOptions {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  brandName?: string;
  industry?: string;
  complianceRules?: string[];
  systemPrompt: string;
  conversationHistory: Array<{ role: string; content: string }>;
  onEvent?: (event: AgentSSEEvent) => void;
}

export interface SupervisorResult {
  success: boolean;
  finalContent: string;
  agentResults: AgentResult[];
  classification: ClassificationResult;
  workflowStates: string[];
  totalDurationMs: number;
  exitReason: string;
  tokenUsage: TokenBudgetSnapshot;
}

interface TokenBudgetSnapshot {
  total: number;
  used: number;
  remaining: number;
  perAgent: Record<string, { budget: number; used: number }>;
}

class TokenBudgetController {
  private totalBudget: number;
  private usedTokens: number = 0;
  private agentUsage: Record<string, number> = {};

  constructor(totalBudget: number = 16384) {
    this.totalBudget = totalBudget;
  }

  canAfford(agentName: string, estimatedTokens: number): boolean {
    return (this.usedTokens + estimatedTokens) <= this.totalBudget;
  }

  recordUsage(agentName: string, tokens: number): void {
    this.usedTokens += tokens;
    this.agentUsage[agentName] = (this.agentUsage[agentName] || 0) + tokens;
  }

  getRemainingBudget(): number {
    return Math.max(0, this.totalBudget - this.usedTokens);
  }

  getSnapshot(): TokenBudgetSnapshot {
    const agentConfigs: Record<string, { budget: number; used: number }> = {};
    for (const [name, used] of Object.entries(this.agentUsage)) {
      const config = getAgent(name);
      agentConfigs[name] = { budget: config?.tokenBudget || 0, used };
    }
    return {
      total: this.totalBudget,
      used: this.usedTokens,
      remaining: this.getRemainingBudget(),
      perAgent: agentConfigs,
    };
  }
}

// Agent display names for SSE events
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  'research-agent': 'Research Agent',
  'strategy-agent': 'Strategy Agent',
  'content-agent': 'Content Agent',
  'reviewer-agent': 'Reviewer Agent',
};

const AGENT_PHASES: Record<string, string> = {
  'research-agent': 'Đang nghiên cứu xu hướng...',
  'strategy-agent': 'Đang lập kế hoạch nội dung...',
  'content-agent': 'Đang tạo nội dung...',
  'reviewer-agent': 'Đang kiểm tra chất lượng...',
};

/**
 * Main supervisor loop - orchestrates multi-agent workflow
 */
export async function executeSupervisorLoop(
  userMessage: string,
  options: SupervisorOptions
): Promise<SupervisorResult> {
  const startTime = Date.now();
  const sessionId = crypto.randomUUID();
  const agentResults: AgentResult[] = [];
  const tokenController = new TokenBudgetController();

  console.log(`[Supervisor] Starting session ${sessionId}`);

  const workflow = createWorkflowContext(sessionId);
  const blackboard = createBlackboard(options.supabase, sessionId);

  const execContext: AgentExecutionContext = {
    supabase: options.supabase,
    userId: options.userId,
    organizationId: options.organizationId,
    brandTemplateId: options.brandTemplateId,
    sessionId, // Pass real session ID
  };

  // Step 1: Classify intent
  transition(workflow, 'user_message');
  options.onEvent?.({ type: 'turn_start', data: { turn: 1, phase: 'classifying' } });

  const classification = await classifyIntent(userMessage, options.organizationId);
  console.log(`[Supervisor] Intent: ${classification.intent} (${classification.confidence})`);

  // Emit classification result so frontend can build dynamic progress steps
  options.onEvent?.({
    type: 'tool_result' as any,
    data: {
      type: 'classification',
      intent: classification.intent,
      suggestedAgents: classification.suggestedAgents,
      confidence: classification.confidence,
    },
  });

  // Fetch brand memory context
  let brandMemoryContext = '';
  if (options.brandTemplateId) {
    try {
      const memories = await searchBrandMemory(
        options.supabase,
        options.brandTemplateId,
        userMessage,
        undefined,
        5
      );
      brandMemoryContext = buildBrandMemoryContext(memories);
    } catch {}
  }

  // Write initial context to blackboard
  await blackboard.write('user_request', userMessage, 'supervisor');
  await blackboard.write('classification', classification, 'supervisor');

  // Step 2: Execute workflow based on classification
  const classificationEvent = classification.workflowEvent;
  const transitionResult = transition(workflow, classificationEvent);

  if (!transitionResult.success) {
    console.error(`[Supervisor] Invalid transition:`, transitionResult.error);
    return buildFallbackResult(userMessage, options, classification, workflow, startTime, tokenController);
  }

  // Execute agents based on state machine
  let maxIterations = 6;
  let iteration = 0;
  let skippedAgents: string[] = [];

  while (!isTerminalState(workflow.currentState) && iteration < maxIterations) {
    iteration++;
    const agentName = getNextAgent(workflow);
    
    if (!agentName) {
      transition(workflow, 'skip_agent');
      continue;
    }

    const agentConfig = getAgent(agentName);
    if (!agentConfig) {
      console.warn(`[Supervisor] Unknown agent: ${agentName}`);
      transition(workflow, 'skip_agent');
      continue;
    }

    // Token budget check
    if (!tokenController.canAfford(agentName, agentConfig.tokenBudget)) {
      console.warn(`[Supervisor] Token budget exhausted, skipping ${agentName}`);
      skippedAgents.push(agentName);
      transition(workflow, 'skip_agent');
      continue;
    }

    console.log(`[Supervisor] Executing ${agentName} (state: ${workflow.currentState})`);
    
    // Emit SSE with agent_name and phase
    options.onEvent?.({
      type: 'tool_executing',
      data: {
        tool: agentName,
        turn: iteration,
        state: workflow.currentState,
        agent_name: AGENT_DISPLAY_NAMES[agentName] || agentName,
        phase: AGENT_PHASES[agentName] || 'Đang xử lý...',
      },
    });

    // Build task with blackboard context injection
    const task = await buildAgentTask(agentName, userMessage, options, brandMemoryContext, blackboard);

    // Execute agent with graceful degradation
    const result = await executeAgentWithDegradation(
      agentConfig, task, blackboard, execContext, agentName, workflow
    );
    
    agentResults.push(result);

    // Record token usage
    const estimatedTokens = Math.ceil((result.content?.length || 0) / 4) + 500;
    tokenController.recordUsage(agentName, estimatedTokens);

    // Write result to blackboard
    if (result.success) {
      const blackboardKey = getBlackboardKey(agentName);
      await blackboard.write(blackboardKey, {
        content: result.content,
        toolResults: result.toolResults,
      }, agentName);
    }

    // Report result via SSE with agent info
    options.onEvent?.({
      type: 'tool_result',
      data: {
        agent: agentName,
        agent_name: AGENT_DISPLAY_NAMES[agentName] || agentName,
        success: result.success,
        duration_ms: result.durationMs,
        content_preview: result.content?.slice(0, 200),
        token_budget_remaining: tokenController.getRemainingBudget(),
      },
    });

    // Transition based on result
    const event = getTransitionEvent(agentName, result);
    transition(workflow, event);
  }

  // Build final content from agent results — prioritize content-agent
  const finalContent = buildFinalContent(agentResults, classification);

  // Fire-and-forget: Run learning agent async
  runLearningAgent(options.supabase, {
    sessionId,
    brandTemplateId: options.brandTemplateId,
    organizationId: options.organizationId,
    agentResults: agentResults.map(r => ({
      agentName: r.agentName,
      content: r.content,
      success: r.success,
    })),
  }).catch(() => {});

  const totalDuration = Date.now() - startTime;
  const tokenSnapshot = tokenController.getSnapshot();
  
  console.log(`[Supervisor] Complete in ${totalDuration}ms, ${agentResults.length} agents, ${skippedAgents.length} skipped`);

  options.onEvent?.({
    type: 'final_response',
    data: {
      exit_reason: workflow.currentState,
      total_agents: agentResults.length,
      skipped_agents: skippedAgents,
      total_duration_ms: totalDuration,
      token_usage: tokenSnapshot,
    },
  });

  return {
    success: workflow.currentState === 'completed',
    finalContent,
    agentResults,
    classification,
    workflowStates: workflow.previousStates,
    totalDurationMs: totalDuration,
    exitReason: workflow.currentState,
    tokenUsage: tokenSnapshot,
  };
}

// ============================================
// Graceful Degradation
// ============================================

async function executeAgentWithDegradation(
  agentConfig: AgentConfig,
  task: any,
  blackboard: BlackboardClient,
  execContext: AgentExecutionContext,
  agentName: string,
  workflow: WorkflowContext
): Promise<AgentResult> {
  try {
    const result = await executeAgent(agentConfig, task, blackboard, execContext);
    
    if (!result.success) {
      console.warn(`[Supervisor] Agent ${agentName} failed: ${result.error}`);
      return handleAgentFailure(agentName, result, workflow);
    }
    
    return result;
  } catch (err) {
    console.error(`[Supervisor] Agent ${agentName} threw:`, err);
    return handleAgentFailure(agentName, {
      success: false,
      agentName,
      content: '',
      toolResults: [],
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
      blackboardWrites: [],
    }, workflow);
  }
}

function handleAgentFailure(
  agentName: string,
  result: AgentResult,
  workflow: WorkflowContext
): AgentResult {
  const criticalAgents = new Set(['content-agent']);
  
  if (!criticalAgents.has(agentName)) {
    console.log(`[Supervisor] Non-critical agent ${agentName} failed, continuing`);
    return {
      ...result,
      success: true,
      content: `[${agentName} skipped due to error: ${result.error}]`,
    };
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

function getNextAgent(workflow: WorkflowContext): string | null {
  const stateToAgent: Record<string, string> = {
    researching: 'research-agent',
    planning: 'strategy-agent',
    generating: 'content-agent',
    reviewing: 'reviewer-agent',
  };
  return stateToAgent[workflow.currentState] || null;
}

/**
 * Build agent task with blackboard context injection
 * Reviewer gets generated_content from blackboard instead of user message
 */
async function buildAgentTask(
  agentName: string,
  userMessage: string,
  options: SupervisorOptions,
  brandMemoryContext: string,
  blackboard: BlackboardClient
) {
  // Read blackboard entries for context injection
  const blackboardEntries = await blackboard.readAll();
  const blackboardContext = buildBlackboardContext(blackboardEntries);
  
  const additionalContext = [options.systemPrompt, brandMemoryContext, blackboardContext]
    .filter(Boolean)
    .join('\n\n');

  // Build conversation history (last 10 messages for context)
  const conversationHistory = options.conversationHistory?.slice(-10);

  switch (agentName) {
    case 'research-agent':
      return { ...createResearchTask(userMessage, options.brandName, options.industry, additionalContext), conversationHistory };
    case 'strategy-agent':
      return { ...createStrategyTask(userMessage, options.brandName, options.industry, additionalContext), conversationHistory };
    case 'content-agent':
      return { ...createContentTask(userMessage, options.brandName, options.industry, additionalContext), conversationHistory };
    case 'reviewer-agent': {
      // Reviewer should review generated_content from blackboard, not user message
      const generatedContent = await blackboard.read('generated_content');
      const contentToReview = generatedContent?.content || userMessage;
      // Pass additionalContext (brand memory + blackboard) to reviewer too
      return { ...createReviewerTask(contentToReview, options.brandName, options.industry, options.complianceRules), additionalContext, conversationHistory };
    }
    default:
      return { ...createContentTask(userMessage, options.brandName, options.industry, additionalContext), conversationHistory };
  }
}

function getBlackboardKey(agentName: string): string {
  const keyMap: Record<string, string> = {
    'research-agent': 'research_data',
    'strategy-agent': 'content_plan',
    'content-agent': 'generated_content',
    'reviewer-agent': 'review_result',
  };
  return keyMap[agentName] || agentName;
}

/**
 * Get transition event based on agent result
 * Reviewer: parse JSON to check approved status
 */
function getTransitionEvent(agentName: string, result: AgentResult): WorkflowEvent {
  if (!result.success) return 'error';
  
  // Special handling for reviewer: parse JSON output
  if (agentName === 'reviewer-agent' && result.content) {
    try {
      // Try to parse reviewer JSON output
      const reviewJson = JSON.parse(result.content);
      if (reviewJson.approved === false) {
        console.log(`[Supervisor] Reviewer rejected content (score: ${reviewJson.overall_score})`);
        return 'review_needs_revision' as WorkflowEvent;
      }
    } catch {
      // If not valid JSON, try to extract from content
      if (result.content.toLowerCase().includes('"approved": false') || 
          result.content.toLowerCase().includes('"approved":false')) {
        return 'review_needs_revision' as WorkflowEvent;
      }
    }
  }

  const eventMap: Record<string, WorkflowEvent> = {
    'research-agent': 'research_complete',
    'strategy-agent': 'plan_complete',
    'content-agent': 'content_complete',
    'reviewer-agent': 'review_approved',
  };
  return eventMap[agentName] || 'skip_agent';
}

/**
 * Build final content — prioritize content-agent output
 */
function buildFinalContent(agentResults: AgentResult[], classification: ClassificationResult): string {
  // Priority 1: content-agent result
  const contentAgentResult = agentResults.find(
    r => r.agentName === 'content-agent' && r.success && r.content && !r.content.startsWith('[')
  );
  if (contentAgentResult) return contentAgentResult.content;

  // Priority 2: any successful agent with real content (not reviewer JSON, not skipped)
  const validResult = agentResults
    .filter(r => r.success && r.content && !r.content.startsWith('[') && r.agentName !== 'reviewer-agent')
    .pop();
  if (validResult) return validResult.content;

  // Priority 3: any content at all
  const anyContent = agentResults
    .filter(r => r.success && r.content && !r.content.startsWith('['))
    .pop();
  if (anyContent) return anyContent.content;

  return 'Không thể tạo nội dung. Vui lòng thử lại.';
}

async function buildFallbackResult(
  userMessage: string,
  options: SupervisorOptions,
  classification: ClassificationResult,
  workflow: WorkflowContext,
  startTime: number,
  tokenController: TokenBudgetController
): Promise<SupervisorResult> {
  return {
    success: false,
    finalContent: 'Xin lỗi, không thể xử lý yêu cầu này. Vui lòng thử lại.',
    agentResults: [],
    classification,
    workflowStates: workflow.previousStates,
    totalDurationMs: Date.now() - startTime,
    exitReason: 'fallback',
    tokenUsage: tokenController.getSnapshot(),
  };
}
