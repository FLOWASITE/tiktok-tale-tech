## Tổng quan
Sau khi rà toàn bộ pipeline Pinterest (DB → generate edge function → image config → mockup → viewer), phát hiện **3 nhóm vấn đề nghiêm trọng** khiến Pinterest hoạt động sai chuẩn so với platform thật. Plan này chuẩn hóa cả nội dung (Pin Title + Pin Description) và ảnh (aspect ratio 2:3) đúng spec Pinterest 2026.

## Vấn đề phát hiện

### 1. Bug nghiêm trọng — Pinterest content không hiển thị ở viewer
Hàm `getContentForChannel()` trong **3 file** đều thiếu case `pinterest`, nên dù AI sinh ra `pinterest_content` + `pinterest_title` lưu vào DB, viewer/edit/export đều trả `null` → user thấy trống.
- `src/components/MultiChannelViewer.tsx` (dòng 249–267)
- `src/components/viewer/EnhancedExportMenu.tsx` (dòng 28–44)
- `src/components/viewer/ChannelComparison.tsx` (dòng 22+)

### 2. Ảnh Pinterest sai chuẩn aspect ratio
- `CHANNEL_OPTIMAL_ASPECT_RATIO.pinterest = '4:5'` (clone Instagram)
- Pinterest official khuyến nghị **2:3 (1000×1500px)** — đây là standard Pin size; mockup `PinterestMockup` đã dùng đúng `aspect-[2/3]` nhưng generator lại sinh 4:5 → ảnh bị crop khi publish.
- `channelImageConfig.pinterest.size = '1080x1350'` cũng sai → đổi sang `1000x1500`.

### 3. Prompt + style đang clone Instagram thay vì Pinterest-native
File `src/config/channelImageConfig.ts` (dòng 191–214):
- `style: 'aesthetically pleasing, visually striking, Instagram-worthy'`
- `composition: 'grid-friendly'` (Pinterest không có grid 3x3)
- `visualDirections` nhắc "Instagram color palettes", "3x3 grid feed" — sai context.

Pinterest-native phải nhấn: **vertical infographic, text overlay rõ ràng, search-discovery (SEO Pin), how-to/listicle aesthetic, idea-pin style, save-worthy**.

### 4. Label hiển thị sai trong CSS config
`BASE_CHANNEL_CONFIG.pinterest = { label: 'Instagram', ... }` (dòng 440 `channelSettings.ts`) — copy-paste từ Instagram, làm hiển thị sai tên ở vài nơi dùng config này.

### 5. Mockup không nhận `pinterest_title` riêng
`PinterestMockup` đang parse title bằng cách lấy "first line" của content — nhưng DB đã có cột `pinterest_title` riêng (≤100 ký tự, SEO-optimized). Cần truyền title riêng vào mockup để hiển thị đúng cấu trúc Pin (Title in đậm + Description bên dưới) như Pinterest thật.

### 6. Sample text generator gọi pinterest là "trendy" generic
`generateSampleText.ts` dòng 24 — đổi style sang `'pinterest-seo'` để phản ánh keyword-driven nature.

## Các thay đổi đề xuất

### A. Bug fix — `getContentForChannel` (3 file)
Thêm case:
```ts
case 'pinterest': return content.pinterest_content;
```
vào cả 3 file viewer/export/comparison.

### B. Chuẩn hóa ảnh Pinterest (`src/config/channelImageConfig.ts`)
- Đổi `size: '1080x1350'` → `'1000x1500'`
- `aspectRatio: '4:5'` → `'2:3'`
- Viết lại `style/mood/composition/visualDirections/avoidElements` theo Pinterest-native:
  - style: `'vertical pin layout, search-friendly, idea-pin aesthetic'`
  - mood: `'inspirational, save-worthy, how-to / listicle vibe'`
  - composition: `'tall vertical 2:3, clear focal subject upper third, optional text overlay bottom, brand mark subtle'`
  - directions: vertical infographic, large readable headline overlay (Pinterest is text-on-image friendly), warm/clean palette, SEO-discoverable visual cue, niche-clear (food/beauty/diy/fashion...)
  - avoid: square/landscape framing, dark muddy backgrounds, low-contrast text overlay, busy collage
