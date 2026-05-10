## Mục tiêu
Cho admin tự đánh dấu ngành nào là "Phổ biến" (hiện ở section đầu của `IndustrySelectionDialog`), thay vì hardcode 8 mã ngành trong frontend.

Hiện tại: `src/components/brand/IndustrySelectionDialog.tsx:76` hardcode `POPULAR_CODES = ['ecommerce','fnb','healthcare',...]` → admin không tự đổi được, không theo thị trường thực tế.

## Thay đổi

### 1. Database (1 migration mới)
Thêm 2 cột vào `public.industry_global_packs`:
- `is_popular boolean NOT NULL DEFAULT false` — flag đánh dấu ngành phổ biến
- `popular_sort_order integer` — thứ tự hiển thị trong section "Phổ biến" (NULL = cuối)

Index: `CREATE INDEX idx_industry_packs_popular ON industry_global_packs(is_popular, popular_sort_order) WHERE is_popular = true;`

Backfill: set `is_popular = true` cho 8 mã hiện tại (`ecommerce, fnb, healthcare, realestate, it, fashion, beauty, education`) với `popular_sort_order` 1–8 để giữ behavior cũ.

RLS: giữ policy hiện tại (public read, admin write — đã có sẵn).

### 2. Admin UI (`src/components/admin/GlobalPacksTable.tsx` + `AdminIndustryPacks.tsx`)
- Thêm cột **"Phổ biến"** trong bảng: hiện `Switch` toggle + input số nhỏ cho `popular_sort_order` (chỉ hiện khi đã bật).
- Bulk action: nút "Đánh dấu phổ biến" / "Bỏ phổ biến" trên các row selected.
- Hiển thị badge ⭐ ở cột tên khi `is_popular = true`.
- Mutation: update `industry_global_packs` qua Supabase client (đã có pattern `is_active` toggle).

### 3. Frontend dialog (`src/components/brand/IndustrySelectionDialog.tsx`)
- Bỏ const `POPULAR_CODES`.
- `useGlobalPacksForBrandSelection` đã trả pack list — extend hook để select thêm `is_popular, popular_sort_order` từ DB.
- Logic `popular = packs.filter(p => p.isPopular).sort(by popular_sort_order)` thay cho filter theo array hardcode.
- Giữ nguyên render UI section "Phổ biến" (mobile + desktop + sidebar count badge).

### 4. Hook (`src/hooks/useGlobalPacksForBrandSelection.ts`)
Thêm 2 field vào select query và map ra type: `isPopular: boolean`, `popularSortOrder: number | null`.

## File touch
- 1 migration mới (schema + backfill)
- `src/hooks/useGlobalPacksForBrandSelection.ts`
- `src/components/admin/GlobalPacksTable.tsx`
- `src/pages/AdminIndustryPacks.tsx` (nếu cần thêm filter "chỉ phổ biến")
- `src/components/brand/IndustrySelectionDialog.tsx`

## Out of scope
- Không đổi UI section "Đã dùng gần đây" / "AI gợi ý".
- Không thêm i18n translation cho tên ngành phổ biến (đã dùng `industry_pack_translations`).
- Không tracking analytics "lượt chọn" (có thể làm sau để auto-suggest popular).

## Verify
- Admin bật toggle "Phổ biến" cho ngành X → reload `BrandCreate` → ngành X xuất hiện trong section "Phổ biến" theo `popular_sort_order`.
- Bỏ toggle → ngành biến mất khỏi section nhưng vẫn còn trong "Tất cả danh mục".
- Backfill: behavior trước migration = sau migration (8 ngành cũ vẫn ở vị trí 1–8).