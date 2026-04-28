import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Whitelist tables (must match admin_cleanup_table SQL function)
const WHITELIST_TABLES = new Set<string>([
  "ai_response_cache", "web_search_cache", "knowledge_graph_cache", "telegram_example_cache",
  "edge_function_metrics", "agent_execution_logs", "agent_pipeline_logs", "cron_run_logs",
  "admin_audit_logs", "campaign_kpi_logs", "regulation_propagation_log", "usage_logs",
  "telegram_messages_log", "sales_chat_messages_log", "content_publishing_logs",
  "approval_logs", "campaign_notification_logs",
  "content_embeddings", "conversation_embeddings",
  "generation_tasks", "workflow_checkpoints",
  "telegram_processed_updates", "telegram_chat_state",
]);

// In-memory rate limit per admin
const rateMap = new Map<string, number[]>();
function rateLimit(userId: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const arr = (rateMap.get(userId) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  rateMap.set(userId, arr);
  return true;
}

async function getAdminUser(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Error("Unauthorized: missing Authorization header");
  const token = auth.replace("Bearer ", "");
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: u, error } = await svc.auth.getUser(token);
  if (error || !u?.user) throw new Error("Unauthorized");
  const { data: roles } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", u.user.id);
  const isAdmin = (roles || []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden: admin role required");
  return { user: u.user, svc };
}

async function audit(svc: any, userId: string, action: string, details: any) {
  try {
    await svc.from("admin_audit_logs").insert({
      admin_id: userId,
      action,
      details,
    });
  } catch (e) {
    console.error("[admin-storage-manager] audit insert failed:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user, svc } = await getAdminUser(req);
    if (!rateLimit(user.id)) {
      return json({ error: "Rate limit: tối đa 30 thao tác/phút" }, 429);
    }

    const body = await req.json();
    const action = body?.action as string;

    switch (action) {
      case "get_overview": {
        const buckets = await fetchBucketsSummary(svc);
        const { data: dbStats } = await svc.rpc("get_db_memory_stats");
        return json({ db_stats: dbStats || [], buckets });
      }

      case "get_db_stats_only": {
        const { data: dbStats } = await svc.rpc("get_db_memory_stats");
        return json({ db_stats: dbStats || [] });
      }

      case "list_bucket_files": {
        const { bucket, search, limit = 50, offset = 0, sortBy = "created_at", sortDir = "desc" } = body;
        if (!bucket) return json({ error: "bucket required" }, 400);
        const allFiles = await deepListBucket(svc, bucket);
        // Sort
        allFiles.sort((a: any, b: any) => {
          const av = sortBy === "name" ? (a.name || "") : (a.created_at || "");
          const bv = sortBy === "name" ? (b.name || "") : (b.created_at || "");
          return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
        let filtered = allFiles;
        if (search) {
          const q = search.toLowerCase();
          filtered = allFiles.filter((f: any) => f.name.toLowerCase().includes(q));
        }
        const total = filtered.length;
        const slice = filtered.slice(offset, offset + limit).map((f: any) => ({
          name: f.name,
          size: f.metadata?.size || 0,
          mimetype: f.metadata?.mimetype,
          created_at: f.created_at,
          updated_at: f.updated_at,
          last_accessed_at: f.last_accessed_at,
          public_url: svc.storage.from(bucket).getPublicUrl(f.name).data.publicUrl,
        }));
        return json({ files: slice, total });
      }

      case "delete_bucket_files": {
        const { bucket, paths } = body;
        if (!bucket || !Array.isArray(paths) || paths.length === 0) {
          return json({ error: "bucket và paths bắt buộc" }, 400);
        }
        if (paths.length > 200) return json({ error: "Tối đa 200 file/lần" }, 400);
        const { data, error } = await svc.storage.from(bucket).remove(paths);
        if (error) throw error;
        await audit(svc, user.id, "storage_delete_files", {
          bucket, count: paths.length, paths: paths.slice(0, 20),
        });
        return json({ deleted: data?.length || 0 });
      }

      case "cleanup_bucket_older_than": {
        const { bucket, days = 30, dry_run = false } = body;
        if (!bucket) return json({ error: "bucket required" }, 400);
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        const allFiles = await deepListBucket(svc, bucket);
        const targets = allFiles
          .filter((f: any) => f.created_at && new Date(f.created_at).getTime() < cutoff)
          .map((f: any) => ({ name: f.name, size: f.metadata?.size || 0 }));
        const totalBytes = targets.reduce((s: number, t: any) => s + t.size, 0);
        if (dry_run) return json({ count: targets.length, total_bytes: totalBytes, sample: targets.slice(0, 10) });
        if (targets.length === 0) return json({ deleted: 0, total_bytes: 0 });
        // Batch 100/lần
        let deleted = 0;
        for (let i = 0; i < targets.length; i += 100) {
          const batch = targets.slice(i, i + 100).map((t: any) => t.name);
          const { data } = await svc.storage.from(bucket).remove(batch);
          deleted += data?.length || 0;
        }
        await audit(svc, user.id, "storage_cleanup_older_than", {
          bucket, days, deleted, total_bytes: totalBytes,
        });
        return json({ deleted, total_bytes: totalBytes });
      }

      case "download_file": {
        const { bucket, path } = body;
        if (!bucket || !path) return json({ error: "bucket và path bắt buộc" }, 400);
        const { data, error } = await svc.storage.from(bucket).createSignedUrl(path, 300);
        if (error) throw error;
        return json({ url: data.signedUrl });
      }

      case "find_orphan_files": {
        const { bucket } = body;
        if (!bucket) return json({ error: "bucket required" }, 400);
        const { data, error } = await svc.rpc("find_orphan_storage_paths", { p_bucket: bucket });
        if (error) throw error;
        return json({
          orphans: (data || []).map((o: any) => ({
            name: o.object_name,
            size: o.size_bytes,
            created_at: o.created_at,
          })),
        });
      }

      case "cleanup_table": {
        const { table, mode, days } = body;
        if (!table || !mode) return json({ error: "table và mode bắt buộc" }, 400);
        if (!WHITELIST_TABLES.has(table)) return json({ error: `Bảng ${table} không nằm trong whitelist` }, 400);
        if (!["expired", "older_than", "all"].includes(mode)) return json({ error: "mode không hợp lệ" }, 400);
        const { data, error } = await svc.rpc("admin_cleanup_table", {
          p_table: table, p_mode: mode, p_days: days ?? 30,
        });
        if (error) throw error;
        await audit(svc, user.id, "cleanup_table", {
          table, mode, days: days ?? 30, rows_deleted: data,
        });
        return json({ rows_deleted: data });
      }

      case "bulk_cleanup_expired": {
        const { data, error } = await svc.rpc("admin_bulk_cleanup_expired");
        if (error) throw error;
        const totalRows = Object.values(data || {}).reduce((s: number, v: any) => s + Number(v || 0), 0);
        await audit(svc, user.id, "bulk_cleanup_expired", { breakdown: data, total: totalRows });
        return json({ breakdown: data, total: totalRows });
      }

      case "preview_table": {
        const { table, limit = 10 } = body;
        if (!table) return json({ error: "table required" }, 400);
        if (!WHITELIST_TABLES.has(table)) return json({ error: `Bảng ${table} không nằm trong whitelist` }, 400);
        const { data, error } = await svc
          .from(table)
          .select("*")
          .order("created_at", { ascending: false } as any)
          .limit(Math.min(limit, 50));
        if (error) throw error;
        return json({ rows: data || [] });
      }

      case "audit_history": {
        const { limit = 50, offset = 0, action_filter } = body;
        let query = svc
          .from("v_admin_audit_with_user")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
        if (action_filter) {
          query = query.eq("action", action_filter);
        } else {
          query = query.in("action", [
            "cleanup_table", "storage_delete_files", "storage_cleanup_older_than", "bulk_cleanup_expired",
          ]);
        }
        const { data, error } = await query;
        if (error) throw error;
        return json({ logs: data || [] });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    console.error("[admin-storage-manager]", e);
    const msg = e?.message || "Internal error";
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Forbidden") ? 403 : 500;
    return json({ error: msg }, status);
  }
});

async function deepListBucket(svc: any, bucket: string): Promise<any[]> {
  // Recursive deep listing — handles >1000 files & nested folders
  const result: any[] = [];
  const stack: string[] = [""];
  const visited = new Set<string>();
  while (stack.length) {
    const prefix = stack.pop()!;
    if (visited.has(prefix)) continue;
    visited.add(prefix);
    let offset = 0;
    while (true) {
      const { data, error } = await svc.storage.from(bucket).list(prefix, {
        limit: 1000, offset, sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        if (item.id === null) {
          // Folder
          const sub = prefix ? `${prefix}/${item.name}` : item.name;
          if (!visited.has(sub)) stack.push(sub);
        } else {
          result.push({
            ...item,
            name: prefix ? `${prefix}/${item.name}` : item.name,
          });
        }
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return result;
}

async function fetchBucketsSummary(svc: any) {
  const { data: buckets } = await svc.storage.listBuckets();
  const result: any[] = [];
  for (const b of buckets || []) {
    const files = await deepListBucket(svc, b.id).catch(() => []);
    const totalSize = files.reduce((s: number, f: any) => s + (f.metadata?.size || 0), 0);
    result.push({
      id: b.id,
      name: b.name,
      public: b.public,
      file_count: files.length,
      total_size: totalSize,
      created_at: b.created_at,
    });
  }
  return result;
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
