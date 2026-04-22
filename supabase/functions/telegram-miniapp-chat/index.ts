// Telegram Mini App AI chat — wraps Lovable AI Gateway with brand context.
// Persists user/assistant messages to chat_conversation_messages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticated client (RLS enforced for verifying user)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const conversationId: string | undefined = body.conversation_id;
    const organizationId: string | undefined = body.organization_id;
    const brandTemplateId: string | undefined = body.brand_template_id;
    const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages.slice(-6) : [];

    if (!conversationId || !organizationId || messages.length === 0) {
      return jsonResponse({ error: "Missing conversation_id / organization_id / messages" }, 400);
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) {
      return jsonResponse({ error: "No user message to respond to" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch brand context (best effort)
    let brandSystemPrompt = "Bạn là trợ lý AI của Flowa — nền tảng marketing AI cho team Việt Nam.";
    if (brandTemplateId) {
      const { data: brand } = await adminClient
        .from("brand_templates")
        .select("brand_name, brand_positioning, tone_of_voice, industry, unique_value_proposition")
        .eq("id", brandTemplateId)
        .maybeSingle();
      if (brand) {
        brandSystemPrompt += `\n\nBối cảnh brand đang chọn:\n- Tên: ${brand.brand_name}\n- Vị thế: ${brand.brand_positioning ?? "-"}\n- Tone: ${brand.tone_of_voice ?? "-"}\n- USP: ${brand.unique_value_proposition ?? "-"}\n- Ngành: ${Array.isArray(brand.industry) ? brand.industry.join(", ") : brand.industry ?? "-"}`;
      }
    }
    brandSystemPrompt += "\n\nTrả lời bằng tiếng Việt, ngắn gọn, dùng markdown khi cần (heading, list, bold). Tập trung gợi ý nội dung, ý tưởng, kế hoạch.";

    // Persist user message
    await adminClient.from("chat_conversation_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: lastUserMsg.content,
    });

    // Call Lovable AI Gateway
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const aiPayload = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: brandSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiPayload),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("[telegram-miniapp-chat] AI error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return jsonResponse({ error: "AI đang bận, thử lại sau ít phút" }, 429);
      }
      if (aiResp.status === 402) {
        return jsonResponse({ error: "Đã hết credit AI, vui lòng nâng cấp gói" }, 402);
      }
      return jsonResponse({ error: "AI không phản hồi" }, 502);
    }

    const aiJson = await aiResp.json();
    const reply: string = aiJson?.choices?.[0]?.message?.content ?? "";

    // Persist assistant message
    await adminClient.from("chat_conversation_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
      metadata: { source: "telegram_miniapp", model: aiPayload.model },
    });

    // Bump conversation
    await adminClient.from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return jsonResponse({ reply, model: aiPayload.model });
  } catch (e) {
    console.error("[telegram-miniapp-chat] fatal", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Lỗi không xác định" }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
