

# Fix: Admin không thấy Brand trong chi tiết Workspace

## Nguyên nhân
Bảng `brand_templates` chỉ có RLS policies cho org members và owner. Admin hệ thống (không phải member của workspace TAF) bị chặn bởi RLS khi query brands.

DB xác nhận workspace TAF (`f28873d2-...`) có **2 brands**: "Công ty Kế toán TAF" và "Công ty TNHH Tư vấn Kiểm toán TAF".

## Giải pháp
Thêm RLS policy cho admin SELECT trên `brand_templates`:

```sql
CREATE POLICY "Admins can view all brand_templates"
ON public.brand_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
```

## Files thay đổi

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Thêm admin SELECT policy cho `brand_templates` |

Chỉ 1 migration, không cần sửa code frontend.

