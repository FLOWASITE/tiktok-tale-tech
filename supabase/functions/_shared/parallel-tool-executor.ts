// Parallel Tool Executor with Dependency Detection
// Executes independent tools concurrently, dependent tools sequentially
// Enhanced with timeout handling, chunking, and metrics

import { ToolCall, ToolCallResult } from "./tool-definitions.ts";
import { executeToolCall } from "./tool-executor.ts";

interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

interface ToolExecutionPlan {
  batches: ToolCall[][]; // Tools grouped by execution order
  dependencyMap: Map<string, string[]>; // tool_id -> [dependent_on_tool_ids]
  isParallelizable: boolean;
}

export interface ParallelExecutionMetrics {
  totalTools: number;
  parallelBatches: number;
  estimatedSequentialMs: number; // Estimated if run sequentially
  actualMs: number;
  speedupFactor: number;
  timeoutCount: number;
  errorCount: number;
  batchBreakdown: Array<{ batchIndex: number; toolCount: number; durationMs: number }>;
}

// Tool execution timeout (15 seconds default)
const TOOL_TIMEOUT_MS = 15000;
// Maximum concurrent tools in a batch to prevent overwhelming
const MAX_CONCURRENT_TOOLS = 5;
// Average estimated tool execution time for speedup calculation
const AVG_TOOL_EXECUTION_MS = 2000;

// Output patterns: what data each tool produces
const TOOL_OUTPUTS: Record<string, string[]> = {
  'web_search': ['web_results', 'trending_topics', 'news_items'],
  'search_topics': ['found_topics', 'topic_list'],
  'save_topic': ['saved_topic_id', 'topic_data'],
  'start_planning_session': ['session_id', 'planning_session'],
  'generate_plan_draft': ['plan_items', 'draft_plan'],
  'generate_script': ['script_content', 'generated_script'],
  'generate_carousel': ['carousel_slides', 'carousel_content'],
  'generate_multichannel': ['multichannel_content', 'channel_contents'],
};

// Input patterns: what data each tool needs
const TOOL_INPUTS: Record<string, string[]> = {
  'save_topic': ['web_results', 'trending_topics', 'found_topics'],
  'generate_script': ['saved_topic_id', 'topic_data', 'web_results', 'found_topics'],
  'generate_carousel': ['saved_topic_id', 'topic_data', 'web_results', 'found_topics'],
  'generate_multichannel': ['saved_topic_id', 'topic_data', 'web_results', 'found_topics'],
  'generate_plan_draft': ['session_id', 'planning_session'],
  'refine_plan': ['session_id', 'plan_items', 'draft_plan'],
  'finalize_plan': ['session_id', 'plan_items'],
};

// Check if tool B depends on tool A's output
function hasDependency(toolA: string, toolB: string): boolean {
  const aOutputs = TOOL_OUTPUTS[toolA] || [];
  const bInputs = TOOL_INPUTS[toolB] || [];
  
  return aOutputs.some(output => bInputs.includes(output));
}

// Check if tool B depends on tool A by analyzing arguments
function hasArgumentDependency(toolA: ToolCall, toolB: ToolCall): boolean {
  try {
    const argsB = JSON.parse(toolB.function.arguments);
    const argsStr = JSON.stringify(argsB).toLowerCase();
    
    // Check for placeholder patterns like {{saved_topic_id}}
    if (argsStr.includes('{{')) return true;
    
    // Check if B references A's output in arguments
    const aName = toolA.function.name;
    const aOutputs = TOOL_OUTPUTS[aName] || [];
    
    return aOutputs.some(output => argsStr.includes(output.toLowerCase()));
  } catch {
    return false;
  }
}

