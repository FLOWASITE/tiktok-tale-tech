## Mục tiêu
Mỗi `brand_template_id` chỉ được có **tối đa 1 nhân vật** với `default_role = 'main'`. Khi user cố gán main thứ 2 → hiển thị cảnh báo rõ ràng (không crash bằng DB error thô).

## 1. Database — Partial Unique Index

Tạo migration mới:

```sql
-- Đảm bảo mỗi brand chỉ có tối đa 1 nhân vật chính
CREATE UNIQUE INDEX IF NOT EXISTS uniq_main_character_per_brand
  ON public.character_profiles (brand_template_id)
  WHERE default_role = 'main' AND brand_template_id IS NOT NULL;
```

Ghi chú: Index partial chỉ áp khi `default_role='main'` & có brand → nhân vật phụ không bị ảnh hưởng; nhân vật main không gắn brand cũng không bị giới hạn.

**Data cleanup trước khi tạo index** (chống fail nếu đã có data trùng):
```sql
-- Giữ nhân vật main cũ nhất, các main còn lại đổi thành supporting
WITH ranked AS (
  SELECT id, brand_template_id,
    ROW_NUMBER() OVER (PARTITION BY brand_template_id ORDER BY created_at ASC) AS rn
  FROM public.character_profiles
  WHERE default_role = 'main' AND brand_template_id IS NOT NULL
)
UPDATE public.character_profiles cp
SET default_role = 'supporting'
FROM ranked r
WHERE cp.id = r.id AND r.rn > 1;
```

## 2. Hook helper — `useCharacterProfiles.ts`

Thêm helper trả về main character hiện tại của 1 brand:
```ts
export function findMainCharacterForBrand(
  profiles: CharacterProfile[],
  brandId: string | null,
  excludeId?: string,
): CharacterProfile | null
```

Bắt lỗi unique violation (Postgres code `23505`) trong `createProfile` & `updateProfile` → toast tiếng Việt: *"Brand này đã có nhân vật chính ('{name}'). Vui lòng chuyển nhân vật cũ sang vai phụ trước."*

## 3. UI Cảnh báo — `CharacterFormSheet.tsx`

Khi user chọn `default_role = 'main'` + `brand_template_id` đã có main khác:
- Hiện `<Alert variant="warning">` ngay dưới radio Vai mặc định:
  > ⚠️ Brand **{brandName}** đã có nhân vật chính: **{existingMainName}**. Lưu sẽ thất bại — hãy chuyển nhân vật đó sang "Vai phụ" trước, hoặc giữ nhân vật mới này ở vai phụ.
- Disable nút Save khi conflict, kèm tooltip giải thích.
- Reactive theo cả 2 field (`default_role`, `brand_template_id`) qua `form.watch`.

## 4. UI Cảnh báo — `AIBulkGenerateSheet.tsx`

- Khi `defaultRole === 'main'` và brand đã có main: disable segment "Vai chính", show inline hint dưới segment:
  > Brand đã có nhân vật chính ({existingMainName}). Bulk tạo sẽ ở vai phụ.
- Auto-fallback `defaultRole = 'supporting'` nếu user vẫn submit (defensive).
- Khi save selected: nếu chọn nhiều và `defaultRole='main'` → chỉ nhân vật **đầu tiên** được set `main`, các nhân vật còn lại auto `supporting` + toast info.

## 5. UI hint — `MultiCharacterPicker.tsx` (nhỏ)

Không thay đổi logic; auto-pin main hiện tại đã đúng (chỉ có 1 main/brand sau khi enforce).

## Files thay đổi
- ➕ `supabase/migrations/<new>.sql` — cleanup + partial unique index
- ✏️ `src/hooks/useCharacterProfiles.ts` — helper + bắt lỗi 23505
- ✏️ `src/components/characters/CharacterFormSheet.tsx` — Alert + disable save
- ✏️ `src/components/characters/AIBulkGenerateSheet.tsx` — disable segment + auto-fallback

## Không thay đổi
- Schema `default_role` enum, RLS, edge functions, video/script generation flow.