- Cập nhật `CHANNEL_OPTIMAL_ASPECT_RATIO.pinterest = '2:3'`.

### C. Sửa label sai (`src/types/channelSettings.ts` dòng 440)
```ts
pinterest: { label: 'Pinterest', color: 'text-[#E60023]', bgColor: 'bg-[#E60023]/10', descriptionSuffix: 'Pin SEO, vertical 2:3' }
```

### D. Mockup nhận `pinterest_title` riêng (`ChannelMockupFrame.tsx`)
- Mở rộng `ChannelMockupFrameProps` thêm optional `pinterestTitle?: string`.
- Nếu `pinterestTitle` được truyền, dùng làm `<h3>` (thay vì parse "first line").
- Cập nhật `ContentMockupToggle.tsx` thêm prop `pinterestTitle` truyền xuống.
- `MultiChannelViewer.tsx` truyền `pinterestTitle={(content as any).pinterest_title}` khi render mockup pinterest.
- Đồng thời đổi aspect mockup sang chiều cao đúng (giữ `aspect-[2/3]` — đã đúng, không sửa).

### E. Prompt builder backend — cải thiện chỉ dẫn (`generate-multichannel/index.ts` 2 chỗ + `_shared/channel-prompt-builder.ts`)
Cập nhật prompt Pinterest description rõ hơn (giữ tương thích, chỉ refine wording):
- Nhấn: "Pinterest là search engine — Description chứa long-tail keyword tự nhiên, mô tả lợi ích/giá trị, không bán hàng cứng."
- Title: format `[Number/Benefit] + [Keyword] + [Audience/Context]`, max 100 ký tự, tránh clickbait.
- Description: 200–500 ký tự (không nhồi tới max), 2–5 hashtag tự nhiên cuối, kết thúc bằng CTA mềm dạng "Lưu Pin để xem sau" / "Click vào ảnh để xem hướng dẫn".
- `pinterest` prompt-builder format mô tả thêm "vertical 2:3 image expected".

### F. Sample text (`src/utils/generateSampleText.ts`)
Đổi:
```ts
pinterest: { emoji: false, hashtags: true, lengthHint: 'short', style: 'pinterest-seo', cta: true }
```

## Files dự kiến thay đổi
1. `src/components/MultiChannelViewer.tsx` — bug fix + truyền pinterestTitle
2. `src/components/viewer/EnhancedExportMenu.tsx` — bug fix
3. `src/components/viewer/ChannelComparison.tsx` — bug fix
4. `src/components/viewer/ContentMockupToggle.tsx` — thêm prop pinterestTitle
5. `src/components/preview/ChannelMockupFrame.tsx` — `PinterestMockup` nhận pinterestTitle
6. `src/config/channelImageConfig.ts` — size/aspect/style/composition Pinterest-native
7. `src/types/channelSettings.ts` — fix label "Instagram" → "Pinterest"
8. `src/utils/generateSampleText.ts` — style pinterest-seo
9. `supabase/functions/generate-multichannel/index.ts` — refine prompt mô tả Pinterest (2 chỗ)
10. `supabase/functions/_shared/channel-prompt-builder.ts` — bổ sung "vertical 2:3" vào format

## Không đụng tới (giữ nguyên)
- `publish-pinterest/index.ts` — logic publish API đã đúng spec Pinterest v5
- `pinterest_boards`, OAuth callback, refresh token — flow đã ổn
- `PinterestPinTypeSelector` — UI đã đúng (auto/image/carousel/video/idea)
- DB schema — đã có sẵn `pinterest_title` + `pinterest_content` + `pinterest_pin_type`

## Kết quả mong đợi
- User mở viewer Pinterest sẽ THẤY content (hết bug trắng)
- Mockup hiển thị đúng layout Pin: title đậm + description riêng biệt như Pinterest thật
- Ảnh sinh ra đúng tỉ lệ 2:3 (1000×1500), không bị crop khi publish lên Pinterest
- AI generate description tối ưu cho Pinterest search (long-tail keyword), không clone Instagram
- Tên kênh hiển thị nhất quán "Pinterest" mọi nơi
