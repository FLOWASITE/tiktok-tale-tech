

## Đánh giá còn lại: Gap chưa fix và kế hoạch đạt chuẩn chuyên gia

### Đã hoàn thành (recap)
- Multi-weight fonts (400/600/700)
- WCAG contrast validation (banner, ribbon, CTA, cards)
- Responsive cards (portrait/square auto-vertical)
- Split→stack fallback
- Smart text fitting + hero number circle
- Auto-optimize text >80 chars
- UI character counter
- Education infographic density rules
- Card description (2-line)

### Gap còn tồn tại (theo thứ tự ưu tiên)

#### P0 — Ảnh hưởng trực tiếp chất lượng output

**1. Negative prompt không inject mặc định vào background generation**
- `buildNegativePrompt` trả `null` khi `negativePrompt` param trống
- Frontend có `NEGATIVE_PROMPT_DEFAULTS` nhưng chỉ hiện trên UI — nếu user không truyền, backend không inject gì
- Hậu quả: AI background thường xuyên render text/watermark/chữ rác lên ảnh nền
- **Fix**: `buildNegativePrompt` inject mặc định `"text, words, letters, numbers, watermark, logo, UI elements, blurry, low quality"` khi param trống và mode KHÔNG phải `with_text`

**2. CTA button thiếu visual elevation**
- CTA chỉ có `backgroundColor` phẳng, không `boxShadow` → chìm vào nền
- **Fix**: Thêm `boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 2px 6px {primary}66'` cho CTA

**3. Numbered card circle text luôn trắng (#FFFFFF)**
- Line 858: `color: '#FFFFFF'` hardcoded → không đọc được trên primary color sáng
- **Fix**: Dùng `getContrastTextColor(colors.primary)` giống hero circle

**4. Card description dùng `theme.cardTextColor` thay vì contrast-validated color**
- Line 910: description dùng `theme.cardTextColor` nhưng label dùng `effectiveCardTextColor` → inconsistent
- **Fix**: Description cũng dùng `effectiveCardTextColor` với opacity 0.7

#### P1 — Mở rộng coverage

**5. Instagram Feed nên dùng 4:5 thay vì 1:1**
- `CHANNEL_OPTIMAL_ASPECT_RATIO.instagram = '1:1'` nhưng 4:5 (1080×1350) chiếm 23% diện tích feed hơn
- Instagram algorithm ưu tiên ảnh lớn hơn
- **Fix**: Đổi `instagram: '4:5'`, cập nhật `CHANNEL_IMAGE_CONFIG.instagram.size = '1080x1350'`

**6. Simple overlay (legacy) vẫn chỉ load 1 font weight**
- Structured overlay dùng `loadMultipleFontWeights`, nhưng legacy path (line 1332) vẫn dùng `loadGoogleFont` đơn lẻ
- **Fix**: Legacy path cũng dùng `loadMultipleFontWeights`

**7. Background prompt thiếu chỉ dẫn "clean background for overlay"**
- Khi hệ thống sẽ overlay text lên (Satori mode), background nên được hướng dẫn: "leave space for text overlay at top/bottom"
- Hiện `buildCriticalRules` nói "works well as background for text overlay" nhưng chưa cụ thể vùng trống
- **Fix**: Thêm spatial instruction vào `buildCriticalRules` cho background mode: "Ensure top 15% and bottom 20% have lower visual complexity for text overlay readability"

### Files cần sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/image-prompt-builders.ts` | Default negative prompt injection, spatial overlay instruction |
| `supabase/functions/overlay-text-canvas/index.ts` | CTA boxShadow, numbered card contrast, description contrast, legacy multi-weight font |
| `src/config/channelImageConfig.ts` | Instagram 4:5 |

### Ước tính: 1 lần triển khai cho tất cả 7 fixes

