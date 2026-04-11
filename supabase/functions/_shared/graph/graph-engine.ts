// ============================================
// Mini Graph Engine
// Lightweight DAG execution engine for Deno
// Supports: conditional edges, parallel fan-out/fan-in,
//           dynamic graph compilation, checkpoints
// ============================================

import {
  GraphState,
  GraphPlan,
  GraphPlanStep,
  NodeResult,
  mergeStateUpdate,
  createGraphState,
} from "./graph-state.ts";
import { orchestrateWorkflow, OrchestratorOptions, hasExplicitTopic } from "./orchestrator.ts";
import { BlackboardRetriever, extractStorableContent } from "./blackboard-retriever.ts";
import { createTrace, createSpan, endSpan, getTraceHeaders, type Trace } from "../tracing.ts";
import { classifyError, getErrorStrategy, type FlowaError, TransientError, DegradationError } from "../errors/flowa-error.ts";
export { createNodeRegistry, type NodeExecutionContext } from "./nodes/index.ts";
export { BlackboardRetriever } from "./blackboard-retriever.ts";

// ---- Types ----

export type NodeFunction = (state: GraphState) => Promise<Partial<GraphState>>;

export interface NodeConfig {
  name: string;
  fn: NodeFunction;
  /** If true, failure stops the entire graph */
  critical?: boolean;
  /** Estimated token cost for budget checks */
  estimatedTokens?: number;
}

export interface StaticEdge {
  from: string;
  to: string;
}

export interface ConditionalEdge {
  from: string;
  condition: (state: GraphState) => string | string[] | null;
  // Returns target node name(s) or null to end
}

export interface GraphDefinition {
  nodes: Map<string, NodeConfig>;
  edges: StaticEdge[];
  conditionalEdges: ConditionalEdge[];
  entryPoint: string;
  endNodes: Set<string>;
}

export interface GraphExecutionOptions {
  /** Called when a node starts */
  onNodeStart?: (nodeName: string, state: GraphState) => void;
  /** Called when a node completes */
  onNodeComplete?: (nodeName: string, result: Partial<GraphState>, durationMs: number) => void;
  /** Called on node error */
  onNodeError?: (nodeName: string, error: Error) => void;
  /** Checkpoint save function */
  onCheckpoint?: (state: GraphState, completedNode: string) => Promise<void>;
  /** Max total execution time in ms */
  maxExecutionMs?: number;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  /** Continuation threshold - when elapsed > this, save checkpoint and return partial result */
  continuationThresholdMs?: number;
}

export interface GraphExecutionResult {
  state: GraphState;
  executedNodes: string[];
  skippedNodes: string[];
  error?: string;
}

// ---- Graph Builder ----

export class GraphBuilder {
  private nodes = new Map<string, NodeConfig>();
  private edges: StaticEdge[] = [];
  private conditionalEdges: ConditionalEdge[] = [];
  private entry = '';
  private ends = new Set<string>();

  addNode(name: string, fn: NodeFunction, opts?: Partial<Omit<NodeConfig, 'name' | 'fn'>>): this {
    this.nodes.set(name, { name, fn, ...opts });
    return this;
  }

  addEdge(from: string, to: string): this {
    this.edges.push({ from, to });
    return this;
  }

  addConditionalEdge(from: string, condition: ConditionalEdge['condition']): this {
    this.conditionalEdges.push({ from, condition });
    return this;
  }

  setEntryPoint(name: string): this {
    this.entry = name;
    return this;
  }

  addEndNode(name: string): this {
    this.ends.add(name);
    return this;
  }

  build(): GraphDefinition {
    if (!this.entry) throw new Error('Graph must have an entry point');
    if (!this.nodes.has(this.entry)) throw new Error(`Entry point '${this.entry}' not found in nodes`);
    return {
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      conditionalEdges: [...this.conditionalEdges],
      entryPoint: this.entry,
      endNodes: new Set(this.ends),
    };
  }
}

