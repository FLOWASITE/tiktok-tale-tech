

# Rà soát Dark Theme nhất quán + Thêm Theme Toggle cho Landing Page

## Tổng quan
Chuyển toàn bộ landing page từ hardcoded dark colors sang CSS variable-based theming (Tailwind semantic classes), và thêm nút toggle theme vào Navbar. Khi user chuyển theme (light/dark/lime), landing page sẽ thay đổi theo.

## Phạm vi thay đổi

### 1. Thêm Landing Theme Variables vào `src/index.css`
- Thêm CSS custom properties cho landing-specific colors (gradient dots, indigo/violet accents) cho cả `:root`, `.dark`, `.lime`
- Ví dụ: `--landing-accent`, `--landing-card-bg`, `--landing-card-border`

### 2. Thêm Theme Toggle vào `src/landing/components/LandingNav.tsx`
- Import và render `ThemeToggle` component (đã có sẵn) vào navbar, cạnh CTA buttons
- Style toggle phù hợp với landing aesthetic (ghost variant, icon nhỏ)

### 3. Chuyển đổi hardcoded colors trong 15 files landing

Thay thế pattern chung trong tất cả các section components:

| Hardcoded | Thay bằng |
|-----------|-----------|
| `bg-[#09090b]` | `bg-background` |
| `text-white` | `text-foreground` |
| `text-gray-400` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `text-gray-600` | `text-muted-foreground/70` |
| `border-white/10` | `border-border` |
| `border-white/5` | `border-border/50` |
| `bg-white/5` | `bg-muted/50` |
| `bg-white/[0.03]` | `bg-muted/30` |
| `hover:bg-white/10` | `hover:bg-muted` |
| `hover:text-white` | `hover:text-foreground` |

**Files cần sửa (15 files):**
- `HeroSection.tsx` — section bg, text colors, pipeline cards, channel outputs
- `LandingNav.tsx` — header bg, scroll state, mobile menu bg, links
- `SocialProofSection.tsx` — section bg, text, borders
- `ProblemSection.tsx` — section bg, cards, stats
- `ReframeSection.tsx` — section bg, comparison columns
- `WorkflowSection.tsx` — section bg, step cards, badges
- `CampaignSection.tsx` — section bg, tabs, cards
- `FeaturesSection.tsx` — section bg, feature cards
- `IndustryMemorySection.tsx` — section bg (600 lines, careful audit)
- `LearningSection.tsx` — section bg, memory cards
- `TrustSection.tsx` — section bg, trust items
- `PricingSection.tsx` — section bg, plan cards, gradient borders
- `FAQSection.tsx` — section bg, accordion items
- `CTASection.tsx` — section bg, CTA card
- `FooterSection.tsx` — footer bg, links, borders

### 4. Cập nhật `PublicPageLayout.tsx`
- Đã dùng `bg-background` (OK), không cần sửa

### 5. Cập nhật `src/landing/pages/Landing.tsx` + `src/pages/Landing.tsx`
- Thay `bg-[#09090b]` → `bg-background`

### 6. Giữ nguyên gradient accents
- Gradient indigo→violet cho CTAs và highlights giữ nguyên (không phụ thuộc theme)
- Chỉ thay background/text/border colors

## Lưu ý kỹ thuật
- Indigo/violet gradients trên CTA buttons giữ nguyên vì đây là brand color, không phải theme color
- Hero grid background pattern cần điều chỉnh opacity cho light mode
- SalesChatWidget (674 lines) cần audit riêng nếu có hardcoded colors
- Tổng cộng ~15 files cần edit, mỗi file thay thế 3-15 class names

