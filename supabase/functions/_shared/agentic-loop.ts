// Multi-Turn Agentic Loop with ReAct Pattern
// Reason → Act → Observe → Repeat
// Now with Parallel Tool Execution for independent tools

import { CHAT_TOOLS, ToolCall, ToolCallResult, AgentTurn, AgentLoopResult } from "./tool-definitions.ts";
import { executeToolCall } from "./tool-executor.ts";
import { executeToolsParallel, executeToolsWithMetrics, estimateSpeedup, type ParallelExecutionMetrics } from "./parallel-tool-executor.ts";
import { withRetry, isRetryableError, RetryableError } from "./error-utils.ts";
import { estimateTokenCount, MODEL_LIMITS } from "./token-manager.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface AgentLoopOptions {
  maxTurns: number;
  executionContext: ExecutionContext;
  onTurnStart?: (turn: number) => void;
  onTurnComplete?: (turn: AgentTurn) => void;
  onToolExecuting?: (toolName: string) => void;
  onStreamChunk?: (chunk: string) => void;
}

interface SSEWriter {
  write: (event: AgentSSEEvent) => Promise<void>;
}

export interface AgentSSEEvent {
  type: 'turn_start' | 'tool_executing' | 'tool_result' | 'turn_complete' | 'content_chunk' | 'final_response' | 'error';
  data: any;
}

// Execute task_complete tool (special handling)
function executeTaskComplete(params: Record<string, any>): ToolCallResult {
  return {
    success: true,
    tool_name: "task_complete",
    result: {
      summary: params.summary || "Task completed",
      outputs: params.outputs || [],
      next_suggestions: params.next_suggestions || [],
      message: "✅ " + (params.summary || "Task completed"),
    },
  };
}

// Parse streaming response to extract content and tool calls
async function parseStreamingResponse(
  response: Response,
  onChunk?: (chunk: string) => void
): Promise<{ content: string; toolCalls: ToolCall[]; finishReason: string | null }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let textBuffer = '';
  let contentChunks: string[] = [];
  let toolCalls: ToolCall[] = [];
  let toolCallArgBuffers: Map<number, string> = new Map();
  let finishReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta;
        const reason = parsed.choices?.[0]?.finish_reason;

        if (reason) finishReason = reason;

        if (delta?.content) {
          contentChunks.push(delta.content);
          onChunk?.(delta.content);
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0;

            if (tc.id) {
              toolCalls[index] = {
                id: tc.id,
                type: tc.type || 'function',
                function: {
                  name: tc.function?.name || '',
                  arguments: '',
                },
              };
              toolCallArgBuffers.set(index, '');
            }

            if (tc.function?.name && toolCalls[index]) {
              toolCalls[index].function.name = tc.function.name;
            }

            if (tc.function?.arguments) {
              const currentArgs = toolCallArgBuffers.get(index) || '';
              toolCallArgBuffers.set(index, currentArgs + tc.function.arguments);
            }
          }
        }
      } catch {
        // Incomplete JSON
      }
    }
  }

  // Finalize tool call arguments
  for (const [index, args] of toolCallArgBuffers.entries()) {
    if (toolCalls[index]) {
      toolCalls[index].function.arguments = args;
    }
  }

  toolCalls = toolCalls.filter(tc => tc && tc.id && tc.function?.name);

  return {
    content: contentChunks.join(''),
    toolCalls,
    finishReason,
  };
}

// Execute all tool calls with parallel execution for independent tools
async function executeTools(
  toolCalls: ToolCall[],
  context: ExecutionContext,
  onToolExecuting?: (toolName: string) => void,
  onToolComplete?: (result: ToolCallResult) => void
): Promise<{ results: ToolCallResult[]; metrics?: ParallelExecutionMetrics }> {
  if (toolCalls.length === 0) return { results: [] };

  // Log parallelization estimate
  const speedupEstimate = estimateSpeedup(toolCalls);
  if (speedupEstimate.estimatedSpeedup > 1) {
    console.log(`[executeTools] Parallelizing: ${speedupEstimate.sequentialBatches} tools → ${speedupEstimate.parallelBatches} batches (${speedupEstimate.estimatedSpeedup.toFixed(1)}x estimated speedup)`);
  }

  // Use parallel executor with metrics
  const { results, metrics } = await executeToolsWithMetrics(toolCalls, context, onToolExecuting, onToolComplete);
  
  console.log(`[executeTools] Actual speedup: ${metrics.speedupFactor}x (${metrics.actualMs}ms vs estimated ${metrics.estimatedSequentialMs}ms sequential)`);
  
  return { results, metrics };
}

// Build observation summary from tool results
function buildObservationSummary(toolResults: ToolCallResult[]): string {
  const summaries = toolResults.map(r => {
    if (r.success) {
      return `✅ ${r.tool_name}: ${r.result?.message || 'Success'}`;
    }
    return `❌ ${r.tool_name}: ${r.error || 'Failed'}`;
  });
  return summaries.join('\n');
}

