import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for all admin operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get caller identity via anon client with user's token
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Check admin role using serviceClient (bypasses RLS)
    const { data: adminRole } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper to log admin actions
    async function auditLog(actionName: string, targetUserId: string | null, details: Record<string, unknown> = {}) {
      await serviceClient.from("admin_audit_logs").insert({
        admin_id: callerId,
        action: actionName,
        target_user_id: targetUserId,
        details,
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "create_user": {
        const { email, password, full_name, role, plan_type } = body;
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email and password required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newUser, error: createError } =
          await serviceClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: full_name || "" },
          });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (role && role !== "user" && newUser.user) {
          await serviceClient
            .from("user_roles")
            .update({ role })
            .eq("user_id", newUser.user.id);
        }

        if (plan_type && plan_type !== "free" && newUser.user) {
          const periodEnd = new Date();
          periodEnd.setDate(periodEnd.getDate() + 30);
          await serviceClient
            .from("subscriptions")
            .update({
              plan_type,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq("user_id", newUser.user.id);
        }

        await auditLog("create_user", newUser.user?.id || null, { email, full_name, role, plan_type });

        return new Response(
          JSON.stringify({ success: true, user: newUser.user }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "ban_user": {
        const { user_id, ban } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (user_id === callerId) {
          return new Response(
            JSON.stringify({ error: "Cannot ban yourself" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const banOptions = ban
          ? { ban_duration: "876000h" }
          : { ban_duration: "none" };

        const { error: banError } =
          await serviceClient.auth.admin.updateUserById(user_id, banOptions);

        if (banError) {
          return new Response(JSON.stringify({ error: banError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog(ban ? "ban_user" : "unban_user", user_id, { ban });

        return new Response(
          JSON.stringify({ success: true, banned: ban }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_user": {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (user_id === callerId) {
          return new Response(
            JSON.stringify({ error: "Cannot delete yourself" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } =
          await serviceClient.auth.admin.deleteUser(user_id);

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("delete_user", user_id, {});

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { user_id, new_password } = body;
        if (!user_id || !new_password) {
          return new Response(
            JSON.stringify({ error: "user_id and new_password required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "Password must be at least 6 characters" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: resetError } =
          await serviceClient.auth.admin.updateUserById(user_id, { password: new_password });

        if (resetError) {
          return new Response(JSON.stringify({ error: resetError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("reset_password", user_id, {});

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_usage": {
        const { user_id } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: sub } = await serviceClient
          .from("subscriptions")
          .select("current_period_start, current_period_end")
          .eq("user_id", user_id)
          .maybeSingle();

        if (sub) {
          await serviceClient
            .from("usage_logs")
            .delete()
            .eq("user_id", user_id)
            .gte("created_at", sub.current_period_start)
            .lte("created_at", sub.current_period_end);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list_banned_users": {
        const { data: authUsers, error: listError } =
          await serviceClient.auth.admin.listUsers({ perPage: 1000 });

        if (listError) {
          return new Response(JSON.stringify({ error: listError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const bannedIds = (authUsers?.users || [])
          .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
          .map((u) => u.id);

        return new Response(
          JSON.stringify({ banned_ids: bannedIds }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action: " + action }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
