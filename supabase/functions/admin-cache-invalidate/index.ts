// ============================================
// Admin Cache Invalidation
// ============================================
// Lets workspace admins flush the AI response cache for a brand, organization,
// or industry template. Use this when compliance rules change mid-TTL window
// (e.g. Vietnamese Decree 38 update for an aesthetic vertical) and you cannot
// wait for the 7-day default TTL to expire.
//
// Auth: caller must be the org admin/owner of the target organization, or hold
// the global `admin` app_role.
//
// Body: { organization_id?, industry_template_id?, brand_template_id? }
//   At least one of the three must be provided.
//
// Returns: { deleted_pg, deleted_redis, scope }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { invalidateByPrefix } from "../_shared/cache/redis-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvalidateBody {
  organization_id?: string;
  industry_template_id?: string;
  brand_template_id?: string;
}

const isUuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Auth: validate JWT and resolve user ----
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const jwt = authHeader.slice(7);

  const sbAuth = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userRes, error: userErr } = await sbAuth.auth.getUser(jwt);
  if (userErr || !userRes?.user) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const userId = userRes.user.id;

  // ---- Parse body ----
  let body: InvalidateBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { organization_id, industry_template_id, brand_template_id } = body;
  const provided = [organization_id, industry_template_id, brand_template_id].filter(Boolean);
  if (provided.length === 0) {
    return new Response(
      JSON.stringify({
        error: "Provide at least one of: organization_id, industry_template_id, brand_template_id",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  for (const v of provided) {
    if (!isUuid(v)) {
      return new Response(
        JSON.stringify({ error: "All ids must be valid UUIDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  // ---- Authorization: global admin OR org admin/owner ----
  const sbSrv = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: globalAdmin } = await sbSrv.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  let orgIdForCheck = organization_id;
  if (!orgIdForCheck && brand_template_id) {
    const { data: brand } = await sbSrv
      .from("brand_templates")
      .select("organization_id")
      .eq("id", brand_template_id)
      .maybeSingle();
    orgIdForCheck = brand?.organization_id || undefined;
  }

  let isAuthorized = !!globalAdmin;
  if (!isAuthorized && orgIdForCheck) {
    const { data: orgAdmin } = await sbSrv.rpc("is_org_admin", {
      _user_id: userId,
      _org_id: orgIdForCheck,
    });
    isAuthorized = !!orgAdmin;
  }
  // industry_template_id alone (no org context) → require global admin only
  if (!isAuthorized && industry_template_id && !orgIdForCheck) {
    isAuthorized = !!globalAdmin;
  }

  if (!isAuthorized) {
    console.warn(
      `[admin-cache-invalidate] DENY user=${userId} org=${orgIdForCheck} industry=${industry_template_id}`,
    );
    return new Response(
      JSON.stringify({ error: "Forbidden — admin/owner role required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- Invalidate Postgres ai_response_cache rows ----
  let deletedPg = 0;
  try {
    let q = sbSrv.from("ai_response_cache").delete({ count: "exact" });
    if (organization_id) q = q.eq("organization_id", organization_id);
    if (brand_template_id) q = q.eq("brand_template_id", brand_template_id);
    if (industry_template_id) {
      // No FK to industry templates on cache rows — match by industry_memory_version
      // of brands using this template (best-effort).
      const { data: brands } = await sbSrv
        .from("brand_templates")
        .select("id")
        .eq("industry_template_id", industry_template_id);
      const brandIds = (brands || []).map((b: any) => b.id);
      if (brandIds.length === 0) {
        console.log("[admin-cache-invalidate] No brands use this industry template");
      } else {
        q = q.in("brand_template_id", brandIds);
      }
    }
    const { count, error } = await q;
    if (error) {
      console.warn("[admin-cache-invalidate] PG delete error:", error.message);
    } else {
      deletedPg = count || 0;
    }
  } catch (e) {
    console.warn("[admin-cache-invalidate] PG delete threw:", e);
  }

  // ---- Invalidate Redis cache (best-effort, prefix-based) ----
  let deletedRedis = 0;
  try {
    if (brand_template_id) {
      deletedRedis += await invalidateByPrefix(`flowa:cache:${brand_template_id}:`);
    } else if (organization_id) {
      // No org-prefix scheme in redis-cache.ts today; skip with a note.
      console.log(
        "[admin-cache-invalidate] Redis prefix invalidation by org not supported; PG only",
      );
    }
  } catch (e) {
    console.warn("[admin-cache-invalidate] Redis invalidate threw:", e);
  }

  console.log(
    `[admin-cache-invalidate] OK user=${userId} pg=${deletedPg} redis=${deletedRedis} ` +
    `org=${organization_id || "-"} industry=${industry_template_id || "-"} brand=${brand_template_id || "-"}`,
  );

  return new Response(
    JSON.stringify({
      success: true,
      deleted_pg: deletedPg,
      deleted_redis: deletedRedis,
      scope: { organization_id, industry_template_id, brand_template_id },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
