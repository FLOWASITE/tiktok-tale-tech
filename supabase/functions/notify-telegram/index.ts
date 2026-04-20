// notify-telegram — Push pipeline completion/failure notifications to Telegram.
// Called server-to-server (service role) from agent-pipeline after analyze stage.
//
// Body: { user_id, organization_id, content_title, status: 'completed'|'failed',
//         pipeline_id?, campaign_id?, summary? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { resolveUserTarget, pushMany, escapeMd } from "../_shared/telegram-notifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  user_id: string;
  organization_id: string;
  content_title: string;
  status: "completed" | "failed";
  pipeline_id?: string;
  campaign_id?: string;
  summary?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const body = (await req.json()) as Body;
    if (!body?.user_id || !body?.organization_id || !body?.content_title || !body?.status) {
      return new Response(
        JSON.stringify({ error: "missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const target = await resolveUserTarget(supabase, body.organization_id, body.user_id);
    if (!target) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no_telegram_binding" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const title = escapeMd(body.content_title.slice(0, 80));
    const summary = body.summary ? `\n\n_${escapeMd(body.summary.slice(0, 200))}_` : "";

    const text = body.status === "completed"
      ? `✅ Campaign *${title}* đã hoàn thành.${summary}`
      : `❌ Campaign *${title}* thất bại.${summary}`;

    const buttons: Array<{ text: string; url?: string; callback_data?: string }> = [];
    if (body.campaign_id) {
      buttons.push({ text: "👁 Xem chi tiết", url: `https://app.flowa.one/campaigns/${body.campaign_id}` });
    } else if (body.pipeline_id) {
      buttons.push({ text: "👁 Xem pipeline", url: `https://app.flowa.one/agent/pipelines/${body.pipeline_id}` });
    }

    await pushMany([target], text, {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: buttons.length > 0 ? { inline_keyboard: [buttons] } : undefined,
    });

    return new Response(
      JSON.stringify({ ok: true, sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[notify-telegram] error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
