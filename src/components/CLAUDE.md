# Components Rules

(Lovable cũng edit file ở đây — giữ pattern nhất quán để diff sạch)

## Naming & file layout
- File: `PascalCase.tsx` (vd `BrandCard.tsx`, `ApprovalDialog.tsx`)
- Subfolder theo domain (`brand/`, `topic/`, `carousel/`, `agents/`, `compliance/`, `multichannel/`, `admin/`)
- shadcn/ui primitives đặt trong `ui/` (lowercase: `button.tsx`, `dialog.tsx`)
- Tests co-located: `<Component>.test.tsx` hoặc trong `__tests__/`

## Imports — luôn dùng alias `@/`
```ts
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBrandTemplates } from '@/hooks/useBrandTemplates';
import { cn } from '@/lib/utils';
```
Thứ tự: external libs → `@/components/ui/*` → `@/components/*` → `@/hooks/*` → `@/lib/*` → `@/utils/*` → types.

## Component structure
```tsx
// 1. Imports
// 2. Props interface (PascalCase + Props suffix)
interface BrandCardProps {
  template: BrandTemplate;
  onEdit: (template: BrandTemplate) => void;
  compact?: boolean;
}

// 3. Helper components (co-located nếu chỉ dùng nội bộ)
function CompletenessRing({ score }: { score: number }) { ... }

// 4. Main component (named export, function declaration)
export function BrandCard({ template, onEdit, compact = false }: BrandCardProps) {
  // hooks → derived state (useMemo) → handlers (useCallback) → render
}
```

## Styling — semantic tokens only
- ✅ `bg-primary`, `text-muted-foreground`, `border-border`, `bg-card`
- ❌ `bg-blue-500`, `text-white`, `bg-gray-100` (bypass theme + dark mode)
- Conditional classes qua `cn(...)` từ `@/lib/utils`
- Custom tokens trong `src/index.css` + `tailwind.config.ts` (HSL CSS vars)

## Data fetching
- KHÔNG fetch supabase trực tiếp trong component — dùng hook trong `@/hooks/*`
- Hook trả TanStack Query result; component handle `isLoading` / `error` / `data`
- Org/brand-scoped data lấy ID từ context (`useOrganization()`, `useBrand()`), không hardcode

## shadcn/ui usage
- Compose primitives, đừng wrap trừ khi cần variant cụ thể của Flowa
- AlertDialog/Dialog: dùng `<AlertDialogTrigger asChild>` để giữ button styling
- Tooltip: wrap trong `<TooltipProvider>` (đã có ở root layout, kiểm tra trước khi thêm)
- Form: `react-hook-form` + `@hookform/resolvers/zod`, dùng `<Form>` wrapper từ `ui/form.tsx`

## Routing
- Internal links: `<Link to="/...">` từ `react-router-dom`, KHÔNG `<a href>`
- Protected pages bọc trong `<ProtectedRoute>` ở `src/app/routes.tsx`, không cần check ở component level

## i18n
- Strings hiển thị user → qua `useTranslation()` + key trong `src/i18n/locales/{vi,en,th}.json`
- Default language `vi`; thêm key vào cả 3 file khi add string mới
- Format date/number theo locale (`Intl.NumberFormat`, `date-fns` với locale)

## Performance
- `useMemo` cho derived computations đắt (filtered/sorted lists)
- `useCallback` cho handlers truyền vào memoized children
- List dài → `@tanstack/react-virtual`
- Image: `<OptimizedImage />` từ `ui/OptimizedImage.tsx` (lazy + aspect ratio)

## Khi tạo component mới
1. Đặt vào subfolder domain phù hợp (đừng nhét hết vào root)
2. Reuse `ui/*` primitives, đừng tạo Button/Card/Dialog mới
3. Test render + key interactions trong `<Component>.test.tsx`
4. Nếu là dialog/modal có form → tách form thành component riêng để re-test dễ
