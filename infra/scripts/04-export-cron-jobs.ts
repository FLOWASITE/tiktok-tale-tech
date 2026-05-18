// =============================================================================
// 04-export-cron-jobs.ts
// Dump tất cả pg_cron jobs từ Lovable Cloud để re-apply lên self-host
// Chạy: SUPABASE_DB_URL=postgres://... deno run -A 04-export-cron-jobs.ts
// =============================================================================

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
if (!dbUrl) {
  console.error("❌ SUPABASE_DB_URL chưa set");
  Deno.exit(1);
}

// Note: cần Postgres client; ở đây dùng `psql` qua subprocess để đơn giản
const proc = new Deno.Command("psql", {
  args: [
    dbUrl,
    "-A", "-t", "-F", "\t",
    "-c", "SELECT jobname, schedule, command FROM cron.job ORDER BY jobname",
  ],
  stdout: "piped",
  stderr: "piped",
});

const { stdout, stderr, success } = await proc.output();
if (!success) {
  console.error(new TextDecoder().decode(stderr));
  Deno.exit(1);
}

const rows = new TextDecoder().decode(stdout).trim().split("\n");
const out: string[] = [
  "-- Cron jobs exported từ Lovable Cloud",
  "-- Re-apply lên self-host: psql -U postgres -d postgres -f cron-jobs.sql",
  "",
];

for (const row of rows) {
  const [name, schedule, command] = row.split("\t");
  if (!name) continue;
  out.push(`SELECT cron.schedule('${name}', '${schedule}', $cmd$${command}$cmd$);`);
}

const outFile = "/mnt/backups/cron-jobs.sql";
await Deno.writeTextFile(outFile, out.join("\n"));
console.log(`✅ Exported ${rows.length} cron jobs → ${outFile}`);
console.log("⚠️  Edit file để thay URL functions từ *.supabase.co → https://api.flowa.one");
