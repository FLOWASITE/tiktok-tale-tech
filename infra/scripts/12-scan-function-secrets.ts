#!/usr/bin/env -S deno run --allow-read --allow-write
// =============================================================================
// 12-scan-function-secrets.ts
// Scan tất cả supabase/functions/*/index.ts tìm Deno.env.get(...) calls
// Output: infra/snapshots/functions-manifest.json
// =============================================================================

const root = new URL("../../supabase/functions/", import.meta.url).pathname;
const out = new URL("../snapshots/functions-manifest.json", import.meta.url).pathname;

const fns: Record<string, string[]> = {};
const secretRe = /Deno\.env\.get\(['"]([A-Z_][A-Z0-9_]+)['"]\)/g;

for await (const entry of Deno.readDir(root)) {
  if (!entry.isDirectory || entry.name.startsWith("_")) continue;
  const path = `${root}${entry.name}/index.ts`;
  try {
    const content = await Deno.readTextFile(path);
    const secrets = new Set<string>();
    for (const m of content.matchAll(secretRe)) secrets.add(m[1]);
    fns[entry.name] = [...secrets].sort();
  } catch { /* skip */ }
}

const allSecrets = [...new Set(Object.values(fns).flat())].sort();
const manifest = {
  generated_at: new Date().toISOString(),
  count: Object.keys(fns).length,
  all_secrets: allSecrets,
  functions: fns,
};
await Deno.writeTextFile(out, JSON.stringify(manifest, null, 2));
console.log(`✅ ${manifest.count} functions, ${allSecrets.length} unique secrets`);
console.log(`   → ${out}`);
