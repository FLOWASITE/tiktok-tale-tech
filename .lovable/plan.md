## Mục tiêu

Lưu lại prompt của mọi ảnh do `generate-brand-image` sinh ra để **debug**, nhưng **chỉ admin hệ thống Flowa** được xem (user thường không thấy). Backfill prompt cho 2 ảnh FinAI đã có để admin review ngay.

---

## Bước 1 — Persist prompt vào `channel_image_history` (early write + late update)

**File:** `supabase/functions/generate-brand-image/index.ts`

1. Sau khi `buildImagePrompt(...)` xong, **insert ngay 1 row** vào `channel_image_history`:
   - `content_id`, `channel`, `organization_id`, `prompt` (full)
   - `aspect_ratio`, `version = next_version`
   - `image_url = ''` (placeholder), `is_selected = false`
2. Lưu `historyRowId`
3. Khi PoYo/Gemini trả ảnh thành công → **UPDATE** row đó: `image_url = <url>`, `is_selected = true`
4. Fail giữa chừng → row vẫn còn prompt với `image_url = ''` → admin debug được

Best-effort: insert history fail vẫn KHÔNG block generation (try/catch warn).

---

## Bước 2 — RLS: chỉ admin Flowa xem được prompt

**Migration mới** trên `channel_image_history`:

- Drop policy SELECT hiện tại (nếu cho phép user xem prompt)
- Tạo 2 policy SELECT:
  - **Org members**: được SELECT nhưng **CHỈ qua VIEW** (xem dưới) — view này KHÔNG expose cột `prompt`
  - **Admin Flowa**: được SELECT full bảng base bao gồm `prompt`, qua hàm `public.has_role(auth.uid(), 'admin')`

**View public:**
```sql
CREATE OR REPLACE VIEW public.channel_image_history_safe
WITH (security_invoker=on) AS
SELECT id, content_id, channel, image_url, aspect_ratio,
       is_selected, version, organization_id, created_at, last_accessed_at
FROM public.channel_image_history;
-- KHÔNG có cột prompt và created_by
```

Base table policy SELECT:
```sql
-- Chỉ admin Flowa SELECT trực tiếp base table (có prompt)
CREATE POLICY "admin_full_select" ON channel_image_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
```

Org members query qua **view** sẽ chỉ thấy URL ảnh (cần cho hiển thị gallery), không thấy prompt.

→ Frontend hiện tại nếu query `channel_image_history` để show ảnh phải đổi sang `channel_image_history_safe`. Tôi sẽ grep + update.

---

## Bước 3 — Sample 100% prompt vào `ai_metrics` (admin-only)

`ai_metrics.sampled_response` đã có RLS admin-only sẵn (theo memory `Carousel Cache & Circuit Breaker`). Image gen volume thấp → ép sample **100%**:
```ts
sampled_response: { prompt: fullPrompt, model: modelUsed, provider }
```
Backup thứ 2 ngoài `channel_image_history` — kể cả history insert lỗi vẫn còn metric.

---

## Bước 4 — Backfill prompt cho 2 ảnh FinAI hiện có

Script offline (Deno) tái dựng prompt cho content `1e518499` (FB + IG):
- Brand FinAI (`9a532865`) colors/industry/style
- Channel FB 16:9 + IG 4:5
- Dùng cùng `_shared/image-prompt-builder.ts` → đảm bảo output y hệt

Insert 2 row vào `channel_image_history` với note `version=backfill_v1`. Admin mở admin panel thấy được prompt ngay.

---

## Bước 5 — UI: nút "Xem prompt" chỉ hiện cho admin

**File:** `src/components/multichannel/<ChannelImageCard>` (sẽ locate trong build)

- Dùng hook role check (`useUserRole` hoặc tương đương đã có trong codebase)
- Nếu `isAdmin === true` → render icon ℹ️ "Xem prompt"
- Click → mở Dialog hiển thị prompt + model + provider + version, có copy-to-clipboard
- User thường: KHÔNG thấy icon

Query: `channel_image_history` (base table) — chỉ admin pass được RLS, user thường nhận empty array. UI fallback: dùng `channel_image_history_safe` view cho gallery (mọi user).

---

## Technical details

**Schema:** không cần thêm cột mới, chỉ tạo view + đổi RLS policy. Migration là additive.

**Code search cần làm khi build:**
- `rg "channel_image_history" src/` → đổi sang view name cho mọi query non-admin
- `rg "has_role|useUserRole|isAdmin" src/` → reuse hook hiện có

**Files sẽ chạm:**
```text
supabase/migrations/<timestamp>_image_prompt_admin_only.sql  (mới — view + RLS)
supabase/functions/generate-brand-image/index.ts             (bước 1+3)
src/components/multichannel/<ChannelImageCard>               (bước 5)
src/hooks/<useChannelImageHistory hoặc tương đương>          (đổi sang view)
scripts/backfill-finai-prompts.ts                            (bước 4 — chạy 1 lần)
mem://features/multichannel/image-prompt-admin-observability-vn  (memory mới)
```

**Không chạm:**
- `_shared/image-prompt-builder.ts` (logic prompt giữ nguyên)
- Các function khác

**Verify khi xong:**
1. Tạo 1 ảnh mới với account user thường → query `channel_image_history` trả 0 rows; query view trả URL không có prompt ✅
2. Login admin → query base table → thấy prompt ✅
3. UI user thường: không thấy icon "Xem prompt" ✅
4. UI admin: thấy + click ra prompt full ✅

---

## Kết quả

- ✅ Mọi ảnh mới → prompt tự lưu, **chỉ admin Flowa xem được**
- ✅ User thường vẫn xem ảnh bình thường, không thấy prompt
- ✅ 2 ảnh FinAI hiện tại được backfill prompt cho admin review
- ✅ Function timeout 150s vẫn lưu được prompt nhờ early-write
