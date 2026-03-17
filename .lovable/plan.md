

# Bỏ AI Edit khỏi hệ thống quota + Thêm Brands + Cập nhật giá gói

## Tổng quan
Bỏ hoàn toàn AI Edit khỏi hệ thống giới hạn quota (cho dùng unlimited). Thêm `monthly_brands` vào plan_limits. Cập nhật quota và giá theo yêu cầu chính thức.

## Quota chính thức

| Metric | Free | Starter | Pro | Enterprise |
|---|:-:|:-:|:-:|:-:|
| Brands | 1 | 3 | 10 | 30 |
| Content đa kênh | 2 | 20 | 60 | 200 |
| Ảnh AI | 2 | 20 | 60 | 200 |
| Scripts | 2 | 10 | 30 | 100 |
| Carousels | 0 | 3 | 10 | 35 |
| AI Edits | ∞ | ∞ | ∞ | ∞ |
| Giá/tháng | 0₫ | 299.000₫ | 549.000₫ | 1.499.000₫ |

## Thay đổi cần thực hiện

### 1. Database migration
- Thêm cột `monthly_brands INTEGER NOT NULL DEFAULT 1` vào `plan_limits`

### 2. Database data update (INSERT tool)
- Update 4 gói plan_limits với quota mới, giá mới, `monthly_ai_edits = -1`

### 3. Update `can_use_feature` DB function
- Bỏ case `ai_edit` (hoặc luôn return true)

### 4. `src/hooks/useSubscription.ts`
- Thêm `monthly_brands` vào `PlanLimit` interface
- Bỏ `ai_edits` khỏi `UsageStats`
- Thêm đếm brands vào usage query
- Thêm `brands` vào `isWithinLimits` / `getRemainingUsage`

### 5. `src/pages/Account.tsx`
- Bỏ query `ai_edits` từ usage_logs
- Thêm "Thương hiệu" vào `usageItems` array

### 6. `src/hooks/useUsageLogger.ts`
- Bỏ `ai_edit` khỏi `UsageType`

### 7. `supabase/functions/_shared/rate-limiter.ts`
- Bỏ `ai_edit` khỏi mapping và type unions
- Bỏ quota check cho ai_edit

### 8. `supabase/functions/_shared/pipeline/request-validator.ts`
- Bỏ quota check `ai_edit` (chỉ giữ rate limit)

### 9. `supabase/functions/chat-topics/index.ts`
- Bỏ `logUsage(..., 'ai_edit', ...)` call

### 10. `src/components/landing/PricingSection.tsx` + i18n
- Cập nhật giá và features cho 4 gói

### 11. `src/components/admin/UserDetailSheet.tsx`
- Bỏ `ai_edit` khỏi label mapping

## Files thay đổi (11 files)

| File | Thay đổi |
|---|---|
| DB Migration | Thêm `monthly_brands` column |
| DB Data | Update quota + giá 4 gói |
| `can_use_feature` function | Bỏ ai_edit case |
| `useSubscription.ts` | Brands + bỏ ai_edits |
| `Account.tsx` | Usage bar brands, bỏ ai_edit query |
| `useUsageLogger.ts` | Bỏ ai_edit type |
| `rate-limiter.ts` | Bỏ ai_edit mapping |
| `request-validator.ts` | Bỏ quota check ai_edit |
| `chat-topics/index.ts` | Bỏ logUsage ai_edit |
| `PricingSection.tsx` + i18n | Giá mới, features mới |
| `UserDetailSheet.tsx` | Bỏ ai_edit label |

