## Mục tiêu

Đơn giản hoá `PlanLimitsManager` — không còn 2 nhóm v2/legacy. Chỉ hiển thị **5 trường chính**:

```text
┌─ Hạn mức gói ──────────────────────────────────────────────┐
│ Nội dung │ Ảnh AI │ Video │ Brands │ AI chat │
└─────────────────────────────────────────────────────────────┘
```

Các field legacy (`monthly_scripts`, `monthly_carousels`, `monthly_multichannel`, `monthly_images`) bị **ẩn hoàn toàn khỏi UI admin** và **ngừng enforcement ở backend** (chuyển sang dùng `can_use_unit` cho 3 units).

---

## Thay đổi cụ thể

### 1. `PlanLimitsManager.tsx` — Bỏ collapsible, gộp thành 1 nhóm 5 fields

- Xoá state `showLegacy` và `<Collapsible>` "Hiển thị fields phụ trợ".
- Đổi `v2LimitFields` thành `mainLimitFields = ["monthly_content_units", "monthly_image_units", "monthly_video_units", "monthly_brands", "monthly_ai_edits"]`.
- Xoá `legacyLimitFields` array.
- Cập nhật `FIELD_LABELS`:
  - `monthly_content_units` → "Nội dung"
  - `monthly_image_units` → "Ảnh AI"
  - `monthly_video_units` → "Video"
  - `monthly_brands` → "Brands"
  - `monthly_ai_edits` → **"AI chat"** (đổi nhãn, giữ cột DB)
- Cập nhật `FIELD_TOOLTIPS` cho `monthly_ai_edits`: "Số lượt AI chat / tháng. -1 = không giới hạn".
- Cập nhật `FIELD_ICONS`: `monthly_ai_edits` → icon `MessageSquare` thay vì `Bot` (rõ nghĩa "chat" hơn).
- Bỏ badge "v2" trên nhóm (vì giờ chỉ còn 1 nhóm thống nhất).
- Render section "Hạn mức" như cũ nhưng map qua `mainLimitFields` duy nhất.

### 2. `useSubscriptionReport.ts` & `UsageQuotaWidget.tsx`

- Thêm key thứ 4 cho `QuotaKey`: `ai_chats` (với label "AI chat").
- Trong `buildQuotas`, đếm `usage_logs` `usage_type IN ('ai_edit')` (giữ enum cũ) gắn nhãn "AI chat".
- Widget dashboard: thêm progress bar "AI chat" cùng nhóm với Nội dung/Ảnh/Video; ẩn collapsible "legacy products".

### 3. `_shared/quota-units.ts` — Mở rộng cho ai_chat

- Thêm unit type thứ 4 `'ai_chat'` map sang `monthly_ai_edits`.
- `checkUnitQuota` hỗ trợ `'content' | 'image' | 'video' | 'ai_chat'`.
- Edge functions chat/edit gọi `checkUnitQuota(orgId, 'ai_chat')` thay vì `can_use_feature('ai_edit')`.

### 4. Ngừng enforcement legacy ở backend

- Các edge function generate (`generate-script`, `generate-carousel`, `generate-multichannel`, `generate-video`) hiện gọi `can_use_feature(...)` với 4 usage_types legacy → đổi sang gọi `checkUnitQuota(orgId, 'content' | 'image' | 'video')` thuần.
- Giữ `can_use_feature` SQL function trong DB (không drop) để backward compat, nhưng không gọi từ code mới.
- Vẫn `INSERT usage_logs` với `usage_type` cũ (`script`, `carousel`, `multichannel`, `image_generation`, `video_generation`, `ai_edit`) — `get_org_usage_units()` đã aggregate từ các loại này, không break analytics.

### 5. RevenueStats & SubscriptionDetailDrawer

- `useAdminPlanStats` & `RevenueStats` chart "Tiêu thụ units theo tier" → giữ 3 cột Content/Image/Video, **thêm cột thứ 4** "AI chat" (sample query thêm `monthly_ai_edits` usage).
- `SubscriptionDetailDrawer` panel "Usage chu kỳ hiện tại" → thêm progress bar thứ 4 "AI chat".

### 6. Memory update

- Cập nhật `mem://business/pricing-v2-units` ghi rõ: **4 hạn mức chính** = 3 units output + AI chat (re-use `monthly_ai_edits`); legacy fields deprecated.

---

## Files cần sửa

- **Updated** `src/components/admin/plans/PlanLimitsManager.tsx` (bỏ collapsible, 5 fields chính)
- **Updated** `src/components/dashboard/UsageQuotaWidget.tsx` (thêm AI chat, bỏ legacy collapsible)
- **Updated** `src/hooks/reports/useSubscriptionReport.ts` (thêm `ai_chats` key)
- **Updated** `src/hooks/admin/useAdminPlanStats.ts` (thêm chiều ai_chat)
- **Updated** `src/components/admin/plans/RevenueStats.tsx` (chart 4 cột)
- **Updated** `src/components/admin/plans/SubscriptionDetailDrawer.tsx` (4 progress bars)
- **Updated** `supabase/functions/_shared/quota-units.ts` (hỗ trợ `ai_chat`)
- **Updated** edge functions còn dùng `can_use_feature` cho legacy: chuyển sang `checkUnitQuota`
- **Updated** `mem://business/pricing-v2-units`

## Không thuộc phạm vi
- Không drop cột `monthly_scripts/carousels/multichannel/images` khỏi DB (giữ backward compat).
- Không sửa `can_use_feature()` SQL function (giữ nguyên cho safety, chỉ ngừng gọi từ code mới).
- Không tạo enum `usage_type` mới — re-use `ai_edit` enum hiện có.
