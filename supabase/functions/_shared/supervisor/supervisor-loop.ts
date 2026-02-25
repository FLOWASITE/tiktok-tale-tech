// ============================================
// Supervisor Loop
// Orchestrates multi-agent workflow using State Machine
// With Session Budget Manager + Graceful Degradation
// + Blackboard Pruning + Cost Estimation
// ============================================

import {
  createWorkflowContext,
  transition,
  isTerminalState,
  WorkflowContext,
  WorkflowEvent,
  createSubWorkflow,
  advanceSubWorkflow,
  allSubWorkflowsComplete,
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
import { runLearningAgent, getLearnedPromptRules } from "../agents/learning-agent.ts";
import { runBrandMemoryAgent } from "../agents/brand-memory-agent.ts";
import { createImageTask } from "../agents/image-agent.ts";
import { estimateCost } from "../cost-estimator.ts";
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
  userAccessToken?: string;
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

class SessionBudgetManager {
  private totalBudget: number;
  private agentUsage: Record<string, number> = {};
  private agentOrder: string[] = [];

  constructor(totalBudget: number = 16384) {
    this.totalBudget = totalBudget;
  }

  /** Record which agents will run, in order */
  setAgentOrder(agents: string[]): void {
    this.agentOrder = agents;
  }

  /** Total tokens used so far */
  private getUsedTokens(): number {
    return Object.values(this.agentUsage).reduce((sum, v) => sum + v, 0);
  }

  /** Dynamic budget: allows agent to use up to 150% of its base budget if surplus exists */
  getEffectiveBudget(agentName: string): number {
    const config = getAgent(agentName);
    const baseBudget = config?.tokenBudget || 2000;
    const remaining = this.totalBudget - this.getUsedTokens();
    return Math.min(remaining, Math.ceil(baseBudget * 1.5));
  }

  canAfford(agentName: string, estimatedTokens: number): boolean {
    return (this.getUsedTokens() + estimatedTokens) <= this.totalBudget;
  }

  recordUsage(agentName: string, tokens: number): void {
    this.agentUsage[agentName] = (this.agentUsage[agentName] || 0) + tokens;
  }

  getRemainingBudget(): number {
    return Math.max(0, this.totalBudget - this.getUsedTokens());
  }

  getSnapshot(): TokenBudgetSnapshot {
    const agentConfigs: Record<string, { budget: number; used: number }> = {};
    for (const [name, used] of Object.entries(this.agentUsage)) {
      const config = getAgent(name);
      agentConfigs[name] = { budget: config?.tokenBudget || 0, used };
    }
    return {
      total: this.totalBudget,
      used: this.getUsedTokens(),
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
  'brand-memory-agent': 'Brand Memory Agent',
  'image-agent': 'Image Agent',
};

const AGENT_PHASES: Record<string, string> = {
  'research-agent': 'Đang nghiên cứu xu hướng...',
  'strategy-agent': 'Đang lập kế hoạch nội dung...',
  'content-agent': 'Đang tạo nội dung...',
  'reviewer-agent': 'Đang kiểm tra chất lượng...',
  'brand-memory-agent': 'Đang cập nhật hồ sơ thương hiệu...',
  'image-agent': 'Đang tạo hình ảnh...',
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
  const tokenController = new SessionBudgetManager();

  console.log(`[Supervisor] Starting session ${sessionId}`);

  const workflow = createWorkflowContext(sessionId);
  const blackboard = createBlackboard(options.supabase, sessionId);

  const execContext: AgentExecutionContext = {
    supabase: options.supabase,
    userId: options.userId,
    organizationId: options.organizationId,
    brandTemplateId: options.brandTemplateId,
    sessionId, // Pass real session ID
    userAccessToken: options.userAccessToken,
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

  // ============================================
  // Multi-step routing (Hierarchical Supervisor)
  // ============================================
  if (classification.intent === 'multi_step' && workflow.currentState === 'multi_step_routing') {
    console.log(`[Supervisor] Multi-step workflow with ${classification.steps?.length || 3} steps`);
    
    const stepToAgent: Record<string, string> = {
      research: 'research-agent',
      plan: 'strategy-agent',
      generate: 'content-agent',
      review: 'reviewer-agent',
      image: 'image-agent',
    };
    
    const agentSteps = (classification.steps || ['research', 'plan', 'generate'])
      .map(s => stepToAgent[s] || 'content-agent');
    
    const sub = createSubWorkflow(agentSteps);
    workflow.subWorkflows.push(sub);
    workflow.activeSubWorkflowId = sub.id;
    workflow.multiStepPlan = classification.steps;

    options.onEvent?.({
      type: 'tool_result' as any,
      data: {
        type: 'multi_step_plan',
        steps: classification.steps,
        agents: agentSteps,
      },
    });

    let nextAgent = advanceSubWorkflow(sub);
    let stepIndex = 0;
    
    while (nextAgent) {
      stepIndex++;
      const agentConfig = getAgent(nextAgent);
      if (!agentConfig || !tokenController.canAfford(nextAgent, agentConfig.tokenBudget)) {
        console.warn(`[Supervisor] Skipping ${nextAgent} in multi-step`);
        nextAgent = advanceSubWorkflow(sub);
        continue;
      }

      options.onEvent?.({
        type: 'tool_executing',
        data: {
          tool: nextAgent,
          turn: stepIndex,
          state: 'multi_step_routing',
          agent_name: AGENT_DISPLAY_NAMES[nextAgent] || nextAgent,
          phase: AGENT_PHASES[nextAgent] || 'Đang xử lý...',
          step: `${stepIndex}/${sub.steps.length}`,
        },
      });

      await blackboard.prune();
      const task = await buildAgentTask(nextAgent, userMessage, options, brandMemoryContext, blackboard);
      const result = await executeAgentWithDegradation(agentConfig, task, blackboard, execContext, nextAgent, workflow);
      agentResults.push(result);

      const estimatedTokens = Math.ceil((result.content?.length || 0) / 4) + 500;
      tokenController.recordUsage(nextAgent, estimatedTokens);

      if (result.success) {
        const bbKey = getBlackboardKey(nextAgent);
        await blackboard.write(bbKey, { content: result.content, toolResults: result.toolResults }, nextAgent);
        sub.results[nextAgent] = result.content;

        // Emit topic_suggestions after research-agent completes
        if (nextAgent === 'research-agent') {
          const topicPayload = await buildTopicSuggestionsPayload(result, blackboard);
          if (topicPayload) {
            options.onEvent?.({
              type: 'topic_suggestions' as any,
              data: topicPayload,
            });
            // Write best_topic to blackboard for Content Agent
            await blackboard.write('best_topic', topicPayload.best_topic, 'research-agent');
            await blackboard.write('suggested_topics', topicPayload.topics, 'research-agent');
            console.log(`[Supervisor] Emitted topic_suggestions (${topicPayload.topics.length} topics) + wrote best_topic to blackboard`);
          }
        }
      }

      options.onEvent?.({
        type: 'tool_result',
        data: {
          agent: nextAgent,
          agent_name: AGENT_DISPLAY_NAMES[nextAgent] || nextAgent,
          success: result.success,
          duration_ms: result.durationMs,
          step: `${stepIndex}/${sub.steps.length}`,
          token_budget_remaining: tokenController.getRemainingBudget(),
        },
      });

      // Emit agent_step_result for realtime streaming to frontend
      console.log(`[Supervisor] agent_step_result check (multi-step): agent=${nextAgent}, success=${result.success}, contentLength=${result.content?.length || 0}, contentStart="${result.content?.slice(0, 50)}"`);
      if (result.success && result.content && nextAgent !== 'reviewer-agent') {
        const trimmed = result.content.trim();
        const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
        if (!isJson) {
          console.log(`[Supervisor] Emitting agent_step_result for ${nextAgent}, ${result.content.length} chars`);
          options.onEvent?.({
            type: 'agent_step_result',
            data: {
              agent: nextAgent,
              agent_name: AGENT_DISPLAY_NAMES[nextAgent] || nextAgent,
              content: result.content,
              success: true,
              duration_ms: result.durationMs,
              step_index: stepIndex,
              is_final: false,
            },
          });
        } else {
          console.log(`[Supervisor] Skipped agent_step_result for ${nextAgent}: content is JSON`);
        }
      }

      transition(workflow, 'sub_complete');
      nextAgent = advanceSubWorkflow(sub);
    }

    transition(workflow, 'all_subs_complete');

    // Merge results
    const mergedContent = mergeMultiStepResults(agentResults, sub);
    transition(workflow, 'merge_complete');

    // Fire learning agent + brand memory agent
    runLearningAgent(options.supabase, {
      sessionId,
      brandTemplateId: options.brandTemplateId,
      organizationId: options.organizationId,
      agentResults: agentResults.map(r => ({ agentName: r.agentName, content: r.content, success: r.success })),
    }).catch(() => {});

    if (options.brandTemplateId && options.organizationId) {
      runBrandMemoryAgent({
        supabase: options.supabase,
        brandTemplateId: options.brandTemplateId,
        organizationId: options.organizationId,
        sessionId,
        userMessage,
        generatedContent: mergedContent,
      }).catch(() => {});
    }

    const totalDuration = Date.now() - startTime;
    options.onEvent?.({
      type: 'final_response',
      data: {
        exit_reason: 'completed',
        total_agents: agentResults.length,
        workflow_type: 'multi_step',
        total_duration_ms: totalDuration,
        token_usage: tokenController.getSnapshot(),
      },
    });

    return {
      success: true,
      finalContent: mergedContent,
      agentResults,
      classification,
      workflowStates: workflow.previousStates,
      totalDurationMs: totalDuration,
      exitReason: 'completed',
      tokenUsage: tokenController.getSnapshot(),
    };
  }

  // ============================================
  // Standard linear workflow (existing logic)
  // ============================================
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

    await blackboard.prune();
    const task = await buildAgentTask(agentName, userMessage, options, brandMemoryContext, blackboard);

    const result = await executeAgentWithDegradation(
      agentConfig, task, blackboard, execContext, agentName, workflow
    );
    
    agentResults.push(result);

    const estimatedTokens = Math.ceil((result.content?.length || 0) / 4) + 500;
    tokenController.recordUsage(agentName, estimatedTokens);

    if (result.success) {
      const blackboardKey = getBlackboardKey(agentName);
      await blackboard.write(blackboardKey, {
        content: result.content,
        toolResults: result.toolResults,
      }, agentName);

      // Emit topic_suggestions after research-agent completes
      if (agentName === 'research-agent') {
        const topicPayload = await buildTopicSuggestionsPayload(result, blackboard);
        if (topicPayload) {
          options.onEvent?.({
            type: 'topic_suggestions' as any,
            data: topicPayload,
          });
          // Write best_topic to blackboard for Content Agent
          await blackboard.write('best_topic', topicPayload.best_topic, 'research-agent');
          await blackboard.write('suggested_topics', topicPayload.topics, 'research-agent');
          console.log(`[Supervisor] Emitted topic_suggestions (${topicPayload.topics.length} topics) + wrote best_topic to blackboard`);
        }
      }
    }

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

    // Emit agent_step_result for realtime streaming to frontend
    console.log(`[Supervisor] agent_step_result check (linear): agent=${agentName}, success=${result.success}, contentLength=${result.content?.length || 0}, contentStart="${result.content?.slice(0, 50)}"`);
    if (result.success && result.content && agentName !== 'reviewer-agent') {
      const trimmed = result.content.trim();
      const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
      if (!isJson) {
        console.log(`[Supervisor] Emitting agent_step_result for ${agentName}, ${result.content.length} chars`);
        options.onEvent?.({
          type: 'agent_step_result',
          data: {
            agent: agentName,
            agent_name: AGENT_DISPLAY_NAMES[agentName] || agentName,
            content: result.content,
            success: true,
            duration_ms: result.durationMs,
            step_index: iteration,
            is_final: false,
          },
        });
      } else {
        console.log(`[Supervisor] Skipped agent_step_result for ${agentName}: content is JSON`);
      }
    }

    const event = getTransitionEvent(agentName, result);
    transition(workflow, event);
  }

  // Build final content from agent results — prioritize content-agent
  const finalContent = buildFinalContent(agentResults, classification);

  // Extract review scores if reviewer ran
  const reviewerResult = agentResults.find(r => r.agentName === 'reviewer-agent' && r.success);
  let reviewScores: any;
  if (reviewerResult?.content) {
    try { reviewScores = JSON.parse(reviewerResult.content); } catch {}
  }

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
    reviewScores,
  }).catch(() => {});

  // Fire-and-forget: Run brand memory agent async (non-blocking)
  if (options.brandTemplateId && options.organizationId) {
    runBrandMemoryAgent({
      supabase: options.supabase,
      brandTemplateId: options.brandTemplateId,
      organizationId: options.organizationId,
      sessionId,
      userMessage,
      generatedContent: finalContent,
    }).catch(() => {});
  }

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
    image_generating: 'image-agent',
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
  
  // Fetch learned prompt rules for content-agent
  let learnedRules = '';
  if (agentName === 'content-agent' && options.brandTemplateId) {
    try {
      learnedRules = await getLearnedPromptRules(options.supabase, options.brandTemplateId);
    } catch {}
  }
  
  const additionalContext = [options.systemPrompt, brandMemoryContext, learnedRules, blackboardContext]
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
    case 'image-agent':
      return { ...createImageTask(userMessage, options.brandName, options.industry, additionalContext), conversationHistory };
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
    'image-agent': 'generated_image',
  };
  return keyMap[agentName] || agentName;
}

