

## Cập nhật Landing Page Hero Section

### Thay đổi

**1. Tag line** — Đổi từ "AI Marketing Agent — Không phải AI Writing Tool" → "Agentic Content Marketing Platform"

**2. Headline** — Tách thành 2 phần:
- Dòng 1 (text thường): "Content marketing chạy "
- Dòng 2 (gradient text): "tự động"
- Dòng 3 (text thường): " — từ chiến lược đến đăng bài"

Cần sửa component `HeroSection.tsx` để "tự động" có gradient thay vì chỉ dùng `text-primary` cho dòng 2.

**3. Sub-headline** — Đổi thành: "Flowa là AI Agent tự lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài — thay cho cả một team content. Bạn chỉ cần duyệt."

### Files cần sửa

**`src/i18n/locales/vi.json`**
- `hero.tag` → "Agentic Content Marketing Platform"
- `hero.titleLine1` → "Content marketing chạy"
- `hero.titleLine2` → "tự động"
- Thêm `hero.titleLine3` → "— từ chiến lược đến đăng bài"
- `hero.descPlain` → text mới

**`src/i18n/locales/en.json`** và **`src/i18n/locales/th.json`** — cập nhật tương ứng

**`src/landing/components/HeroSection.tsx`**
- Headline: render `titleLine1` + `titleLine2` (gradient) + `titleLine3` trên cùng 1 block
- Áp dụng gradient CSS cho "tự động": `bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent`

### Kết quả
- Tag: "Agentic Content Marketing Platform"
- Headline: "Content marketing chạy **tự động** — từ chiến lược đến đăng bài" (tự động có gradient)
- Sub: "Flowa là AI Agent tự lên chiến dịch, tạo nội dung 12 kênh, chấm điểm chất lượng và đăng bài — thay cho cả một team content. Bạn chỉ cần duyệt."

