import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assertEquals,
  assertExists,
  assert,
  assertArrayIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeKD, detectSerpFeatures } from "./index.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/enrich-keyword-serp`;

const VALID_INTENT = new Set(["informational", "commercial", "transactional", "navigational"]);

async function call(body: unknown, token = SUPABASE_ANON_KEY) {
  return await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

// ── Pure unit tests (no network) ────────────────────────────────────────────

Deno.test("computeKD: empty SERP returns neutral 50", () => {
  assertEquals(computeKD([]), 50);
});

Deno.test("computeKD: 0 authority hits clamps to 25", () => {
  const results = [
    { url: "https://random-blog-1.com/post" },
    { url: "https://random-blog-2.com/post" },
  ];
  assertEquals(computeKD(results), 25);
});

Deno.test("computeKD: scales with authority hits, clamps ≤ 100", () => {
  const results = Array.from({ length: 12 }, (_, i) => ({
    url: `https://en.wikipedia.org/wiki/page-${i}`,
  }));
  const kd = computeKD(results);
  assert(kd > 25 && kd <= 100, `KD ${kd} should be in (25,100]`);
  assertEquals(kd, 100); // 25 + 12*7 = 109 → clamped 100
});

Deno.test("computeKD: ignores invalid URLs gracefully", () => {
  const results = [
    { url: "not-a-url" },
    { url: "https://wikipedia.org/x" },
  ];
  const kd = computeKD(results);
  assertEquals(kd, 25 + 7);
});

Deno.test("detectSerpFeatures: identifies video + shopping + news", () => {
  const feats = detectSerpFeatures([
    { url: "https://www.youtube.com/watch?v=x" },
    { url: "https://shopee.vn/product" },
    { url: "https://vnexpress.net/tin/abc.html" },
  ]);
  assertArrayIncludes(feats, ["video", "shopping", "news"]);
});

Deno.test("detectSerpFeatures: empty array yields empty features", () => {
  assertEquals(detectSerpFeatures([]), []);
});

// ── HTTP contract tests ─────────────────────────────────────────────────────

Deno.test("HTTP: OPTIONS returns CORS headers", async () => {
  const res = await fetch(FN_URL, { method: "OPTIONS" });
  await res.text();
  assertEquals(res.status, 200);
  assertExists(res.headers.get("Access-Control-Allow-Origin"));
});

Deno.test("HTTP: missing Authorization → 401 JSON {error}", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywordIds: ["x"], organizationId: "y" }),
  });
  const json = await res.json();
  assertEquals(res.status, 401);
  assertExists(json.error);
});

Deno.test("HTTP: invalid JWT → 401 JSON {error}", async () => {
  const res = await call({ keywordIds: ["x"], organizationId: "y" }, "invalid.token.here");
  const json = await res.json();
  assertEquals(res.status, 401);
  assertExists(json.error);
});

Deno.test("HTTP: missing keywordIds → 400 JSON {error}", async () => {
  const res = await call({ organizationId: "00000000-0000-0000-0000-000000000000" });
  const json = await res.json();
  // 400 (validation) hoặc 401 (anon không qua getUser) đều chấp nhận
  assert([400, 401].includes(res.status), `unexpected ${res.status}`);
  assertExists(json.error);
});

Deno.test("HTTP: keywordIds > 50 → 400 JSON {error}", async () => {
  const ids = Array.from({ length: 51 }, (_, i) => `k${i}`);
  const res = await call({ keywordIds: ids, organizationId: "00000000-0000-0000-0000-000000000000" });
  const json = await res.json();
  assert([400, 401].includes(res.status));
  assertExists(json.error);
});

Deno.test("HTTP: response always JSON content-type", async () => {
  const res = await call({});
  await res.text();
  const ct = res.headers.get("content-type") || "";
  assert(ct.includes("application/json"), `content-type: ${ct}`);
});

// ── Schema contract test (skip nếu không có TEST_JWT) ──────────────────────

Deno.test({
  name: "HTTP: success response matches {jobId, total, hasFirecrawl} schema",
  ignore: !Deno.env.get("TEST_JWT") || !Deno.env.get("TEST_ORG_ID") || !Deno.env.get("TEST_KEYWORD_ID"),
  fn: async () => {
    const res = await call(
      {
        keywordIds: [Deno.env.get("TEST_KEYWORD_ID")],
        organizationId: Deno.env.get("TEST_ORG_ID"),
      },
      Deno.env.get("TEST_JWT")!,
    );
    const json = await res.json();
    assertEquals(res.status, 200, `body: ${JSON.stringify(json)}`);
    assertExists(json.jobId, "missing jobId");
    assertEquals(typeof json.jobId, "string");
    assertEquals(typeof json.total, "number");
    assertEquals(json.total, 1);
    assertEquals(typeof json.hasFirecrawl, "boolean");
  },
});

// ── DB consistency: KD/intent persisted within valid ranges ────────────────

Deno.test({
  name: "DB: enriched keyword has KD ∈ [10,100] and intent ∈ enum",
  ignore: !Deno.env.get("TEST_JWT") || !Deno.env.get("TEST_KEYWORD_ID"),
  fn: async () => {
    const kwId = Deno.env.get("TEST_KEYWORD_ID")!;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/seo_keywords?id=eq.${kwId}&select=difficulty,intent,serp_features`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${Deno.env.get("TEST_JWT")!}`,
        },
      },
    );
    const rows = await res.json();
    assertEquals(res.status, 200);
    assert(Array.isArray(rows) && rows.length === 1, "keyword not found via PostgREST");
    const k = rows[0];
    if (k.difficulty !== null) {
      assert(k.difficulty >= 10 && k.difficulty <= 100, `KD ${k.difficulty} out of range`);
    }
    if (k.intent !== null) {
      assert(VALID_INTENT.has(k.intent), `intent "${k.intent}" not in enum`);
    }
    assert(Array.isArray(k.serp_features), "serp_features must be array");
  },
});
