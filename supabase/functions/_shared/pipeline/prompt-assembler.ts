// ============================================
// Pipeline: Prompt Assembler
// System prompt building + context metadata
// ============================================

import { buildSystemPrompt } from "../system-prompt-builder.ts";
import { buildContextMetadata, serializeContextMetadata, summarizeContext } from "../context-tracker.ts";
import { getContextSources } from "../logger.ts";
import type { PipelineContext } from "./context-fetcher.ts";
import type { ContentGoal } from "../../chat-topics/index.ts";

export interface AssembledPrompt {
  systemPrompt: string;
  contextMetadata: ReturnType<typeof buildContextMetadata>;
  contextSources: string[];
}

/**
 * Assemble the system prompt from all pipeline context.
 */
export function assemblePrompt(
  ctx: PipelineContext,
  contentGoal?: ContentGoal
): AssembledPrompt {
  const systemPrompt = buildSystemPrompt(
    ctx.brandContext,
    contentGoal,
    ctx.recentTopics,
    ctx.personasContext,
    ctx.productsContext,
    ctx.productPersonaContext,
    ctx.industryMemory,
    ctx.learningContext,
    ctx.journeyMessaging,
    ctx.sampleTexts,
    ctx.industryGlossary,
    ctx.ragResults,
    ctx.userPreferences,
    ctx.sessionMemory,
    ctx.conversationRagSection,
    ctx.prefetchSection,
  );

  const contextMetadata = buildContextMetadata({
    industryMemory: ctx.industryMemory || undefined,
    brandContext: ctx.brandContext || undefined,
    learningContext: ctx.learningContext || undefined,
    userPreferences: ctx.userPreferences || undefined,
    sessionMemory: ctx.sessionMemory || undefined,
    ragResults: ctx.ragResults.length > 0 ? ctx.ragResults : undefined,
    industryGlossary: ctx.industryGlossary.length > 0 ? ctx.industryGlossary : undefined,
    personasContext: ctx.personasContext.length > 0 ? ctx.personasContext : undefined,
    productsContext: ctx.productsContext.length > 0 ? ctx.productsContext : undefined,
    journeyMessaging: ctx.journeyMessaging.length > 0 ? ctx.journeyMessaging : undefined,
    sampleTexts: ctx.sampleTexts || undefined,
    conversationRagResults: ctx.conversationRagResults.length > 0 ? ctx.conversationRagResults : undefined,
    webSearchResults: ctx.prefetchedTrends?.results || undefined,
  });

  const contextSources = getContextSources({
    industryMemory: ctx.industryMemory,
    brandContext: ctx.brandContext,
    learningContext: ctx.learningContext,
    ragResults: ctx.ragResults,
    glossary: ctx.industryGlossary,
    personas: ctx.personasContext.length > 0 ? ctx.personasContext : undefined,
    products: ctx.productsContext.length > 0 ? ctx.productsContext : undefined,
    journeyMessaging: ctx.journeyMessaging,
    sampleTexts: ctx.sampleTexts,
    userPreferences: ctx.userPreferences,
    sessionMemory: ctx.sessionMemory,
    conversationRag: ctx.conversationRagResults.length > 0 ? ctx.conversationRagResults : undefined,
  });

  return { systemPrompt, contextMetadata, contextSources };
}