// Main agentic loop executor
export async function executeAgenticLoop(
  initialMessages: ChatMessage[],
  systemPrompt: string,
  options: AgentLoopOptions,
  sseWriter?: SSEWriter
): Promise<AgentLoopResult> {
  const startTime = Date.now();
  const turns: AgentTurn[] = [];
  const accumulatedContext: Record<string, any> = {};
  let currentMessages = [...initialMessages];
  let exitReason: AgentLoopResult['exit_reason'] = 'max_turns';
  let taskCompleteSummary: AgentLoopResult['task_complete_summary'] | undefined;
  let finalContent = '';

  // Token tracking for context window management
  const modelLimit = MODEL_LIMITS['google/gemini-2.5-flash'];
  const maxContextTokens = Math.floor(modelLimit.contextWindow * 0.85); // 85% safety margin
  const systemPromptTokens = estimateTokenCount(systemPrompt);

  console.log('[AgenticLoop] Starting with max', options.maxTurns, 'turns, context budget:', maxContextTokens);

  for (let turnNumber = 1; turnNumber <= options.maxTurns; turnNumber++) {
    const turnStart = Date.now();
    
    console.log(`[AgenticLoop] Turn ${turnNumber} starting`);
    options.onTurnStart?.(turnNumber);
    await sseWriter?.write({ 
      type: 'turn_start', 
      data: { turn: turnNumber, max_turns: options.maxTurns } 
    });

    // Calculate current token usage
    const messageTokens = currentMessages.reduce((sum, m) => sum + estimateTokenCount(m.content || ''), 0);
    const totalTokens = systemPromptTokens + messageTokens;
    
    // Warn if approaching limit
    if (totalTokens > maxContextTokens * 0.9) {
      console.warn(`[AgenticLoop] Token usage high: ${totalTokens}/${maxContextTokens} (${Math.round(totalTokens/maxContextTokens*100)}%)`);
    }

    // Call AI
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...currentMessages,
    ];

    // Add turn context if not first turn
    if (turnNumber > 1) {
      aiMessages.push({
        role: 'system',
        content: `[Turn ${turnNumber}/${options.maxTurns}] Đánh giá kết quả trước đó và quyết định bước tiếp theo. Gọi task_complete nếu đã hoàn thành.`,
      });
    }

    // Call AI with retry logic
    const response = await withRetry(
      async () => {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: aiMessages,
            tools: CHAT_TOOLS,
            tool_choice: 'auto',
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!res.ok) {
          const status = res.status;
          // Throw retryable error for 429, 500+
          if (status === 429 || (status >= 500 && status !== 501)) {
            throw new RetryableError(`AI API error: ${status}`, { statusCode: status });
          }
          throw new Error(`AI API error: ${status}`);
        }
        return res;
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        retryOn: isRetryableError,
        onRetry: (err, attempt, delay) => {
          console.log(`[AgenticLoop] AI call retry ${attempt}, waiting ${delay}ms:`, err.message);
        },
      }
    ).catch(err => {
      console.error('[AgenticLoop] AI call failed after retries:', err.message);
      return null;
    });

    if (!response) {
      exitReason = 'error';
      break;
    }

    // Parse streaming response
    const { content, toolCalls, finishReason } = await parseStreamingResponse(
      response,
      (chunk) => {
        options.onStreamChunk?.(chunk);
        sseWriter?.write({ type: 'content_chunk', data: { chunk } });
      }
    );

    console.log(`[AgenticLoop] Turn ${turnNumber}: content=${content.length}chars, tools=${toolCalls.length}`);

    // No tool calls = conversation complete
    if (toolCalls.length === 0) {
      finalContent = content;
      exitReason = 'content_only';
      console.log('[AgenticLoop] No tools requested, exiting with content');
      break;
    }

    // Check for task_complete tool
    const taskCompleteTool = toolCalls.find(tc => tc.function.name === 'task_complete');
    
    // Execute all tools
    const { results: toolResults, metrics: parallelMetrics } = await executeTools(
      toolCalls,
      options.executionContext,
      (toolName) => {
        options.onToolExecuting?.(toolName);
        sseWriter?.write({ type: 'tool_executing', data: { tool: toolName, turn: turnNumber } });
      }
    );

    // Send tool results via SSE
    for (const result of toolResults) {
      await sseWriter?.write({ 
        type: 'tool_result', 
        data: { result, turn: turnNumber } 
      });
    }

    // Build observation summary
    const observationSummary = buildObservationSummary(toolResults);
    const turnDuration = Date.now() - turnStart;

    // Record turn
    const turn: AgentTurn = {
      turn_number: turnNumber,
      tool_calls: toolCalls,
      tool_results: toolResults,
      observation_summary: observationSummary,
      duration_ms: turnDuration,
    };
    turns.push(turn);

    options.onTurnComplete?.(turn);
    await sseWriter?.write({ 
      type: 'turn_complete', 
      data: { 
        turn: turnNumber, 
        tools_executed: toolCalls.map(tc => tc.function.name),
        duration_ms: turnDuration,
        observation: observationSummary,
        parallel_metrics: parallelMetrics,
      } 
    });

    // Accumulate context from tool results
    for (const result of toolResults) {
      if (result.success && result.result) {
        accumulatedContext[result.tool_name] = result.result;
      }
    }

    // Check if task_complete was called
    if (taskCompleteTool) {
      const taskCompleteResult = toolResults.find(r => r.tool_name === 'task_complete');
      if (taskCompleteResult?.success) {
        taskCompleteSummary = {
          summary: taskCompleteResult.result?.summary || 'Completed',
          outputs: taskCompleteResult.result?.outputs || [],
          next_suggestions: taskCompleteResult.result?.next_suggestions,
        };
        exitReason = 'task_complete';
        finalContent = content;
        console.log('[AgenticLoop] task_complete called, exiting');
        break;
      }
    }

    // Add assistant message with tool calls to history
    currentMessages.push({
      role: 'assistant',
      content: content || null,
      tool_calls: toolCalls,
    });

    // Add tool results to history
    for (let i = 0; i < toolCalls.length; i++) {
      currentMessages.push({
        role: 'tool',
        content: JSON.stringify(toolResults[i] || { error: 'No result' }),
        tool_call_id: toolCalls[i].id,
      });
    }
  }

  // Generate final response if needed (after tool execution)
  if (exitReason === 'task_complete' || exitReason === 'max_turns') {
    console.log('[AgenticLoop] Generating final response');
    
    // Add summary context for final response
    const summaryMessage: ChatMessage = {
      role: 'system',
      content: taskCompleteSummary 
        ? `Task completed: ${taskCompleteSummary.summary}. Outputs: ${taskCompleteSummary.outputs.join(', ')}. Tổng kết kết quả cho user và đề xuất next steps nếu có.`
        : `Đã thực hiện ${turns.length} turns. Tổng kết kết quả cho user.`,
    };

    const finalMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...currentMessages,
      summaryMessage,
    ];

    const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: finalMessages,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (finalResponse.ok) {
      const { content } = await parseStreamingResponse(
        finalResponse,
        (chunk) => {
          options.onStreamChunk?.(chunk);
          sseWriter?.write({ type: 'content_chunk', data: { chunk } });
        }
      );
      finalContent = content;
    }
  }

  const totalDuration = Date.now() - startTime;

  const result: AgentLoopResult = {
    turns,
    total_turns: turns.length,
    final_response: finalContent,
    total_duration_ms: totalDuration,
    exit_reason: exitReason,
    task_complete_summary: taskCompleteSummary,
    accumulated_context: accumulatedContext,
  };

  console.log('[AgenticLoop] Complete:', {
    turns: turns.length,
    exitReason,
    durationMs: totalDuration,
  });

  await sseWriter?.write({ 
    type: 'final_response', 
    data: { 
      exit_reason: exitReason,
      total_turns: turns.length,
      total_duration_ms: totalDuration,
      task_complete_summary: taskCompleteSummary,
    } 
  });

  return result;
}