// Analyze tool calls and create execution plan with parallel batches
export function createExecutionPlan(toolCalls: ToolCall[]): ToolExecutionPlan {
  if (toolCalls.length <= 1) {
    return {
      batches: toolCalls.length ? [toolCalls] : [],
      dependencyMap: new Map(),
      isParallelizable: false,
    };
  }

  const dependencyMap = new Map<string, string[]>();
  const executedSet = new Set<string>();
  const batches: ToolCall[][] = [];
  const remaining = [...toolCalls];

  // Build dependency graph
  for (let i = 0; i < toolCalls.length; i++) {
    const toolB = toolCalls[i];
    const dependencies: string[] = [];

    for (let j = 0; j < i; j++) {
      const toolA = toolCalls[j];
      
      if (
        hasDependency(toolA.function.name, toolB.function.name) ||
        hasArgumentDependency(toolA, toolB)
      ) {
        dependencies.push(toolA.id);
      }
    }

    if (dependencies.length > 0) {
      dependencyMap.set(toolB.id, dependencies);
    }
  }

  // Group tools into batches based on dependencies
  while (remaining.length > 0) {
    const batch: ToolCall[] = [];
    const toRemove: number[] = [];

    for (let i = 0; i < remaining.length; i++) {
      const tool = remaining[i];
      const deps = dependencyMap.get(tool.id) || [];
      
      // Check if all dependencies have been executed
      const depsResolved = deps.every(depId => executedSet.has(depId));
      
      if (depsResolved) {
        batch.push(tool);
        toRemove.push(i);
      }
    }

    // If no tools can be executed, break to avoid infinite loop
    if (batch.length === 0) {
      console.warn('[ParallelExecutor] Circular dependency detected, falling back to sequential');
      batches.push([...remaining]);
      break;
    }

    // Add batch and mark tools as executed
    batches.push(batch);
    for (const tool of batch) {
      executedSet.add(tool.id);
    }

    // Remove executed tools from remaining (in reverse order to maintain indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      remaining.splice(toRemove[i], 1);
    }
  }

  const isParallelizable = batches.some(batch => batch.length > 1);

  console.log('[ParallelExecutor] Execution plan:', {
    totalTools: toolCalls.length,
    batches: batches.length,
    batchSizes: batches.map(b => b.length),
    isParallelizable,
  });

  return { batches, dependencyMap, isParallelizable };
}

// Execute tools with parallel execution for independent tools
// Returns results AND execution metrics
export async function executeToolsParallel(
  toolCalls: ToolCall[],
  context: ExecutionContext,
  onToolExecuting?: (toolName: string) => void,
  onToolComplete?: (result: ToolCallResult) => void
): Promise<ToolCallResult[]> {
  if (toolCalls.length === 0) return [];

  const startTime = Date.now();
  const plan = createExecutionPlan(toolCalls);
  const results: ToolCallResult[] = [];
  const resultMap = new Map<string, ToolCallResult>();
  const batchBreakdown: ParallelExecutionMetrics['batchBreakdown'] = [];
  let timeoutCount = 0;
  let errorCount = 0;

  console.log(`[ParallelExecutor] Executing ${toolCalls.length} tools in ${plan.batches.length} batch(es)`);

  for (let batchIndex = 0; batchIndex < plan.batches.length; batchIndex++) {
    const batch = plan.batches[batchIndex];
    const batchStart = Date.now();

    console.log(`[ParallelExecutor] Batch ${batchIndex + 1}/${plan.batches.length}: ${batch.map(t => t.function.name).join(', ')}`);

    if (batch.length === 1) {
      // Single tool - execute directly with timeout
      const tool = batch[0];
      onToolExecuting?.(tool.function.name);
      
      const result = await executeSingleToolWithTimeout(tool, context, TOOL_TIMEOUT_MS);
      if (result.error?.includes('timeout')) timeoutCount++;
      if (!result.success) errorCount++;
      
      resultMap.set(tool.id, result);
      results.push(result);
      onToolComplete?.(result);
    } else {
      // Multiple tools - execute in parallel with chunking
      const chunks = chunkArray(batch, MAX_CONCURRENT_TOOLS);
      
      for (const chunk of chunks) {
        const batchPromises = chunk.map(async (tool) => {
          onToolExecuting?.(tool.function.name);
          const result = await executeSingleToolWithTimeout(tool, context, TOOL_TIMEOUT_MS);
          return { tool, result };
        });

        const batchResults = await Promise.all(batchPromises);
        
        for (const { tool, result } of batchResults) {
          if (result.error?.includes('timeout')) timeoutCount++;
          if (!result.success) errorCount++;
          
          resultMap.set(tool.id, result);
          results.push(result);
          onToolComplete?.(result);
        }
      }
    }

    const batchDuration = Date.now() - batchStart;
    batchBreakdown.push({
      batchIndex: batchIndex + 1,
      toolCount: batch.length,
      durationMs: batchDuration,
    });

    console.log(`[ParallelExecutor] Batch ${batchIndex + 1} completed in ${batchDuration}ms`);
  }

  const totalTime = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const estimatedSequential = toolCalls.length * AVG_TOOL_EXECUTION_MS;
  const speedupFactor = estimatedSequential / Math.max(totalTime, 1);

  const metrics: ParallelExecutionMetrics = {
    totalTools: toolCalls.length,
    parallelBatches: plan.batches.length,
    estimatedSequentialMs: estimatedSequential,
    actualMs: totalTime,
    speedupFactor: Math.round(speedupFactor * 100) / 100,
    timeoutCount,
    errorCount,
    batchBreakdown,
  };

  console.log(`[ParallelExecutor] Complete: ${successCount}/${toolCalls.length} succeeded in ${totalTime}ms (speedup: ${metrics.speedupFactor}x)`);

  // Return results in original tool call order
  return toolCalls.map(tc => resultMap.get(tc.id) || {
    success: false,
    tool_name: tc.function.name,
    result: null,
    error: 'Result not found',
  });
}

