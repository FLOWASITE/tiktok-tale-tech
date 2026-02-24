// ============================================
// Agent Base Class
// Abstract base for all specialized agents
// ============================================

import { ToolCallResult } from "../tool-definitions.ts";
import { BlackboardClient, buildBlackboardContext } from "../supervisor/blackboard.ts";
import { withRetry, withTimeout, isRetryableError, createCircuitBreaker } from "../error-utils.ts";
import { callAI } from "../ai-provider.ts";
import { AgentConfig, getAgentTools } from "../supervisor/agent-registry.ts";

export interface AgentTask {
  userMessage: string;
  systemPrompt: string;
  additionalContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface AgentResult {
  success: boolean;
  agentName: string;
  content: string;
  toolResults: ToolCallResult[];
  durationMs: number;
  tokenUsage?: { input: number; output: number };
  error?: string;
  blackboardWrites: Array<{ key: string; value: any }>;
}

export interface AgentExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

/**
 * Execute a specialized agent
 */
export async function executeAgent(
  agentConfig: AgentConfig,
  task: AgentTask,
  blackboard: BlackboardClient,
  execContext: AgentExecutionContext
): Promise<AgentResult> {
  const startTime = Date.now();
  const agentName = agentConfig.name;
  const blackboardWrites: Array<{ key: string; value: any }> = [];
  const toolResults: ToolCallResult[] = [];

  console.log(`[${agentName}] Starting execution, model: ${agentConfig.defaultModel}`);

  // Create circuit breaker for this agent
  const circuitBreaker = createCircuitBreaker(agentName, {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  });

  try {
    // Build context from blackboard
    const blackboardEntries = await blackboard.readAll();
    const blackboardContext = buildBlackboardContext(blackboardEntries);

    // Build messages
    const messages = [
      {
        role: 'system',
        content: [
          task.systemPrompt,
          blackboardContext,
          task.additionalContext || '',
        ].filter(Boolean).join('\n\n'),
      },
      ...(task.conversationHistory || []),
      { role: 'user', content: task.userMessage },
    ];

    // Get tools for this agent
    const tools = getAgentTools(agentName);

    // Execute with circuit breaker + retry + timeout
    const result = await circuitBreaker.execute(async () => {
      return withTimeout(
        () => withRetry(
          async () => {
            const aiResult = await callAI({
              functionName: agentName,
              organizationId: execContext.organizationId,
              messages,
              tools: tools.length > 0 ? tools : undefined,
              toolChoice: tools.length > 0 ? 'auto' : undefined,
              stream: false,
              modelOverride: agentConfig.defaultModel,
            });

            if (!aiResult.success) {
              throw new Error(aiResult.error || 'AI call failed');
            }

            return aiResult;
          },
          {
            maxRetries: agentConfig.maxRetries,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            retryOn: isRetryableError,
          }
        ),
        agentConfig.timeoutMs,
        `${agentName} timed out after ${agentConfig.timeoutMs}ms`
      );
    });

    // Parse response
    let content = '';
    if (result.data) {
      if (typeof result.data === 'string') {
        content = result.data;
      } else if (result.data instanceof ReadableStream) {
        content = await streamToText(result.data);
      }
    }

    // Log to agent_execution_logs
    await logAgentExecution(execContext.supabase, {
      sessionId: blackboard instanceof Object ? 'session' : 'unknown',
      agentName,
      status: 'completed',
      outputSummary: content.slice(0, 200),
      toolsUsed: toolResults.map(t => t.tool_name),
      durationMs: Date.now() - startTime,
      modelUsed: agentConfig.defaultModel,
    });

    return {
      success: true,
      agentName,
      content,
      toolResults,
      durationMs: Date.now() - startTime,
      blackboardWrites,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agentName}] Execution failed:`, errorMsg);

    // Log failure
    await logAgentExecution(execContext.supabase, {
      sessionId: 'session',
      agentName,
      status: 'failed',
      errorMessage: errorMsg,
      durationMs: Date.now() - startTime,
      modelUsed: agentConfig.defaultModel,
    });

    return {
      success: false,
      agentName,
      content: '',
      toolResults,
      durationMs: Date.now() - startTime,
      error: errorMsg,
      blackboardWrites,
    };
  }
}

async function logAgentExecution(supabase: any, data: {
  sessionId: string;
  agentName: string;
  status: string;
  outputSummary?: string;
  errorMessage?: string;
  toolsUsed?: string[];
  durationMs: number;
  modelUsed: string;
}): Promise<void> {
  try {
    await supabase.from('agent_execution_logs').insert({
      session_id: data.sessionId,
      agent_name: data.agentName,
      status: data.status,
      output_summary: data.outputSummary,
      error_message: data.errorMessage,
      tools_used: data.toolsUsed,
      duration_ms: data.durationMs,
      model_used: data.modelUsed,
    });
  } catch {
    // Non-critical
  }
}

async function streamToText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    
    // Parse SSE events
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content;
        if (content) chunks.push(content);
      } catch {}
    }
  }

  return chunks.join('');
}
