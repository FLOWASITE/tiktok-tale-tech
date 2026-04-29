## Vấn đề (đã chẩn đoán)

Bạn đang ở brand **"Flowa - Agentic Content Marketing Platform"** (`8dd69b10-…`) và bấm **Đăng Blogger** không có gì xảy ra (không có log nào ở `publish-blogger` / `channel-publisher`).

Nguyên nhân từ DB:
- Trong bảng `social_connections` chỉ có **1 row Blogger duy nhất** thuộc về brand **"TAF"** (`188f65cc-…`, organization `f28873d2-…`).
- Brand "Flowa" hiện tại (`bccfec38-…` org) **chưa có connection Blogger** nào.
- Theo policy "Brand Connection Isolation", `useSocialConnections` lọc chặt theo `brand_template_id` → trên brand "Flowa" sẽ không thấy connection Blogger nào → nút bấm sẽ navigate về `/connections` mà không hiện lý do, khiến trông như "không phản hồi".
- Bonus: row Blogger hiện tại có `organization_id = NULL` (state OAuth lúc đó chỉ chứa `brandTemplateId`). Backend `channel-publisher` resolve bằng `.eq('organization_id', mcc.organization_id)` nên ngay cả query org-scope cũng miss.

## Các thay đổi đề xuất

### 1. Vá `supabase/functions/blogger-oauth-callback/index.ts`
Sau khi parse state, nếu `organizationId` thiếu nhưng có `brandTemplateId`, **derive** `organizationId` từ `brand_templates.organization_id`. Đảm bảo mọi connection mới luôn có cả 2 ID → resolver org-scope/brand-scope đều tìm thấy.

### 2. Backfill data — migration mới
Tạo migration `update public.social_connections set organization_id = bt.organization_id from brand_templates bt where social_connections.brand_template_id = bt.id and social_connections.organization_id is null;` để vá row "TAF" đang có org NULL. (Migration tool sẽ xin phép user trước khi chạy.)

### 3. UX rõ ràng hơn cho nút "Đăng Blogger" (`src/components/social/DirectPublishButton.tsx`)
Khi `platform === 'blogger'` và `!connection`, thay vì silent navigate, hiển thị toast:
> "Brand này chưa kết nối Blogger. Vào tab Kết nối của brand để kết nối Google/Blogger trước." + nút "Đi đến Kết nối".

Đồng thời log warn `[DirectPublishButton] No blogger connection for brand=<id>` để dễ debug.

### 4. Hành động bạn cần làm (sau khi deploy fix)
- Vào brand **Flowa** → tab **Kết nối** → kết nối **Blogger** (Google OAuth).
- Sau đó bấm **Đăng Blogger** lại — request sẽ tới `publish-blogger` và đăng được bài.

Lý do phải kết nối lại cho brand "Flowa": Flowa tách connection per-brand (mỗi brand có thể chọn blog Blogger khác nhau, refresh token riêng) — không dùng chung connection cross-brand.

## Tệp sẽ chạm
- `supabase/functions/blogger-oauth-callback/index.ts` (derive org_id)
- `supabase/migrations/<timestamp>_backfill_social_connections_org_id.sql` (data fix)
- `src/components/social/DirectPublishButton.tsx` (toast khi thiếu connection blogger)

Không đụng schema, không đụng RLS, không đụng generic publish flow.
