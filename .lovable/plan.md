

# Phase 3: Hero Section Rewrite

## Overview
Rewrite hoàn toàn HeroSection theo brief — chuyên nghiệp, dark theme, 2 cột layout, pipeline visualization với pulse animation.

## Thay đổi trong `src/landing/components/HeroSection.tsx`

### Layout tổng quan
- 2 cột trên desktop (text 55% / visual 45%), stack trên mobile
- Dark theme: nền `bg-[#09090b]`, text trắng/gray
- Bỏ toàn bộ code cũ (stats counter, dashboard preview, industry badges)

### Cột trái — Text content
1. **Badge tag**: `"🤖 AI Marketing Agent — Không phải AI Writing Tool"` — border indigo-500/30, bg-indigo-500/10, rounded-full, px-3 py-1
2. **Headline** (text-5xl md:text-6xl font-bold):
   - "Đội ngũ content của bạn —"
   - "chạy bằng AI Agent" (gradient text indigo→violet)
3. **Sub-headline** (text-xl text-gray-400, max-w-lg):
   - "Flowa tự nghiên cứu thị trường, lên chiến dịch cả tháng..."
4. **2 CTA buttons** (flex row, gap-4, mt-8):
   - Primary: "Dùng thử miễn phí →" — bg-gradient indigo→violet, rounded-full, py-3 px-8
   - Secondary: "Xem cách hoạt động" — border white/20, bg-transparent, rounded-full
5. **3 micro-stats** (flex row, gap-8, mt-6, text-sm text-gray-500):
   - "⚡ Setup 5 phút" · "🔒 Không cần thẻ tín dụng" · "🌏 Hỗ trợ VI · TH · EN"

### Cột phải — Pipeline Visual
- Card lớn: rounded-2xl, border white/10, bg-white/5, backdrop-blur, p-6
- **Pipeline diagram**: 6 nodes ngang với connector lines
  - 🔍 Research → 🎯 Strategy → ✍️ Create → 🔄 Review → ✅ Approve → 🚀 Publish
  - Mỗi node: circle icon + label dưới
  - Animated pulse dot chạy từ trái sang phải (lặp lại)
  - Node "Create" có glow effect (active state)
  - Nodes đã xong hiện checkmark xanh lá
- **Dòng caption dưới pipeline**: "Toàn bộ pipeline chạy trong ~10 phút, không cần can thiệp" — text-xs text-gray-500, text-center

### Animations
- Framer Motion stagger: badge → headline → sub → CTAs → stats → visual
- Pipeline pulse: CSS animation hoặc Framer Motion `animate` loop cho dot di chuyển qua nodes
- Active node glow: `box-shadow: 0 0 20px rgba(99, 102, 241, 0.4)`

## Technical details
- Hardcode tiếng Việt (không dùng i18n keys cho copy mới)
- Giữ `getAuthUrl('register')` cho CTA primary
- Secondary CTA scroll đến `#workflow`
- Responsive: stack thành 1 cột trên mobile, pipeline nodes thu nhỏ hoặc wrap 2 hàng

## File thay đổi
- **Edit**: `src/landing/components/HeroSection.tsx` (single file, full rewrite)

