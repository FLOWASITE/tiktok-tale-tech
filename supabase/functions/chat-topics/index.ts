import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchLearningContext } from "../_shared/learning-context.ts";
import { LearningContext, JourneyStageMessagingData, JourneyStage } from "../_shared/prompt-utils.ts";
import { CHAT_TOOLS, ToolCallResult } from "../_shared/tool-definitions.ts";
import { executeToolCall } from "../_shared/tool-executor.ts";
import { 
  executeToolChain, 
  detectToolChainDependencies, 
  summarizeToolChain,
  ToolChainResult 
} from "../_shared/tool-chain-executor.ts";
import { fetchUserPreferences, UserPreferencesContext } from "../_shared/user-preferences.ts";
import { fetchCrossSessionMemory, CrossSessionMemory } from "../_shared/session-memory.ts";
import { executeAgenticLoop, createSSEWriter, buildReActPromptSection } from "../_shared/agentic-loop.ts";
import { buildContextMetadata, serializeContextMetadata, summarizeContext } from "../_shared/context-tracker.ts";

// Import shared types
import { ChatMessage, ChatRequest, BrandContext, IndustryMemory, GlossaryTerm, RAGResult } from "../_shared/types/chat-types.ts";

// Import shared data fetchers
import { searchRelevantContent, fetchIndustryMemory, fetchIndustryGlossary } from "../_shared/data-fetchers/index.ts";

