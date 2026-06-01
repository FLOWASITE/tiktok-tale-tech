
# Refine TikTok Composer — match screenshot native

Chỉ sửa `src/components/publishing/TikTokComposerDialog.tsx`. Không động logic publish, hook, edge function.

## So sánh với screenshot native

| Phần | Hiện tại (sai) | Native TikTok (đúng) |
|---|---|---|
| Header | Back + "Đăng bài" + "@username" giữa + "Nháp" góc phải | **Chỉ icon back `<`**, không title, không username, không nút Nháp |
| Caption placeholder | "Thêm mô tả, hashtag (#)..." | Không có placeholder text — chỉ caret nhấp nháy |
| Thumbnail | 72×96 ring + Play icon overlay giữa | ~96×128 bo nhẹ, có **badge "Xem trước"** góc trên + nút **"Sửa ảnh bìa"** chip mờ dưới đáy thumbnail |
| Hashtag / Mention | Inline text + icon + dấu separator dọc | **Pill rounded-full `bg-muted` cao 36px**, có gap-2 giữa 2 chip, không separator |
| Counter `0/4000` | Hiển thị inline cạnh toolbar | **Ẩn hoàn toàn** (native không show) |
| Row layout | Title 15px + summary 12px 2 dòng | **1 dòng duy nhất** — icon + title 16px, KHÔNG summary (trừ row "Thêm liên kết" có hint phải) |
| Row Privacy | "Ai có thể xem video này" + summary "Mọi người" | **Title chính là giá trị đang chọn**: "Ai cũng có thể xem bài đăng này" / "Bạn bè" / "Chỉ mình tôi" |
| Comment/Duet/Stitch | 3 flat row top-level | **Nằm trong "Tùy chọn khác"** collapsible — không lộ ở cấp gốc |
| Section "Music Usage" footnote | Khối text dài giữa rows | **Xoá** — native không có ở composer |
| Footer | 1 nút đỏ full-width | **2 pill rounded-full**: "Nháp" (icon hộp, bg muted, ~45% width) trái + "Đăng" (icon mũi tên-tròn, bg `#FE2C55`, ~50% width) phải, gap-3 |

## Thay đổi cụ thể

### 1. Header (px-2 h-12)
- Chỉ giữ icon back trái (`ArrowLeft`, h-10 w-10 ghost).
- Bỏ block title 2 dòng + bỏ nút "Nháp" góc phải.

### 2. Caption + thumbnail
- Textarea: bỏ `placeholder`, giữ `maxLength=4000`, min-h-[140px] để có chỗ trống.
- Thumbnail: `w-[96px] h-[128px] rounded-lg` floating top-right.
  - Pill nhỏ "Xem trước" góc trên (`absolute top-1 right-1 bg-black/55 text-white text-[10px] px-2 py-0.5 rounded-full`).
  - Bỏ Play icon giữa.
  - Chip "Sửa ảnh bìa" dưới đáy thumbnail (disabled / no-op, chỉ visual): `absolute inset-x-1 bottom-1 bg-black/55 text-white text-[10px] py-1 rounded-md text-center`.
- Bỏ counter `0/4000`.

### 3. Hashtag / Mention chips (gap-2, mt-3)
```tsx
<button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-muted text-[14px]">
  <Hash className="w-4 h-4" /> Hashtag
</button>
<button ...> <AtSign /> Nhắc đến </button>
```
Bỏ separator dọc.

### 4. Section rows — đơn giản hoá `SectionRow`
- Row chính: `h-14 px-4 flex items-center gap-3`, divider `border-b border-border/40`.
- `[icon 20px outline] [title text-[15px] font-normal flex-1] [optional right hint text-muted-foreground text-[13px]] [ChevronRight w-5]`.
- Bỏ subtitle 2 dòng. Chỉ row "Thêm liên kết" có right hint "Sản phẩm và nhiều hơn thế.".

### 5. Privacy row
- Title = `PRIVACY_META[currentPrivacy].nativeTitle`:
  - PUBLIC: "Ai cũng có thể xem bài đăng này"
  - MUTUAL: "Bạn bè"
  - FOLLOWER: "Người theo dõi"
  - SELF_ONLY: "Chỉ mình tôi"
- Icon: Globe2 (giữ icon theo selection).
- Khi expand → list full-width như cũ (giữ logic SELF_ONLY disabled khi Branded).

### 6. "Tùy chọn khác" → chứa toggles
- Bỏ 3 `FlatToggleRow` ở top-level.
- Đưa Comment / Duet / Stitch vào trong collapsible "Tùy chọn khác" (icon `Settings`/gear).
- Mỗi toggle bên trong vẫn là row 56px với switch phải.

### 7. Row "Chia sẻ với" (mới, optional)
- Row tĩnh dưới "Tùy chọn khác" — chỉ visual, click → no-op (để khớp screenshot). Icon `Share2`.
- Nếu thấy thừa, bỏ qua — giảm noise.

### 8. Bỏ Music Usage footnote khối lớn
- Chuyển thành 1 dòng text-[10px] text-muted-foreground căn giữa **ngay trên footer** (compact 1 dòng), giữ link để compliance.

### 9. Footer — 2 pill buttons
```tsx
<div className="px-4 py-3 flex items-center gap-3 border-t">
  <button className="flex-1 h-12 rounded-full bg-muted text-[15px] font-medium inline-flex items-center justify-center gap-2">
    <Archive className="w-4 h-4" /> Nháp
  </button>
  <button style={{backgroundColor: TIKTOK_RED}} className="flex-1 h-12 rounded-full text-white text-[15px] font-semibold inline-flex items-center justify-center gap-2">
    <ArrowUpCircle className="w-4 h-4" /> Đăng
  </button>
</div>
```
- Disabled state: opacity-50.

### 10. Icon set bổ sung
Thêm imports: `Settings`, `Share2`, `Archive`, `ArrowUpCircle`. Bỏ unused: `ArrowLeft` giữ, `Play` bỏ, `MessageCircle/Video/Scissors` chuyển vào trong collapsible.

## Verify

1. Mở `/video-studio` → Đăng ngay → TikTok.
2. So sánh side-by-side với screenshot native: header chỉ có back, thumbnail có "Xem trước" + "Sửa ảnh bìa", chips Hashtag/Nhắc đến là pill xám, rows 1-dòng, footer 2 pill (xám trái + đỏ phải).
3. Privacy row đổi title theo selection.
4. Comment/Duet/Stitch nằm trong "Tùy chọn khác" expand.
5. Branded + SELF_ONLY vẫn block đúng, không regress logic submit.
6. Test viewport 360 / 414 / 707 (current) — pill footer không tràn.
