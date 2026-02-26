// ============================================
// Pipeline: Token Processor
// Token management + conversation summarization
// ============================================

import {
  createTokenManager,
  estimateTokenCount,
  estimateConversationTokens,
  summarizeConversationHistory,
} from "../token-manager.ts";
import { ChatMessage } from "../types/chat-types.ts";

export interface TokenProcessResult {
  processedMessages: ChatMessage[];
  conversationSummarized: boolean;
  systemPromptTokens: number;
  totalInputTokens: number;
  budgetStatus: {
    available: number;
    utilizationPercent: number;
    status: string;
    remaining: number;
  };
  tokenManager: ReturnType<typeof createTokenManager>;
}

/**
 * Process token budget: summarize conversation if needed, validate budget.
 */
export function processTokenBudget(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string = 'google/gemini-2.5-flash',
  logger: { info: (msg: string, ctx?: any) => void; warn: (msg: string, ctx?: any) => void }
): TokenProcessResult {
  const tokenManager = createTokenManager(model);
  const conversationTokens = estimateConversationTokens(messages);

  let processedMessages = messages;
  let conversationSummarized = false;
  const maxConversationTokens = Math.floor(tokenManager.getAvailableBudget() * 0.4);

  if (conversationTokens > maxConversationTokens && messages.length > 6) {
    const summarized = summarizeConversationHistory(messages, maxConversationTokens, 6);
    if (summarized.summarized) {
      processedMessages = summarized.messages;
      conversationSummarized = true;
      logger.info('Conversation history summarized', {
        originalMessages: messages.length,
        summarizedMessages: processedMessages.length,
        originalTokens: conversationTokens,
        newTokens: estimateConversationTokens(processedMessages),
      });
    }
  }

  const systemPromptTokens = estimateTokenCount(systemPrompt);
  const totalInputTokens = systemPromptTokens + estimateConversationTokens(processedMessages);
  const budgetStatus = tokenManager.getBudgetStatus(totalInputTokens);

  logger.info('Token budget status', {
    systemPromptTokens,
    conversationTokens: estimateConversationTokens(processedMessages),
    totalInputTokens,
    available: budgetStatus.available,
    utilizationPercent: budgetStatus.utilizationPercent,
    status: budgetStatus.status,
    conversationSummarized,
  });

  if (budgetStatus.status === 'critical') {
    logger.warn('Token budget critical', {
      utilization: budgetStatus.utilizationPercent,
      remaining: budgetStatus.remaining,
    });
  }

  return {
    processedMessages,
    conversationSummarized,
    systemPromptTokens,
    totalInputTokens,
    budgetStatus,
    tokenManager,
  };
}
