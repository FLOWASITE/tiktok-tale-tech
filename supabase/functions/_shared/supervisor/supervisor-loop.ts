// ============================================
// Supervisor Loop
// Orchestrates multi-agent workflow using State Machine
// ============================================

import {
  createWorkflowContext,
  transition,
  isTerminalState,
  WorkflowContext,
  WorkflowEvent,
} from "./state-machine.ts";
import { classifyIntent, ClassificationResult } from "./intent-classifier.ts";
import { getAgent, AgentConfig } from "./agent-registry.ts";
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
  systemPrompt: string; // Full system prompt from chat-topics
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
}

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

  console.log(`[Supervisor] Starting session ${sessionId}`);

  // Create workflow context and blackboard
  const workflow = createWorkflowContext(sessionId);
  const blackboard = createBlackboard(options.supabase, sessionId);

  const execContext: AgentExecutionContext = {
    supabase: options.supabase,
    userId: options.userId,
    organizationId: options.organizationId,
    brandTemplateId: options.brandTemplateId,
  };

  // Step 1: Classify intent
  transition(workflow, 'user_message');
  options.onEvent?.({ type: 'turn_start', data: { turn: 1, phase: 'classifying' } });

  const classification = await classifyIntent(userMessage, options.organizationId);
  console.log(`[Supervisor] Intent: ${classification.intent} (${classification.confidence})`);

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
    return buildFallbackResult(userMessage, options, classification, workflow, startTime);
  }

  // Execute agents based on state machine
  let maxIterations = 6; // Safety limit
  let iteration = 0;

  while (!isTerminalState(workflow.currentState) && iteration < maxIterations) {
    iteration++;
    const agentName = getNextAgent(workflow);
    
    if (!agentName) {
      // No agent for current state, try to advance
      transition(workflow, 'skip_agent');
      continue;
    }

    const agentConfig = getAgent(agentName);
    if (!agentConfig) {
      console.warn(`[Supervisor] Unknown agent: ${agentName}`);
      transition(workflow, 'skip_agent');
      continue;
    }

    console.log(`[Supervisor] Executing ${agentName} (state: ${workflow.currentState})`);
    options.onEvent?.({
      type: 'tool_executing',
      data: { tool: agentName, turn: iteration, state: workflow.currentState },
    });

    // Build task based on agent type
    const task = buildAgentTask(
      agentName,
      userMessage,
      options,
      brandMemoryContext
    );

    // Execute agent
    const result = await executeAgent(agentConfig, task, blackboard, execContext);
    agentResults.push(result);

    // Write result to blackboard
    if (result.success) {
      const blackboardKey = getBlackboardKey(agentName);
      await blackboard.write(blackboardKey, {
        content: result.content,
        toolResults: result.toolResults,
      }, agentName);
    }

    // Report result via SSE
    options.onEvent?.({
      type: 'tool_result',
      data: {
        agent: agentName,
        success: result.success,
        duration_ms: result.durationMs,
        content_preview: result.content?.slice(0, 200),
      },
    });

    // Transition based on result
    const event = getTransitionEvent(agentName, result);
    transition(workflow, event);
  }

  // Build final content from agent results
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
  console.log(`[Supervisor] Complete in ${totalDuration}ms, ${agentResults.length} agents executed`);

  options.onEvent?.({
    type: 'final_response',
    data: {
      exit_reason: workflow.currentState,
      total_agents: agentResults.length,
      total_duration_ms: totalDuration,
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
  };
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

function buildAgentTask(
  agentName: string,
  userMessage: string,
  options: SupervisorOptions,
  brandMemoryContext: string
) {
  const additionalContext = [options.systemPrompt, brandMemoryContext]
    .filter(Boolean)
    .join('\n\n');

  switch (agentName) {
    case 'research-agent':
      return createResearchTask(userMessage, options.brandName, options.industry, additionalContext);
    case 'strategy-agent':
      return createStrategyTask(userMessage, options.brandName, options.industry, additionalContext);
    case 'content-agent':
      return createContentTask(userMessage, options.brandName, options.industry, additionalContext);
    case 'reviewer-agent':
      return createReviewerTask(userMessage, options.brandName, options.industry, options.complianceRules);
    default:
      return createContentTask(userMessage, options.brandName, options.industry, additionalContext);
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

function getTransitionEvent(agentName: string, result: AgentResult): WorkflowEvent {
  if (!result.success) return 'error';
  
  const eventMap: Record<string, WorkflowEvent> = {
    'research-agent': 'research_complete',
    'strategy-agent': 'plan_complete',
    'content-agent': 'content_complete',
    'reviewer-agent': 'review_approved', // TODO: parse review result for needs_revision
  };
  return eventMap[agentName] || 'skip_agent';
}

function buildFinalContent(agentResults: AgentResult[], classification: ClassificationResult): string {
  // Find the last successful content-generating agent result
  const contentResult = agentResults
    .filter(r => r.success && r.content)
    .pop();

  return contentResult?.content || 'Không thể tạo nội dung. Vui lòng thử lại.';
}

async function buildFallbackResult(
  userMessage: string,
  options: SupervisorOptions,
  classification: ClassificationResult,
  workflow: WorkflowContext,
  startTime: number
): Promise<SupervisorResult> {
  return {
    success: false,
    finalContent: 'Xin lỗi, không thể xử lý yêu cầu này. Vui lòng thử lại.',
    agentResults: [],
    classification,
    workflowStates: workflow.previousStates,
    totalDurationMs: Date.now() - startTime,
    exitReason: 'fallback',
  };
}
