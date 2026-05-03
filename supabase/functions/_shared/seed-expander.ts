// Seed expansion: Google Autocomplete + People Also Ask (regex từ SERP titles)
// Free, không cần API key. Dùng cho keyword-research-v2.

const QUESTION_RE = /^(làm sao|cách|tại sao|có nên|là gì|khi nào|ở đâu|nên|how|why|what|when|where|should)\b/i;

const memCache = new Map<string, { data: string[]; exp: number }>();

async function googleAutocomplete(seed: string, hl = "vi", gl = "vn"): Promise<string[]> {
  const key = `ac:${seed}:${hl}:${gl}`;
  const hit = memCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seed)}&hl=${hl}&gl=${gl}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const arr: string[] = Array.isArray(data?.[1]) ? data[1] : [];
    const out = arr.slice(0, 5).map((s) => String(s).trim()).filter(Boolean);
    memCache.set(key, { data: out, exp: Date.now() + 24 * 3600_000 });
    return out;
  } catch (e) {
    console.warn("[seed-expander] autocomplete failed:", (e as Error).message);
    return [];
  }
}

function extractPAA(serpResults: { title: string; description: string }[]): string[] {
  const out: string[] = [];
  for (const r of serpResults) {
    const candidates = [r.title, r.description].filter(Boolean);
    for (const c of candidates) {
      // tách thành câu, kiểm tra mở đầu = từ hỏi
      for (const sentence of String(c).split(/[.!?…\n]+/)) {
        const t = sentence.trim().toLowerCase().replace(/[?:]+$/, "");
        if (t.length < 8 || t.length > 80) continue;
        if (QUESTION_RE.test(t)) {
          out.push(t);
          break;
        }
      }
    }
  }
  return [...new Set(out)].slice(0, 5);
}

/**
 * Expand seeds: cho mỗi seed lấy top-3 Autocomplete + PAA từ SERP đã có.
 * Trả về list mới (không bao gồm seed gốc), dedupe.
 */
export async function expandSeeds(
  seeds: string[],
  serpGround: Record<string, { title: string; description: string }[]>,
  locale = "vi"
): Promise<string[]> {
  const hl = locale.startsWith("vi") ? "vi" : "en";
  const gl = locale.startsWith("vi") ? "vn" : "us";

  const acLists = await Promise.all(seeds.map((s) => googleAutocomplete(s, hl, gl)));
  const ac = acLists.flat();

  const paa: string[] = [];
  for (const s of seeds) {
    const results = serpGround[s] || [];
    paa.push(...extractPAA(results));
  }

  const seedSet = new Set(seeds.map((s) => s.toLowerCase().trim()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cand of [...ac, ...paa]) {
    const key = cand.toLowerCase().trim();
    if (!key || seedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(cand);
    if (out.length >= 10) break;
  }
  return out;
}