// Import shared system prompt builder
import { buildSystemPrompt } from "../_shared/system-prompt-builder.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, brandTemplateId, contentGoal, organizationId, userId, enableTools, enableAgenticLoop, maxAgentTurns }: ChatRequest = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all context data in parallel
    let brandContext: BrandContext | null = null;
    let personasContext: string[] = [];
    let productsContext: string[] = [];
    let productPersonaContext: string[] = [];
    let recentTopics: string[] = [];
    let industryMemory: IndustryMemory | null = null;
    let learningContext: LearningContext | null = null;
    let journeyMessaging: JourneyStageMessagingData[] = [];
    let sampleTexts: Record<string, string> | null = null;
    let industryGlossary: GlossaryTerm[] = [];
    let userPreferences: UserPreferencesContext | null = null;
    let sessionMemory: CrossSessionMemory | null = null;
    
    // Fetch user preferences and cross-session memory if userId is provided
    if (userId) {
      const [userPrefsResult, sessionMemoryResult] = await Promise.all([
        fetchUserPreferences(supabase, userId, brandTemplateId),
        fetchCrossSessionMemory(supabase, userId, brandTemplateId, organizationId, 10),
      ]);
      
      userPreferences = userPrefsResult;
      sessionMemory = sessionMemoryResult;
      
      if (userPreferences) {
        console.log('Loaded user preferences:', {
          tone: userPreferences.preferredTone,
          skillLevel: userPreferences.skillLevel,
          emojiFrequency: userPreferences.emojiFrequency,
          stylePatterns: userPreferences.stylePatterns.length,
          avgEditPercentage: userPreferences.avgEditPercentage,
        });
      }
      
      if (sessionMemory) {
        console.log('Loaded cross-session memory:', {
          insights: sessionMemory.insights.length,
          corrections: sessionMemory.corrections.length,
          summaries: sessionMemory.conversationSummaries.length,
          totalConversations: sessionMemory.totalConversations,
          avgMessagesPerSession: sessionMemory.avgMessagesPerSession,
        });
      }
    }
    
    if (brandTemplateId) {
      const [brandResult, personasResult, productsResult, mappingsResult, historyResult] = await Promise.all([
        supabase
          .from('brand_templates')
          .select(`
            brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
            unique_value_proposition, target_age_range, target_gender, evergreen_themes,
            brand_hashtags, main_competitors, industry_template_id, sample_texts
          `)
          .eq('id', brandTemplateId)
          .single(),
        supabase
          .from('customer_personas')
          .select(`
            id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
            device_usage, tech_savviness, buying_motivation, communication_style, 
            typical_funnel_stage, objections, journey_map, priority_score
          `)
          .eq('brand_template_id', brandTemplateId)
          .order('priority_score', { ascending: false, nullsFirst: false })
          .order('is_primary', { ascending: false })
          .limit(5),
        supabase
          .from('brand_products')
          .select('id, name, category, description, unique_selling_points, suggested_content_angles, is_featured')
          .eq('brand_template_id', brandTemplateId)
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .limit(5),
        supabase
          .from('product_persona_mappings')
          .select('product_id, persona_id, relevance_score, is_primary_product, custom_pitch, key_benefits, preferred_content_angles')
          .eq('brand_template_id', brandTemplateId)
          .order('relevance_score', { ascending: false })
          .limit(20),
        supabase
          .from('topic_history')
          .select('topic')
          .eq('brand_template_id', brandTemplateId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);
      
      if (brandResult.data) {
        const brand = brandResult.data;
        brandContext = {
          brandName: brand.brand_name,
          brandPositioning: brand.brand_positioning,
          toneOfVoice: brand.tone_of_voice,
          industry: brand.industry,
          contentPillars: brand.content_pillars as any,
          uniqueValueProposition: brand.unique_value_proposition,
          targetAgeRange: brand.target_age_range,
          targetGender: brand.target_gender,
          evergreenThemes: brand.evergreen_themes,
          brandHashtags: brand.brand_hashtags,
          mainCompetitors: brand.main_competitors,
          industryTemplateId: brand.industry_template_id,
        };

        // Parse sample_texts if available
        if (brand.sample_texts && typeof brand.sample_texts === 'object') {
          sampleTexts = brand.sample_texts as Record<string, string>;
          console.log('Loaded sample_texts channels:', Object.keys(sampleTexts).join(', '));
        }

        // Fetch Industry Memory and Glossary if brand has industry_template_id
        if (brand.industry_template_id) {
          const [memoryResult, glossaryResult] = await Promise.all([
            fetchIndustryMemory(supabase, brand.industry_template_id, 'vi'),
            fetchIndustryGlossary(supabase, brand.industry_template_id, 'vi', 30)
          ]);
          industryMemory = memoryResult;
          industryGlossary = glossaryResult;
          if (industryGlossary.length > 0) {
            console.log('Loaded', industryGlossary.length, 'industry glossary terms');
          }
        }

        // Fetch Learning Context
        learningContext = await fetchLearningContext(supabase, brandTemplateId, organizationId || null, 50);
        console.log('Learning context:', learningContext ? {
          topPerformers: learningContext.topPerformers?.length || 0,
          avgPerformance: learningContext.averagePerformance,
          negativeFeedback: learningContext.negativeFeedback?.length || 0,
          preferredCategories: learningContext.preferredCategories?.length || 0,
          publishedCount: learningContext.publishedCount || 0,
        } : 'No learning context');
      }

      // Build enhanced personas context
      if (personasResult.data?.length) {
        personasContext = personasResult.data.map((p: any) => {
          const parts = [
            `${p.name}${p.is_primary ? ' ⭐' : ''} (${p.occupation || 'N/A'}, ${p.age_range || 'N/A'})`,
          ];
          if (p.device_usage) parts.push(`📱 ${p.device_usage}`);
          if (p.tech_savviness) parts.push(`🔧 Tech: ${p.tech_savviness}`);
          if (p.typical_funnel_stage) parts.push(`📊 Stage: ${p.typical_funnel_stage.toUpperCase()}`);
          if (p.communication_style) parts.push(`💬 Style: ${p.communication_style}`);
          parts.push(`Pain Points: ${(p.pain_points || []).slice(0, 3).join(', ')}`);
          parts.push(`Desires: ${(p.desires || []).slice(0, 3).join(', ')}`);
          if (p.buying_motivation?.length) {
            parts.push(`Động lực mua: ${p.buying_motivation.slice(0, 2).join(', ')}`);
          }
          if (p.objections?.length) {
            parts.push(`Objections: ${p.objections.slice(0, 2).join(', ')}`);
          }
          return parts.join(' | ');
        });
        console.log('Loaded', personasResult.data.length, 'enhanced personas for chat context');
      }

      // Build products context
      if (productsResult.data?.length) {
        productsContext = productsResult.data.map((p: any) => 
          `${p.is_featured ? '⭐ ' : ''}${p.name}${p.category ? ` (${p.category})` : ''}: ${(p.suggested_content_angles || []).slice(0, 2).join(', ')}`
        );
        console.log('Loaded', productsResult.data.length, 'products for chat context');
      }

      // Build product-persona mappings context
      if (mappingsResult.data?.length && personasResult.data?.length && productsResult.data?.length) {
        const personaMap = new Map(personasResult.data.map((p: any) => [p.id, p.name]));
        const productMap = new Map(productsResult.data.map((p: any) => [p.id, p.name]));
        
        productPersonaContext = mappingsResult.data
          .filter((m: any) => personaMap.has(m.persona_id) && productMap.has(m.product_id))
          .map((m: any) => {
            const parts = [
              `${productMap.get(m.product_id)} → ${personaMap.get(m.persona_id)} (${m.relevance_score}%)`
            ];
            if (m.is_primary_product) parts[0] = '⭐ ' + parts[0];
            if (m.custom_pitch) parts.push(`Pitch: "${m.custom_pitch}"`);
            if (m.key_benefits?.length) parts.push(`Benefits: ${m.key_benefits.slice(0, 2).join(', ')}`);
            return parts.join(' | ');
          });
        console.log('Loaded', productPersonaContext.length, 'product-persona mappings');

        // Fetch journey stage messaging for all mappings
        if (mappingsResult.data?.length > 0) {
          const mappingIds = mappingsResult.data.map((m: any) => m.id).filter(Boolean);
          if (mappingIds.length > 0) {
            const { data: journeyData, error: journeyError } = await supabase
              .from('journey_stage_messaging')
              .select('mapping_id, journey_stage, headline, hook, key_message, pain_points_focus, benefits_highlight, cta_template, emotional_tone, objection_response, content_types, avoid_messages')
              .in('mapping_id', mappingIds);

            if (journeyError) {
              console.error('Error fetching journey messaging:', journeyError);
            } else if (journeyData?.length) {
              journeyMessaging = journeyData.map((j: any) => ({
                mapping_id: j.mapping_id,
                journey_stage: j.journey_stage as JourneyStage,
                headline: j.headline,
                hook: j.hook,
                key_message: j.key_message,
                pain_points_focus: j.pain_points_focus || [],
                benefits_highlight: j.benefits_highlight || [],
                cta_template: j.cta_template,
                emotional_tone: j.emotional_tone,
                objection_response: j.objection_response,
                content_types: j.content_types || [],
                avoid_messages: j.avoid_messages || [],
              }));
              console.log('Loaded', journeyMessaging.length, 'journey stage messaging records');
            }
          }
        }
      }

      if (historyResult.data) {
        recentTopics = historyResult.data.map(h => h.topic);
      }
    }

    // RAG: Search for relevant past content based on user's latest message
    let ragResults: RAGResult[] = [];
    if (organizationId && messages.length > 0) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        ragResults = await searchRelevantContent(
          supabase,
          lastUserMessage.content,
          organizationId,
          brandTemplateId,
          5
        );
        console.log('RAG search results:', ragResults.length, 'relevant items found');
      }
    }

    // Build system prompt with all context using shared builder
    const systemPrompt = buildSystemPrompt(
      brandContext, 
      contentGoal, 
      recentTopics, 
      personasContext, 
      productsContext, 
      productPersonaContext, 
      industryMemory, 
      learningContext, 
      journeyMessaging, 
      sampleTexts, 
      industryGlossary,
      ragResults,
      userPreferences,
      sessionMemory
    );

    // Determine mode and settings
    const useTools = enableTools !== false;
    const useAgenticLoop = enableAgenticLoop === true;
    const maxTurns = maxAgentTurns || 5;

    // Prepare messages for AI
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // Build context metadata for transparency
    const contextMetadata = buildContextMetadata({
      industryMemory: industryMemory || undefined,
      brandContext: brandContext || undefined,
      learningContext: learningContext || undefined,
      userPreferences: userPreferences || undefined,
      sessionMemory: sessionMemory || undefined,
      ragResults: ragResults.length > 0 ? ragResults : undefined,
      glossaryTerms: industryGlossary.length > 0 ? industryGlossary.length : undefined,
      personasCount: personasContext.length > 0 ? personasContext.length : undefined,
      productsCount: productsContext.length > 0 ? productsContext.length : undefined,
      journeyMessagingCount: journeyMessaging.length > 0 ? journeyMessaging.length : undefined,
      sampleTextsChannels: sampleTexts ? Object.keys(sampleTexts) : undefined,
    });
    
    console.log('[chat-topics]', summarizeContext(contextMetadata));

    // Add ReAct prompt section if using agentic loop
    const finalSystemPrompt = useAgenticLoop 
      ? systemPrompt + buildReActPromptSection()
      : systemPrompt;

    // ============ AGENTIC LOOP MODE ============
    if (useAgenticLoop) {
      console.log('[chat-topics] Using Agentic Loop mode, max turns:', maxTurns);
      
      const executionContext = {
        supabase,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        brandTemplateId: brandTemplateId || undefined,
      };

      // Create streaming response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const sseWriter = createSSEWriter(writer);
      
      // Send context metadata first
      const metadataEvent = `data: ${serializeContextMetadata(contextMetadata)}\n\n`;
      writer.write(encoder.encode(metadataEvent));

      // Start async agentic loop execution
      (async () => {
        try {
          const agentResult = await executeAgenticLoop(
            messages,
            finalSystemPrompt,
            {
              maxTurns,
              executionContext,
              onTurnStart: (turn) => {
                console.log(`[chat-topics] Turn ${turn} started`);
              },
              onTurnComplete: (turn) => {
                console.log(`[chat-topics] Turn ${turn.turn_number} complete:`, turn.observation_summary);
              },
              onToolExecuting: (toolName) => {
                console.log(`[chat-topics] Executing tool: ${toolName}`);
              },
            },
            sseWriter
          );

          // Send done signal
          await writer.write(encoder.encode('data: [DONE]\n\n'));
          
          console.log('[chat-topics] Agentic loop complete:', {
            turns: agentResult.total_turns,
            exitReason: agentResult.exit_reason,
            durationMs: agentResult.total_duration_ms,
          });
        } catch (err) {
          console.error('[chat-topics] Agentic loop error:', err);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            data: { message: err instanceof Error ? err.message : 'Unknown error' },
          })}\n\n`;
          await writer.write(encoder.encode(errorEvent));
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // ============ LEGACY SINGLE-TURN MODE ============
    console.log('[chat-topics] Using legacy single-turn mode');
    
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: aiMessages,
      temperature: 0.8,
      stream: true,
    };

    if (useTools) {
      requestBody.tools = CHAT_TOOLS;
      requestBody.tool_choice = 'auto';
    }

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse streaming response to check for tool calls
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const decoder = new TextDecoder();
    let textBuffer = '';
    let contentChunks: string[] = [];
    let toolCalls: any[] = [];
    let toolCallArgBuffers: Map<number, string> = new Map();
    let finishReason: string | null = null;

    // Collect all streaming data first
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
          
          if (reason) {
            finishReason = reason;
          }

          if (delta?.content) {
            contentChunks.push(delta.content);
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
          // Incomplete JSON, skip
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

    const fullContent = contentChunks.join('');

    console.log('Streaming complete:', {
      contentLength: fullContent.length,
      toolCallsCount: toolCalls.length,
      finishReason,
    });

    // Check if AI wants to call tools
    if (toolCalls.length > 0 && useTools) {
      console.log('AI requested tool calls:', toolCalls.length, toolCalls.map(tc => tc.function.name));
      
      const executionContext = {
        supabase,
        userId: userId || undefined,
        organizationId: organizationId || undefined,
        brandTemplateId: brandTemplateId || undefined,
      };

      const { isChain, dependencyGraph } = detectToolChainDependencies(toolCalls);
      
      let toolResults: ToolCallResult[] = [];
      let chainResult: ToolChainResult | null = null;
      let chainSummary: { summary: string; outputs: Record<string, any> } | null = null;

      if (isChain) {
        console.log('Detected tool chain with dependencies:', 
          Array.from(dependencyGraph.entries()).map(([to, from]) => 
            `${toolCalls[to].function.name} depends on ${from.map(i => toolCalls[i].function.name).join(', ')}`
          )
        );

        chainResult = await executeToolChain(toolCalls, executionContext, {
          stopOnError: false,
          maxRetries: 1,
        });

        toolResults = chainResult.final_results;
        chainSummary = summarizeToolChain(chainResult);
        
        console.log('Chain execution complete:', chainSummary.summary);
      } else {
        console.log('Executing tools in parallel (no dependencies detected)');
        
        const toolPromises = toolCalls.map(async (toolCall) => {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            return await executeToolCall(toolCall.function.name, args, executionContext);
          } catch (err) {
            console.error(`Tool ${toolCall.function.name} parse error:`, err);
            return {
              success: false,
              tool_name: toolCall.function.name,
              result: null,
              error: 'Failed to parse tool arguments',
            };
          }
        });

        toolResults = await Promise.all(toolPromises);
      }

      toolResults.forEach((result, idx) => {
        console.log(`Tool ${toolCalls[idx].function.name} result:`, result.success);
      });

      const toolResultsMessages = toolCalls.map((tc, idx) => {
        const baseResult = toolResults[idx] || { error: 'No result' };
        const enrichedResult = chainResult ? {
          ...baseResult,
          chain_step: idx + 1,
          total_steps: toolCalls.length,
          chain_context: chainResult.chain_context,
        } : baseResult;
        
        return {
          role: 'tool' as const,
          content: JSON.stringify(enrichedResult),
          tool_call_id: tc.id,
        };
      });

      const assistantMessage = {
        role: 'assistant' as const,
        content: fullContent || null,
        tool_calls: toolCalls,
      };

      const followUpMessages = [
        ...aiMessages,
        assistantMessage,
        ...toolResultsMessages,
      ];

      if (chainResult && chainSummary) {
        followUpMessages.push({
          role: 'system' as const,
          content: `Multi-step tool chain completed. ${chainSummary.summary}. 
Available outputs from chain: ${Object.keys(chainSummary.outputs).join(', ')}.
Summarize results for user and suggest next actions.`,
        });
      }

      console.log('Calling follow-up with tool results, streaming response...');

      const followUpResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: followUpMessages,
          temperature: 0.8,
          stream: true,
        }),
      });

      if (!followUpResponse.ok) {
        console.error('Follow-up AI error:', followUpResponse.status);
        return new Response(JSON.stringify({
          type: 'tool_results',
          content: fullContent,
          tool_calls: toolCalls,
          tool_results: toolResults,
          chain_result: chainResult ? {
            total_duration_ms: chainResult.total_duration_ms,
            has_errors: chainResult.has_errors,
            chain_context: chainResult.chain_context,
          } : undefined,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        try {
          const toolResultsEvent = `data: ${JSON.stringify({
            type: 'tool_results',
            tool_calls: toolCalls,
            tool_results: toolResults,
            is_chain: isChain,
            chain_result: chainResult ? {
              total_duration_ms: chainResult.total_duration_ms,
              has_errors: chainResult.has_errors,
              chain_context: chainResult.chain_context,
              summary: chainSummary?.summary,
            } : undefined,
          })}\n\n`;
          await writer.write(encoder.encode(toolResultsEvent));

          const followUpReader = followUpResponse.body?.getReader();
          if (followUpReader) {
            while (true) {
              const { done, value } = await followUpReader.read();
              if (done) break;
              await writer.write(value);
            }
          }
        } catch (err) {
          console.error('Streaming error:', err);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // No tool calls - return streamed content as regular message
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const metadataEvent = `data: ${serializeContextMetadata(contextMetadata)}\n\n`;
        await writer.write(encoder.encode(metadataEvent));
        
        const chunkSize = 20;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          const chunk = fullContent.slice(i, i + chunkSize);
          const sseEvent = `data: ${JSON.stringify({
            choices: [{
              delta: { content: chunk },
              index: 0,
            }],
          })}\n\n`;
          await writer.write(encoder.encode(sseEvent));
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Re-streaming error:', err);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Chat-topics error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