async function buildTopicSuggestionsPayload(
  result: AgentResult,
  blackboard: BlackboardClient
): Promise<{ topics: any[]; best_topic?: string } | null> {
  // Primary source: discover_topics tool result from research-agent
  const discoverTool = result.toolResults?.find(
    (tool) => tool.tool_name === 'discover_topics' && tool.success && tool.result?.topics?.length
  );

  if (discoverTool?.result?.topics?.length) {
    const topics = discoverTool.result.topics.slice(0, 5);
    const bestTopicRaw = discoverTool.result.best_topic ?? topics[0]?.topic;
    const bestTopic = typeof bestTopicRaw === 'string' ? bestTopicRaw : bestTopicRaw?.topic;
    return { topics, best_topic: bestTopic };
  }

  // Fallback source: legacy blackboard keys (if any custom flow writes these)
  const suggestedTopics = await blackboard.read('suggested_topics');
  if (suggestedTopics && Array.isArray(suggestedTopics) && suggestedTopics.length > 0) {
    const bestTopicRaw = await blackboard.read('best_topic');
    const bestTopic = typeof bestTopicRaw === 'string' ? bestTopicRaw : bestTopicRaw?.topic;
    return {
      topics: suggestedTopics.slice(0, 5),
      best_topic: bestTopic,
    };
  }

  return null;
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
    'image-agent': 'image_complete',
  };
  return eventMap[agentName] || 'skip_agent';
}