// Execute tools and return metrics separately
export async function executeToolsWithMetrics(
  toolCalls: ToolCall[],
  context: ExecutionContext,
  onToolExecuting?: (toolName: string) => void,
  onToolComplete?: (result: ToolCallResult) => void
): Promise<{ results: ToolCallResult[]; metrics: ParallelExecutionMetrics }> {
  if (toolCalls.length === 0) {
    return {
      results: [],
      metrics: {
        totalTools: 0,
        parallelBatches: 0,
        estimatedSequentialMs: 0,
        actualMs: 0,
        speedupFactor: 1,
        timeoutCount: 0,
        errorCount: 0,
        batchBreakdown: [],
      },
    };
  }

  const startTime = Date.now();
  const plan = createExecutionPlan(toolCalls);
  const results: ToolCallResult[] = [];
  const resultMap = new Map<string, ToolCallResult>();
  const batchBreakdown: ParallelExecutionMetrics['batchBreakdown'] = [];
  let timeoutCount = 0;
  let errorCount = 0;

  for (let batchIndex = 0; batchIndex < plan.batches.length; batchIndex++) {
    const batch = plan.batches[batchIndex];
    const batchStart = Date.now();

    const chunks = chunkArray(batch, MAX_CONCURRENT_TOOLS);
    
    for (const chunk of chunks) {
      const batchPromises = chunk.map(async (tool) => {
        onToolExecuting?.(tool.function.name);
        const result = await executeSingleToolWithTimeout(tool, context, TOOL_TIMEOUT_MS);
        return { tool, result };
      });

      const batchResults = await Promise.all(batchPromises);
      
      for (const { tool, result } of batchResults) {
        if (result.error?.includes('timeout')) timeoutCount++;
        if (!result.success) errorCount++;
        
        resultMap.set(tool.id, result);
        results.push(result);
        onToolComplete?.(result);
      }
    }

    batchBreakdown.push({
      batchIndex: batchIndex + 1,
      toolCount: batch.length,
      durationMs: Date.now() - batchStart,
    });
  }

  const totalTime = Date.now() - startTime;
  const estimatedSequential = toolCalls.length * AVG_TOOL_EXECUTION_MS;

  return {
    results: toolCalls.map(tc => resultMap.get(tc.id) || {
      success: false,
      tool_name: tc.function.name,
      result: null,
      error: 'Result not found',
    }),
    metrics: {
      totalTools: toolCalls.length,
      parallelBatches: plan.batches.length,
      estimatedSequentialMs: estimatedSequential,
      actualMs: totalTime,
      speedupFactor: Math.round((estimatedSequential / Math.max(totalTime, 1)) * 100) / 100,
      timeoutCount,
      errorCount,
      batchBreakdown,
    },
  };
}

// Helper: Chunk array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Execute a single tool with timeout
async function executeSingleToolWithTimeout(
  tool: ToolCall,
  context: ExecutionContext,
  timeoutMs: number
): Promise<ToolCallResult> {
  const toolName = tool.function.name;

  try {
    const args = JSON.parse(tool.function.arguments);
    
    // Special handling for task_complete
    if (toolName === 'task_complete') {
      return {
        success: true,
        tool_name: "task_complete",
        result: {
          summary: args.summary || "Task completed",
          outputs: args.outputs || [],
          next_suggestions: args.next_suggestions || [],
          message: "✅ " + (args.summary || "Task completed"),
        },
      };
    }
    
    // Execute with timeout
    const result = await Promise.race([
      executeToolCall(toolName, args, context),
      new Promise<ToolCallResult>((_, reject) => 
        setTimeout(() => reject(new Error(`Tool ${toolName} timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
    
    return result;
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timeout');
    console.error(`[ParallelExecutor] Tool ${toolName} ${isTimeout ? 'timeout' : 'error'}:`, err);
    return {
      success: false,
      tool_name: toolName,
      result: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Utility: Check if a set of tool calls can be parallelized
export function canParallelize(toolCalls: ToolCall[]): boolean {
  if (toolCalls.length <= 1) return false;
  
  const plan = createExecutionPlan(toolCalls);
  return plan.isParallelizable;
}

// Utility: Get estimated speedup from parallelization
export function estimateSpeedup(toolCalls: ToolCall[]): { 
  sequentialBatches: number;
  parallelBatches: number;
  estimatedSpeedup: number;
} {
  const plan = createExecutionPlan(toolCalls);
  
  return {
    sequentialBatches: toolCalls.length,
    parallelBatches: plan.batches.length,
    estimatedSpeedup: toolCalls.length > 0 
      ? toolCalls.length / plan.batches.length 
      : 1,
  };
}
