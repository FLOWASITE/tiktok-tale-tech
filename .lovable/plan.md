# Sửa lỗi không tạo được ảnh cho nội dung đa kênh

## Triệu chứng
- Vào `/multichannel`, spinner quay mãi không kết thúc.
- Không có lỗi rõ ràng từ "tạo ảnh".
- Không hề có request nào tới edge function `generate-brand-image` trong logs gần đây.

## Nguyên nhân thực sự (không phải do nút tạo ảnh)
Console log lặp lại lỗi sau từ `src/hooks/useMultiChannelContents.ts:174`:

```
Error fetching contents: { code: "57014", message: "canceling statement due to statement timeout" }
```

→ Query `SELECT * FROM multi_channel_contents WHERE organization_id = ...` **bị Postgres giết do quá 8 giây**.
Vì danh sách content không tải được, trang đứng ở trạng thái loading/skeleton, người dùng tưởng "ảnh không tạo được" — thực ra chưa từng vào được màn hình tạo ảnh.

## Vì sao query timeout
Bảng `multi_channel_contents` chỉ ~596 rows / 8.8MB và đã có index `idx_multi_channel_org`. Query lẽ ra phải cực nhanh. Vấn đề nằm ở **RLS policies cho `SELECT`**:

```
Users can view own multi_channel_contents      → auth.uid() = user_id
Users can view org multi_channel_contents      → is_org_member(auth.uid(), organization_id)
Admins can view all multi_channel_contents     → has_role(auth.uid(), 'admin')
```

Cả 3 policy `SELECT` đều gọi `auth.uid()`, `is_org_member()`, `has_role()` **không có `(SELECT …)` wrapper**, nên Postgres re-evaluate cho **mỗi row** thay vì 1 lần. Với 596 row × 3 hàm × subquery vào `user_roles` / `organization_members` ⇒ vượt 8s statement timeout.

Đây là anti-pattern Supabase RLS rất phổ biến (`auth.uid()` phải bọc trong subquery để được cache).

## Kế hoạch sửa

### 1. Migration tối ưu RLS `multi_channel_contents` (chính)
Thay 3 policy `SELECT` bằng phiên bản dùng `initplan` (subquery wrapper) để Postgres chỉ chạy 1 lần / query:

```sql
DROP POLICY "Users can view own multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY "Users can view org multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY "Admins can view all multi_channel_contents" ON public.multi_channel_contents;

CREATE POLICY "mcc_select_unified" ON public.multi_channel_contents
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (organization_id IS NOT NULL
      AND is_org_member((SELECT auth.uid()), organization_id))
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);
```

Gộp 3 policy thành 1 cũng giảm overhead (Postgres OR các policy SELECT, mỗi policy = 1 lần evaluate).

Tương tự áp dụng cho UPDATE/DELETE policy nếu sau migration vẫn còn timeout (theo dõi log).

### 2. Tối ưu query phía client (phụ — chỉ làm nếu cần)
- Trong `useMultiChannelContents.fetchContents`, thay `select('*')` bằng danh sách cột thực sự cần cho list view (bỏ các cột JSONB nặng như `raw_response`, `channels` đầy đủ — chỉ load khi mở chi tiết).
- Thêm `.limit(100)` + pagination nếu workspace có nhiều content.

Bước 2 là tối ưu thêm; chỉ riêng bước 1 đã đủ giải quyết timeout hiện tại.

### 3. Verify
- Sau khi apply migration, reload `/multichannel` → danh sách content load < 1s.
- Mở 1 content → bấm "Tạo ảnh" → quan sát `[SimpleImageGenerator] handleGenerate triggered` trong console + 1 request `generate-brand-image` 200 trong network tab.
- Check edge function logs `generate-brand-image` có trace mới.

## Files dự kiến chạm
- **Mới:** 1 migration SQL (`drop` + `create policy`).
- **Tuỳ chọn:** `src/hooks/useMultiChannelContents.ts` (giảm cột select).

Không đụng tới phần tạo ảnh / edge function — vì code đó vẫn đúng, chỉ bị nghẽn do trang không load.
