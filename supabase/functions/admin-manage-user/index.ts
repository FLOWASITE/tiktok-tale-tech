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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await serviceClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

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
        const { email, password, full_name, role, plan_type, organization_ids, org_role } = body;
        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email and password required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Admin tạo user → luôn skip default workspace, admin sẽ tự quản lý việc gán org
        const { data: newUser, error: createError } =
          await serviceClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: full_name || "",
              skip_default_org: true,
            },
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

        if (organization_ids?.length && newUser.user) {
          for (const orgId of organization_ids) {
            await serviceClient.from("organization_members").insert({
              organization_id: orgId,
              user_id: newUser.user.id,
              role: org_role || "member",
              joined_at: new Date().toISOString(),
            });
          }
        }

        await auditLog("create_user", newUser.user?.id || null, { email, full_name, role, plan_type, organization_ids, org_role });

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

        await auditLog("reset_usage", user_id, {});

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

      // ===== NEW ACTIONS =====

      case "update_profile": {
        const { user_id, full_name } = body;
        if (!user_id) {
          return new Response(
            JSON.stringify({ error: "user_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updates: Record<string, unknown> = {};
        if (full_name !== undefined) updates.full_name = full_name;

        if (Object.keys(updates).length === 0) {
          return new Response(
            JSON.stringify({ error: "No fields to update" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: profileError } = await serviceClient
          .from("profiles")
          .update(updates)
          .eq("id", user_id);

        if (profileError) {
          return new Response(JSON.stringify({ error: profileError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("update_profile", user_id, updates);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add_to_org": {
        const { user_id, organization_id, role: memberRole } = body;
        if (!user_id || !organization_id) {
          return new Response(
            JSON.stringify({ error: "user_id and organization_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if already a member
        const { data: existing } = await serviceClient
          .from("organization_members")
          .select("id")
          .eq("user_id", user_id)
          .eq("organization_id", organization_id)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: "User đã là thành viên của organization này" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: addError } = await serviceClient
          .from("organization_members")
          .insert({
            user_id,
            organization_id,
            role: memberRole || "member",
            joined_at: new Date().toISOString(),
          });

        if (addError) {
          return new Response(JSON.stringify({ error: addError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("add_to_org", user_id, { organization_id, role: memberRole || "member" });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_from_org": {
        const { user_id, organization_id } = body;
        if (!user_id || !organization_id) {
          return new Response(
            JSON.stringify({ error: "user_id and organization_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: removeError } = await serviceClient
          .from("organization_members")
          .delete()
          .eq("user_id", user_id)
          .eq("organization_id", organization_id);

        if (removeError) {
          return new Response(JSON.stringify({ error: removeError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("remove_from_org", user_id, { organization_id });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_org_role": {
        const { user_id, organization_id, role: newRole } = body;
        if (!user_id || !organization_id || !newRole) {
          return new Response(
            JSON.stringify({ error: "user_id, organization_id and role required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await serviceClient
          .from("organization_members")
          .update({ role: newRole })
          .eq("user_id", user_id)
          .eq("organization_id", organization_id);

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("update_org_role", user_id, { organization_id, new_role: newRole });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_workspace_plan": {
        const { organization_id, plan_type } = body;
        if (!organization_id || !plan_type) {
          return new Response(
            JSON.stringify({ error: "organization_id and plan_type required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        // Check if subscription exists for this org
        const { data: existingSub } = await serviceClient
          .from("subscriptions")
          .select("id")
          .eq("organization_id", organization_id)
          .maybeSingle();

        if (existingSub) {
          const { error: updateErr } = await serviceClient
            .from("subscriptions")
            .update({
              plan_type,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq("organization_id", organization_id);
          if (updateErr) throw updateErr;
        } else {
          // Find org owner to create subscription
          const { data: org } = await serviceClient
            .from("organizations")
            .select("owner_id")
            .eq("id", organization_id)
            .single();

          if (!org) {
            return new Response(
              JSON.stringify({ error: "Organization not found" }),
              { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const { error: insertErr } = await serviceClient
            .from("subscriptions")
            .insert({
              user_id: org.owner_id,
              organization_id,
              plan_type,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: periodEnd.toISOString(),
            });
          if (insertErr) throw insertErr;
        }

        await auditLog("update_workspace_plan", null, { organization_id, plan_type });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cleanup_orphan_workspaces": {
        // Find auto-created personal workspaces (slug = UUID format) where owner is member of another org
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const { data: allOrgs } = await serviceClient
          .from("organizations")
          .select("id, name, slug, owner_id");

        if (!allOrgs) {
          return new Response(
            JSON.stringify({ success: true, deleted: 0, orphans: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Filter orgs with UUID slugs (auto-created)
        const autoOrgs = allOrgs.filter((o) => UUID_REGEX.test(o.slug));

        // Get member counts for these orgs
        const autoOrgIds = autoOrgs.map((o) => o.id);
        const { data: members } = await serviceClient
          .from("organization_members")
          .select("organization_id, user_id")
          .in("organization_id", autoOrgIds.length > 0 ? autoOrgIds : ["__none__"]);

        const memberCountMap = new Map<string, number>();
        (members || []).forEach((m: any) => {
          memberCountMap.set(m.organization_id, (memberCountMap.get(m.organization_id) || 0) + 1);
        });

        // Check which owners are members of other orgs
        const ownerIds = [...new Set(autoOrgs.map((o) => o.owner_id).filter(Boolean))];
        const { data: ownerMemberships } = await serviceClient
          .from("organization_members")
          .select("user_id, organization_id")
          .in("user_id", ownerIds.length > 0 ? ownerIds : ["__none__"]);

        const ownerOtherOrgMap = new Map<string, boolean>();
        (ownerMemberships || []).forEach((m: any) => {
          const ownerAutoOrg = autoOrgs.find((o) => o.owner_id === m.user_id);
          if (ownerAutoOrg && m.organization_id !== ownerAutoOrg.id) {
            ownerOtherOrgMap.set(m.user_id, true);
          }
        });

        // Orphans: auto-created, 1 member (owner), owner belongs to another org
        const orphans = autoOrgs.filter((o) => {
          const count = memberCountMap.get(o.id) || 0;
          return count <= 1 && o.owner_id && ownerOtherOrgMap.has(o.owner_id);
        });

        if (body.dry_run) {
          return new Response(
            JSON.stringify({ success: true, dry_run: true, orphan_count: orphans.length, orphans: orphans.map((o) => ({ id: o.id, name: o.name, slug: o.slug })) }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete orphans
        let deletedCount = 0;
        for (const orphan of orphans) {
          const { error: delErr } = await serviceClient
            .from("organizations")
            .delete()
            .eq("id", orphan.id);
          if (!delErr) deletedCount++;
        }

        await auditLog("cleanup_orphan_workspaces", null, { deleted_count: deletedCount, orphan_ids: orphans.map((o) => o.id) });

        return new Response(
          JSON.stringify({ success: true, deleted: deletedCount, orphans: orphans.map((o) => ({ id: o.id, name: o.name })) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_workspace": {
        const { organization_id } = body;
        if (!organization_id) {
          return new Response(
            JSON.stringify({ error: "organization_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: delError } = await serviceClient
          .from("organizations")
          .delete()
          .eq("id", organization_id);

        if (delError) {
          return new Response(JSON.stringify({ error: delError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await auditLog("delete_workspace", null, { organization_id });

        return new Response(
          JSON.stringify({ success: true }),
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