// ---- Dynamic Graph Compilation from Orchestrator Plan ----

/**
 * Compile an orchestrator plan into a GraphDefinition.
 * The plan specifies ordered steps with parallel groups and dependencies.
 * Node functions must be provided via the nodeRegistry.
 */
export function compileGraphFromPlan(
  plan: GraphPlan,
  nodeRegistry: Map<string, NodeConfig>
): GraphDefinition {
  const builder = new GraphBuilder();
  const skipSet = new Set(plan.skipNodes || []);

  // Filter valid steps
  const steps = plan.steps.filter(s => !skipSet.has(s.node) && nodeRegistry.has(s.node));

  if (steps.length === 0) {
    throw new Error('Graph plan has no executable steps');
  }

  // Add all nodes
  for (const step of steps) {
    const config = nodeRegistry.get(step.node)!;
    builder.addNode(config.name, config.fn, {
      critical: config.critical,
      estimatedTokens: config.estimatedTokens,
    });

    // Also add parallel nodes
    for (const pNode of step.parallelWith || []) {
      if (!skipSet.has(pNode) && nodeRegistry.has(pNode) && !steps.some(s => s.node === pNode)) {
        const pConfig = nodeRegistry.get(pNode)!;
        builder.addNode(pConfig.name, pConfig.fn, {
          critical: pConfig.critical,
          estimatedTokens: pConfig.estimatedTokens,
        });
      }
    }
  }

  // Set entry point
  builder.setEntryPoint(steps[0].node);

  // Build edges from step dependencies
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Add edges from dependencies
    if (step.dependsOn?.length) {
      for (const dep of step.dependsOn) {
        if (!skipSet.has(dep)) {
          builder.addEdge(dep, step.node);
        }
      }
    } else if (i > 0) {
      // Default: sequential edge from previous step
      const prev = steps[i - 1];
      // Connect from previous step (and its parallels) to current
      builder.addEdge(prev.node, step.node);
      for (const pNode of prev.parallelWith || []) {
        if (!skipSet.has(pNode)) {
          builder.addEdge(pNode, step.node);
        }
      }
    }
  }

  // Last step is end node
  const lastStep = steps[steps.length - 1];
  builder.addEndNode(lastStep.node);
  for (const pNode of lastStep.parallelWith || []) {
    if (!skipSet.has(pNode)) builder.addEndNode(pNode);
  }

  return builder.build();
}

// ---- Graph Executor ----

/**
 * Execute a graph definition against a state.
 * Supports parallel execution of independent nodes.
 */
