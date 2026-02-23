// ============================================
// Token Management & Context Window Control
// Phase 4: Token Budget Allocation
// ============================================

/**
 * Token budget configuration per context type
 * Priorities: 1 (highest) to 10 (lowest)
 */
export interface TokenBudgetConfig {
  contextType: string;
  priority: number;
  minTokens: number;
  maxTokens: number;
  canTruncate: boolean;
  truncationStrategy: 'head' | 'tail' | 'middle' | 'summarize';
}

/**
 * Default budget configuration for context layers
 */
export const DEFAULT_CONTEXT_BUDGETS: TokenBudgetConfig[] = [
  // Immutable contexts - cannot be truncated
  { contextType: 'systemBase', priority: 1, minTokens: 500, maxTokens: 1500, canTruncate: false, truncationStrategy: 'tail' },
  { contextType: 'industryMemory', priority: 2, minTokens: 300, maxTokens: 2000, canTruncate: false, truncationStrategy: 'tail' },
  { contextType: 'complianceRules', priority: 2, minTokens: 200, maxTokens: 800, canTruncate: false, truncationStrategy: 'tail' },
  
  // High priority - minimal truncation
  { contextType: 'brandContext', priority: 3, minTokens: 200, maxTokens: 1000, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'userPreferences', priority: 3, minTokens: 100, maxTokens: 500, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'sessionMemory', priority: 4, minTokens: 100, maxTokens: 600, canTruncate: true, truncationStrategy: 'head' },
  
  // Medium priority - can be truncated
  { contextType: 'learningContext', priority: 5, minTokens: 100, maxTokens: 800, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'ragResults', priority: 5, minTokens: 100, maxTokens: 600, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'personas', priority: 6, minTokens: 100, maxTokens: 800, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'products', priority: 6, minTokens: 100, maxTokens: 600, canTruncate: true, truncationStrategy: 'tail' },
  
  // Lower priority - aggressive truncation allowed
  { contextType: 'journeyMessaging', priority: 7, minTokens: 50, maxTokens: 600, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'sampleTexts', priority: 7, minTokens: 100, maxTokens: 800, canTruncate: true, truncationStrategy: 'middle' },
  { contextType: 'glossary', priority: 8, minTokens: 50, maxTokens: 400, canTruncate: true, truncationStrategy: 'tail' },
  { contextType: 'recentTopics', priority: 9, minTokens: 50, maxTokens: 300, canTruncate: true, truncationStrategy: 'head' },
  
  // Conversation history - special handling
  { contextType: 'conversationHistory', priority: 10, minTokens: 500, maxTokens: 8000, canTruncate: true, truncationStrategy: 'head' },
];

/**
 * Model context window limits
 */
export const MODEL_LIMITS: Record<string, { contextWindow: number; maxOutput: number }> = {
  'google/gemini-2.5-flash': { contextWindow: 128000, maxOutput: 8192 },
  'google/gemini-2.5-pro': { contextWindow: 200000, maxOutput: 8192 },
  'google/gemini-2.5-flash-lite': { contextWindow: 128000, maxOutput: 8192 },
  'openai/gpt-5': { contextWindow: 128000, maxOutput: 16384 },
  'openai/gpt-5-mini': { contextWindow: 128000, maxOutput: 16384 },
  'openai/gpt-5-nano': { contextWindow: 128000, maxOutput: 8192 },
  // Default fallback
  'default': { contextWindow: 100000, maxOutput: 8192 },
};

/**
 * Context segment with content and metadata
 */
export interface ContextSegment {
  type: string;
  content: string;
  tokenCount: number;
  priority: number;
  canTruncate: boolean;
}

/**
 * Token allocation result
 */
export interface TokenAllocationResult {
  segments: ContextSegment[];
  totalTokens: number;
  truncatedSegments: string[];
  droppedSegments: string[];
  budgetUtilization: number;
  warnings: string[];
}

/**
 * Conversation message for token counting
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Estimate token count from text
 * Multi-language support: Vietnamese, Thai, CJK, Korean, English
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // Detect different script patterns for accurate estimation
  const vietnamesePattern = /[\u00C0-\u024F\u1E00-\u1EFF]/g;
  const thaiPattern = /[\u0E00-\u0E7F]/g;
  const cjkPattern = /[\u3000-\u9FFF\uF900-\uFAFF]/g;
  const koreanPattern = /[\uAC00-\uD7AF\u1100-\u11FF]/g;
  
  const vietnameseChars = (text.match(vietnamesePattern) || []).length;
  const thaiChars = (text.match(thaiPattern) || []).length;
  const cjkChars = (text.match(cjkPattern) || []).length;
  const koreanChars = (text.match(koreanPattern) || []).length;
  
  // Count code blocks (more predictable token ratio)
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  const codeLength = codeBlocks.reduce((sum, block) => sum + block.length, 0);
  
  // Remaining text (English/Latin)
  const specialChars = vietnameseChars + thaiChars + cjkChars + koreanChars;
  const normalLength = text.length - specialChars - codeLength;
  
  // Token estimation ratios per script type
  const tokens = Math.ceil(
    (vietnameseChars / 2.0) +   // Vietnamese: ~2 chars per token
    (thaiChars / 1.5) +         // Thai: ~1.5 chars per token (no word spaces)
    (cjkChars / 1.5) +          // CJK: ~1.5 chars per token
    (koreanChars / 1.8) +       // Korean: ~1.8 chars per token
    (codeLength / 3.5) +        // Code: ~3.5 chars per token
    (normalLength / 4.0)        // English/Latin: ~4 chars per token
  );
  
  return Math.max(1, tokens);
}

/**
 * Estimate tokens for a conversation
 */
