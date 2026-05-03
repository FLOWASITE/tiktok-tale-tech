## Mục tiêu

Đưa Flowa từ ~60% lên ~90% playbook keyword research chuẩn SEO, bằng 5 bổ sung tập trung vào các gap rõ rệt nhất.

---

## Gap 1 — Brand Domination Preset (1.1)

**Bối cảnh:** Hiện AI sinh keyword đa năng, không có job riêng đảm bảo phủ 100% SERP cho brand name.

**Thay đổi:**
- Thêm preset mới `brand_domination` vào `keyword-research-v2/index.ts`.
- Generate cứng (không gọi AI) các pattern: `<brand>`, `<brand> là gì`, `<brand> giá`, `<brand> review`, `<brand> đánh giá`, `<brand> login`, `<brand> đăng nhập`, `<brand> miễn phí`, `<brand> alternatives`, `<brand> vs <competitor>` (loop qua `main_competitors`).
- Sinh thêm biến thể: viết liền/cách, có dấu/không dấu, lowercase.
- Tag `intent="navigational"` cho login/đăng nhập, `commercial` cho review/giá/vs.
- Vẫn chạy qua Google Suggest expand để bắt biến thể thật user gõ.

**File:** `supabase/functions/keyword-research-v2/index.ts`, `KeywordResearchLabTab.tsx` (thêm option preset).

---

## Gap 2 — Modifier Expander (3)

**Bối cảnh:** `seed-expander.ts` chỉ làm Google Suggest + PAA, thiếu modifier-based expansion.

**Thay đổi:**
- Thêm helper `expandWithModifiers(seeds)` trong `_shared/seed-expander.ts`.
- Modifier groups (VN + EN):
  - **Quality:** `tốt nhất`, `chất lượng`, `uy tín`, `top`
  - **Price:** `giá rẻ`, `miễn phí`, `bao nhiêu tiền`, `chi phí`
  - **Time:** `2026`, `mới nhất`, `hiện nay`
  - **Audience:** `cho người mới`, `cho doanh nghiệp`, `cho spa`, `cho startup`
  - **Format:** `hướng dẫn`, `cách dùng`, `review`
- Cap 8 modifier × N seed gốc = ~40 candidate, sau đó verify qua Google Suggest (chỉ giữ keyword có suggestion thật) để tránh keyword "ảo".

**File:** `supabase/functions/_shared/seed-expander.ts`, `keyword-research-v2/index.ts` (gọi helper).

---

## Gap 3 — Cannibalization Detector (6)

**Bối cảnh:** `seo_keywords.assigned_landing_page_id` đã có nhưng UI không cảnh báo khi nhiều keyword cùng target 1 URL hoặc 1 keyword chưa map.

**Thay đổi:**
- Thêm component `CannibalizationAlert.tsx` trong `KeywordExplorerTab`.
- Query group-by `assigned_landing_page_id` → đếm keyword/URL.
- Hiển thị 3 cảnh báo:
  - 🔴 **Cannibal:** URL có ≥3 primary keyword với cùng intent → đề xuất tách page hoặc gộp content.
  - 🟡 **Orphan:** Keyword priority ≥70 nhưng `assigned_landing_page_id IS NULL` → CTA "Tạo landing page".
  - 🟢 **Multi-target OK:** URL có nhiều keyword nhưng khác intent (TOFU info + BOFU transactional) → coi là healthy.
- Quy tắc 1 page = 1 primary keyword được enforce qua dropdown trong KeywordExplorer (dùng `LazyAssignSelect` hiện có, thêm warning inline khi conflict).

**File:** mới `src/components/admin/seo-keywords/CannibalizationAlert.tsx`, edit `KeywordExplorerTab.tsx`.

---

## Gap 4 — Funnel Health Check (7)

**Bối cảnh:** `IntentFunnelMatrix` chỉ hiển thị số, không score sức khỏe funnel.

**Thay đổi:**
- Thêm strip "Funnel Health" trên `OverviewTab`:
  - % TOFU / MOFU / BOFU trên tổng keyword pool.
  - Benchmark khuyến nghị: TOFU 50% / MOFU 30% / BOFU 20%.
  - Cảnh báo đỏ khi BOFU < 10% ("Traffic không ra tiền — thiếu keyword chuyển đổi").
  - Cảnh báo cam khi TOFU > 80% ("Top funnel quá nặng").
- CTA "Sinh thêm BOFU keyword" → mở Lab với preset `commercial_intent` + filter funnel.

**File:** `src/components/admin/seo-keywords/OverviewTab.tsx`, helper `src/lib/seo/funnelHealth.ts`.

---

## Gap 5 — Priority Score chuẩn SEO (4)

**Bối cảnh:** Công thức priority hiện đơn giản, thiếu component "Business Relevance × Intent".

**Thay đổi:**
- Cập nhật công thức trong `keyword-research-v2/index.ts` và migration SQL cho `seo_keywords.priority_score`:
  ```
  Priority = (brand_fit_score × intent_weight × log10(volume+10)) / sqrt(difficulty+1)
  
  intent_weight: transactional=4, commercial=3, navigational=2, informational=1
  ```
- Hiển thị breakdown trong `KeywordPreviewTable` tooltip: "70 (relevance) × 4 (BOFU) × 2.4 (vol) / 8 (KD) = 84".
- Thêm column "Why" giải thích ngắn gọn để user hiểu vì sao keyword này priority cao.

**File:** `supabase/functions/keyword-research-v2/index.ts`, `KeywordPreviewTable.tsx`, migration update column comment (optional).

---

## Files thay đổi (tổng)

- `supabase/functions/keyword-research-v2/index.ts` (preset brand_domination + modifier integration + new priority formula)
- `supabase/functions/_shared/seed-expander.ts` (modifier expander)
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (UI preset mới)
- `src/components/admin/seo-keywords/KeywordPreviewTable.tsx` (priority breakdown tooltip)
- `src/components/admin/seo-keywords/KeywordExplorerTab.tsx` (cannibal alert mount)
- `src/components/admin/seo-keywords/CannibalizationAlert.tsx` **(mới)**
- `src/components/admin/seo-keywords/OverviewTab.tsx` (funnel health strip)
- `src/lib/seo/funnelHealth.ts` **(mới)**
- `.lovable/memory/features/seo/research-lab-v2-vn.md` (cập nhật)

## Không cần migration
Tất cả formula tính client-side hoặc trong edge function; cột `priority_score` đã tồn tại.

## Edge cases
- Brand không có `main_competitors` → skip `vs <competitor>` pattern, chỉ sinh brand-only.
- Pool keyword < 20 → ẩn Funnel Health (chưa đủ dữ liệu).
- Modifier expander fail Google Suggest → fallback giữ candidate nguyên (không drop).
