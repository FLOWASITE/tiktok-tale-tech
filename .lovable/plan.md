

## Refactor UI/UX cho chế độ "Để AI lo" — Trải nghiệm đặc biệt hơn

### Vấn đề hiện tại

Chế độ "Để AI lo" (full) chỉ đơn giản là **ẩn bớt tùy chọn** của các mode khác và thay bằng nhãn read-only nhỏ. Không có gì đặc biệt về mặt visual. User vẫn thấy:
- Step 3 trống trải với vài info labels rời rạc
- Advanced Options vẫn hiển thị (dù hầu hết bị ẩn)
- Nút "Tạo ảnh" giống hệt các mode khác
- Không có cảm giác "premium" hay "AI đang lo hết"

### Thiết kế mới

Khi `promptMode === 'full'`, thay thế Step 3 bằng một **AI Summary Card** thống nhất và loại bỏ Advanced Options.

```text
┌─────────────────────────────────────┐
│  Step 1: Chọn kênh  [channel grid] │
├─────────────────────────────────────┤
│  Step 2: Kiểm soát AI [3 cards]    │
├─────────────────────────────────────┤
│  ╔═══════════════════════════════╗  │
│  ║  ✨ AI đã sẵn sàng tạo ảnh   ║  │
│  ║                               ║  │
│  ║  🎨 Phong cách: Cinematic 92% ║  │
│  ║  📐 Tỉ lệ: Tự động theo kênh ║  │
│  ║  📍 Logo: Tự động theo kênh   ║  │
│  ║  📝 Text: AI tự quyết định    ║  │
│  ║  🧩 Layout: AI chọn tối ưu   ║  │
│  ║                               ║  │
│  ║  Keywords: [tag] [tag] [tag]   ║  │
│  ║                               ║  │
│  ║  ┌─────────────────────────┐  ║  │
│  ║  │  ✨ Tạo {n} ảnh AI      │  ║  │
│  ║  │     (gradient + glow)   │  ║  │
│  ║  └─────────────────────────┘  ║  │
│  ╚═══════════════════════════════╝  │
│                                     │
│  [NO Advanced Options in full mode] │
└─────────────────────────────────────┘
```

### Chi tiết kỹ thuật

#### 1. Tạo component `AIReadyCard` (file mới)
**File: `src/components/multichannel/AIReadyCard.tsx`**

Component card gradient đặc biệt chỉ hiển thị trong `full` mode, gồm:
- Header gradient (`from-primary/10 via-purple-500/5 to-blue-500/10`) với icon sparkle animated
- Checklist icon-based: phong cách (V3 top pick + score), tỉ lệ, logo, text, layout — mỗi item 1 dòng gọn
- Keywords tags (từ `previewKeywords`)
- Nút CTA gradient nổi bật với hiệu ứng glow pulse
- Strategic context badges inline (role + angle) — compact

#### 2. Cập nhật `SimpleImageGenerator.tsx`
- Khi `promptMode === 'full'`: render `<AIReadyCard>` thay vì các block rời rạc (V3 compact, Content keywords, PromptPreview, Settings Summary, Complexity Warning, info note, generate button)
- Ẩn hoàn toàn `<ImageAdvancedOptions>` khi `promptMode === 'full'` — không cần vì mọi thứ đã auto
- CTA button nằm trong `AIReadyCard` thay vì bên ngoài

#### 3. Validation fix
- Trong `handleGenerate`: skip text validation khi `promptMode === 'full'` (đã phân tích ở message trước)

### Tổng kết: 2 files
1. **`src/components/multichannel/AIReadyCard.tsx`** — Component mới, card tổng hợp AI
2. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Thay block Step 3 + ẩn Advanced Options cho full mode + fix validation