export function estimateConversationTokens(messages: ConversationMessage[]): number {
  let total = 0;
  
  for (const msg of messages) {
    // Add overhead for message structure (role, formatting)
    total += 4; // ~4 tokens per message overhead
    total += estimateTokenCount(msg.content);
  }
  
  // Add some buffer for formatting
  return total + 10;
}

/**
 * Truncate text to fit within token budget
 */
export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  strategy: 'head' | 'tail' | 'middle' = 'tail'
): { text: string; truncated: boolean; originalTokens: number } {
  const originalTokens = estimateTokenCount(text);
  
  if (originalTokens <= maxTokens) {
    return { text, truncated: false, originalTokens };
  }
  
  // Rough char estimation for target tokens
  const targetChars = Math.floor(maxTokens * 3); // Conservative estimate
  
  let truncatedText: string;
  
  switch (strategy) {
    case 'head':
      // Keep the end, remove from start (useful for conversation history)
      truncatedText = '...' + text.slice(-targetChars);
      break;
      
    case 'middle':
      // Keep start and end, remove middle (useful for long documents)
      const halfChars = Math.floor(targetChars / 2);
      truncatedText = text.slice(0, halfChars) + '\n...[content truncated]...\n' + text.slice(-halfChars);
      break;
      
    case 'tail':
    default:
      // Keep the start, remove from end (default, most common)
      truncatedText = text.slice(0, targetChars) + '...';
      break;
  }
  
  return {
    text: truncatedText,
    truncated: true,
    originalTokens,
  };
}

/**
 * Summarize conversation history when it exceeds budget
 * Returns summarized older messages + recent messages
 */
