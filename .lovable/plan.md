

## Đánh giá Chuyên gia: Hệ thống Tạo ảnh Social Media

### Tổng quan kiến trúc

Hệ thống sử dụng pipeline 4 bước: **AI Background → Logo Overlay → Canvas Text → Structured Overlay (Satori)**. Kiến trúc tách biệt giữa nền AI và text programmatic là quyết định đúng đắn, đảm bảo typography chính xác 100% cho tiếng Việt.

---

### ĐIỂM MẠNH (đã cover tốt)

| Khía cạnh | Đánh giá |
|---|---|
| **12 kênh** với spec riêng biệt | Tốt — mỗi kênh có aspect ratio, mood, composition, avoidElements riêng |
| **Style-Adaptive Overlay** | Xuất sắc — 12 theme (photorealistic → product_only) với borderRadius, shadow, bg riêng |
| **Logo Safe Zone** | Tốt — tự động tính safe area dựa trên logoMeta cho banner/cards/footer/CTA |
| **Smart Density** | Tốt — tự động cắt giảm elements khi quá đông, nới cho education_infographic |
| **AI Decompose** | Tốt — Gemini phân tích nội dung → suggestedLayout với strategic context |
| **Fallback chain** | Tốt — AI → regex fallback, model fallback, retry với backoff |
| **3 Prompt Modes** | Tốt — full/brand_only/raw cover 3 use case khác nhau |
| **Country localization** | Tốt — VN, US, TH, SG, MY, ID, PH, JP, KR |
| **Content taxonomy** | Tốt — Goal × Angle × Role tạo ma trận chiến lược phong phú |

---

### GAPS VÀ KHUYẾN NGHỊ NÂNG CẤP

#### 1. **Thiếu tỉ lệ 4:5 trong channel config** (Critical)
Instagram Feed thực tế ưu tiên **4:5** (1080×1350) hơn 1:1 vì chiếm nhiều diện tích feed hơn 23%. Hiện tại `CHANNEL_OPTIMAL_ASPECT_RATIO.instagram = '1:1'` nhưng type system hỗ trợ 4:5. Cần thêm option auto-select 4:5 cho Instagram Feed.

**File**: `src/config/channelImageConfig.ts`
- Thêm variant `instagram_feed_portrait` hoặc thay `instagram: '4:5'`
- Cập nhật `CHANNEL_IMAGE_CONFIG.instagram.size` → `'1080x1350'`

#### 2. **Thiếu Stories/Reels variant** (Critical)
Instagram Stories, Facebook Stories, YouTube Shorts đều 9:16 nhưng không có channel riêng. Hiện chỉ TikTok có 9:16. Cần ít nhất support "instagram_stories" hoặc cho phép user chọn variant per channel.

**File**: `src/config/channelImageConfig.ts`, `src/types/multichannel.ts`
- Thêm channel variant hoặc sub-format selector

#### 3. **Font chỉ load 1 weight** (Medium)
Hiện tại `loadGoogleFont` chỉ load weight 600 (hoặc fallback 400). Nhưng cards cần weight 400 cho description, banner cần 700 cho bold. Satori sẽ **fake bold/light** khi chỉ có 1 weight → kém chuyên nghiệp.

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Load 2-3 weights: 400 (description), 600 (body), 700 (banner/hero)
- Truyền array fonts vào Satori

#### 4. **Thiếu color contrast validation** (Medium)
Không kiểm tra contrast ratio giữa text color vs background. Khi brand primary color nhạt (vd: `#FFD700` vàng), banner text trắng sẽ không đọc được.

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Thêm function `getContrastColor(bgColor)` → auto-switch text sang đen/trắng
- Áp dụng cho banner, CTA, ribbon

#### 5. **Card layout không responsive theo aspect ratio** (Medium)
Cards luôn dùng cùng styling bất kể ảnh 16:9 hay 9:16. Trên 9:16 (TikTok), cards grid-2x2 sẽ rất bé vì width hẹp (1080px nhưng height 1920px).

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- 9:16: ép cards layout = 'vertical', font size lớn hơn
- 16:9: cho phép 'horizontal' hoặc 'grid-2x2'
- Tỉ lệ font theo min(width, height) thay vì chỉ width

#### 6. **Split layout chỉ hoạt động trên landscape** (Low-Medium)
Split layout (55% trái / 45% phải) trên ảnh 1:1 hoặc 9:16 sẽ bị chật. Cần auto-convert sang stack layout khi aspect ratio là portrait/square.

**File**: `supabase/functions/overlay-text-canvas/index.ts`
- Khi `imageWidth <= imageHeight && isSplit` → fallback sang stack (column) layout

#### 7. **Thiếu "Carousel/Multi-slide" support** (Low-Medium)
Instagram carousel (tối đa 10 slides) là format engagement cao nhất. Hệ thống hiện chỉ tạo 1 ảnh/kênh. Cần support tạo series ảnh cho cùng 1 nội dung (slide 1: hook, slide 2-4: content, slide 5: CTA).

#### 8. **Background prompt thiếu negative prompt mặc định** (Low)
Hiện `negativePrompt` là optional và thường trống. Cần inject mặc định: `"text, words, letters, numbers, watermark, logo, UI elements, blurry, low quality"` để AI background luôn sạch text.

#### 9. **Overlay SVG output — không rasterize** (Low)
Output cuối cùng là SVG (Satori) overlay trên base image URL. Trên một số platform (Zalo, email), SVG có thể không render đúng. Cần option rasterize SVG → PNG trước khi upload.

#### 10. **Thiếu A/B variant generation** (Nice-to-have)
Chuyên gia thiết kế luôn tạo 2-3 variants. Hệ thống chỉ tạo 1 ảnh/kênh. Có thể thêm option "tạo 2 variants" với style khác nhau cho cùng nội dung.

---

### ĐỘ ƯU TIÊN TRIỂN KHAI

```text
P0 (Critical - ảnh hưởng chất lượng output):
  1. Load multiple font weights (400, 600, 700)
  2. Color contrast validation
  3. Card layout responsive theo aspect ratio
  4. Split → stack fallback cho portrait

P1 (Important - mở rộng coverage):
  5. Instagram 4:5 support
  6. Stories/Reels 9:16 variant
  7. Default negative prompt injection

P2 (Nice-to-have):
  8. Carousel/multi-slide
  9. SVG → PNG rasterization
  10. A/B variant generation
```

### KẾ HOẠCH TRIỂN KHAI ĐỀ XUẤT

Tập trung **P0 (4 items)** trước — tất cả nằm trong 2 files:

| File | Thay đổi |
|---|---|
| `supabase/functions/overlay-text-canvas/index.ts` | Multi-weight font loading, contrast validation, responsive cards, split→stack fallback |
| `src/config/channelImageConfig.ts` | Instagram 4:5 option (P1) |

**Ước tính**: P0 = 1 lần triển khai, P1 = 1 lần triển khai riêng.

Bạn muốn tôi triển khai nhóm P0 trước không?

