// Tool executor for AI chatbot function calling

import { ToolCallResult } from "./tool-definitions.ts";

interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
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

// Generate multichannel content via generate-multichannel edge function
async function executeGenerateMultichannel(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<ToolCallResult> {
  const { topic, channels, content_goal } = params;

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

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-multichannel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      topic,
      channels: channels || ["facebook", "instagram"],
      contentGoal: content_goal || "engagement",
      brandName,
      brandGuideline,
      brandTemplateId: context.brandTemplateId,
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

  // Extract previews for each channel
  const channelPreviews: Record<string, string> = {};
  if (multiData.data) {
    for (const [channel, content] of Object.entries(multiData.data)) {
      if (typeof content === "string") {
        channelPreviews[channel] = content.slice(0, 150) + "...";
      }
    }
  }

  return {
    success: true,
    tool_name: "generate_multichannel",
    result: {
      topic,
      channels: channels || ["facebook", "instagram"],
      content_goal: content_goal || "engagement",
      channel_previews: channelPreviews,
      full_content: multiData.data,
      message: `Đã tạo content cho ${(channels || []).length} kênh: ${(channels || []).join(", ")}`,
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
