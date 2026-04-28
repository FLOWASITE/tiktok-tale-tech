import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Simple in-memory rate limit per admin
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
  if (!auth) throw new Error("Missing Authorization header");
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
        // Buckets summary
        const { data: bucketsData } = await svc.rpc("get_db_memory_stats");
        const { data: storageRows } = await svc
          .from("v_storage_summary" as any)
          .select("*")
          .limit(0);
        // direct query via rpc-less: use storage admin
        const buckets = await fetchBucketsSummary(svc);
        return json({ db_stats: bucketsData || [], buckets });
      }

      case "list_bucket_files": {
        const { bucket, search, limit = 50, offset = 0, sortBy = "created_at", sortDir = "desc" } = body;
        if (!bucket) return json({ error: "bucket required" }, 400);
        const { data, error } = await svc.storage.from(bucket).list("", {
          limit: 1000,
          offset: 0,
          sortBy: { column: sortBy, order: sortDir },
        });
        if (error) throw error;
        let files = (data || []).filter((f: any) => f.name && !f.name.endsWith("/"));
        // Recursive: if there are folders, also fetch their content (1 level deep for now)
        const folders = (data || []).filter((f: any) => f.id === null);
        for (const folder of folders) {
          const { data: sub } = await svc.storage.from(bucket).list(folder.name, { limit: 1000 });
          if (sub) {
            for (const s of sub) {
              if (s.name && s.id) files.push({ ...s, name: `${folder.name}/${s.name}` });
            }
          }
        }
        if (search) {
          const q = search.toLowerCase();
          files = files.filter((f: any) => f.name.toLowerCase().includes(q));
        }
        const total = files.length;
        const slice = files.slice(offset, offset + limit).map((f: any) => ({
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
        await svc.from("admin_audit_logs").insert({
          admin_user_id: user.id,
          action: "storage_delete_files",
          target_type: bucket,
          metadata: { count: paths.length, paths: paths.slice(0, 20) },
        });
        return json({ deleted: data?.length || 0 });
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
        const { data, error } = await svc.rpc("admin_cleanup_table", {
          p_table: table,
          p_mode: mode,
          p_days: days ?? 30,
        });
        if (error) throw error;
        return json({ rows_deleted: data });
      }

      case "preview_table": {
        const { table, limit = 10 } = body;
        if (!table) return json({ error: "table required" }, 400);
        const { data, error } = await svc
          .from(table)
          .select("*")
          .order("created_at", { ascending: false } as any)
          .limit(limit);
        if (error) throw error;
        return json({ rows: data || [] });
      }

      case "audit_history": {
        const { limit = 50 } = body;
        const { data, error } = await svc
          .from("admin_audit_logs")
          .select("*")
          .or("action.eq.cleanup_table,action.eq.storage_delete_files")
          .order("created_at", { ascending: false })
          .limit(limit);
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

async function fetchBucketsSummary(svc: any) {
  // Use raw REST for storage.buckets aggregate
  const { data: buckets } = await svc.storage.listBuckets();
  const result: any[] = [];
  for (const b of buckets || []) {
    // Count + size via list (limit 1000) — best effort summary
    const { data: files } = await svc.storage.from(b.id).list("", { limit: 1000 });
    const realFiles = (files || []).filter((f: any) => f.id);
    const totalSize = realFiles.reduce((s: number, f: any) => s + (f.metadata?.size || 0), 0);
    result.push({
      id: b.id,
      name: b.name,
      public: b.public,
      file_count: realFiles.length,
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