// Create SSE writer for streaming events
export function createSSEWriter(writer: WritableStreamDefaultWriter<Uint8Array>): SSEWriter {
  const encoder = new TextEncoder();
  
  return {
    write: async (event: AgentSSEEvent) => {
      const sseEvent = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(sseEvent));
    },
  };
}

// Build ReAct system prompt additions
export function buildReActPromptSection(): string {
  return `

## 🤖 AGENTIC BEHAVIOR (Multi-Turn Tool Calling - ReAct Pattern)

Bạn hoạt động theo pattern ReAct (Reason → Act → Observe → Repeat):

### Quy trình xử lý request:

1. **REASON**: Phân tích request, xác định các bước cần thực hiện
2. **ACT**: Gọi tools cần thiết (có thể nhiều tools cùng lúc)
3. **OBSERVE**: Đánh giá kết quả tools
4. **REPEAT**: Tiếp tục nếu chưa hoàn thành, hoặc gọi task_complete nếu xong

### Khi nào gọi tiếp tools:
- Kết quả tool trước cần được xử lý thêm
- User request yêu cầu nhiều bước (search → save → generate)
- Cần verify hoặc refine output

### Khi nào gọi task_complete:
- Đã hoàn thành TẤT CẢ các bước user yêu cầu
- Đã tạo đủ outputs cần thiết
- Không còn action nào cần thực hiện

### Ví dụ multi-turn:
User: "Tìm trending topics và tạo script cho topic hay nhất"

Turn 1: web_search(query="trending beauty topics", search_type="trending")
Turn 2: Observe kết quả → save_topic(topic="topic được chọn")
Turn 3: generate_script(topic="topic đó")
Turn 4: task_complete(summary="Đã tạo script cho trending topic")

### QUAN TRỌNG:
- Tối đa 5 turns để hoàn thành task
- Mỗi turn có thể gọi nhiều tools song song nếu không phụ thuộc nhau
- LUÔN gọi task_complete khi xong để user biết đã hoàn thành
- Nếu task đơn giản, có thể xong trong 1-2 turns
`;
}