export async function executeGraph(
  graph: GraphDefinition,
  initialState: GraphState,
  options: GraphExecutionOptions = {}
): Promise<GraphExecutionResult> {
  const executedNodes: string[] = [];
  const skippedNodes: string[] = [];
  let state = { ...initialState };
  const startTime = Date.now();
  const maxMs = options.maxExecutionMs || 55000; // Default 55s (Edge Function safety margin)

  // Build adjacency & in-degree for topological execution
  const { adjacency, inDegree, allNodes } = buildDAG(graph);

  // Track completed nodes
  const completed = new Set<string>();
  const failed = new Set<string>();

  // BFS-style execution: process nodes whose dependencies are all met
  while (completed.size + failed.size + skippedNodes.length < allNodes.size) {
    // Check continuation threshold (soft timeout — save & resume later)
    const continuationMs = options.continuationThresholdMs || 0;
    if (continuationMs > 0 && Date.now() - startTime > continuationMs) {
      const checkpointId = crypto.randomUUID();
      state = mergeStateUpdate(state, {
        status: 'continuing',
        exitReason: 'continuation_required',
        continuationToken: checkpointId,
      });
      // Save checkpoint before returning
      if (options.onCheckpoint) {
        try { await options.onCheckpoint(state, `continuation_at_${Date.now()}`); } catch {}
      }
      return { state, executedNodes, skippedNodes };
    }

    // Check hard timeout
    if (Date.now() - startTime > maxMs) {
      state = mergeStateUpdate(state, {
        status: 'failed',
        exitReason: 'timeout',
      });
      return { state, executedNodes, skippedNodes, error: 'Graph execution timeout' };
    }

    // Check abort
    if (options.abortSignal?.aborted) {
      state = mergeStateUpdate(state, {
        status: 'failed',
        exitReason: 'aborted',
      });
      return { state, executedNodes, skippedNodes, error: 'Aborted' };
    }

    // Find ready nodes: all dependencies completed
    const readyNodes = [...allNodes].filter(n =>
      !completed.has(n) && !failed.has(n) && !skippedNodes.includes(n) &&
      (inDegree.get(n) || []).every(dep => completed.has(dep))
    );

    if (readyNodes.length === 0) {
      // Deadlock or all done
      break;
    }

    // Execute ready nodes in parallel
    const results = await Promise.allSettled(
      readyNodes.map(async (nodeName) => {
        const nodeConfig = graph.nodes.get(nodeName);
        if (!nodeConfig) {
          skippedNodes.push(nodeName);
          return { nodeName, skipped: true };
        }

        // Token budget check
        if (nodeConfig.estimatedTokens && !canAfford(state, nodeConfig.estimatedTokens)) {
          console.warn(`[GraphEngine] Token budget exhausted, skipping ${nodeName}`);
          skippedNodes.push(nodeName);
          return { nodeName, skipped: true };
        }

        options.onNodeStart?.(nodeName, state);
        const nodeStart = Date.now();

        try {
          const update = await nodeConfig.fn(state);
          const durationMs = Date.now() - nodeStart;

          options.onNodeComplete?.(nodeName, update, durationMs);

          return { nodeName, update, durationMs, skipped: false };
        } catch (err) {
          const classified = classifyError(err);
          const strategy = getErrorStrategy(classified, !!nodeConfig.critical);
          const durationMs = Date.now() - nodeStart;

          console.warn(`[GraphEngine] Node ${nodeName} error (${classified.code}), strategy: ${strategy}`);

          // Retry transient errors (max 1 retry for nodes)
          if (strategy === 'retry') {
            console.log(`[GraphEngine] Retrying ${nodeName} once...`);
            try {
              const retryUpdate = await nodeConfig.fn(state);
              const retryDurationMs = Date.now() - nodeStart;
              options.onNodeComplete?.(nodeName, retryUpdate, retryDurationMs);
              return { nodeName, update: retryUpdate, durationMs: retryDurationMs, skipped: false };
            } catch (retryErr) {
              const retryClassified = classifyError(retryErr);
              options.onNodeError?.(nodeName, retryClassified);
              // After retry fails: critical → propagate, non-critical → skip
              if (nodeConfig.critical) {
                throw retryClassified;
              }
              console.warn(`[GraphEngine] Retry failed for ${nodeName}, skipping: ${retryClassified.message}`);
              return { nodeName, update: {} as Partial<GraphState>, durationMs: Date.now() - nodeStart, error: retryClassified.message, skipped: false };
            }
          }

          // Fail immediately for permanent errors on critical nodes
          if (strategy === 'fail') {
            options.onNodeError?.(nodeName, classified);
            throw classified;
          }

          // Skip (degradation) — log and continue
          options.onNodeError?.(nodeName, classified);
          return { nodeName, update: {} as Partial<GraphState>, durationMs, error: classified.message, skipped: false };
        }
      })
    );

    // Process results
    for (const result of results) {
      if (result.status === 'rejected') {
        // Critical node failure
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        state = mergeStateUpdate(state, {
          status: 'failed',
          exitReason: `critical_node_failure: ${errorMsg}`,
        });
        return { state, executedNodes, skippedNodes, error: errorMsg };
      }

      const { nodeName, update, durationMs, skipped, error } = result.value as any;

      if (skipped) continue;

      executedNodes.push(nodeName);

      if (error) {
        failed.add(nodeName);
        state = mergeStateUpdate(state, {
          nodeResults: [{
            nodeName,
            success: false,
            content: '',
            toolResults: [],
            durationMs: durationMs || 0,
            error,
            stateUpdate: {},
          }],
        });
      } else {
        completed.add(nodeName);
        state = mergeStateUpdate(state, update || {});

        // Extract actual tokens from metadata if available
        const updateAny = update as any;
        const actualTokens = Object.keys(updateAny?.metadata || {})
          .filter(k => k.startsWith('actualTokensUsed_'))
          .reduce((sum, k) => sum + (updateAny.metadata[k] || 0), 0);

        state = mergeStateUpdate(state, {
          nodeResults: [{
            nodeName,
            success: true,
            content: (update as any)?.generatedContent || '',
            toolResults: [],
            durationMs: durationMs || 0,
            stateUpdate: update || {},
            actualTokensUsed: actualTokens || undefined,
          }],
        });

        // Update token budget with actual usage if available
        if (actualTokens > 0) {
          const nodeConfig = graph.nodes.get(nodeName);
          state.tokenBudget.used += actualTokens;
          if (nodeConfig?.name) {
            state.tokenBudget.perNode[nodeConfig.name] = {
              budget: nodeConfig.estimatedTokens || 0,
              used: actualTokens,
            };
          }
        }
      }

      // Checkpoint after each node
      if (options.onCheckpoint) {
        try {
          await options.onCheckpoint(state, nodeName);
        } catch (e) {
          console.warn(`[GraphEngine] Checkpoint failed after ${nodeName}:`, e);
        }
      }
    }

    // Resolve conditional edges from completed nodes
    for (const nodeName of [...completed]) {
      const condEdges = graph.conditionalEdges.filter(e => e.from === nodeName);
      for (const edge of condEdges) {
        const target = edge.condition(state);
        if (target) {
          const targets = Array.isArray(target) ? target : [target];
          for (const t of targets) {
            if (graph.nodes.has(t) && !completed.has(t) && !failed.has(t)) {
              // Dynamically add to allNodes and update inDegree
              allNodes.add(t);
              if (!inDegree.has(t)) inDegree.set(t, []);
              // Dependencies are already met (the conditional node completed)
            }
          }
        }
      }
    }

    // Handle interrupt
    if (state.interruptPayload) {
      state = mergeStateUpdate(state, { status: 'interrupted' });
      return { state, executedNodes, skippedNodes };
    }
  }

  // Determine final status
  if (state.status === 'running') {
    state = mergeStateUpdate(state, {
      status: failed.size > 0 && executedNodes.length === 0 ? 'failed' : 'completed',
      completedAt: Date.now(),
      exitReason: 'completed',
    });
  }

  return { state, executedNodes, skippedNodes };
}

