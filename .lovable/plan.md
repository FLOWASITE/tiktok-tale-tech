

# Bổ sung card Ảnh AI & Video vào Dashboard Stats

## Thay đổi

Hiện tại `DashboardStats` có 4 card: Kịch bản Video, Carousel, Nội dung đa kênh, Brand Templates. Cần thêm 2 card:
- **Ảnh AI**: Đếm từ `channel_image_history` (org scope)
- **Video AI**: Hiển thị "Soon" badge, giá trị = 0

## Kế hoạch

### 1. `src/components/DashboardStats.tsx`
- Mở rộng `StatsData` thêm `aiImages: number` và `aiVideos: number`
- Thêm 2 config entries:
  - `aiImages`: icon `Wand2`, gradient teal, key `statsAiImages`
  - `aiVideos`: icon `Video`, gradient indigo, key `statsAiVideos`, thêm flag `comingSoon: true`
- Card có `comingSoon` sẽ hiển thị badge "Soon" thay vì trend percentage
- Grid chuyển thành `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` cho 6 card

### 2. `src/pages/Dashboard.tsx`
- Fetch count ảnh AI từ `channel_image_history` với `organization_id` filter (dùng `supabase.from('channel_image_history').select('id', { count: 'exact', head: true })`)
- Truyền `aiImages` và `aiVideos: 0` vào stats

### 3. `src/i18n/locales/vi.json` & `en.json`
- Thêm keys: `statsAiImages` = "Ảnh AI" / "AI Images", `statsAiVideos` = "Video AI" / "AI Videos"

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/DashboardStats.tsx` | Thêm 2 card, cập nhật grid 6 cột |
| `src/pages/Dashboard.tsx` | Fetch AI image count, truyền vào stats |
| `src/i18n/locales/vi.json` | Thêm 2 keys |
| `src/i18n/locales/en.json` | Thêm 2 keys |

