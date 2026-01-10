import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  CoreContentQualityMode,
  CoreContentConfig,
  GeneratedOutline,
  GeneratedSection,
  getModelsForMode,
  getWordBudget,
  buildOutlinePrompt,
  buildSectionPrompt,
  buildCompilePrompt,
  buildSinglePassPrompt,
  parseOutlineJSON,
  buildBrandContextBlock,
  buildPersonaContextBlock,
  buildProductContextBlock,
  CustomerPersonaContext,
  BrandProductContext,
} from '../_shared/core-content-pipeline.ts';
import { BrandContext } from '../_shared/types/chat-types.ts';

// ============================================
// GENERATE CORE CONTENT - Multi-Step Pipeline
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface GenerateCoreContentRequest {
  topic: string;
  contentGoal: string;
  contentAngle?: string;
  contentRole?: 'seed' | 'sprout' | 'harvest';
  qualityMode?: CoreContentQualityMode;
  brandTemplateId?: string;
  organizationId?: string;
  targetAudience?: string;
  additionalContext?: string;
  topicHistoryId?: string;
}

interface CoreContentResponse {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  keyMessages: string[];
  qualityScore: number;
  aiModel: string;
  outline?: GeneratedOutline;
  generationMetadata?: {
    qualityMode: string;
    stepsCompleted: string[];
    totalTokensEstimated: number;
    modelsUsed: string[];
    generationTimeMs: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function extractKeyMessages(content: string): string[] {
  const messages: string[] = [];
  
  // Look for bullet points
  const bulletMatches = content.match(/^[\-\*•]\s+(.+)$/gm);
  if (bulletMatches) {
    bulletMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^[\-\*•]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  // Look for numbered items
  const numberedMatches = content.match(/^\d+[\.\)]\s+(.+)$/gm);
  if (numberedMatches) {
    numberedMatches.slice(0, 5).forEach(m => {
      const cleaned = m.replace(/^\d+[\.\)]\s+/, '').trim();
      if (cleaned.length > 20 && cleaned.length < 200) {
        messages.push(cleaned);
      }
    });
  }
  
  // Look for bold patterns
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    boldMatches.slice(0, 3).forEach(m => {
      const cleaned = m.replace(/\*\*/g, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        messages.push(cleaned);
      }
    });
  }
  
  return [...new Set(messages)].slice(0, 5);
}

function generateTitle(topic: string, content: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].slice(0, 200);
  
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) return h2Match[1].slice(0, 200);
  
  return topic.length > 200 ? topic.slice(0, 197) + '...' : topic;
}

function calculateQualityScore(content: string, wordCount: number, keyMessages: string[]): number {
  let score = 50;
  
  // Word count scoring
  if (wordCount >= 800 && wordCount <= 2000) {
    score += 20;
  } else if (wordCount >= 600) {
    score += 10;
  }
  
  // Key messages scoring
  score += Math.min(keyMessages.length * 4, 15);
  
  // Structure scoring
  if (content.includes('##')) score += 5;
  if (content.includes('**')) score += 5;
  if (content.match(/^\d+[\.\)]/m)) score += 5;
  
  return Math.min(score, 100);
}

// ============================================
// AI CALL HELPER
// ============================================

async function callAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 4000,
  temperature: number = 0.7
): Promise<string> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limits exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    const errorText = await response.text();
    console.error(`[AI] Error ${response.status}:`, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const result = await response.json();
  return result.choices?.[0]?.message?.content || '';
}

// ============================================
// MULTI-STEP PIPELINE
// ============================================

