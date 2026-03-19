

# Phân tích & Kế hoạch sửa 2 vấn đề Carousel

## Vấn đề 1: Các slide không liên quan đến nhau (hình ảnh)

**Nguyên nhân gốc:** Khi tạo ảnh hàng loạt (`handleGenerateAllImages`), cross-slide context (colorPalette + previousSceneDescription) CHỈ được truyền cho style `seamless`. Với `educational`, `listicle`, `gallery` — mỗi slide được tạo ảnh hoàn toàn độc lập, không có thông tin về slide trước đó.

Mặc dù prompt text (từ `generate-carousel`) có yêu cầu "consistent palette" trong fullPrompt, AI image model không nhận được context thực tế từ ảnh đã tạo trước. Kết quả: mỗi slide ra một phong cách/palette khác nhau.

**Giải pháp:** Mở rộng cơ chế cross-slide context cho TẤT CẢ carousel styles, không chỉ seamless.

### Thay đổi 1a: `src/components/CarouselViewer.tsx` — `handleGenerateAllImages`
- Luôn truyền `previousSceneDescription` (từ AI response hoặc objective của slide trước) cho mọi style
- Luôn truyền `colorPalette` (extract từ slide đầu tiên) cho mọi style
- Đổi tên field từ `seamlessContext` thành `crossSlideContext` (hoặc giữ `seamlessContext` để tránh breaking change ở backend, nhưng truyền cho tất cả styles)

### Thay đổi 1b: `src/components/CarouselViewer.tsx` — `handleGenerateImage` (single slide)
- Tương tự, truyền context cho tất cả styles khi regenerate 1 slide

### Thay đổi 1c: `supabase/functions/generate-carousel-image/index.ts` — `buildBackgroundPrompt`
- Mở rộng seamless directive injection: khi nhận được `seamlessContext` cho non-seamless styles, thêm directive nhẹ hơn:
  ```
  VISUAL CONTINUITY:
  - Maintain EXACT color palette from previous slides: [colors]
  - Previous slide depicted: "[description]" — maintain same environment, lighting, photography style
  - This is slide X of Y — keep consistent visual identity
  ```
- Chỉ giữ các yêu cầu "edge-bleeding" và "panoramic artwork" cho seamless

---

## Vấn đề 2: Text mất chữ, không nhất quán

**Nguyên nhân gốc:** Nhiều lớp vấn đề:

1. **Font loading thất bại im lặng**: Khi Google Fonts API fail (rate limit, network), hệ thống fallback về `Be Vietnam Pro` nhưng nếu cả fallback cũng fail → font rỗng → text có thể không render được hoặc render bằng ký tự mặc định
2. **`fitTextToWidth` quá aggressive**: Với text dài (subtitle, body), font size có thể bị scale xuống rất nhỏ (min 12px trên canvas 1080px = gần như không đọc được)
3. **Thiếu validation text layers**: Nếu `textContent` object có `headline` rỗng hoặc chỉ có spaces, hệ thống vẫn render → kết quả trống
4. **Legacy fallback text path**: Khi `textLayers` parse thất bại (return null vì chỉ 1 headline), legacy path dùng `text` field — nhưng cho structured content, `text` chỉ là headline (không phải toàn bộ nội dung)

**Giải pháp:**

### Thay đổi 2a: `supabase/functions/generate-carousel-image/index.ts` — Text layer handling
- Khi `parseTextLayers` trả về `null` (chỉ có 1 headline), vẫn tạo 1 layer explicit thay vì rơi vào legacy path
- Đảm bảo `textLayers` luôn được gửi khi có structured content

### Thay đổi 2b: `supabase/functions/overlay-text-canvas/index.ts` — Font resilience
- Tăng cường retry logic khi load font thất bại
- Nâng `minFontSize` cho carousel overlay từ 12 → 16px (trên canvas 1080px, 12px quá nhỏ)

### Thay đổi 2c: `supabase/functions/generate-carousel-image/index.ts` — Validate text trước overlay
- Validate tất cả text layers không rỗng trước khi gọi overlay
- Log warning khi phát hiện text content rỗng/quá ngắn

### Thay đổi 2d: `supabase/functions/overlay-text-canvas/index.ts` — Đồng nhất font xuyên suốt carousel
- Truyền thêm `fontFamily` từ preset config vào overlay request (hiện tại chỉ dùng default `Be Vietnam Pro`)
- Đảm bảo tất cả slides trong 1 carousel dùng cùng font family

---

## Tóm tắt files cần sửa

| File | Thay đổi |
|---|---|
| `src/components/CarouselViewer.tsx` | Truyền cross-slide context cho tất cả styles |
| `supabase/functions/generate-carousel-image/index.ts` | Mở rộng visual continuity directive + validate text layers |
| `supabase/functions/overlay-text-canvas/index.ts` | Tăng min font size + font resilience |

