

## Hệ thống xử lý yêu cầu Infographic phức tạp — Phân tích & Kế hoạch cải thiện

### Phân tích hiện trạng

Sau khi rà soát kỹ code, hệ thống hiện tại có:

1. **`generate-brand-image`** — gửi 1 prompt duy nhất tới AI model (Gemini/PoYo/KIE), nhận về 1 ảnh
2. **`overlay-text-canvas`** — Satori overlay **1 text block duy nhất** (headline hoặc CTA) lên ảnh nền, chỉ hỗ trợ 1 `<span>` trong 1 `<div>`
3. **Pipeline** — tuần tự: generate ảnh → overlay logo → overlay text → done

**Kết luận:** Với yêu cầu infographic phức tạp (6+ text blocks, 4 info cards, icons, banner, structured layout), hệ thống sẽ tạo ra ảnh "giống infographic từ xa" nhưng không usable. Đây là use case chưa được cover.

---

### Kế hoạch: 3 cải tiến theo thứ tự impact/effort

#### 1. Content Complexity Detection + UX Warning

**Mục tiêu:** Phát hiện yêu cầu phức tạp trước khi generate, cảnh báo user về limitations.

**File mới:** `src/lib/contentComplexityAnalyzer.ts`

Phân tích mô tả user bằng regex/keyword counting:
- `textBlocks`: đếm cụm text riêng biệt (tiêu đề, label, CTA)
- `structuredElements`: cards, lists, grids, tables
- `spatialConstraints`: "bên trái", "bên phải", "phía trên", "giữa"
- `iconRequirements`: icon, biểu tượng cụ thể
- Score → `simple` | `moderate` | `complex`

**Tích hợp UI:** Trong `SimpleImageGenerator` Step 3 và `MultiChannelFormWizard` Step 6:
- Khi score = `complex`, hiện alert card trước nút "Tạo ảnh AI":
  - Cảnh báo yêu cầu có bố cục phức tạp
  - Gợi ý: "AI sẽ tạo ảnh minh họa tổng thể. Để có text/layout chính xác, hãy dùng chế độ Hybrid."
  - Cho phép user vẫn bấm generate (không block)

#### 2. Mở rộng Satori Overlay — Structured Multi-block Layout

**Mục tiêu:** Extend `overlay-text-canvas` để render nhiều text blocks + info cards thay vì chỉ 1 span.

**File sửa:** `supabase/functions/overlay-text-canvas/index.ts`

Thêm interface mới `StructuredOverlayRequest` bên cạnh `OverlayTextRequest` hiện tại (backward compatible):

```typescript
interface StructuredOverlayRequest {
  baseImageUrl: string;
  layout: 'banner_cards' | 'hero_text' | 'simple'; // template type
  elements: {
    banner?: { text: string; bgColor: string; position: 'top' | 'bottom' };
    heroText?: { text: string; fontSize: 'xl' | '2xl' | '3xl'; effect: 'none' | 'gradient' };
    cards?: { items: { icon?: string; label: string }[]; layout: 'grid-2x2' | 'horizontal' | 'vertical' };
    headline?: string;
    cta?: string;
  };
  colors: { primary: string; secondary: string; text: string };
  imageWidth?: number;
  imageHeight?: number;
  contentId?: string;
  channel?: string;
  organizationId?: string;
}
```

`buildElement()` sẽ dispatch theo `layout` type, tạo Satori element tree phức tạp hơn (multiple children div). Text tiếng Việt render 100% chính xác vì dùng font Be Vietnam Pro.

**File sửa:** `src/hooks/useAutoImageGeneration.ts` — thêm option `structuredOverlay` bên cạnh `useCanvasFallback` hiện tại.

#### 3. Hybrid Generation Mode — AI nền + Programmatic overlay

**Mục tiêu:** Cho yêu cầu phức tạp, tách thành 2 bước: AI tạo nền visual → Satori render structured elements lên.

**Flow:**
1. Complexity analyzer detect `complex` → suggest Hybrid
2. Tự động simplify prompt gửi AI: chỉ yêu cầu background/atmosphere (tông màu, skyline, mood) — bỏ text, cards, icons
3. AI trả về ảnh nền clean
4. Gọi extended `overlay-text-canvas` với structured layout (banner + hero text + cards)
5. Composite → kết quả cuối

**File mới:** `src/lib/hybridImageGenerator.ts`
- `decomposeRequest()`: tách mô tả user thành `backgroundPrompt` (visual elements) + `overlayConfig` (text, cards, structured elements)
- Dùng AI (Gemini Flash) để phân tích mô tả và tự động tách

**File sửa:** `src/hooks/useAutoImageGeneration.ts` — thêm hybrid path khi complexity = `complex` và user opt-in.

---

### Tóm tắt

| # | Thay đổi | Files | Effort |
|---|----------|-------|--------|
| 1 | Complexity Detection + UX warning | 1 file mới + 2 UI files | ~100 dòng |
| 2 | Extend Satori overlay cho multi-block | `overlay-text-canvas` + types | ~200 dòng |
| 3 | Hybrid generation mode | 1 file mới + hook update | ~150 dòng |

Tổng ~450 dòng. Không breaking change — tất cả là additive. Use case đơn giản vẫn chạy như cũ, use case phức tạp được route sang hybrid path.

