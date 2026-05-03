## Mục tiêu
Bỏ yêu cầu nhập seed thủ công. Khi bấm **Run research**, hệ thống **tự suy ra seed** từ brand đang chọn (content pillars + keywords + industry + audience + website), rồi chạy pipeline AI Research v2 như cũ. Người dùng vẫn có thể mở "Tuỳ chỉnh nâng cao" để override seed/competitor nếu muốn.

---

## 1. UX mới — `KeywordResearchLabTab.tsx`

**Default view (gọn)**:
- Hiển thị **brand context card** thay cho ô seed:
  - Badge `Context: {brand_name}`
  - Tóm tắt: "Sẽ research dựa trên: 3 pillars · ngành {industry} · audience {target_audience}"
  - Chip danh sách seed sẽ dùng (preview readonly, derived từ brand) — user thấy minh bạch
- Nút chính: **`Run research`** (luôn enabled khi có brand)
- Nếu **chưa có brand** → hiển thị empty state + CTA "Chọn brand" (link `/brand`)
- Nếu brand **không có pillars** → fallback: dùng `brand_name` + `industry` làm seed, hiện hint "Brand chưa có content pillars — research sẽ generic. Cấu hình pillars để chính xác hơn."

**Advanced toggle** (collapsed, accordion):
- "Tuỳ chỉnh nâng cao (override)" → mở ra:
  - Textarea seeds (override) — placeholder = seeds auto
  - Textarea competitor URLs
  - Preset chips
  - Limit input

**Logic seed derivation** (`useMemo`):
```
1. Lấy top 5 pillars (sort theo weight) → mỗi pillar: ưu tiên keywords[0], fallback name
2. Nếu < 3 seed → bổ sung: brand_name + " " + industry, "{industry} là gì", "cách chọn {industry}"
3. Dedupe + lowercase + trim, cap 5
```

User override (nếu có nhập) sẽ thắng auto-derivation.

---

## 2. Edge function — `keyword-research-v2/index.ts`

**Thay đổi nhỏ** (BE đã nhận seeds từ FE rồi):
- Khi `seeds` rỗng/missing nhưng có `brandTemplateId`:
  - Server-side derive seeds từ `brand_templates` (cùng logic FE) → dùng làm seed
  - Tránh case FE bug → vẫn chạy được
- Bổ sung **`brand_website` scrape** (1 URL): nếu brand có `website_url`, auto add vào `competitorUrls` (không tính vào limit 3) → AI lấy được nội dung thực của brand để sinh keyword sát hơn.
- SSE `progress` 10%: "Đang phân tích brand «{name}» để tự suy seed..."

---

## 3. Hint khi đang dùng auto seeds

- Trong panel "Seed mở rộng" hiện 2 nhóm chip với label rõ:
  - **"Seed từ brand"** (màu primary nhạt) — derived seeds
  - **"Seed mở rộng"** (muted) — Autocomplete + PAA như cũ

---

## 4. Files thay đổi

- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`:
  - Tách `deriveBrandSeeds(brand)` helper
  - Default UI: brand context card + auto seed chips + Run button
  - Advanced accordion (shadcn `Collapsible` hoặc `Accordion`) chứa textarea seed/competitor + preset + limit
  - Bỏ requirement `!seedsText.trim()` disable button → enable khi có brand HOẶC seeds
  - Submit body: `seeds = userOverride.length > 0 ? userOverride : autoSeeds`

- `supabase/functions/keyword-research-v2/index.ts`:
  - Nếu `seeds.length === 0` và có brand → fetch brand → derive seeds (top pillars)
  - Auto-include `website_url` vào scrape list (không trừ vào max 3 user URLs)
  - Emit progress message mới

- `.lovable/memory/features/seo/research-lab-v2-vn.md`:
  - Ghi chú: auto-seed mode mặc định, manual override qua advanced toggle, server-side fallback seed derivation, brand website auto-scrape

---

## 5. QA

1. Vào tab Discover với brand có pillars → thấy chip seed auto + Run button enabled, không có ô textarea bắt buộc.
2. Bấm Run → SSE chạy bình thường, keyword sinh ra bám pillars.
3. Mở "Tuỳ chỉnh nâng cao" → nhập 2 seed thủ công → Run → BE nhận đúng 2 seed user.
4. Brand không có pillars → hint xuất hiện, vẫn Run được với fallback seed (brand_name + industry).
5. Brand có `website_url` → log scrape có URL website, AI prompt có nội dung từ brand site.
6. Không chọn brand → empty state + CTA, không cho Run.
