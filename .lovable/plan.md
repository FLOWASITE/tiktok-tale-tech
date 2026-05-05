# Hoàn thiện UI Quản lý nhân vật

## Mục tiêu
Biến `CharacterProfileManager` (đang nhồi 856 dòng trong 1 dialog nhỏ tại VideoStudio) thành hệ thống quản lý nhân vật chuyên nghiệp: page riêng, drawer detail, form đa tab có validation, bulk actions.

## Cấu trúc mới

```text
/characters (route mới)
 ├─ Header: search + filter brand/gender/age + sort + view toggle (grid/list)
 ├─ Bulk action bar (xuất hiện khi chọn ≥1)
 ├─ Grid card lớn (ảnh ref to, badges, hover actions)
 └─ Empty / Loading / Error states

CharacterDetailSheet (Sheet phải, w=540)
 ├─ Hero: ảnh chính + tên + brand badge
 ├─ Gallery ảnh ref (grid 3 cột, click zoom)
 ├─ Tabs nội bộ: Tổng quan / Voice / Lịch sử dùng
 └─ Action: Sửa, Nhân bản, Xoá, Copy prompt

CharacterFormSheet (Sheet phải, w=600) — thay Dialog cũ
 └─ Tabs: Cơ bản | Ngoại hình | Ảnh tham chiếu | Voice
    ├─ react-hook-form + zod resolver
    ├─ Inline error, char count, autosave draft (localStorage)
    └─ Footer dính: progress completeness + Lưu/Huỷ
```

## Files thay đổi

**Mới**
- `src/pages/CharactersPage.tsx` — page wrapper, header, filter bar
- `src/components/characters/CharacterGrid.tsx` — grid + card với checkbox
- `src/components/characters/CharacterCard.tsx` — card đẹp hơn (ảnh 16:10, badges)
- `src/components/characters/CharacterDetailSheet.tsx` — Sheet xem chi tiết
- `src/components/characters/CharacterFormSheet.tsx` — Sheet form 4 tab
- `src/components/characters/CharacterFilters.tsx` — search + filter chips
- `src/components/characters/CharacterBulkBar.tsx` — bulk delete/đổi brand/export
- `src/components/characters/AIBulkGenerateSheet.tsx` — tách dialog AI hiện tại
- `src/lib/characterSchema.ts` — zod schema
- `src/i18n/locales/{vi,en,th}.json` — keys mới `characters.*`

**Sửa**
- `src/app/routes.tsx` — thêm route `/characters` (ProtectedRoute + AppLayout)
- `src/pages/VideoStudioPage.tsx` — thay `<CharacterProfileManager />` bằng phiên bản gọn (CharacterPickerStrip) + nút "Mở trang nhân vật"
- `src/components/video/CharacterProfileManager.tsx` — chuyển thành thin wrapper re-export hoặc xoá sau migration
- Sidebar/Nav (file điều hướng app) — thêm mục "Nhân vật"

## Form validation (zod)
```ts
characterSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc').max(60),
  description: z.string().max(500).optional(),
  wardrobe: z.string().max(200).optional(),
  appearance: z.object({
    gender: z.enum([...]).optional(),
    age_range: z.enum([...]).optional(),
    hair: z.string().max(50).optional(),
    skin_tone: z.string().max(50).optional(),
    distinctive_features: z.string().max(200).optional(),
  }),
  reference_image_url: z.string().url().optional().or(z.literal('')),
  reference_images: z.array(z.object({ url: z.string().url(), label: z.enum([...]) })).max(5),
  default_voice_id: z.string().max(100).optional(),
  default_voice_provider: z.enum(['elevenlabs','google','openai','lovable','']).optional(),
  brand_template_id: z.string().uuid().nullable(),
})
```

## Bulk actions
- Checkbox trên mỗi card → state `selectedIds: Set<string>`
- Bulk bar nổi đáy: **Xoá**, **Đổi brand** (Select), **Nhân bản sang brand khác**, **Export JSON**
- Confirm dialog cho Xoá hàng loạt

## UX nâng cao
- **Completeness ring** trên card: % field đã điền (tên, ảnh, ngoại hình, voice) → giúp user thấy nhân vật nào còn thiếu
- **Autosave draft** form vào localStorage `character-draft-{id|new}` — khôi phục khi mở lại
- **Keyboard**: `⌘K` focus search, `N` new, `Esc` đóng sheet
- **Skeleton** loading thay spinner
- **Toast** chi tiết hơn (tên nhân vật trong message)
- **Empty state** có CTA AI generate nổi bật
- **Cross-brand badge** rõ ràng + tooltip "Nhân vật của brand X, đang xem brand Y"
- **Soft Luxury**: giữ neutral gray, ring `ring-1 ring-border/50`, rounded-2xl, không emoji (dùng lucide icons)

## Migration & tương thích
- `useCharacterProfiles` hook giữ nguyên — không cần migration DB
- VideoStudio vẫn dùng `MultiCharacterPicker` để pick nhân vật khi tạo scene (không đổi)
- Link "Quản lý nhân vật →" trong Picker mở `/characters` ở tab mới hoặc inline drawer

## Phân chia thực thi
1. Schema + types + route skeleton + sidebar entry
2. CharacterCard + CharacterGrid + CharactersPage + Filters
3. CharacterFormSheet (4 tabs + zod + autosave)
4. CharacterDetailSheet + gallery
5. Bulk bar + bulk actions
6. Migrate VideoStudio dùng picker gọn + xoá manager cũ
7. i18n keys + smoke test

## Out of scope
- Không đổi schema DB `character_profiles`
- Không đổi edge functions `generate-character` / `analyze-character-image`
- Không thêm import CSV (ghi chú lại để làm sau nếu cần)