async function generateWithPipeline(
  apiKey: string,
  config: CoreContentConfig
): Promise<{
  content: string;
  outline: GeneratedOutline | null;
  metadata: {
    stepsCompleted: string[];
    modelsUsed: string[];
    totalTokensEstimated: number;
  };
}> {
  const models = getModelsForMode(config.qualityMode);
  const wordBudget = getWordBudget(config.qualityMode);
  const stepsCompleted: string[] = [];
  const modelsUsed: string[] = [];
  let totalTokensEstimated = 0;
  
  console.log(`[Pipeline] Starting ${config.qualityMode} mode generation`);
  
  // ========== FAST MODE: Single-pass ==========
  if (config.qualityMode === 'fast') {
    console.log('[Pipeline] Fast mode: single-pass generation');
    
    const prompt = buildSinglePassPrompt(config);
    const content = await callAI(
      apiKey,
      models.compile,
      prompt,
      `Viết Core Content chất lượng cao về: ${config.topic}`,
      4000
    );
    
    stepsCompleted.push('single_pass');
    modelsUsed.push(models.compile);
    totalTokensEstimated = 4000;
    
    return {
      content,
      outline: null,
      metadata: { stepsCompleted, modelsUsed, totalTokensEstimated },
    };
  }
  
  // ========== BALANCED/QUALITY: Multi-step ==========
  
  // Step 1: Generate Outline
  console.log('[Pipeline] Step 1: Generating outline...');
  const outlinePrompt = buildOutlinePrompt(config);
  const outlineResponse = await callAI(
    apiKey,
    models.outline,
    'Bạn là content strategist. Trả lời CHÍNH XÁC bằng JSON theo format yêu cầu.',
    outlinePrompt,
    2000,
    0.5
  );
  
  stepsCompleted.push('outline');
  modelsUsed.push(models.outline);
  totalTokensEstimated += 2000;
  
  let outline: GeneratedOutline;
  try {
    outline = parseOutlineJSON(outlineResponse);
    console.log(`[Pipeline] Outline parsed: ${outline.sections.length} sections`);
  } catch (err) {
    console.error('[Pipeline] Outline parsing failed, falling back to single-pass');
    // Fallback to single-pass
    const prompt = buildSinglePassPrompt(config);
    const content = await callAI(apiKey, models.compile, prompt, `Viết Core Content về: ${config.topic}`, 4000);
    return {
      content,
      outline: null,
      metadata: { stepsCompleted: ['fallback_single_pass'], modelsUsed: [models.compile], totalTokensEstimated: 4000 },
    };
  }
  
  // Step 2-5: Generate each section
  console.log('[Pipeline] Steps 2-5: Generating sections...');
  const sections: GeneratedSection[] = [];
  
  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    console.log(`[Pipeline] Generating section ${i + 1}: ${section.title}`);
    
    const sectionPrompt = buildSectionPrompt(config, outline, i);
    const sectionContent = await callAI(
      apiKey,
      models.section,
      'Bạn là content writer. Viết nội dung theo yêu cầu.',
      sectionPrompt,
      Math.max(800, section.wordBudget * 2),
      0.7
    );
    
    sections.push({
      index: i,
      title: section.title,
      content: sectionContent,
      wordCount: countWords(sectionContent),
    });
    
    stepsCompleted.push(`section_${i + 1}`);
    modelsUsed.push(models.section);
    totalTokensEstimated += section.wordBudget * 2;
  }
  
  // Step Final: Compile & Refine
  console.log('[Pipeline] Final step: Compiling and refining...');
  const compilePrompt = buildCompilePrompt(config, sections, wordBudget);
  const compiledContent = await callAI(
    apiKey,
    models.compile,
    'Bạn là senior editor. Polish và hoàn thiện nội dung.',
    compilePrompt,
    4000,
    0.6
  );
  
  stepsCompleted.push('compile');
  modelsUsed.push(models.compile);
  totalTokensEstimated += 4000;
  
  console.log(`[Pipeline] Complete! ${stepsCompleted.length} steps, ~${totalTokensEstimated} tokens`);
  
  return {
    content: compiledContent,
    outline,
    metadata: { stepsCompleted, modelsUsed, totalTokensEstimated },
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    
    // Parse request body
    const body: GenerateCoreContentRequest = await req.json();
    const {
      topic,
      contentGoal,
      contentAngle,
      contentRole,
      qualityMode = 'balanced',
      brandTemplateId,
      organizationId,
      targetAudience,
      additionalContext,
      topicHistoryId,
    } = body;
    
    // Validate required fields
    if (!topic || topic.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Topic is required (min 5 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[generate-core-content] Topic: "${topic.slice(0, 50)}...", Mode: ${qualityMode}`);
    
    // Fetch brand template
    let brandContext: BrandContext | null = null;
    if (brandTemplateId) {
      const { data: brandData } = await supabase
        .from('brand_templates')
        .select('*')
        .eq('id', brandTemplateId)
        .single();
      
      if (brandData) {
        brandContext = {
          brandName: brandData.brand_name,
          brandPositioning: brandData.brand_positioning || undefined,
          toneOfVoice: brandData.tone_of_voice || undefined,
          uniqueValueProposition: brandData.unique_value_proposition || undefined,
          contentPillars: brandData.content_pillars || undefined,
          evergreenThemes: brandData.evergreen_themes || undefined,
          industry: brandData.industry || undefined,
          targetAgeRange: brandData.target_age_range || undefined,
          targetGender: brandData.target_gender || undefined,
          brandHashtags: brandData.brand_hashtags || undefined,
          mainCompetitors: brandData.main_competitors || undefined,
        };
        console.log(`[generate-core-content] Loaded brand: ${brandData.brand_name}`);
      }
    }
    
    // Fetch personas if brand exists
    let personas: CustomerPersonaContext[] = [];
    if (brandTemplateId) {
      const { data: personaData } = await supabase
        .from('customer_personas')
        .select('name, short_description, pain_points, psychological_triggers, communication_style')
        .eq('brand_template_id', brandTemplateId)
        .eq('is_active', true)
        .limit(3);
      
      if (personaData) {
        personas = personaData.map(p => ({
          name: p.name,
          description: p.short_description || undefined,
          pain_points: p.pain_points || undefined,
          triggers: p.psychological_triggers || undefined,
          communication_style: p.communication_style || undefined,
        }));
      }
    }
    
    // Fetch products if brand exists
    let products: BrandProductContext[] = [];
    if (brandTemplateId) {
      const { data: productData } = await supabase
        .from('brand_products')
        .select('name, description, unique_selling_points, benefits, suggested_content_angles')
        .eq('brand_template_id', brandTemplateId)
        .eq('is_active', true)
        .limit(3);
      
      if (productData) {
        products = productData.map(p => ({
          name: p.name,
          description: p.description || undefined,
          unique_selling_points: p.unique_selling_points || undefined,
          benefits: p.benefits || undefined,
          content_angles: p.suggested_content_angles || undefined,
        }));
      }
    }
    
    // Get API key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    // Build pipeline config
    const pipelineConfig: CoreContentConfig = {
      topic,
      contentGoal: contentGoal || 'education',
      contentAngle,
      role: contentRole,
      qualityMode: qualityMode as CoreContentQualityMode,
      brandContext,
      personas,
      products,
      targetAudience,
      additionalContext,
    };
    
    // Generate content with pipeline
    const result = await generateWithPipeline(LOVABLE_API_KEY, pipelineConfig);
    
    if (!result.content || result.content.length < 300) {
      throw new Error('Generated content too short');
    }
    
    const wordCount = countWords(result.content);
    const keyMessages = extractKeyMessages(result.content);
    const title = generateTitle(topic, result.content);
    const qualityScore = calculateQualityScore(result.content, wordCount, keyMessages);
    const duration = Date.now() - startTime;
    
    // Get primary model used
    const models = getModelsForMode(qualityMode as CoreContentQualityMode);
    const primaryModel = qualityMode === 'quality' ? models.compile : models.section;
    
    console.log(`[generate-core-content] Generated ${wordCount} words, score: ${qualityScore}, time: ${duration}ms`);
    
    // Save to database
    const { data: coreContent, error: insertError } = await supabase
      .from('core_contents')
      .insert({
        title,
        topic,
        content: result.content,
        word_count: wordCount,
        content_goal: contentGoal || 'education',
        content_angle: contentAngle || null,
        content_role: contentRole || null,
        target_audience: targetAudience || null,
        key_messages: keyMessages,
        brand_template_id: brandTemplateId || null,
        organization_id: organizationId,
        user_id: userId,
        source_type: 'ai_generated',
        source_topic_history_id: topicHistoryId || null,
        quality_score: qualityScore,
        ai_model_used: primaryModel,
        status: 'draft',
        outline: result.outline,
        generation_metadata: {
          qualityMode,
          stepsCompleted: result.metadata.stepsCompleted,
          totalTokensEstimated: result.metadata.totalTokensEstimated,
          modelsUsed: result.metadata.modelsUsed,
          generationTimeMs: duration,
        },
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.error(`[generate-core-content] Insert error:`, insertError);
      throw new Error(`Failed to save core content: ${insertError.message}`);
    }
    
    console.log(`[generate-core-content] Saved with ID: ${coreContent.id}`);
    
    // Return response
    const response: CoreContentResponse = {
      id: coreContent.id,
      title,
      content: result.content,
      wordCount,
      keyMessages,
      qualityScore,
      aiModel: primaryModel,
      outline: result.outline || undefined,
      generationMetadata: {
        qualityMode,
        stepsCompleted: result.metadata.stepsCompleted,
        totalTokensEstimated: result.metadata.totalTokensEstimated,
        modelsUsed: result.metadata.modelsUsed,
        generationTimeMs: duration,
      },
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[generate-core-content] Error:`, error);
    
    const status = error instanceof Error && error.message.includes('Rate limits') ? 429 
      : error instanceof Error && error.message.includes('Payment required') ? 402 
      : 500;
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
