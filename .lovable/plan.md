

# Phase 2: Navbar Redesign

## Thay đổi trong `src/landing/components/LandingNav.tsx`

### 1. Logo
- Bỏ import logo image, thay bằng text "Flowa" với gradient dot sau chữ "a"
- Dot: `w-1.5 h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500`

### 2. Menu items (updated)
- "Tính năng" → `#features`
- "Cách hoạt động" → `#workflow`
- "Campaign" → `#campaign`
- "Pricing" → `#pricing`
- "Blog" → `/blog` (link)
- Style: `text-sm text-gray-400 hover:text-white transition`

### 3. Scroll detection sections
- Update sections array to match new section IDs: `features`, `workflow`, `campaign`, `pricing`

### 4. Header styling
- When scrolled: `bg-[#09090b]/80 backdrop-blur-xl border-b border-white/10`
- When not scrolled: `bg-transparent`

### 5. CTA buttons
- "Đăng nhập": text link style, `text-gray-400 hover:text-white`
- "Bắt đầu miễn phí": `bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full px-5 py-2 text-white text-sm font-semibold`

### 6. Mobile menu
- Update background to dark theme: `bg-[#09090b] border-b border-white/10`
- Same menu items and CTA styling

## File thay đổi
- **Edit**: `src/landing/components/LandingNav.tsx` (single file)

