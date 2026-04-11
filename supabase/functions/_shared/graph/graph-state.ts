// ============================================
// Graph State Schema
// Typed state container for the graph engine
// Replaces Blackboard as the primary inter-node data store
// ============================================

import { ToolCallResult } from "../tool-definitions.ts";

// ---- Message types ----

export interface GraphMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
  timestamp?: number;
}

// ---- Node execution result ----

export interface NodeResult {
  nodeName: string;
  success: boolean;
  content: string;
  toolResults: ToolCallResult[];
  durationMs: number;
  error?: string;
  /** Partial state update produced by this node */
  stateUpdate: Partial<GraphState>;
  /** Actual tokens used (from LLM response usage header) */
  actualTokensUsed?: number;
}

// ---- Core Graph State ----

export interface GraphState {
  // Identity
  sessionId: string;
  checkpointId?: string;

  // Conversation
  messages: GraphMessage[];
  userMessage: string;

  // Classification / Orchestration
  userIntent: string;
  confidence: number;
  suggestedAgents: string[];
  orchestratorPlan?: GraphPlan;

  // Agent outputs (keyed by node name)
  researchData?: any;
  contentPlan?: any;
  generatedContent?: string;
  reviewResult?: any;
  generatedImage?: any;
  brandMemoryContext?: string;
  complianceResult?: any;

  // Governor / Review scoring
  reviewScore?: number;
  reviewConfidence?: number;
  finalResponse?: string;

  // Orchestrator tracking
  orchestratorReasoning?: string;

  // Topics
  bestTopic?: string;
  suggestedTopics?: any[];

  // Aggregated results
  nodeResults: NodeResult[];

  // Metadata
  metadata: Record<string, any>;
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed' | 'interrupted' | 'continuing';
  exitReason?: string;

  // Continuation pattern (anti-timeout)
  continuationToken?: string;
  continuingFromNode?: string;

  // Token budget
  tokenBudget: TokenBudget;

  // Human-in-the-loop
  interruptPayload?: InterruptPayload;
}

// ---- Orchestrator Plan ----

export interface GraphPlanStep {
  node: string;
  parallelWith?: string[];  // Nodes to run in parallel with this one
  dependsOn?: string[];     // Must complete before this node starts
}

export interface GraphPlan {
  steps: GraphPlanStep[];
  skipNodes: string[];
  reasoning: string;
  fastPath?: boolean;  // true = heuristic, no LLM orchestrator needed
  extractedTopic?: string; // Topic extracted by LLM during planning (zero-cost fallback)
  fromPlanCache?: boolean; // true = plan was served from in-memory cache
}

// ---- Token Budget ----

export interface TokenBudget {
  total: number;
  used: number;
  perNode: Record<string, { budget: number; used: number }>;
}

// ---- Human-in-the-loop ----

export interface InterruptPayload {
  type: 'topic_selection' | 'approval' | 'custom' | 'human_escalation';
  prompt: string;
  options?: Array<{ label: string; value: string }>;
  resumeNodeId: string;
}

// ---- Factory ----

export function createGraphState(sessionId: string, userMessage: string): GraphState {
  return {
    sessionId,
    messages: [{ role: 'user', content: userMessage, timestamp: Date.now() }],
    userMessage,
    userIntent: '',
    confidence: 0,
    suggestedAgents: [],
    nodeResults: [],
    metadata: {},
    startedAt: Date.now(),
    status: 'running',
    tokenBudget: {
      total: 16384,
      used: 0,
      perNode: {},
    },
  };
}

// ---- State merge helpers ----

/**
 * Merge a partial state update into the current state.
 * Arrays (nodeResults, messages) are appended, objects are shallow-merged.
 */
export function mergeStateUpdate(
  current: GraphState,
  update: Partial<GraphState>
): GraphState {
  const merged = { ...current };

  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) continue;

    if (key === 'nodeResults' && Array.isArray(value)) {
      merged.nodeResults = [...merged.nodeResults, ...value];
    } else if (key === 'messages' && Array.isArray(value)) {
      merged.messages = [...merged.messages, ...value];
    } else if (key === 'metadata' && typeof value === 'object') {
      merged.metadata = { ...merged.metadata, ...(value as Record<string, any>) };
    } else if (key === 'tokenBudget' && typeof value === 'object') {
      const budgetUpdate = value as Partial<TokenBudget>;
      merged.tokenBudget = {
        ...merged.tokenBudget,
        ...budgetUpdate,
        perNode: {
          ...merged.tokenBudget.perNode,
          ...(budgetUpdate.perNode || {}),
        },
      };
    } else {
      (merged as any)[key] = value;
    }
  }

  return merged;
}

/**
 * Record token usage for a node
 */
export function recordNodeTokens(
  state: GraphState,
  nodeName: string,
  tokensUsed: number,
  baseBudget: number
): GraphState {
  return mergeStateUpdate(state, {
    tokenBudget: {
      total: state.tokenBudget.total,
      used: state.tokenBudget.used + tokensUsed,
      perNode: {
        ...state.tokenBudget.perNode,
        [nodeName]: {
          budget: baseBudget,
          used: (state.tokenBudget.perNode[nodeName]?.used || 0) + tokensUsed,
        },
      },
    },
  });
}

/**
 * Check if there's enough token budget for a node
 */
export function canAffordNode(state: GraphState, estimatedTokens: number): boolean {
  return (state.tokenBudget.used + estimatedTokens) <= state.tokenBudget.total;
}

/**
 * Build context string from state for injection into node prompts
 */
export function buildStateContext(state: GraphState): string {
  const sections: string[] = [];

  if (state.researchData) {
    const str = typeof state.researchData === 'string'
      ? state.researchData
      : JSON.stringify(state.researchData, null, 2).slice(0, 1500);
    sections.push(`### Research Data\n${str}`);
  }

  if (state.bestTopic) {
    sections.push(`### Selected Topic\n${state.bestTopic}`);
  }

  if (state.contentPlan) {
    const str = typeof state.contentPlan === 'string'
      ? state.contentPlan
      : JSON.stringify(state.contentPlan, null, 2).slice(0, 1500);
    sections.push(`### Content Plan\n${str}`);
  }

  if (state.generatedContent) {
    sections.push(`### Generated Content\n${state.generatedContent.slice(0, 2000)}`);
  }

  // brandMemoryContext and complianceResult removed from context injection
  // — these are now handled internally by generate-multichannel

  if (sections.length === 0) return '';
  return `\n## 📋 Context from Previous Nodes\n${sections.join('\n\n')}`;
}
