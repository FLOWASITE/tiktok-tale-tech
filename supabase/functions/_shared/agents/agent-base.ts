// ============================================
// Agent Base Class
// Abstract base for all specialized agents
// With mini ReAct tool-calling loop
// ============================================

import { ToolCallResult, ToolCall } from "../tool-definitions.ts";
import { executeToolCall } from "../tool-executor.ts";
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
  sessionId?: string;
}

/**
 * Execute a specialized agent with mini ReAct tool-calling loop
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
  const sessionId = execContext.sessionId || 'agent-session';

  console.log(`[${agentName}] Starting execution, model: ${agentConfig.defaultModel}`);

  const circuitBreaker = createCircuitBreaker(agentName, {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
  });

  try {
    // Build context from blackboard
    const blackboardEntries = await blackboard.readAll();
    const blackboardContext = buildBlackboardContext(blackboardEntries);

    // Build initial messages
    const messages: Array<{ role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }> = [
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

    const tools = getAgentTools(agentName);
    const maxTurns = agentConfig.maxTurns || 2;

    // Mini ReAct loop: AI → parse tool_calls → execute → feed back → repeat
    let finalContent = '';
    
    for (let turn = 0; turn < maxTurns; turn++) {
      const result = await circuitBreaker.execute(async () => {
        return withTimeout(
          () => withRetry(
            async () => {
              const aiResult = await callAI({
                functionName: agentName,
                organizationId: execContext.organizationId,
                messages: messages as any,
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
      const data = result.data;
      let content = '';
      let parsedToolCalls: ToolCall[] = [];

      if (typeof data === 'string') {
        content = data;
      } else if (data instanceof ReadableStream) {
        content = await streamToText(data);
      } else if (data && typeof data === 'object') {
        // OpenAI-style response object
        const choice = data.choices?.[0];
        if (choice) {
          content = choice.message?.content || choice.delta?.content || '';
          parsedToolCalls = choice.message?.tool_calls || [];
        } else {
          content = JSON.stringify(data);
        }
      }

      // If no tool calls, this is the final response
      if (parsedToolCalls.length === 0) {
        finalContent = content;
        break;
      }

      // Execute tool calls
      console.log(`[${agentName}] Turn ${turn + 1}: executing ${parsedToolCalls.length} tool(s)`);
      
      // Add assistant message with tool_calls to conversation
      messages.push({
        role: 'assistant',
        content: content || null,
        tool_calls: parsedToolCalls,
      });

      for (const toolCall of parsedToolCalls) {
        const toolName = toolCall.function.name;
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        // Handle task_complete specially
        if (toolName === 'task_complete') {
          finalContent = content || args.summary || '';
          toolResults.push({
            success: true,
            tool_name: 'task_complete',
            result: { summary: args.summary, outputs: args.outputs },
          });
          // Add tool result message
          messages.push({
            role: 'tool' as any,
            content: JSON.stringify({ success: true, summary: args.summary }),
            tool_call_id: toolCall.id,
          });
          break;
        }

        // Execute the tool
        const toolResult = await executeToolCall(toolName, args, {
          supabase: execContext.supabase,
          userId: execContext.userId,
          organizationId: execContext.organizationId,
          brandTemplateId: execContext.brandTemplateId,
        });
        
        toolResults.push(toolResult);

        // Add tool result as message for next AI turn
        messages.push({
          role: 'tool' as any,
          content: JSON.stringify(toolResult.result),
          tool_call_id: toolCall.id,
        });
      }

      // If task_complete was called, stop
      if (toolResults.some(t => t.tool_name === 'task_complete')) {
        break;
      }
    }

    // Log to agent_execution_logs
    await logAgentExecution(execContext.supabase, {
      sessionId,
      agentName,
      status: 'completed',
      outputSummary: finalContent.slice(0, 200),
      toolsUsed: toolResults.map(t => t.tool_name),
      durationMs: Date.now() - startTime,
      modelUsed: agentConfig.defaultModel,
    });

    return {
      success: true,
      agentName,
      content: finalContent,
      toolResults,
      durationMs: Date.now() - startTime,
      blackboardWrites,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${agentName}] Execution failed:`, errorMsg);

    await logAgentExecution(execContext.supabase, {
      sessionId,
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