// ---- Internal Helpers ----

function buildDAG(graph: GraphDefinition) {
  const allNodes = new Set<string>();
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, string[]>(); // node -> list of dependencies

  // Collect all nodes
  for (const [name] of graph.nodes) {
    allNodes.add(name);
    adjacency.set(name, []);
    inDegree.set(name, []);
  }

  // Build from static edges
  for (const edge of graph.edges) {
    if (!allNodes.has(edge.from) || !allNodes.has(edge.to)) continue;
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.get(edge.to)!.push(edge.from);
  }

  return { adjacency, inDegree, allNodes };
}

function canAfford(state: GraphState, estimatedTokens: number): boolean {
  return (state.tokenBudget.used + estimatedTokens) <= state.tokenBudget.total;
}

// ---- Template Graphs ----

/**
 * Pre-built graph plans for common workflows (fast-path, no LLM orchestrator needed)
 */
export const TEMPLATE_PLANS: Record<string, GraphPlan> = {
  chat: {
    steps: [{ node: 'content' }],
    skipNodes: ['research', 'strategy', 'reviewer', 'image'],
    reasoning: 'Simple chat — direct to content node',
    fastPath: true,
  },
  research_only: {
    steps: [{ node: 'research' }],
    skipNodes: ['strategy', 'content', 'reviewer', 'image'],
    reasoning: 'Research-only request',
    fastPath: true,
  },
  generate_with_research: {
    steps: [
      { node: 'research' },
      { node: 'content', dependsOn: ['research'] },
      { node: 'reviewer', dependsOn: ['content'] },
      { node: 'governor', dependsOn: ['reviewer'] },
    ],
    skipNodes: ['strategy', 'brand_memory', 'compliance'],
    reasoning: 'Content pipeline with research (Strategy skipped — Content fast-path uses bestTopic directly)',
    fastPath: true,
  },
  generate_simple: {
    steps: [
      { node: 'content' },
      { node: 'reviewer', dependsOn: ['content'] },
      { node: 'governor', dependsOn: ['reviewer'] },
    ],
    skipNodes: ['research', 'strategy'],
    reasoning: 'Direct generation with explicit topic',
    fastPath: true,
  },
  image_generate: {
    steps: [{ node: 'image' }],
    skipNodes: ['research', 'strategy', 'content', 'reviewer', 'compliance', 'governor'],
    reasoning: 'Image generation only',
    fastPath: true,
  },
  full_pipeline: {
    steps: [
      { node: 'research' },
      { node: 'strategy', dependsOn: ['research'] },
      { node: 'content', dependsOn: ['strategy'] },
      { node: 'reviewer', dependsOn: ['content'] },
      { node: 'governor', dependsOn: ['reviewer'] },
    ],
    skipNodes: ['brand_memory', 'compliance'],
    reasoning: 'Full multi-step pipeline with governor',
    fastPath: true,
  },
};

