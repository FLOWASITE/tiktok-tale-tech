## Mục tiêu
Giảm friction khi user chọn ngành nghề trong `IndustrySelectionDialog` — từ "duyệt 60+ ngành" thành "AI gợi ý đúng ngành + tìm nhanh + nhớ ngành đã dùng".

## 4 cải tiến

### 1. AI gợi ý ngành từ kết quả Brand Import
Khi user import xong website/fanpage, gọi edge function mới `suggest-industry` phân tích `name + description + content_summary + footer_info` → trả top 3 ngành phù hợp kèm `confidence %` và `reason` ngắn.

- Edge function `suggest-industry` (Gemini Flash, JSON tool-call output): nhận `{ brandText, language }`, fetch danh sách `industry_global_packs` (cache shared), trả `[{ packId, code, name, confidence, reason }]`.
- Trong `IndustrySelectionDialog` thêm prop `suggestedContext?: { brandText: string }`. Khi có context, render section **"AI gợi ý cho bạn"** ở trên cùng (3 card có badge ✨ + % match + lý do 1 dòng).
- `BrandCreate.tsx` truyền `suggestedContext` từ kết quả import vào dialog.

### 2. Tìm kiếm thông minh hơn
Hiện `IndustrySelectionDialog` chỉ match `name/shortName/code`. Mở rộng:

- Thêm bảng `industry_search_aliases` (nhẹ, seed sẵn): `pack_id`, `alias`, `lang`. Vd: pack `beauty` có alias `["thẩm mỹ","spa","làm đẹp","mỹ phẩm","skincare"]`; `fnb` có `["cà phê","nhà hàng","quán ăn","ẩm thực"]`.
- Hook `useGlobalPacksForBrandSelection` join thêm aliases.
- Logic search trong dialog: normalize bỏ dấu (Vietnamese diacritics) + match aliases + fuzzy đơn giản (Levenshtein ≤ 2 cho từ ≥ 4 ký tự) để bắt typo "thẩm my" → "thẩm mỹ".
- Highlight phần match trong tên hiển thị.

### 3. Recently used + Recommended
Thêm tracking ngành đã chọn:

- Cột `last_used_industry_pack_ids uuid[]` trên `organizations` (cap 5, mới nhất đầu) — update qua trigger khi `brand_templates.industry_template_id` thay đổi, hoặc gọi RPC `record_industry_use(pack_id)`.
- Trong dialog state default (chưa search/chưa chọn category) bổ sung 2 section đầu:
  - **"Đã dùng gần đây"** (nếu có ≥ 1) — lấy từ org.
  - **"Phổ biến"** (POPULAR_CODES hiện có).
  - Sau đó mới đến "Tất cả danh mục".

### 4. UX duyệt ngành rõ ràng hơn
Refactor layout desktop của dialog (mobile giữ pattern drawer hiện tại):

- **Sidebar trái**: list `industry_categories` (đã có table) + filter chip `B2B / B2C / Cả hai` (lấy từ `target_audience` của pack).
- **Khu giữa**: grid ngành theo category đang chọn (Core trên + Sub indent dưới với divider rõ).
- **Preview pane phải** (sticky, hiện khi hover/focus 1 pack):
  - Tên + short name + category
  - 3 compliance rules tiêu biểu
  - Top 5 forbidden terms
  - Brand voice tone (nếu có)
  - 1 ví dụ caption ngắn từ `industry_templates.metadata.sample_caption` (nếu thiếu → ẩn)
  - Nút "Chọn ngành này" rõ ràng
- Breadcrumb nhỏ: `Category › Core › Sub` khi đang ở deep level.

## Technical notes
- Database: 1 migration tạo `industry_search_aliases` + cột `last_used_industry_pack_ids` + RPC `record_industry_use`. RLS: aliases public read, last_used update qua RPC SECURITY DEFINER.
- Edge function: `supabase/functions/suggest-industry/index.ts` dùng `callAI()` shared, cache 24h theo hash(brandText), `verify_jwt = true`.
- Frontend: chỉ sửa `IndustrySelectionDialog.tsx` + `useGlobalPacksForBrandSelection.ts` + `BrandCreate.tsx`. Tạo helper `src/lib/industrySearch.ts` cho normalize + fuzzy.
- Không thay đổi schema `industry_global_packs/templates` (immutable theo project rule).
- Giữ Soft Luxury: neutral gray, không gradient mới ngoài badge "Hot" hiện có.

## Out of scope
- Không sửa logic compliance/brand voice cascade.
- Không thêm ngành mới vào `industry_global_packs` (đó là việc của admin).
- Không thay đổi mobile drawer flow lớn (chỉ áp dụng "Recently used" + smart search; preview pane chỉ desktop).

## Verify
- Import 1 website mỹ phẩm → suggest top 1 = `beauty` hoặc `cosmetics` với confidence ≥ 70%.
- Search "tham my" (không dấu, sai chính tả) → ra `beauty` / `cosmetics`.
- Tạo brand 2 lần với cùng ngành → lần 2 ngành đó hiện ở section "Đã dùng gần đây".
- Hover 1 pack trên desktop → preview pane hiện compliance rules trong < 200ms (data đã có sẵn từ hook).
