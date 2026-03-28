// Tool executor for AI chatbot function calling

import { ToolCallResult } from "./tool-definitions.ts";

interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  userAccessToken?: string;
  onProgress?: (subStep: string, label: string, progress: number) => void;
}

// Execute a single tool call
export async function executeToolCall(
  toolName: string,
  parameters: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  console.log(`Executing tool: ${toolName}`, parameters);

  try {
    switch (toolName) {
      case "web_search":
        return await executeWebSearch(parameters, context);
      case "save_topic":
        return await executeSaveTopic(parameters, context);
      case "generate_script":
        return await executeGenerateScript(parameters, context);
      case "generate_carousel":
        return await executeGenerateCarousel(parameters, context);
      case "generate_multichannel":
        return await executeGenerateMultichannel(parameters, context);
      case "search_topics":
        return await executeSearchTopics(parameters, context);
      case "discover_topics":
        return await executeDiscoverTopics(parameters, context);
      // Reviewer tools
      case "brand_voice_check":
        return await executeBrandVoiceCheck(parameters, context);
      case "legal_compliance_check":
        return await executeLegalComplianceCheck(parameters, context);
      case "platform_best_practices":
        return await executePlatformBestPractices(parameters, context);
      // Image tools
      case "generate_image":
        return await executeGenerateImage(parameters, context);
      case "edit_image":
        return await executeEditImage(parameters, context);
      // Planning tools
      case "start_planning_session":
        return await executeStartPlanningSession(parameters, context);
      case "generate_plan_draft":
        return await executeGeneratePlanDraft(parameters, context);
      case "refine_plan":
        return await executeRefinePlan(parameters, context);
      case "finalize_plan":
        return await executeFinalizePlan(parameters, context);
      case "get_active_session":
        return await executeGetActiveSession(parameters, context);
      default:
        return {
          success: false,
          tool_name: toolName,
          result: null,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      tool_name: toolName,
      result: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============ WEB SEARCH TOOL - Enhanced with Fallback ============

import { enhancedWebSearch, getCircuitStatus } from "./data-fetchers/web-search-fallback.ts";

async function executeWebSearch(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { query, search_type, industry, recency, max_results } = params;
  
  console.log(`[web_search] Starting enhanced search: ${search_type} "${query}"`);

  try {
    const searchResult = await enhancedWebSearch({
      query,
      searchType: search_type || 'general',
      industry,
      recency,
      maxResults: max_results,
      timeoutMs: 20000,
    });

    const searchTypeLabels: Record<string, string> = {
      trending: "xu hướng",
      news: "tin tức", 
      competitor: "đối thủ",
      general: "chung"
    };

    // Log circuit breaker status for monitoring
    const circuitStatus = getCircuitStatus();
    console.log(`[web_search] Circuit status: Perplexity=${circuitStatus.perplexity}, LovableAI=${circuitStatus.lovableAI}`);

    if (!searchResult.success) {
      return {
        success: false,
        tool_name: "web_search",
        result: null,
        error: searchResult.error || "Lỗi tìm kiếm web",
      };
    }

    // Limit results
    const limitedResults = searchResult.results.slice(0, max_results || 5);

    return {
      success: true,
      tool_name: "web_search",
      result: {
        query,
        search_type,
        search_type_label: searchTypeLabels[search_type] || search_type,
        industry,
        recency,
        results: limitedResults,
        citations: searchResult.citations,
        total_results: limitedResults.length,
        message: searchResult.message,
        source: searchResult.source,
        fallback_used: searchResult.fallback_used,
      },
    };
  } catch (error) {
    console.error("[web_search] Unexpected error:", error);
    return {
      success: false,
      tool_name: "web_search",
      result: null,
      error: error instanceof Error ? error.message : "Lỗi tìm kiếm web không xác định",
    };
  }
}

// Save topic to topic_history table
async function executeSaveTopic(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { topic, category, pillar, reasoning, suggested_format } = params;

  if (!context.userId) {
    return {
      success: false,
      tool_name: "save_topic",
      result: null,
      error: "User not authenticated",
    };
  }

  const { data, error } = await context.supabase.from("topic_history").insert({
    user_id: context.userId,
    organization_id: context.organizationId || null,
    brand_template_id: context.brandTemplateId || null,
    topic: topic,
    category: category || "general",
    pillar: pillar || null,
    reasoning: reasoning || null,
    format: suggested_format || "post",
    content_goal: "engagement",
    usage_status: "saved",
    was_used: false,
  }).select('id, topic, category').single();

  if (error) {
    return {
      success: false,
      tool_name: "save_topic",
      result: null,
      error: error.message,
    };
  }

  return {
    success: true,
    tool_name: "save_topic",
    result: {
      id: data.id,
      topic: data.topic,
      category: data.category,
      message: `Đã lưu topic "${topic}" vào Topic Bank!`,
    },
  };
}

// Generate script via generate-script edge function
async function executeGenerateScript(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { topic, video_type, duration, character_type } = params;

  // Fetch brand template for context
  let brandName = "Brand";
  let brandGuideline = "";
  
  if (context.brandTemplateId) {
    const { data: brand } = await context.supabase
      .from("brand_templates")
      .select("brand_name, brand_guideline")
      .eq("id", context.brandTemplateId)
      .single();
    
    if (brand) {
      brandName = brand.brand_name;
      brandGuideline = brand.brand_guideline || "";
    }
  }

  // Call generate-script edge function internally
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-script`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      topic,
      videoType: video_type || "expert_share",
      duration: duration || 60,
      characterType: character_type || "single",
      brandName,
      brandGuideline,
      brandTemplateId: context.brandTemplateId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      tool_name: "generate_script",
      result: null,
      error: `Script generation failed: ${errorText}`,
    };
  }

  const scriptData = await response.json();

  return {
    success: true,
    tool_name: "generate_script",
    result: {
      title: scriptData.title || topic,
      content: scriptData.content || scriptData.script,
      duration: duration || 60,
      video_type: video_type,
      preview: scriptData.content?.slice(0, 300) + "...",
      message: `Đã tạo script "${topic}" (${duration || 60}s, ${video_type})`,
    },
  };
}

// Generate carousel via generate-carousel edge function
async function executeGenerateCarousel(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { topic, platform, slide_count } = params;

  // Fetch brand template for context
  let brandName = "Brand";
  let brandGuideline = "";
  
  if (context.brandTemplateId) {
    const { data: brand } = await context.supabase
      .from("brand_templates")
      .select("brand_name, brand_guideline")
      .eq("id", context.brandTemplateId)
      .single();
    
    if (brand) {
      brandName = brand.brand_name;
      brandGuideline = brand.brand_guideline || "";
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-carousel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      topic,
      platform: platform || "facebook",
      slideCount: slide_count || 5,
      brandName,
      brandGuideline,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      tool_name: "generate_carousel",
      result: null,
      error: `Carousel generation failed: ${errorText}`,
    };
  }

  const carouselData = await response.json();

  return {
    success: true,
    tool_name: "generate_carousel",
    result: {
      title: carouselData.title || topic,
      slides: carouselData.slides || [],
      slide_count: carouselData.slides?.length || slide_count || 5,
      platform,
      caption: carouselData.captionSuggestion,
      message: `Đã tạo carousel "${topic}" (${carouselData.slides?.length || slide_count} slides cho ${platform})`,
    },
  };
}

// Generate multichannel content via 2-step pipeline: Core Content → Transform
async function executeGenerateMultichannel(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { topic, content_goal, journey_stage, content_angle, content_role, auto_research, target_audience } = params;
  // Normalize channel aliases (e.g. blog → website)
  const CHANNEL_ALIASES: Record<string, string> = { blog: 'website' };
  const channels = (params.channels as string[] | undefined)?.map(ch => CHANNEL_ALIASES[ch] || ch);

  if (!context.userId) {
    return {
      success: false,
      tool_name: "generate_multichannel",
      result: null,
      error: "User not authenticated. Không thể tạo và lưu nội dung.",
    };
  }

  // Fetch brand template for context
  let brandName = "Brand";
  let brandGuideline = "";
  
  if (context.brandTemplateId) {
    const { data: brand } = await context.supabase
      .from("brand_templates")
      .select("brand_name, brand_guideline")
      .eq("id", context.brandTemplateId)
      .single();
    
    if (brand) {
      brandName = brand.brand_name;
      brandGuideline = brand.brand_guideline || "";
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Derive content_role from journey_stage if not explicitly set
  const effectiveContentRole = content_role || journey_stage || "seed";

  // ============================================
  // STEP 1: Generate Core Content first
  // ============================================
  console.log(`[generate_multichannel] STEP 1: Generating Core Content for topic="${topic}", role=${effectiveContentRole}`);

  // Emit real progress: Core Content starting
  context.onProgress?.('core_content_generating', 'Đang tạo Core Content...', 25);

  let coreContentId: string | null = null;
  let coreContentTitle: string | null = null;

  try {
    const coreContentResponse = await fetch(`${supabaseUrl}/functions/v1/generate-core-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${context.userAccessToken || supabaseKey}`,
      },
      body: JSON.stringify({
        topic,
        contentGoal: content_goal || "engagement",
        contentAngle: content_angle || "educational",
        contentRole: effectiveContentRole,
        lengthMode: "medium",
        brandTemplateId: context.brandTemplateId,
        organizationId: context.organizationId,
        targetAudience: target_audience || null,
        enableResearch: auto_research || false,
        userId: context.userId,
        user_id: context.userId,
      }),
    });

    if (!coreContentResponse.ok) {
      const errorText = await coreContentResponse.text();
      console.error(`[generate_multichannel] Core Content generation failed: ${errorText}`);
      console.warn(`[generate_multichannel] Falling back to topic-based generation (no Core Content)`);
    } else {
      const coreData = await coreContentResponse.json();
      coreContentId = coreData.id || null;
      coreContentTitle = coreData.title || topic;
      console.log(`[generate_multichannel] STEP 1 SUCCESS: Core Content ID=${coreContentId}, title="${coreContentTitle}"`);
    }
  } catch (coreError) {
    console.error(`[generate_multichannel] Core Content step error:`, coreError);
    console.warn(`[generate_multichannel] Proceeding with topic-based generation`);
  }

  // Emit real progress: Core Content done
  context.onProgress?.('core_content_done', 'Core Content hoàn tất', 50);

  // ============================================
  // STEP 2: Transform to multichannel using Core Content
  // ============================================
  console.log(`[generate_multichannel] STEP 2: Transforming to multichannel, coreContentId=${coreContentId}`);

  // Emit real progress: Transform starting
  const channelCount = (channels || ["facebook", "instagram"]).length;
  context.onProgress?.('transforming_channels', `Đang chuyển đổi sang ${channelCount} kênh...`, 55);

  const requestBody: Record<string, any> = {
    topic,
    channels: channels || ["facebook", "instagram"],
    contentGoal: content_goal || "engagement",
    brandName,
    brandGuideline,
    brandTemplateId: context.brandTemplateId,
    targetJourneyStage: journey_stage || "seed",
    contentAngle: content_angle || "educational",
    autoResearch: auto_research || false,
    userId: context.userId,
    organizationId: context.organizationId,
    // Core Content pipeline params
    coreContentId: coreContentId,
    contentRole: effectiveContentRole,
  };

  console.log(`[generate_multichannel] Calling with userId=${context.userId}, orgId=${context.organizationId}, coreContentId=${coreContentId}, role=${effectiveContentRole}`);

  const authToken = context.userAccessToken || supabaseKey;

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-multichannel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      ...requestBody,
      userId: context.userId,
      user_id: context.userId,
      organizationId: context.organizationId,
      organization_id: context.organizationId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      tool_name: "generate_multichannel",
      result: null,
      error: `Multichannel generation failed: ${errorText}`,
    };
  }

  const multiData = await response.json();

  // Emit real progress: Transform done
  context.onProgress?.('transform_done', 'Đã chuyển đổi xong', 85);

  // Extract previews for each channel
  const channelPreviews: Record<string, string> = {};
  if (multiData.data) {
    for (const [channel, content] of Object.entries(multiData.data)) {
      if (typeof content === "string") {
        channelPreviews[channel] = content.slice(0, 150) + "...";
      }
    }
  }

  const contentId = multiData.contentId || multiData.content_id || null;

  return {
    success: true,
    tool_name: "generate_multichannel",
    result: {
      topic,
      channels: channels || ["facebook", "instagram"],
      content_goal: content_goal || "engagement",
      journey_stage: requestBody.targetJourneyStage,
      content_angle: requestBody.contentAngle,
      content_role: effectiveContentRole,
      content_id: contentId,
      core_content_id: coreContentId,
      pipeline_steps: coreContentId 
        ? ["generate-core-content", "generate-multichannel"]
        : ["generate-multichannel (topic-based fallback)"],
      channel_previews: channelPreviews,
      full_content: multiData.data,
      message: coreContentId
        ? `✅ Pipeline hoàn tất:\n1) Đã tạo Core Content: "${coreContentTitle}"\n2) Đã transform sang ${(channels || []).length} kênh.\nXem tại /multichannel và /core-content`
        : `Đã tạo content cho ${(channels || []).length} kênh: ${(channels || []).join(", ")}`,
    },
  };
}

// Search topics in topic_history
async function executeSearchTopics(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { query, category, min_score, limit } = params;

  let queryBuilder = context.supabase
    .from("topic_history")
    .select("id, topic, category, pillar, reasoning, performance_score, format, created_at")
    .order("created_at", { ascending: false })
    .limit(limit || 10);

  // Add organization filter
  if (context.organizationId) {
    queryBuilder = queryBuilder.eq("organization_id", context.organizationId);
  }

  // Add brand filter
  if (context.brandTemplateId) {
    queryBuilder = queryBuilder.eq("brand_template_id", context.brandTemplateId);
  }

  // Add category filter
  if (category) {
    queryBuilder = queryBuilder.eq("category", category);
  }

  // Add min score filter
  if (min_score && min_score > 0) {
    queryBuilder = queryBuilder.gte("performance_score", min_score);
  }

  // Text search using ilike
  if (query) {
    queryBuilder = queryBuilder.ilike("topic", `%${query}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return {
      success: false,
      tool_name: "search_topics",
      result: null,
      error: error.message,
    };
  }

  return {
    success: true,
    tool_name: "search_topics",
    result: {
      query,
      count: data?.length || 0,
      topics: (data || []).map((t: any) => ({
        id: t.id,
        topic: t.topic,
        category: t.category,
        pillar: t.pillar,
        score: t.performance_score,
        format: t.format,
      })),
      message: data?.length 
        ? `Tìm thấy ${data.length} topics phù hợp với "${query}"`
        : `Không tìm thấy topic nào với "${query}"`,
    },
  };
}

// ============ TOPIC DISCOVERY TOOL ============

// Discover new topics via topic-ai edge function
async function executeDiscoverTopics(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { action, query, content_goal, limit, force_refresh } = params;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Build request to topic-ai edge function — action goes in BODY (not just query param)
  const topicAiUrl = `${supabaseUrl}/functions/v1/topic-ai`;

  const requestBody: Record<string, any> = {
    action: action || 'suggest',
    query,
    limit: limit || 5,
    brandTemplateId: context.brandTemplateId || null,
    organizationId: context.organizationId || null,
  };

  if (content_goal) {
    requestBody.contentGoal = content_goal;
  }

  // Force refresh to bypass cache when called from research prefetch
  if (force_refresh) {
    requestBody.forceRefresh = true;
  }

  console.log(`[discover_topics] Calling topic-ai action=${action}, query="${query}", forceRefresh=${!!force_refresh}`);

  try {
    const response = await fetch(topicAiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[discover_topics] topic-ai error: ${errorText}`);
      return {
        success: false,
        tool_name: "discover_topics",
        result: null,
        error: `Topic-AI ${action} failed: ${errorText}`,
      };
    }

    const data = await response.json();

    // Normalize response based on action type
    // trending returns { data: [...] }, suggest returns { suggestions: [...] }
    const topics = data.data || data.suggestions || data.topics || data.trendingTopics || [];
    const gaps = data.gaps || [];

    return {
      success: true,
      tool_name: "discover_topics",
      result: {
        action,
        query,
        content_goal: content_goal || null,
        topics: topics.slice(0, limit || 10).map((t: any) => ({
          topic: t.topic || t.title || t.name,
          category: t.category || t.pillar || 'general',
          score: t.overallScore || t.score || t.velocity_score || t.velocityScore || (t.scores?.trend) || null,
          reasoning: t.reasoning || t.explanation || t.suggestedAngles?.[0] || t.suggested_angles?.[0] || null,
          format: t.suggestedFormat || t.format || null,
          engagement_potential: t.engagementPotential || t.engagement_potential || t.scores?.engagement || null,
          source: t.source || (action === 'trending' ? 'trending' : 'suggest'),
        })),
        gaps: gaps.slice(0, 5).map((g: any) => ({
          pillar: g.pillar,
          gap_type: g.gapType || g.type,
          severity: g.severity,
          reason: g.reason,
          suggested_topics: g.suggestedTopics || [],
        })),
        total_found: topics.length,
        insights: data.insights || data.summary || null,
        message: topics.length > 0
          ? `Tìm thấy ${topics.length} topic suggestions cho "${query}" (action: ${action})`
          : `Không tìm thấy topic nào cho "${query}"`,
      },
    };
  } catch (error) {
    console.error(`[discover_topics] Error:`, error);
    return {
      success: false,
      tool_name: "discover_topics",
      result: null,
      error: error instanceof Error ? error.message : "Lỗi gọi Topic-AI",
    };
  }
}

// ============ REVIEWER TOOLS ============

// Brand voice check against brand_templates
async function executeBrandVoiceCheck(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { content, brand_template_id } = params;
  const templateId = brand_template_id || context.brandTemplateId;

  if (!templateId) {
    return {
      success: true,
      tool_name: "brand_voice_check",
      result: {
        score: 7,
        message: "Không có Brand Template để kiểm tra. Cho điểm mặc định.",
        forbidden_found: [],
        preferred_found: [],
        tone_match: "unknown",
      },
    };
  }

  try {
    const { data: brand } = await context.supabase
      .from("brand_templates")
      .select("brand_name, tone_of_voice, forbidden_words, preferred_words, formality_level, language_style")
      .eq("id", templateId)
      .single();

    if (!brand) {
      return { success: true, tool_name: "brand_voice_check", result: { score: 7, message: "Brand template not found" } };
    }

    const contentLower = content.toLowerCase();
    const forbiddenWords: string[] = brand.forbidden_words || [];
    const preferredWords: string[] = brand.preferred_words || [];

    const forbiddenFound = forbiddenWords.filter((w: string) => contentLower.includes(w.toLowerCase()));
    const preferredFound = preferredWords.filter((w: string) => contentLower.includes(w.toLowerCase()));

    // Score calculation
    let score = 8;
    if (forbiddenFound.length > 0) score -= forbiddenFound.length * 2;
    if (preferredFound.length > 0) score += Math.min(preferredFound.length * 0.5, 1);
    score = Math.max(1, Math.min(10, score));

    return {
      success: true,
      tool_name: "brand_voice_check",
      result: {
        brand_name: brand.brand_name,
        score: Math.round(score * 10) / 10,
        tone_of_voice: brand.tone_of_voice,
        formality_level: brand.formality_level,
        language_style: brand.language_style,
        forbidden_found: forbiddenFound,
        preferred_found: preferredFound,
        forbidden_count: forbiddenFound.length,
        preferred_count: preferredFound.length,
        message: forbiddenFound.length > 0
          ? `⚠️ Phát hiện ${forbiddenFound.length} từ cấm: ${forbiddenFound.join(", ")}`
          : `✅ Không phát hiện từ cấm. ${preferredFound.length > 0 ? `Sử dụng ${preferredFound.length} từ khuyến nghị.` : ''}`,
      },
    };
  } catch (err) {
    return { success: false, tool_name: "brand_voice_check", result: null, error: String(err) };
  }
}

// Legal compliance check against industry jurisdiction profiles
async function executeLegalComplianceCheck(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { content, industry_code, jurisdiction } = params;
  const region = jurisdiction || 'VN';

  try {
    // Find matching jurisdiction profile
    let query = context.supabase
      .from("industry_jurisdiction_profiles")
      .select("jurisdiction_code, resolved_rules, industry_template_id")
      .eq("jurisdiction_code", region)
      .limit(5);

    const { data: profiles } = await query;

    if (!profiles?.length) {
      return {
        success: true,
        tool_name: "legal_compliance_check",
        result: {
          risk_level: "unknown",
          violations: [],
          message: `Không tìm thấy quy định cho khu vực ${region}. Cần kiểm tra thủ công.`,
        },
      };
    }

    const contentLower = content.toLowerCase();
    const violations: Array<{ term: string; rule: string; severity: string }> = [];

    for (const profile of profiles) {
      const rules = profile.resolved_rules;
      if (!rules) continue;

      // Check forbidden_terms
      const forbiddenTerms: string[] = rules.forbidden_terms || [];
      for (const term of forbiddenTerms) {
        if (contentLower.includes(term.toLowerCase())) {
          violations.push({ term, rule: 'forbidden_term', severity: 'high' });
        }
      }

      // Check claim_restrictions
      const claimRestrictions: string[] = rules.claim_restrictions || [];
      for (const claim of claimRestrictions) {
        if (claim.length > 5 && contentLower.includes(claim.toLowerCase())) {
          violations.push({ term: claim, rule: 'claim_restriction', severity: 'medium' });
        }
      }
    }

    const riskLevel = violations.length === 0 ? 'low'
      : violations.some(v => v.severity === 'high') ? 'high' : 'medium';

    return {
      success: true,
      tool_name: "legal_compliance_check",
      result: {
        jurisdiction: region,
        risk_level: riskLevel,
        violations,
        violation_count: violations.length,
        profiles_checked: profiles.length,
        message: violations.length === 0
          ? `✅ Content tuân thủ quy định ${region}`
          : `⚠️ Phát hiện ${violations.length} vi phạm tiềm ẩn tại ${region}`,
      },
    };
  } catch (err) {
    return { success: false, tool_name: "legal_compliance_check", result: null, error: String(err) };
  }
}

// Platform best practices evaluation
async function executePlatformBestPractices(
  params: Record<string, any>,
  _context: ExecutionContext
): Promise<ToolCallResult> {
  const { content, platform } = params;

  const BEST_PRACTICES: Record<string, {
    maxLength: number;
    idealHashtags: [number, number];
    ctaRequired: boolean;
    tips: string[];
  }> = {
    tiktok: {
      maxLength: 2200,
      idealHashtags: [3, 5],
      ctaRequired: true,
      tips: [
        "Hook mạnh trong 3 giây đầu",
        "Sử dụng trending sounds",
        "Caption ngắn gọn, có CTA",
        "Hashtag trending + niche mix",
      ],
    },
    facebook: {
      maxLength: 63206,
      idealHashtags: [1, 3],
      ctaRequired: false,
      tips: [
        "3 dòng đầu quan trọng nhất (before See more)",
        "Ưu tiên storytelling format",
        "Emoji vừa phải, tránh lạm dụng",
        "Kêu gọi comment/share tự nhiên",
      ],
    },
    instagram: {
      maxLength: 2200,
      idealHashtags: [5, 15],
      ctaRequired: true,
      tips: [
        "Caption hook + value + CTA",
        "Hashtag mix: 5 big + 5 niche + 5 specific",
        "Carousel > single image cho engagement",
        "Sử dụng line breaks để dễ đọc",
      ],
    },
    linkedin: {
      maxLength: 3000,
      idealHashtags: [3, 5],
      ctaRequired: false,
      tips: [
        "Hook với số liệu hoặc insight",
        "Chia paragraph ngắn (1-2 câu)",
        "Tone chuyên nghiệp nhưng cá nhân",
        "Kết thúc bằng câu hỏi mở",
      ],
    },
    youtube: {
      maxLength: 5000,
      idealHashtags: [3, 5],
      ctaRequired: true,
      tips: [
        "Title dưới 60 ký tự, có keyword",
        "Description chi tiết, timestamps",
        "CTA subscribe + bell",
        "Tags relevant và specific",
      ],
    },
    threads: {
      maxLength: 500,
      idealHashtags: [0, 2],
      ctaRequired: false,
      tips: [
        "Ngắn gọn, conversational",
        "Ít hashtag hoặc không dùng",
        "Tone casual, authentic",
        "Tận dụng reply chains cho long-form",
      ],
    },
  };

  const practices = BEST_PRACTICES[platform] || BEST_PRACTICES.facebook;
  const contentLength = content.length;
  const hashtagCount = (content.match(/#\w+/g) || []).length;
  const hasCTA = /(?:mua ngay|đăng ký|comment|share|link|bio|click|xem thêm|follow|subscribe|liên hệ)/i.test(content);

  // Score calculation
  let fitScore = 7;
  
  // Length check
  if (contentLength > practices.maxLength) fitScore -= 2;
  else if (contentLength < 50) fitScore -= 1;
  
  // Hashtag check
  if (hashtagCount < practices.idealHashtags[0]) fitScore -= 0.5;
  else if (hashtagCount > practices.idealHashtags[1]) fitScore -= 1;
  else fitScore += 0.5;
  
  // CTA check
  if (practices.ctaRequired && !hasCTA) fitScore -= 1;
  else if (hasCTA) fitScore += 0.5;

  fitScore = Math.max(1, Math.min(10, fitScore));

  const issues: string[] = [];
  if (contentLength > practices.maxLength) issues.push(`Vượt giới hạn ${practices.maxLength} ký tự (hiện ${contentLength})`);
  if (hashtagCount > practices.idealHashtags[1]) issues.push(`Quá nhiều hashtag (${hashtagCount}, nên ${practices.idealHashtags[0]}-${practices.idealHashtags[1]})`);
  if (hashtagCount < practices.idealHashtags[0]) issues.push(`Thiếu hashtag (${hashtagCount}, nên ít nhất ${practices.idealHashtags[0]})`);
  if (practices.ctaRequired && !hasCTA) issues.push("Thiếu CTA (Call to Action)");

  return {
    success: true,
    tool_name: "platform_best_practices",
    result: {
      platform,
      fit_score: Math.round(fitScore * 10) / 10,
      content_length: contentLength,
      max_length: practices.maxLength,
      hashtag_count: hashtagCount,
      ideal_hashtags: practices.idealHashtags,
      has_cta: hasCTA,
      cta_required: practices.ctaRequired,
      issues,
      tips: practices.tips,
      message: issues.length === 0
        ? `✅ Content phù hợp với ${platform}`
        : `⚠️ ${issues.length} vấn đề cần cải thiện cho ${platform}`,
    },
  };
}

// ============ PLANNING TOOLS ============

// Start a new planning session
async function executeStartPlanningSession(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { session_type, goal, timeframe_start, timeframe_end, target_channels } = params;

  if (!context.userId) {
    return {
      success: false,
      tool_name: "start_planning_session",
      result: null,
      error: "User not authenticated",
    };
  }

  // Calculate default timeframe if not provided
  const today = new Date();
  let startDate = timeframe_start;
  let endDate = timeframe_end;

  if (!startDate) {
    startDate = today.toISOString().split('T')[0];
  }
  
  if (!endDate) {
    const end = new Date(today);
    if (session_type === 'weekly') {
      end.setDate(end.getDate() + 7);
    } else if (session_type === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setDate(end.getDate() + 14); // Default 2 weeks for campaign/event
    }
    endDate = end.toISOString().split('T')[0];
  }

  const { data, error } = await context.supabase
    .from("planning_sessions")
    .insert({
      user_id: context.userId,
      organization_id: context.organizationId || null,
      brand_template_id: context.brandTemplateId || null,
      session_type,
      title: goal,
      goal,
      timeframe_start: startDate,
      timeframe_end: endDate,
      target_channels: target_channels || [],
      status: 'draft',
    })
    .select('id, session_type, goal, timeframe_start, timeframe_end, status')
    .single();

  if (error) {
    return {
      success: false,
      tool_name: "start_planning_session",
      result: null,
      error: error.message,
    };
  }

  return {
    success: true,
    tool_name: "start_planning_session",
    result: {
      session_id: data.id,
      session_type: data.session_type,
      goal: data.goal,
      timeframe_start: data.timeframe_start,
      timeframe_end: data.timeframe_end,
      status: data.status,
      message: `Đã tạo planning session "${goal}" (${session_type}) từ ${startDate} đến ${endDate}`,
    },
  };
}

// Generate plan draft with AI
async function executeGeneratePlanDraft(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { session_id, content_frequency, format_mix, special_dates } = params;

  // Get session details
  const { data: session, error: sessionError } = await context.supabase
    .from("planning_sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      tool_name: "generate_plan_draft",
      result: null,
      error: sessionError?.message || "Session not found",
    };
  }

  // Get brand context
  let brandContext = "";
  if (context.brandTemplateId) {
    const { data: brand } = await context.supabase
      .from("brand_templates")
      .select("brand_name, brand_guideline, content_pillars, tone_of_voice")
      .eq("id", context.brandTemplateId)
      .single();
    
    if (brand) {
      brandContext = `Brand: ${brand.brand_name}\nGuideline: ${brand.brand_guideline}\nPillars: ${JSON.stringify(brand.content_pillars)}\nTone: ${JSON.stringify(brand.tone_of_voice)}`;
    }
  }

  // Calculate number of content pieces needed
  const start = new Date(session.timeframe_start);
  const end = new Date(session.timeframe_end);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  let contentCount = days; // Default daily
  if (content_frequency === 'every_2_days') contentCount = Math.ceil(days / 2);
  if (content_frequency === '3_per_week') contentCount = Math.ceil(days / 7 * 3);
  if (content_frequency === 'weekly') contentCount = Math.ceil(days / 7);

  // Generate plan using Lovable AI
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    return {
      success: false,
      tool_name: "generate_plan_draft",
      result: null,
      error: "LOVABLE_API_KEY not configured",
    };
  }

  const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Bạn là Content Planning Expert. Tạo kế hoạch content chi tiết theo yêu cầu. 
${brandContext}

Output JSON array với format:
[{
  "date": "YYYY-MM-DD",
  "topic": "Tiêu đề topic",
  "format": "script|carousel|post",
  "category": "educational|engagement|commercial|entertainment",
  "reasoning": "Lý do chọn topic này cho ngày này",
  "priority": "low|medium|high",
  "channels": ["facebook", "instagram"]
}]

Special dates to consider: ${JSON.stringify(special_dates || [])}
Format mix preference: ${JSON.stringify(format_mix || { scripts: 2, carousels: 2, posts: 3 })}`
        },
        {
          role: "user",
          content: `Tạo kế hoạch ${contentCount} content pieces cho "${session.goal}" từ ${session.timeframe_start} đến ${session.timeframe_end}. Session type: ${session.session_type}. Channels: ${JSON.stringify(session.target_channels)}.`
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!aiResponse.ok) {
    return {
      success: false,
      tool_name: "generate_plan_draft",
      result: null,
      error: "AI generation failed",
    };
  }

  const aiData = await aiResponse.json();
  const aiContent = aiData.choices?.[0]?.message?.content || "[]";
  
  // Parse AI response
  let planItems: any[] = [];
  try {
    // Extract JSON from response
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      planItems = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error("Failed to parse AI plan:", aiContent);
    planItems = [];
  }

  // Save plan items to database
  const itemsToInsert = planItems.map((item: any, index: number) => ({
    session_id,
    topic: item.topic,
    format: item.format || 'post',
    channels: item.channels || session.target_channels || [],
    scheduled_date: item.date,
    priority: item.priority || 'medium',
    reasoning: item.reasoning,
    category: item.category,
    status: 'planned',
    sort_order: index,
    original_suggestion: item,
  }));

  if (itemsToInsert.length > 0) {
    const { error: insertError } = await context.supabase
      .from("planned_content_items")
      .insert(itemsToInsert);

    if (insertError) {
      console.error("Failed to insert plan items:", insertError);
    }
  }

  // Update session with plan
  await context.supabase
    .from("planning_sessions")
    .update({
      current_plan: { items: planItems },
      total_topics: planItems.length,
      status: 'in_progress',
    })
    .eq("id", session_id);

  return {
    success: true,
    tool_name: "generate_plan_draft",
    result: {
      session_id,
      items: planItems,
      total_items: planItems.length,
      timeframe: `${session.timeframe_start} - ${session.timeframe_end}`,
      message: `Đã tạo kế hoạch với ${planItems.length} content pieces cho "${session.goal}"`,
    },
  };
}

// Refine plan based on user feedback
async function executeRefinePlan(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { session_id, action, item_id, changes, user_feedback } = params;

  // Get current session
  const { data: session, error: sessionError } = await context.supabase
    .from("planning_sessions")
    .select("*, planned_content_items(*)")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      tool_name: "refine_plan",
      result: null,
      error: sessionError?.message || "Session not found",
    };
  }

  // Save current plan version for undo
  const currentVersions = session.plan_versions || [];
  currentVersions.push({
    timestamp: new Date().toISOString(),
    plan: session.current_plan,
    feedback: user_feedback,
  });

  let resultMessage = "";

  switch (action) {
    case "add_topic": {
      const newItem = {
        session_id,
        topic: changes?.topic || "New Topic",
        format: changes?.format || "post",
        channels: changes?.channels || [],
        scheduled_date: changes?.date,
        priority: changes?.priority || "medium",
        reasoning: user_feedback,
        category: changes?.category || "engagement",
        status: "planned",
        is_user_modified: true,
      };

      const { error } = await context.supabase
        .from("planned_content_items")
        .insert(newItem);

      if (!error) {
        resultMessage = `Đã thêm topic "${newItem.topic}" vào kế hoạch`;
      }
      break;
    }

    case "remove_topic": {
      if (item_id) {
        await context.supabase
          .from("planned_content_items")
          .delete()
          .eq("id", item_id);
        resultMessage = "Đã xóa topic khỏi kế hoạch";
      }
      break;
    }

    case "change_date": {
      if (item_id && changes?.new_date) {
        await context.supabase
          .from("planned_content_items")
          .update({ 
            scheduled_date: changes.new_date,
            is_user_modified: true,
          })
          .eq("id", item_id);
        resultMessage = `Đã đổi ngày sang ${changes.new_date}`;
      }
      break;
    }

    case "change_format": {
      if (item_id && changes?.new_format) {
        await context.supabase
          .from("planned_content_items")
          .update({ 
            format: changes.new_format,
            is_user_modified: true,
          })
          .eq("id", item_id);
        resultMessage = `Đã đổi format sang ${changes.new_format}`;
      }
      break;
    }

    case "swap_order": {
      if (changes?.item1_id && changes?.item2_id) {
        // Get both items
        const { data: items } = await context.supabase
          .from("planned_content_items")
          .select("id, sort_order")
          .in("id", [changes.item1_id, changes.item2_id]);
        
        if (items && items.length === 2) {
          await context.supabase
            .from("planned_content_items")
            .update({ sort_order: items[1].sort_order })
            .eq("id", items[0].id);
          await context.supabase
            .from("planned_content_items")
            .update({ sort_order: items[0].sort_order })
            .eq("id", items[1].id);
          resultMessage = "Đã hoán đổi thứ tự 2 topics";
        }
      }
      break;
    }

    default:
      resultMessage = `Action "${action}" processed`;
  }

  // Update session with new version history
  await context.supabase
    .from("planning_sessions")
    .update({
      plan_versions: currentVersions,
      user_feedback_history: [...(session.user_feedback_history || []), { action, feedback: user_feedback, timestamp: new Date().toISOString() }],
    })
    .eq("id", session_id);

  // Get updated items
  const { data: updatedItems } = await context.supabase
    .from("planned_content_items")
    .select("*")
    .eq("session_id", session_id)
    .order("scheduled_date", { ascending: true });

  return {
    success: true,
    tool_name: "refine_plan",
    result: {
      session_id,
      action,
      updated_items: updatedItems || [],
      message: resultMessage,
    },
  };
}

