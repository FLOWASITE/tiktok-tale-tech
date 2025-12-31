// Multi-step tool chain executor for AI chatbot
// Enables the AI to execute sequences of tools where outputs feed into subsequent tools

import { ToolCallResult, ToolCall } from "./tool-definitions.ts";
import { executeToolCall } from "./tool-executor.ts";

export interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
}

export interface ToolChainStep {
  tool_call: ToolCall;
  result: ToolCallResult;
  duration_ms: number;
}

export interface ToolChainResult {
  steps: ToolChainStep[];
  total_duration_ms: number;
  has_errors: boolean;
  final_results: ToolCallResult[];
  chain_context: Record<string, any>;
}

// Context accumulator for multi-step chains
// Stores outputs from previous tools for use in subsequent tools
export class ChainContext {
  private context: Record<string, any> = {};
  private stepOutputs: ToolCallResult[] = [];

  // Add a result from a tool execution
  addStepOutput(toolName: string, result: ToolCallResult) {
    this.stepOutputs.push(result);
    
    if (result.success && result.result) {
      // Store by tool name for easy reference
      this.context[`${toolName}_result`] = result.result;
      
      // Store specific fields for common patterns
      switch (toolName) {
        case 'save_topic':
          if (result.result.id) {
            this.context.saved_topic_id = result.result.id;
            this.context.saved_topic = result.result.topic;
          }
          break;
        case 'search_topics':
          if (result.result.topics?.length) {
            this.context.found_topics = result.result.topics;
            this.context.first_topic = result.result.topics[0];
          }
          break;
        case 'start_planning_session':
          if (result.result.session_id) {
            this.context.active_session_id = result.result.session_id;
            this.context.session_goal = result.result.goal;
          }
          break;
        case 'generate_plan_draft':
          if (result.result.items) {
            this.context.planned_items = result.result.items;
            this.context.plan_summary = result.result.summary;
          }
          break;
        case 'generate_script':
          if (result.result.content) {
            this.context.generated_script = result.result.content;
            this.context.script_title = result.result.title;
          }
          break;
        case 'generate_carousel':
          if (result.result.slides) {
            this.context.generated_slides = result.result.slides;
            this.context.carousel_title = result.result.title;
          }
          break;
        case 'generate_multichannel':
          if (result.result.full_content) {
            this.context.multichannel_content = result.result.full_content;
          }
          break;
        case 'web_search':
          if (result.result.results?.length) {
            this.context.web_search_results = result.result.results;
            this.context.first_web_result = result.result.results[0];
            this.context.web_citations = result.result.citations;
            this.context.web_query = result.result.query;
            this.context.web_search_type = result.result.search_type;
          }
          break;
      }
    }
  }

  // Get the full context for parameter injection
  getContext(): Record<string, any> {
    return { ...this.context };
  }

  // Get all step outputs
  getStepOutputs(): ToolCallResult[] {
    return [...this.stepOutputs];
  }

  // Get a specific value from context
  get(key: string): any {
    return this.context[key];
  }

  // Check if a key exists
  has(key: string): boolean {
    return key in this.context;
  }
}

// Inject chain context into tool parameters
// Replaces placeholders like {{saved_topic_id}} with actual values
function injectChainContext(
  params: Record<string, any>,
  chainContext: ChainContext
): Record<string, any> {
  const injectedParams = { ...params };
  const context = chainContext.getContext();

  for (const [key, value] of Object.entries(injectedParams)) {
    if (typeof value === 'string') {
      // Check for placeholder pattern: {{context_key}}
      const placeholderMatch = value.match(/^\{\{(\w+)\}\}$/);
      if (placeholderMatch) {
        const contextKey = placeholderMatch[1];
        if (contextKey in context) {
          injectedParams[key] = context[contextKey];
          console.log(`Injected chain context: ${key} = ${contextKey} -> ${context[contextKey]}`);
        }
      }
      // Also support inline replacement: "some text {{key}} more text"
      else if (value.includes('{{')) {
        injectedParams[key] = value.replace(/\{\{(\w+)\}\}/g, (match, contextKey) => {
          if (contextKey in context) {
            return String(context[contextKey]);
          }
          return match;
        });
      }
    }
    // Handle nested objects
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      injectedParams[key] = injectChainContext(value, chainContext);
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      injectedParams[key] = value.map(item => {
        if (typeof item === 'string') {
          return item.replace(/\{\{(\w+)\}\}/g, (match, contextKey) => {
            return context[contextKey] !== undefined ? String(context[contextKey]) : match;
          });
        }
        if (typeof item === 'object' && item !== null) {
          return injectChainContext(item, chainContext);
        }
        return item;
      });
    }
  }

  return injectedParams;
}