export function summarizeConversationHistory(
  messages: ConversationMessage[],
  maxTokens: number,
  keepRecentCount: number = 6
): { messages: ConversationMessage[]; summarized: boolean; summary?: string } {
  const totalTokens = estimateConversationTokens(messages);
  
  if (totalTokens <= maxTokens || messages.length <= keepRecentCount) {
    return { messages, summarized: false };
  }
  
  // Split into old and recent messages
  const recentMessages = messages.slice(-keepRecentCount);
  const oldMessages = messages.slice(0, -keepRecentCount);
  
  // Create summary of old messages
  const oldContent = oldMessages
    .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.slice(0, 200)}`)
    .join('\n');
  
  const summary = `[Previous conversation summary - ${oldMessages.length} messages]\nKey points discussed:\n${truncateToTokenBudget(oldContent, Math.floor(maxTokens * 0.2), 'tail').text}`;
  
  // Create summarized message
  const summaryMessage: ConversationMessage = {
    role: 'system',
    content: summary,
  };
  
  return {
    messages: [summaryMessage, ...recentMessages],
    summarized: true,
    summary,
  };
}

/**
 * Token budget allocator - distributes available tokens across context types
 */
export class TokenBudgetAllocator {
  private modelLimit: number;
  private maxOutputTokens: number;
  private reservedForOutput: number;
  private budgetConfigs: Map<string, TokenBudgetConfig>;
  
  constructor(
    model: string = 'google/gemini-2.5-flash',
    customBudgets?: TokenBudgetConfig[]
  ) {
    const limits = MODEL_LIMITS[model] || MODEL_LIMITS['default'];
    this.modelLimit = limits.contextWindow;
    this.maxOutputTokens = limits.maxOutput;
    
    // Reserve tokens for output
    this.reservedForOutput = Math.min(this.maxOutputTokens, 4096);
    
    // Build budget config map
    this.budgetConfigs = new Map();
    const budgets = customBudgets || DEFAULT_CONTEXT_BUDGETS;
    for (const config of budgets) {
      this.budgetConfigs.set(config.contextType, config);
    }
  }
  
  /**
   * Get available token budget for all context
   */
  getAvailableBudget(): number {
    // Keep 10% safety margin
    const safetyMargin = Math.floor(this.modelLimit * 0.1);
    return this.modelLimit - this.reservedForOutput - safetyMargin;
  }
  
  /**
   * Allocate tokens across context segments
   */
  allocate(segments: Array<{ type: string; content: string }>): TokenAllocationResult {
    const availableBudget = this.getAvailableBudget();
    const warnings: string[] = [];
    const truncatedSegments: string[] = [];
    const droppedSegments: string[] = [];
    
    // Calculate token counts and add metadata
    const segmentsWithMeta: ContextSegment[] = segments.map(seg => {
      const config = this.budgetConfigs.get(seg.type) || {
        priority: 10,
        minTokens: 0,
        maxTokens: 1000,
        canTruncate: true,
        truncationStrategy: 'tail' as const,
      };
      
      return {
        type: seg.type,
        content: seg.content,
        tokenCount: estimateTokenCount(seg.content),
        priority: config.priority,
        canTruncate: config.canTruncate,
      };
    });
    
    // Sort by priority (lower number = higher priority)
    segmentsWithMeta.sort((a, b) => a.priority - b.priority);
    
    // First pass: allocate minimum required tokens
    let allocatedTokens = 0;
    const allocatedSegments: ContextSegment[] = [];
    
    for (const segment of segmentsWithMeta) {
      const config = this.budgetConfigs.get(segment.type);
      const minTokens = config?.minTokens || 0;
      
      // If we can't fit minimum, check if we can drop it
      if (allocatedTokens + minTokens > availableBudget) {
        if (segment.canTruncate && config?.minTokens === 0) {
          droppedSegments.push(segment.type);
          continue;
        }
        // Can't drop immutable segments - this is a warning
        if (!segment.canTruncate) {
          warnings.push(`Cannot fit required context: ${segment.type} (${segment.tokenCount} tokens)`);
        }
        droppedSegments.push(segment.type);
        continue;
      }
      
      allocatedSegments.push(segment);
      allocatedTokens += segment.tokenCount;
    }
    
    // Second pass: truncate if over budget
    if (allocatedTokens > availableBudget) {
      // Start from lowest priority and truncate
      for (let i = allocatedSegments.length - 1; i >= 0 && allocatedTokens > availableBudget; i--) {
        const segment = allocatedSegments[i];
        const config = this.budgetConfigs.get(segment.type);
        
        if (!segment.canTruncate) continue;
        
        const excessTokens = allocatedTokens - availableBudget;
        const targetTokens = Math.max(
          config?.minTokens || 0,
          segment.tokenCount - excessTokens
        );
        
        if (targetTokens < segment.tokenCount) {
          // Map summarize strategy to tail for truncation
          const strategy = config?.truncationStrategy === 'summarize' 
            ? 'tail' 
            : (config?.truncationStrategy || 'tail');
          const result = truncateToTokenBudget(
            segment.content,
            targetTokens,
            strategy
          );
          
          if (result.truncated) {
            segment.content = result.text;
            segment.tokenCount = estimateTokenCount(result.text);
            truncatedSegments.push(segment.type);
            allocatedTokens = allocatedSegments.reduce((sum, s) => sum + s.tokenCount, 0);
          }
        }
      }
    }
    
    // Final check - if still over budget, drop lowest priority truncatable segments
    while (allocatedTokens > availableBudget && allocatedSegments.length > 0) {
      const lastTruncatable = allocatedSegments.findIndex(
        (s, i) => s.canTruncate && i === allocatedSegments.length - 1
      );
      
      if (lastTruncatable === -1) {
        warnings.push(`Cannot fit within budget. Current: ${allocatedTokens}, Available: ${availableBudget}`);
        break;
      }
      
      const dropped = allocatedSegments.pop()!;
      droppedSegments.push(dropped.type);
      allocatedTokens = allocatedSegments.reduce((sum, s) => sum + s.tokenCount, 0);
    }
    
    return {
      segments: allocatedSegments,
      totalTokens: allocatedTokens,
      truncatedSegments,
      droppedSegments,
      budgetUtilization: allocatedTokens / availableBudget,
      warnings,
    };
  }
  
  /**
   * Get budget status report
   */
  getBudgetStatus(currentTokens: number): {
    available: number;
    used: number;
    remaining: number;
    utilizationPercent: number;
    status: 'ok' | 'warning' | 'critical';
  } {
    const available = this.getAvailableBudget();
    const remaining = available - currentTokens;
    const utilizationPercent = (currentTokens / available) * 100;
    
    let status: 'ok' | 'warning' | 'critical' = 'ok';
    if (utilizationPercent > 90) {
      status = 'critical';
    } else if (utilizationPercent > 75) {
      status = 'warning';
    }
    
    return {
      available,
      used: currentTokens,
      remaining: Math.max(0, remaining),
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      status,
    };
  }
}

/**
 * Create a token manager for chat-topics function
 */
export function createTokenManager(model: string = 'google/gemini-2.5-flash'): TokenBudgetAllocator {
  return new TokenBudgetAllocator(model);
}

/**
 * Quick token check - returns true if content fits within model limits
 */
export function fitsWithinLimit(
  content: string,
  model: string = 'google/gemini-2.5-flash',
  reserveForOutput: number = 4096
): boolean {
  const limits = MODEL_LIMITS[model] || MODEL_LIMITS['default'];
  const tokens = estimateTokenCount(content);
  const safetyMargin = Math.floor(limits.contextWindow * 0.1);
  
  return tokens + reserveForOutput + safetyMargin <= limits.contextWindow;
}