// Finalize and save the plan
async function executeFinalizePlan(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { session_id, save_to_topic_bank = true, create_calendar_entries = true } = params;

  // Get session with items
  const { data: session, error: sessionError } = await context.supabase
    .from("planning_sessions")
    .select("*")
    .eq("id", session_id)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      tool_name: "finalize_plan",
      result: null,
      error: sessionError?.message || "Session not found",
    };
  }

  const { data: items } = await context.supabase
    .from("planned_content_items")
    .select("*")
    .eq("session_id", session_id)
    .eq("status", "planned");

  const savedTopics: any[] = [];
  const calendarEntries: any[] = [];

  // Save topics to topic_history
  if (save_to_topic_bank && items && items.length > 0) {
    for (const item of items) {
      const { data: topic, error: topicError } = await context.supabase
        .from("topic_history")
        .insert({
          user_id: context.userId,
          organization_id: context.organizationId,
          brand_template_id: context.brandTemplateId,
          topic: item.topic,
          category: item.category || "general",
          pillar: item.pillar,
          reasoning: item.reasoning,
          format: item.format,
          content_goal: "engagement",
          usage_status: "planned",
          was_used: false,
        })
        .select("id, topic")
        .single();

      if (!topicError && topic) {
        savedTopics.push(topic);
        
        // Update planned item with topic reference
        await context.supabase
          .from("planned_content_items")
          .update({ status: "generated" })
          .eq("id", item.id);
      }
    }
  }

  // Create calendar entries (content_schedules)
  if (create_calendar_entries && items && items.length > 0) {
    for (const item of items) {
      if (item.scheduled_date) {
        for (const channel of (item.channels || ["facebook"])) {
          // We'd need a content_id to create a schedule, so this is a placeholder
          // In a real implementation, we'd either generate content first or create a draft entry
          calendarEntries.push({
            date: item.scheduled_date,
            channel,
            topic: item.topic,
          });
        }
      }
    }
  }

  // Update session status
  await context.supabase
    .from("planning_sessions")
    .update({
      status: "finalized",
      finalized_at: new Date().toISOString(),
      total_topics: savedTopics.length,
    })
    .eq("id", session_id);

  return {
    success: true,
    tool_name: "finalize_plan",
    result: {
      session_id,
      saved_topics: savedTopics.length,
      calendar_entries: calendarEntries.length,
      topics: savedTopics,
      message: `Đã hoàn thành kế hoạch! Lưu ${savedTopics.length} topics vào Topic Bank.`,
    },
  };
}