// ---- Orchestrator Integration ----

export interface RunOrchestratorOptions {
  organizationId?: string;
  /** SSE-style event emitter */
  onEvent?: (event: { type: string; data: any }) => void;
  /** Checkpoint callback */
  onCheckpoint?: (state: GraphState, completedNode: string) => Promise<void>;
  /** Brand memory context to inject into state */
  brandMemoryContext?: string;
  /** Force a specific template (bypass orchestrator) */
  forceTemplate?: string;
  /** Max execution time in ms */
  maxExecutionMs?: number;
  /** Abort signal */
  abortSignal?: AbortSignal;
  /** Blackboard retriever for auto-storing node outputs */
  retriever?: BlackboardRetriever;
  /** Continuation threshold for anti-timeout pattern */
  continuationThresholdMs?: number;
  /** Trace ID from frontend for distributed tracing */
  traceId?: string;
  /** Conversation history for multi-turn context */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Supabase client for logging orchestrator decisions */
  supabaseClient?: any;
}

// ---- Post-plan validation: inject research when no explicit topic ----

function validateResearchInclusion(
  userMessage: string,
  plan: GraphPlan,
  nodeRegistry: Map<string, NodeConfig>
): GraphPlan {
  // If message already has an explicit topic, no need to force research
  if (hasExplicitTopic(userMessage)) return plan;

  // If plan already includes research, we're good
  const hasResearch = plan.steps.some(s => s.node === 'research');
  if (hasResearch) return plan;

  // Check research is not in skipNodes and registry has it
  if (!nodeRegistry.has('research')) return plan;

  // Chat-only plans should not get research injected
  if (plan.steps.length === 1 && plan.steps[0].node === 'content' && plan.skipNodes.includes('research')) {
    // Check if this looks like a content generation request (not just chat)
    const isGenerate = /viết|tạo|soạn|làm|generate|create|write|draft/i.test(userMessage) &&
                       /content|nội dung|bài|post|caption|script|carousel/i.test(userMessage);
    if (!isGenerate) return plan;
  }

  // Force-inject research before content
  console.log(`[validateResearchInclusion] No explicit topic detected — injecting research node`);

  const newSteps = [
    { node: 'research' },
    ...plan.steps.map(s => {
      if (s.node === 'content' && !s.dependsOn?.includes('research')) {
        return { ...s, dependsOn: [...(s.dependsOn || []), 'research'] };
      }
      return s;
    }),
  ];

  const newSkipNodes = plan.skipNodes.filter(n => n !== 'research');

  return {
    ...plan,
    steps: newSteps,
    skipNodes: newSkipNodes,
    reasoning: plan.reasoning + ' [research injected: no explicit topic detected]',
  };
}

