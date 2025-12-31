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