// Execute a chain of tool calls in sequence
// Each tool can access outputs from previous tools via chain context
export async function executeToolChain(
  toolCalls: ToolCall[],
  context: ExecutionContext,
  options?: {
    stopOnError?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
  }
): Promise<ToolChainResult> {
  const startTime = Date.now();
  const steps: ToolChainStep[] = [];
  const chainContext = new ChainContext();
  let hasErrors = false;

  const stopOnError = options?.stopOnError ?? false;
  const maxRetries = options?.maxRetries ?? 0;

  console.log(`Starting tool chain execution with ${toolCalls.length} tools`);

  for (let i = 0; i < toolCalls.length; i++) {
    const toolCall = toolCalls[i];
    const stepStartTime = Date.now();

    console.log(`Chain step ${i + 1}/${toolCalls.length}: ${toolCall.function.name}`);

    let result: ToolCallResult;
    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        // Parse arguments
        let args: Record<string, any>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        // Inject chain context into arguments
        const injectedArgs = injectChainContext(args, chainContext);

        console.log(`Executing ${toolCall.function.name} with args:`, 
          JSON.stringify(injectedArgs).slice(0, 200));

        // Execute the tool
        result = await executeToolCall(toolCall.function.name, injectedArgs, context);

        // Add to chain context for subsequent tools
        chainContext.addStepOutput(toolCall.function.name, result);

        break; // Success, exit retry loop

      } catch (error) {
        attempts++;
        console.error(`Tool ${toolCall.function.name} attempt ${attempts} failed:`, error);

        if (attempts > maxRetries) {
          result = {
            success: false,
            tool_name: toolCall.function.name,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        } else {
          // Wait before retry
          if (options?.retryDelayMs) {
            await new Promise(r => setTimeout(r, options.retryDelayMs));
          }
        }
      }
    }

    const stepDuration = Date.now() - stepStartTime;

    steps.push({
      tool_call: toolCall,
      result: result!,
      duration_ms: stepDuration,
    });

    if (!result!.success) {
      hasErrors = true;
      console.log(`Chain step ${i + 1} failed: ${result!.error}`);

      if (stopOnError) {
        console.log('Stopping chain due to error (stopOnError=true)');
        break;
      }
    } else {
      console.log(`Chain step ${i + 1} succeeded`);
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log(`Tool chain completed in ${totalDuration}ms`, {
    totalSteps: steps.length,
    successfulSteps: steps.filter(s => s.result.success).length,
    hasErrors,
  });

  return {
    steps,
    total_duration_ms: totalDuration,
    has_errors: hasErrors,
    final_results: steps.map(s => s.result),
    chain_context: chainContext.getContext(),
  };
}

// Detect if tool calls form a chain (have dependencies)
export function detectToolChainDependencies(toolCalls: ToolCall[]): {
  isChain: boolean;
  dependencyGraph: Map<number, number[]>;
} {
  const dependencyGraph = new Map<number, number[]>();
  let isChain = false;

  // Patterns that indicate dependencies
  const outputPatterns: Record<string, string[]> = {
    'save_topic': ['saved_topic_id', 'saved_topic'],
    'search_topics': ['found_topics', 'first_topic'],
    'start_planning_session': ['active_session_id', 'session_goal'],
    'generate_plan_draft': ['planned_items', 'plan_summary'],
    'web_search': ['web_search_results', 'first_web_result', 'web_query'],
  };

  const inputPatterns: Record<string, string[]> = {
    'generate_script': ['topic', 'saved_topic', 'first_web_result'],
    'generate_carousel': ['topic', 'saved_topic', 'first_web_result'],
    'generate_multichannel': ['topic', 'saved_topic', 'first_web_result'],
    'generate_plan_draft': ['session_id', 'active_session_id'],
    'refine_plan': ['session_id', 'active_session_id'],
    'finalize_plan': ['session_id', 'active_session_id'],
    'save_topic': ['topic', 'first_web_result'],
  };

  for (let i = 0; i < toolCalls.length; i++) {
    const currentTool = toolCalls[i].function.name;
    const currentInputs = inputPatterns[currentTool] || [];
    
    if (currentInputs.length === 0) continue;

    // Check if any previous tool provides what this tool needs
    const dependencies: number[] = [];
    for (let j = 0; j < i; j++) {
      const prevTool = toolCalls[j].function.name;
      const prevOutputs = outputPatterns[prevTool] || [];
      
      // Check for overlap between what prev provides and current needs
      const hasOverlap = currentInputs.some(input => 
        prevOutputs.some(output => input.includes(output) || output.includes(input))
      );

      if (hasOverlap) {
        dependencies.push(j);
        isChain = true;
      }
    }

    if (dependencies.length > 0) {
      dependencyGraph.set(i, dependencies);
    }
  }

  return { isChain, dependencyGraph };
}

// Common multi-step patterns
export const COMMON_CHAINS = {
  // Search -> Generate: Find a topic, then create content from it
  SEARCH_AND_GENERATE: ['search_topics', 'generate_script'],
  
  // Save -> Generate: Save a topic, then create content for it
  SAVE_AND_GENERATE: ['save_topic', 'generate_multichannel'],
  
  // Planning workflow: Start session -> Generate draft -> Finalize
  FULL_PLANNING: ['start_planning_session', 'generate_plan_draft', 'finalize_plan'],
  
  // Topic to Multi-format: Generate both script and carousel
  TOPIC_TO_MULTIFORMAT: ['save_topic', 'generate_script', 'generate_carousel'],
  
  // Web Search -> Save: Find trending, save interesting one
  WEB_SEARCH_TO_SAVE: ['web_search', 'save_topic'],
  
  // Web Search -> Generate: Find trends, create content directly
  WEB_SEARCH_TO_CONTENT: ['web_search', 'generate_multichannel'],
  
  // Full Discovery: Search web -> Save topic -> Generate content
  FULL_DISCOVERY: ['web_search', 'save_topic', 'generate_script'],
};

// Build tool results messages for AI follow-up
export function buildToolChainMessages(
  chainResult: ToolChainResult
): Array<{ role: 'tool'; content: string; tool_call_id: string }> {
  return chainResult.steps.map(step => ({
    role: 'tool' as const,
    content: JSON.stringify({
      ...step.result,
      chain_step: chainResult.steps.indexOf(step) + 1,
      total_steps: chainResult.steps.length,
      chain_context_available: Object.keys(chainResult.chain_context),
    }),
    tool_call_id: step.tool_call.id,
  }));
}

// Summarize chain execution for user-friendly display
export function summarizeToolChain(chainResult: ToolChainResult): {
  summary: string;
  successful_tools: string[];
  failed_tools: string[];
  outputs: Record<string, any>;
} {
  const successful_tools: string[] = [];
  const failed_tools: string[] = [];

  for (const step of chainResult.steps) {
    if (step.result.success) {
      successful_tools.push(step.tool_call.function.name);
    } else {
      failed_tools.push(step.tool_call.function.name);
    }
  }

  let summary = '';
  if (successful_tools.length === chainResult.steps.length) {
    summary = `Đã thực hiện thành công ${successful_tools.length} bước: ${successful_tools.join(' → ')}`;
  } else if (failed_tools.length === chainResult.steps.length) {
    summary = `Tất cả ${failed_tools.length} bước đều thất bại`;
  } else {
    summary = `Hoàn thành ${successful_tools.length}/${chainResult.steps.length} bước. ` +
      `Thành công: ${successful_tools.join(', ')}. ` +
      `Thất bại: ${failed_tools.join(', ')}`;
  }

  return {
    summary,
    successful_tools,
    failed_tools,
    outputs: chainResult.chain_context,
  };
}