// Get active planning session
async function executeGetActiveSession(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { session_id, include_items = true } = params;

  let query = context.supabase
    .from("planning_sessions")
    .select("*")
    .eq("id", session_id);

  const { data: session, error } = await query.single();

  if (error || !session) {
    return {
      success: false,
      tool_name: "get_active_session",
      result: null,
      error: error?.message || "Session not found",
    };
  }

  let items: any[] = [];
  if (include_items) {
    const { data } = await context.supabase
      .from("planned_content_items")
      .select("*")
      .eq("session_id", session_id)
      .order("scheduled_date", { ascending: true });
    items = data || [];
  }

  return {
    success: true,
    tool_name: "get_active_session",
    result: {
      session: {
        id: session.id,
        session_type: session.session_type,
        goal: session.goal,
        timeframe_start: session.timeframe_start,
        timeframe_end: session.timeframe_end,
        status: session.status,
        total_topics: session.total_topics,
      },
      items,
      message: `Session "${session.goal}" - ${session.status} - ${items.length} items`,
    },
  };
}

// ============ IMAGE GENERATION TOOLS ============

async function executeGenerateImage(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { prompt, style, aspect_ratio, channel, text_overlay, content_id } = params;

  // Auto-select aspect ratio from channel if not specified
  const channelAspectMap: Record<string, string> = {
    tiktok: '9:16',
    instagram: '1:1',
    facebook: '16:9',
    linkedin: '16:9',
    youtube: '16:9',
  };
  const finalAspectRatio = aspect_ratio || (channel ? channelAspectMap[channel] : '1:1');

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    // Call generate-brand-image edge function with timeout (image gen can be slow)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 110000); // 110s timeout

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-brand-image`, {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        prompt,
        style: style || 'photorealistic',
        aspectRatio: finalAspectRatio,
        channel: channel || 'general',
        textOverlay: text_overlay || '',
        brandTemplateId: context.brandTemplateId,
        organizationId: context.organizationId,
        contentId: content_id,
      }),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        tool_name: "generate_image",
        result: null,
        error: `Image generation failed: ${errorText}`,
      };
    }

    const imageData = await response.json();
    const imageUrl = imageData.imageUrl || imageData.image_url || imageData.url;
    const modelUsed = imageData.modelUsed || imageData.model_used || 'unknown';

    // Save to channel_image_history if content_id provided
    if (content_id && imageUrl && context.organizationId) {
      await context.supabase.from("channel_image_history").insert({
        content_id,
        channel: channel || 'general',
        image_url: imageUrl,
        prompt_used: prompt,
        style_used: style || 'photorealistic',
        model_used: modelUsed,
        organization_id: context.organizationId,
        is_selected: true,
        created_by: context.userId,
      }).catch(() => {});
    }

    return {
      success: true,
      tool_name: "generate_image",
      result: {
        image_url: imageUrl,
        model_used: modelUsed,
        style: style || 'photorealistic',
        aspect_ratio: finalAspectRatio,
        channel: channel || 'general',
        prompt_used: prompt,
        message: `Đã tạo ảnh thành công (${modelUsed}, ${finalAspectRatio})`,
      },
    };
  } catch (error) {
    return {
      success: false,
      tool_name: "generate_image",
      result: null,
      error: error instanceof Error ? error.message : "Image generation error",
    };
  }
}

async function executeEditImage(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { image_url, edit_type, edit_prompt } = params;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/edit-image-background`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        imageUrl: image_url,
        editType: edit_type,
        editPrompt: edit_prompt || '',
        organizationId: context.organizationId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        tool_name: "edit_image",
        result: null,
        error: `Image editing failed: ${errorText}`,
      };
    }

    const editData = await response.json();
    const editedUrl = editData.imageUrl || editData.image_url || editData.url;

    return {
      success: true,
      tool_name: "edit_image",
      result: {
        original_url: image_url,
        edited_url: editedUrl,
        edit_type,
        model_used: editData.modelUsed || 'unknown',
        message: `Đã chỉnh sửa ảnh thành công (${edit_type})`,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        tool_name: "edit_image",
        result: null,
        error: "Image editing timed out after 60s",
      };
    }
    return {
      success: false,
      tool_name: "edit_image",
      result: null,
      error: error instanceof Error ? error.message : "Image editing error",
    };
  }
}
