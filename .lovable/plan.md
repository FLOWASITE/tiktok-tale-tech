

# Phase 3: Hero Section — Rewrite

## Thay đổi trong `src/landing/components/HeroSection.tsx`

Rewrite toàn bộ component theo brief. Giữ lại `getAuthUrl` import và `framer-motion`.

### Layout
- 2 cột trên desktop (text 55% / visual 45%), stack trên mobile
- Dark theme: section bg `bg-[#09090b]`

### Cột trái — Text
1. **Badge**: `"🤖 AI Marketing Agent — Không phải AI Writing Tool"` — border-indigo-500/30, bg-indigo-500/10, rounded-full
2. **Headline**: `"Đội ngũ content của bạn — chạy bằng AI Agent"` — "AI Agent" có gradient text indigo→violet
3. **Sub-headline**: text-xl text-gray-400, mô tả pipeline tự động
4. **2 CTA buttons**: Primary gradient rounded-full + Secondary outline rounded-full (scroll to `#workflow`)
5. **3 micro-stats**: "⚡ Setup 5 phút" · "🔒 Không cần thẻ tín dụng" · "🌏 Hỗ trợ VI · TH · EN"

### Cột phải — Pipeline Visual
1. **Chat input mockup**: Message bubble với prompt mẫu
2. **Pipeline 6 nodes**: Research → Strategy → Create → Review → Approve → Publish
   - Pulse dot animation chạy từ trái sang phải (CSS keyframes)
   - Node "Create" active với glow, tooltip "Đang tạo 20 bài cho 4 kênh..."
   - Nodes trước "Create" có checkmark xanh
3. **3 channel output cards**: Facebook (Score 89 ✅), Instagram (Score 91 ✅), TikTok (Score 85 ⏳)

### Bỏ
- AnimatedCounter, stats grid, industry badges, dashboard preview mockup, i18n translations (hardcode Vietnamese)

### Animation
- Framer Motion staggered fade-up cho text elements
- CSS `@keyframes` cho pulse dot trên pipeline

## File thay đổi
- **Edit**: `src/landing/components/HeroSection.tsx` (single file, full rewrite)