/**
 * High-level entry point: orchestrate + compile + execute.
 *
 * 1. Creates initial GraphState from userMessage
 * 2. Calls orchestrateWorkflow() to get the plan
 * 3. Validates plan (injects research if no topic)
 * 4. Emits `graph_plan` event
 * 5. Compiles plan into GraphDefinition
 * 6. Executes the graph
 * 7. Returns the result
 */
export async function runOrchestrator(
  userMessage: string,
  nodeRegistry: Map<string, NodeConfig>,
  options: RunOrchestratorOptions = {}
): Promise<GraphExecutionResult> {
  const sessionId = crypto.randomUUID();

  // Initialize distributed trace
  const trace = createTrace(options.traceId);
  const rootSpan = trace.spans.get(trace.rootSpanId)!;
  rootSpan.name = 'runOrchestrator';

  // 1. Create initial state
  let state = createGraphState(sessionId, userMessage);
  state.metadata.traceId = trace.traceId;
  state.metadata.rootSpanId = trace.rootSpanId;
  if (options.brandMemoryContext) {
    state.brandMemoryContext = options.brandMemoryContext;
  }

  // Inject conversation history for multi-turn context
  if (options.conversationHistory?.length) {
    state.messages = [
      ...options.conversationHistory.map(m => ({ role: m.role, content: m.content })),
      ...state.messages,
    ];
  }

  // 2. Orchestrate — get the plan
  options.onEvent?.({
    type: 'node_start',
    data: { node: 'orchestrator', traceId: trace.traceId },
  });
  const orchStart = Date.now();
  const orchSpan = createSpan(trace, trace.rootSpanId, 'orchestrate');
  const orchestratorOpts: OrchestratorOptions = {
    organizationId: options.organizationId,
    forceTemplate: options.forceTemplate,
  };

  let plan = await orchestrateWorkflow(state, orchestratorOpts, options.supabaseClient);
  endSpan(orchSpan);
  const orchDurationMs = Date.now() - orchStart;

  // Post-plan validation: ensure research is included when no explicit topic
  plan = validateResearchInclusion(userMessage, plan, nodeRegistry);

  options.onEvent?.({
    type: 'node_complete',
    data: { node: 'orchestrator', durationMs: orchDurationMs, reasoning: plan.reasoning },
  });

  // Store reasoning in state
  state.orchestratorPlan = plan;
  state.orchestratorReasoning = plan.reasoning;
  state.userIntent = plan.fastPath ? 'fast_path' : 'llm_planned';

  // Sprint 6E: Reserve 25% token budget for revision loop when governor is in plan
  const hasGovernor = plan.steps.some(s => s.node === 'governor');
  if (hasGovernor) {
    const totalBudget = state.tokenBudget.total;
    const revisionReserve = Math.floor(totalBudget * 0.25);
    state.tokenBudget.total = totalBudget - revisionReserve;
    state.metadata.revisionBudgetReserve = revisionReserve;
    state.metadata.originalTotalBudget = totalBudget;
    console.log(`[runOrchestrator] Reserved ${revisionReserve} tokens for revision (pipeline budget: ${state.tokenBudget.total})`);
  }

  // Task 11: Use LLM-extracted topic as fallback (zero additional cost)
  if (plan.extractedTopic && !state.bestTopic) {
    state.bestTopic = plan.extractedTopic;
    console.log(`[runOrchestrator] Using LLM-extracted topic: "${plan.extractedTopic}"`);
  }

  // 3. Emit plan event (include orchestrator as first step)
  options.onEvent?.({
    type: 'graph_plan',
    data: {
      steps: [{ node: 'orchestrator' }, ...plan.steps],
      skipNodes: plan.skipNodes,
      reasoning: plan.reasoning,
      fastPath: plan.fastPath,
      traceId: trace.traceId,
      orchestratorDurationMs: orchDurationMs,
    },
  });

  // 4. Compile plan into graph + add governor->reviewer revision loop
  let graph: GraphDefinition;
  try {
    graph = compileGraphFromPlan(plan, nodeRegistry);

    // Add conditional edge: governor routes back to reviewer after revision
    if (graph.nodes.has('governor') && graph.nodes.has('reviewer')) {
      graph.conditionalEdges.push({
        from: 'governor',
        condition: (s: GraphState) => {
          const reason = s.exitReason;
          if (reason === 'revised_full' || reason === 'revised_soft') {
            return 'reviewer'; // Re-score revised content
          }
          return null; // No loop — proceed to end
        },
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[runOrchestrator] Failed to compile plan: ${errorMsg}`);
    endSpan(rootSpan, 'error');
    return {
      state: mergeStateUpdate(state, {
        status: 'failed',
        exitReason: `compile_error: ${errorMsg}`,
        completedAt: Date.now(),
      }),
      executedNodes: [],
      skippedNodes: [],
      error: errorMsg,
    };
  }

  // 5. Execute graph with tracing + continuation
  const result = await executeGraph(graph, state, {
    onNodeStart: (nodeName, s) => {
      const span = createSpan(trace, trace.rootSpanId, `node:${nodeName}`);
      s.metadata[`spanId_${nodeName}`] = span.spanId;
      options.onEvent?.({
        type: 'node_start',
        data: { node: nodeName, traceId: trace.traceId, spanId: span.spanId },
      });
    },
    onNodeComplete: async (nodeName, update, durationMs) => {
      // End node span
      const spanId = state.metadata[`spanId_${nodeName}`] as string;
      if (spanId) {
        const span = trace.spans.get(spanId);
        if (span) endSpan(span);
      }

      // Include quality warning metadata for governor node
      const eventData: Record<string, any> = { node: nodeName, durationMs, traceId: trace.traceId };
      if (nodeName === 'governor' && update) {
        const u = update as any;
        if (u.exitReason) eventData.exitReason = u.exitReason;
        if (u.metadata?.revisionRound) eventData.revisionRound = u.metadata.revisionRound;
        if (u.metadata?.reviewScore !== undefined) eventData.reviewScore = u.metadata.reviewScore;
      }

      options.onEvent?.({
        type: 'node_complete',
        data: eventData,
      });

      // Emit topic_suggestions when research node discovers topics
      if (nodeName === 'research' && update) {
        const u = update as any;
        if (u.suggestedTopics?.length) {
          const normalize = (s: string) => (s || '').toLowerCase().trim().replace(/[""'']/g, '');
          const isRichReason = (r: string | null | undefined): r is string =>
            !!r && r.trim().length > 10; // reject single-word reasons like "practical"

          const normalizedTopics = u.suggestedTopics.map((t: any) => ({
            topic: t.topic || t.title || t.name || 'Untitled',
            category: t.category || t.pillar || 'general',
            score: t.score ?? t.overallScore ?? null,
            reasoning: t.reasoning || t.explanation || null,
          }));

          // Use refined bestTopic directly (may differ from raw list after refinement)
          const normalizedBestTopic = u.bestTopic || normalizedTopics[0]?.topic || undefined;
          const refinedVariants: any[] = u.researchData?.refinedVariants || [];

          // Merge refined topic into normalizedTopics so frontend can always find it
          if (normalizedBestTopic && refinedVariants.length > 0) {
            const bestNorm = normalize(normalizedBestTopic);
            const alreadyExists = normalizedTopics.some((t: any) => normalize(t.topic) === bestNorm);
            if (!alreadyExists) {
              const matchingVariant = refinedVariants.find((v: any) => normalize(v.topic) === bestNorm) || refinedVariants[0];
              const baseTopicData = normalizedTopics[0] || {};
              normalizedTopics.unshift({
                topic: normalizedBestTopic,
                category: baseTopicData.category || 'general',
                score: baseTopicData.score ?? null,
                reasoning: matchingVariant?.hook || matchingVariant?.angle || baseTopicData.reasoning || null,
              });
            }
          }

          // Robust fallback for best_topic_reason:
          // Priority: a) LLM-generated deep reasoning from research node
          //           b) rich reasoning from exact topic match
          //           c) rich reasoning from loose match (highest-score)
          //           d) hook from refined variant matching best topic
          //           e) angle from refined variant (last resort)
          const llmTopicReason = u.researchData?.llmTopicReason || null;
          const bestNorm = normalize(normalizedBestTopic || '');
          const exactMatch = normalizedTopics.find((t: any) => normalize(t.topic) === bestNorm);
          const richExact = isRichReason(exactMatch?.reasoning) ? exactMatch.reasoning : null;

          const highScoreTopic = normalizedTopics
            .filter((t: any) => isRichReason(t.reasoning))
            .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))[0];
          const richHighScore = highScoreTopic?.reasoning || null;

          const matchingVariant = refinedVariants.find((v: any) => normalize(v.topic) === bestNorm) || refinedVariants[0];
          const variantHook = isRichReason(matchingVariant?.hook) ? matchingVariant.hook : null;
          const variantAngle = isRichReason(matchingVariant?.angle) ? matchingVariant.angle : null;

          // Also accept short exact reason as absolute last resort
          const shortExact = exactMatch?.reasoning || null;

          const bestTopicReason = llmTopicReason || richExact || richHighScore || variantHook || variantAngle || shortExact || null;

          console.log(`[GraphEngine] Emitting topic_suggestions: ${normalizedTopics.length} topics, best: ${normalizedBestTopic}, reason: ${bestTopicReason?.slice(0, 80)}, refined variants: ${refinedVariants.length}`);
          options.onEvent?.({
            type: 'topic_suggestions',
            data: {
              topics: normalizedTopics,
              best_topic: normalizedBestTopic,
              best_topic_reason: bestTopicReason,
              refined_variants: refinedVariants.map((v: any) => ({
                topic: v.topic,
                angle: v.angle,
                hook: v.hook || undefined,
              })),
            },
          });
        }
      }

      // Auto-store node output to Blackboard v2
      if (options.retriever) {
        const storable = extractStorableContent(nodeName, update);
        if (storable) {
          options.retriever.store(storable.content, nodeName, storable.contentType).catch(err => {
            console.warn(`[GraphEngine] Blackboard store failed for ${nodeName}:`, err);
          });
        }
      }
    },
    onNodeError: (nodeName, error) => {
      const spanId = state.metadata[`spanId_${nodeName}`] as string;
      if (spanId) {
        const span = trace.spans.get(spanId);
        if (span) endSpan(span, 'error');
      }
      options.onEvent?.({
        type: 'node_error',
        data: { node: nodeName, error: error.message, traceId: trace.traceId },
      });
    },
    onCheckpoint: options.onCheckpoint,
    maxExecutionMs: options.maxExecutionMs,
    abortSignal: options.abortSignal,
    continuationThresholdMs: options.continuationThresholdMs,
  });

  // End root span
  endSpan(rootSpan, result.error ? 'error' : 'ok');

  // If continuation required, emit event
  if (result.state.status === 'continuing' && result.state.continuationToken) {
    options.onEvent?.({
      type: 'continuation_required',
      data: {
        continuationToken: result.state.continuationToken,
        executedNodes: result.executedNodes,
        traceId: trace.traceId,
      },
    });
  }

  return result;
}
