## Keyword Difficulty + SERP Intent Enrichment

Bổ sung **KD score chuẩn hoá**, **SERP features** (PAA, Featured Snippet, Video, Shopping...) và **intent re-classify** cho keyword đã có. Một edge function chạy theo batch, có UI trigger trong Explorer.

### Why
Hiện `seo_keywords.difficulty` mặc định 50, `serp_features` rỗng `[]`, `intent` chỉ heuristic từ Research Lab lúc tạo. Sau vài tuần dữ liệu lệch:
- Không lọc được "easy wins" (KD thấp + volume cao)
- Không biết keyword nào có PAA/snippet để target featured
- Intent gán sai → assign nhầm landing page/funnel

### Approach

**1. Edge function `enrich-keyword-serp`** (Deno, batch 1-50 keyword/lần)
- Input: `{ keywordIds: string[], organizationId }`
- Cho mỗi keyword: gọi **Firecrawl `/v2/search`** với `query=keyword`, `limit=10`, `country=VN`, `lang=vi`
- Parse 10 SERP results → trích:
  - `serp_features`: detect PAA, featured snippet, video carousel, shopping, local pack, news, image pack (heuristic theo title/url/structured fields Firecrawl trả)
  - `kd_signals`: tính KD 0-100 dựa trên (avg domain authority proxy: số kết quả từ top domains như facebook, youtube, wiki, .gov, .edu) + mức cạnh tranh title length & exact-match
  - `intent`: gọi Lovable AI Gateway (`google/gemini-3-flash-preview`) tool-call structured: input top 5 titles+snippets, output 1 trong 4 intent enum
- Update `seo_keywords` SET difficulty, serp_features (jsonb), intent, top_competitors (top 3 domains)
- Track job qua bảng mới `keyword_enrichment_jobs` (id, org, status, total, done, errors[], created_at)
- Background persistence: `EdgeRuntime.waitUntil` để tiếp tục dù client disconnect

**2. UI trong `KeywordExplorerTab.tsx`**
- Nút "Enrich SERP" trong bulk action bar (xuất hiện khi chọn ≥1 keyword) → POST với selectedIds
- Toast "Đang enrich N keyword (1-2 phút)..."
- Polling job status mỗi 3s, hiện progress bar inline ở action bar
- Sau khi xong → invalidate `seo-keywords` queries → row tự cập nhật KD/intent/serp badge

**3. Hiển thị SERP features**
- Thêm cột nhỏ icon row trong bảng Explorer (sau cột Funnel): icon nhỏ cho PAA (?), Snippet (★), Video (▶), Shopping ($), Local (📍). Tooltip liệt kê.
- Hoặc collapse vào popover khi nhiều — quyết định lúc build.

**4. Connector Firecrawl**
- Project chưa có `FIRECRAWL_API_KEY`. Sẽ yêu cầu connect Firecrawl connector trước khi deploy edge function.
- Fallback: nếu không có key, edge function chỉ chạy intent re-classify bằng AI (không có SERP data).

### Schema change

```sql
-- New table
CREATE TABLE keyword_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|running|done|failed
  total int NOT NULL DEFAULT 0,
  done int NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE keyword_enrichment_jobs ENABLE ROW LEVEL SECURITY;
-- Org members CRUD policy theo organization_id (giống các bảng khác)
```

Không thay đổi cột của `seo_keywords` (đã có sẵn `difficulty`, `serp_features`, `intent`, `top_competitors`).

### Files

**Tạo**
- `supabase/functions/enrich-keyword-serp/index.ts`
- `src/hooks/useKeywordEnrichment.ts` (mutation + job polling)
- Migration: `keyword_enrichment_jobs` table + RLS

**Sửa**
- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` — nút "Enrich SERP" trong bulk bar + cột SERP features icons
- `supabase/config.toml` — entry function (default verify_jwt=true)

**Không đổi:** schema `seo_keywords`, các tab Overview/Pillars.

### Risk / cost
- Firecrawl: 1 search ≈ 1 credit. 50 keyword/batch = 50 credits.
- AI intent classify: Gemini Flash, ~200 tokens/keyword, rất rẻ.
- Rate limit: throttle 5 concurrent requests trong edge function tránh 429 Firecrawl.

### Out of scope (hoãn)
- Auto-schedule enrich định kỳ (cron)
- KD score dùng Ahrefs/Semrush API thật (cần key trả phí riêng)
- Re-enrich tự động khi keyword cũ >30 ngày

Approve để tôi triển khai (sẽ hỏi connect Firecrawl nếu chưa có).