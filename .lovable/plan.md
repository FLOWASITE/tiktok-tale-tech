

# Fix: Admin không thể xem đầy đủ thống kê nội dung của user khác

## Nguyên nhân

Bảng `multi_channel_contents` (và `carousels`, `channel_image_history`) có RLS chỉ cho phép:
- User xem bài của chính mình (`user_id = auth.uid()`)
- Thành viên cùng org xem bài trong org đó

Khi admin (flowasite@gmail.com) query thống kê cho duy@gmail.com, RLS chặn các bài thuộc org mà admin không phải member. Cụ thể:
- duy có **12 bài** (10 ở workspace cá nhân `f28873...`, 2 ở Flowa `bccfec...`)
- Admin chỉ là member của Flowa → chỉ thấy **2 bài**
- Kết quả thống kê sai

**Lưu ý:** DB thực tế chỉ có **12 bài** cho duy@gmail.com, không phải 20. Nếu bạn chắc chắn phải có 20 bài, có thể một số bài đã bị xóa hoặc tạo bởi user khác.

## Giải pháp

### 1. Thêm RLS policy cho admin xem tất cả (migration)
Thêm SELECT policy trên 3 bảng cho phép admin (dùng `has_role()`) xem toàn bộ:

```sql
-- multi_channel_contents
CREATE POLICY "Admins can view all multi_channel_contents"
ON public.multi_channel_contents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- carousels  
CREATE POLICY "Admins can view all carousels"
ON public.carousels FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- channel_image_history
CREATE POLICY "Admins can view all channel_image_history"
ON public.channel_image_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

### 2. Không cần sửa code frontend
`UserDetailSheet.tsx` đã query đúng cách. Chỉ cần RLS cho phép admin đọc là thống kê sẽ chính xác.

### Scope
- **1 migration** thêm 3 RLS policies
- **0 file code** cần sửa

