

# Landing Page Content Overhaul — Text & New Sections

## Overview
Update all landing page text to "AI Marketing Agent" positioning and add 6 new sections. Keep all existing layouts, animations, and design patterns. Hardcode Vietnamese text (remove i18n dependency where needed for new content).

## Files to Edit (Existing Sections)

### 1. SEO Meta — `src/pages/Landing.tsx` + `src/landing/pages/Landing.tsx`
- Update SEO title/description to Agent positioning
- Add new sections to page assembly (Problem, Reframe, Campaign, Features, Learning, Trust)
- Reorder sections per brief

### 2. Hero — `src/landing/components/HeroSection.tsx`
- Update sub-headline text to full brief version
- Update CTA text: "Dùng thử miễn phí →" (instead of "Bắt đầu miễn phí")
- Add "Toàn bộ pipeline chạy trong ~10 phút" line under pipeline visual
- Chat bubble text update to match brief

### 3. Social Proof — `src/landing/components/SocialProofSection.tsx`
- Replace metrics/reviews with simple logo bar
- Text: "Được sử dụng bởi các Marketing Team tại Việt Nam & Thái Lan"
- 6 placeholder company names

### 4. Workflow — `src/landing/components/WorkflowSection.tsx`
- Rewrite to 5-step vertical timeline with hardcoded Vietnamese
- Add "BẠN LÀM" / "AGENT LÀM" badges
- Remove image carousels, replace with text-based mockups
- Remove i18n, hardcode all copy

### 5. Industry Memory — `src/landing/components/IndustryMemorySection.tsx`
- Keep existing interactive demo (it's excellent)
- Update header text to match brief positioning language

### 6. Pricing — `src/landing/components/PricingSection.tsx`
- Change from 4 plans to 3: Starter (0đ), Pro (Liên hệ), Enterprise (Tuỳ chỉnh)
- Remove monthly/yearly toggle
- Middle card: gradient border + glow + scale-105
- Hardcode Vietnamese features list

### 7. FAQ — `src/landing/components/FAQSection.tsx`
- Replace i18n with 6 hardcoded FAQ items from brief
- Keep accordion animation

### 8. CTA — `src/landing/components/CTASection.tsx`
- Heading: "Ngừng viết content. Bắt đầu vận hành content."
- Add secondary CTA: "Đặt lịch demo 15 phút"
- Update guarantees text

### 9. Footer — `src/landing/components/FooterSection.tsx`
- Update tagline, columns, bottom bar text per brief
- Add "Designed for Marketing Teams in 🇻🇳 🇹🇭 🌏"

## New Files to Create (6 New Sections)

### 10. `src/landing/components/ProblemSection.tsx`
- 3 problem cards with red stat highlights
- Tag "VẤN ĐỀ", heading, sub per brief

### 11. `src/landing/components/ReframeSection.tsx`
- 2-column comparison: AI Tool (❌) vs Flowa Agent (✅)
- 8 items each column

### 12. `src/landing/components/CampaignSection.tsx`
- 4 tabs with AnimatePresence switching
- Calendar/timeline mockups per tab
- Pull quote blockquote

### 13. `src/landing/components/FeaturesSection.tsx`
- 4 feature blocks alternating layout
- Text + visual mockup per feature

### 14. `src/landing/components/LearningSection.tsx`
- 3 memory cards grid

### 15. `src/landing/components/TrustSection.tsx`
- 4 inline trust items + privacy note

### 16. Update `src/landing/components/index.ts`
- Export all new components

### 17. Remove Testimonials from page assembly
- TestimonialsSection removed (social proof bar replaces it)

## Section Order in Final Page
1. Navbar
2. Hero
3. Social Proof Bar (simplified)
4. Problem Section (new)
5. Reframe/Comparison (new)
6. Workflow (rewritten, 5 steps)
7. Campaign Autopilot (new)
8. Features Deep-Dive (new)
9. Industry Memory (existing, updated text)
10. Learning & Memory (new)
11. Trust & Security (new)
12. Pricing (updated)
13. FAQ (updated)
14. Final CTA (updated)
15. Footer (updated)

## Technical Notes
- All new sections use Framer Motion `whileInView` with `once: true`
- Dark theme classes consistent with Hero (`bg-[#09090b]`, `border-white/10`, `bg-white/[0.03]`)
- New sections hardcode Vietnamese, no i18n dependency
- Existing section updates keep layout/animation, only change text content
- `src/components/landing/` old copies are unused (index.ts re-exports), no need to touch them

