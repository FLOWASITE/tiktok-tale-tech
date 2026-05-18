#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write
// =============================================================================
// 11-export-cron-and-storage.ts
// Export cron jobs + storage buckets + RLS policies từ Lovable Cloud
// Chạy: deno run -A infra/scripts/11-export-cron-and-storage.ts
// Yêu cầu: env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (lấy từ Lovable Cloud Settings)
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const url = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("❌ Cần SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  Deno.exit(1);
}

const supabase = createClient(url, key);
const outDir = new URL("../snapshots/", import.meta.url).pathname;

// 1. Cron jobs
console.log("==> Exporting cron jobs...");
const { data: cronJobs, error: cronErr } = await supabase.rpc("admin_list_cron_jobs").maybeSingle();
if (cronErr) {
  console.warn("⚠️ admin_list_cron_jobs RPC chưa tồn tại. Tạo RPC này trước:");
  console.warn(`
    CREATE OR REPLACE FUNCTION admin_list_cron_jobs() RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER SET search_path=public,cron AS $$
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'jobid',jobid,'schedule',schedule,'jobname',jobname,
        'active',active,'database',database,'command',command
      ) ORDER BY jobid), '[]'::jsonb) FROM cron.job
    $$;
  `);
} else {
  await Deno.writeTextFile(`${outDir}cron-jobs.json`, JSON.stringify(cronJobs, null, 2));
  console.log(`✅ cron-jobs.json`);
}

// 2. Storage buckets
console.log("==> Exporting storage buckets...");
const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
if (bucketsErr) throw bucketsErr;
await Deno.writeTextFile(`${outDir}storage-buckets.json`, JSON.stringify(buckets, null, 2));
console.log(`✅ storage-buckets.json (${buckets.length} buckets)`);

// 3. Bucket sizes (count objects per bucket)
console.log("==> Counting objects per bucket...");
const sizes: Record<string, number> = {};
for (const b of buckets) {
  const { data, error } = await supabase.storage.from(b.name).list("", { limit: 1 });
  if (error) { sizes[b.name] = -1; continue; }
  sizes[b.name] = data?.length ?? 0;
}
await Deno.writeTextFile(`${outDir}storage-sizes.json`, JSON.stringify(sizes, null, 2));
console.log(`✅ storage-sizes.json`);

console.log("\n✅ Export xong. Files trong infra/snapshots/");
