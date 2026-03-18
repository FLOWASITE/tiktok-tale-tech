

# Đánh giá: Hệ thống Flowa có thể triển khai 6 Design Styles này không?

## Trả lời ngắn: **CÓ, khoảng 60-70% đã sẵn sàng.** Cần mở rộng theme system để đạt 100%.

## Hiện trạng hệ thống

Kiến trúc hiện tại đã có 3 tầng xử lý:

```text
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ IMAGE_STYLE_PRESETS  │ → │ OVERLAY_STYLE_THEMES │ → │ Layout Engine        │
│ (AI background gen) │   │ (Satori rendering)   │   │ (5 layouts)          │
│ 12 presets           │   │ 12 themes            │   │ stack/split/banner/  │
│ keywords + negative  │   │ bannerBg, cardBg,    │   │ hero_text/simple     │
│                      │   │ borderRadius, font   │   │                      │
│                      │   │ Weight, textShadow   │   │                      │
└─────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

6 styles của bạn đều map trực tiếp vào 6 presets đã tồn tại: `minimalist`, `flat_design`, `gradient`, `geometric`, `illustration`, `product_only`.

## Những gì ĐÃ LÀM ĐƯỢC (không cần code mới)

| Yêu cầu | Đã có |
|----------|-------|
| Bảng màu khác biệt per style | ✅ `resolveTheme()` + brand colors |
| Border radius khác nhau (0px geometric → 16px watercolor) | ✅ Trong `OVERLAY_STYLE_THEMES` |
| Font weight khác nhau (400 minimalist → 700 flat_design) | ✅ Trong `OVERLAY_STYLE_THEMES` |
| Text shadow khác nhau (none cho minimalist → glow cho cinematic) | ✅ |
| AI background keywords khác nhau per style | ✅ `IMAGE_STYLE_PRESETS` |
| 5 layout types (stack, split, banner_cards, hero_text, simple) | ✅ |
| Smart text fitting + contrast validation | ✅ |
| Logo safe zones | ✅ |

## Những gì CẦN BỔ SUNG

### Gap 1: Font family per style (quan trọng nhất)
**Hiện tại**: Hardcoded `Be Vietnam Pro` cho mọi style.
**Cần**: Mỗi style dùng font riêng (Inter cho minimalist, Montserrat cho flat_design, Playfair cho geometric/corporate...).

→ Mở rộng `OverlayStyleTheme` thêm `fontFamily` + `headingFontFamily`, load Google Font động theo style.

### Gap 2: Spacing/density rules per style
**Hiện tại**: Padding đồng nhất (24px, 32px) cho mọi style.
**Cần**: Clean Modern cần 40-50% negative space, Bold Infographic cần blocky tight.

→ Thêm `spacingMultiplier` và `maxContentDensity` vào theme.

### Gap 3: Style-specific visual effects
- **Gradient Flow**: Glassmorphism (`backdrop-filter: blur`) — Satori **không hỗ trợ** blur filter, nhưng có thể fake bằng semi-transparent overlay.
- **Product Focus**: Contact shadow, badges ("Hot", "Sale 50%") — cần thêm element types.
- **Story Visual**: Asymmetrical layout — cần thêm layout type hoặc offset logic.

### Gap 4: Layout preference per style
**Hiện tại**: AI tự chọn layout qua `decompose-image-request`.
**Cần**: Mỗi style có layout mặc định (Corporate → split, Product → center-focus, Infographic → banner_cards).

→ Thêm `preferredLayout` vào theme, dùng làm hint cho decompose.

## Kế hoạch triển khai

### 1. Mở rộng `OverlayStyleTheme` interface
Thêm các field mới vào `overlay-text-canvas/index.ts`:
```
fontFamily, headingFontFamily, spacingMultiplier, 
preferredLayout, maxCards, ctaStyle, badgeSupport
```

### 2. Cập nhật 6 theme entries
Map chi tiết theo tài liệu Design System cho: `minimalist`, `flat_design`, `gradient`, `geometric`, `illustration`, `product_only`.

### 3. Dynamic font loading
Sửa `loadGoogleFont()` nhận `fontFamily` parameter thay vì hardcode. Load heading font + body font riêng.

### 4. Spacing engine
`buildStructuredElement()` đọc `spacingMultiplier` từ theme để scale padding/gap/margin.

### 5. Layout preference
`decompose-image-request` nhận thêm `imageStyle` → inject `preferredLayout` hint vào AI prompt.

### 6. Product-specific elements
Thêm element type `badge` vào `StructuredOverlayRequest.elements` cho Product Focus style.

### Files thay đổi:
| File | Thay đổi |
|------|----------|
| `supabase/functions/overlay-text-canvas/index.ts` | Mở rộng theme interface, 6 theme entries, dynamic font, spacing engine |
| `supabase/functions/decompose-image-request/index.ts` | Layout preference hint |
| `supabase/functions/_shared/image-prompt-data.ts` | Cập nhật keywords cho 6 presets chính xác hơn |

Tổng ước tính: ~400 dòng code thay đổi, không breaking change nào.