/**
 * Build final content — prioritize content-agent output
 */
function buildFinalContent(agentResults: AgentResult[], classification: ClassificationResult): string {
  // Priority 0: image-agent — its value is in toolResults, but content has the summary
  if (classification.intent === 'image_generate') {
    const imageResult = agentResults.find(r => r.agentName === 'image-agent' && r.success);
    if (imageResult?.content) return imageResult.content;
  }

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

/**
 * Merge results from multi-step sub-workflow into unified response
 */
function mergeMultiStepResults(
  agentResults: AgentResult[],
  sub: { steps: string[]; results: Record<string, any> }
): string {
  const parts: string[] = [];
  
  for (const agentName of sub.steps) {
    const result = agentResults.find(r => r.agentName === agentName && r.success);
    if (result?.content && !result.content.startsWith('[')) {
      parts.push(result.content);
    }
  }

  if (parts.length === 0) {
    return 'Không thể hoàn thành tất cả các bước. Vui lòng thử lại.';
  }

  // If only content-agent produced real content, return just that
  if (parts.length === 1) return parts[0];

  // Otherwise combine all meaningful outputs
  return parts.join('\n\n---\n\n');
}

async function buildFallbackResult(
  userMessage: string,
  options: SupervisorOptions,
  classification: ClassificationResult,
  workflow: WorkflowContext,
  startTime: number,
  tokenController: SessionBudgetManager
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
