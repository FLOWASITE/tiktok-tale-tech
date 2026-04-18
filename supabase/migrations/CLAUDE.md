# Migrations Rules

## Filename pattern
`YYYYMMDDHHMMSS_<uuid>.sql` — auto-generated bởi Lovable/Supabase. Đừng tự đặt tên thủ công, để tooling generate.

## Bất biến
- **KHÔNG BAO GIỜ** edit migration đã commit/deploy. Hệ thống dùng hash để verify; sửa = hỏng deployment chain
- **KHÔNG** xóa migration cũ
- Mọi thay đổi schema = tạo migration MỚI ở timestamp mới nhất
- Đã có 268 migrations — một số table phụ thuộc nhau, đừng giả định schema dựa trên file đơn lẻ

## Style observed trong repo
- Idempotent: `DROP CONSTRAINT IF EXISTS` trước khi `ADD CONSTRAINT`
- Schema mặc định `public.` (luôn prefix table name: `public.brand_templates`)
- ALTER thay vì DROP + CREATE để giữ data
- CHECK constraint cho enum-like columns (vd `task_type IN ('core_content', 'multichannel', 'carousel_image')`)

## RLS — bắt buộc cho mọi table mới
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- Pattern phổ biến: organization isolation
CREATE POLICY "org_members_can_select" ON public.<table>
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
```
- Owner-only tables: `profiles`, `social_connections` (filter bằng `user_id = auth.uid()`)
- Org-scoped tables: hầu hết content tables (filter qua `organization_members`)
- Admin-only tables: `social_platform_settings`, AI config tables

## Knowledge Graph & vector
- Embedding dim = **384** (`gte-small`), KHÔNG đổi
- Index pattern: `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`
- Sau khi insert nhiều rows → `ANALYZE <table>` để IVF rebuild stats

## Khi cần thay đổi
- **Add column** → an toàn, thêm `DEFAULT` để không break existing rows
- **Change CHECK constraint** → DROP IF EXISTS rồi ADD lại với value mới (xem migration `20260418080807_*` làm pattern)
- **Rename column** → preferably thêm column mới + backfill + deprecate, đừng `ALTER ... RENAME` nếu code đang dùng
- **Industry Memory tables** (`industry_global_packs`, `industry_jurisdiction_profiles`, etc.) → confirm với owner trước, đây là source-of-truth compliance data

## 🚫 Đừng làm
- Không chạy `supabase db push` production mà không review migration cuối
- Không tạo migration "test" rồi xóa — commit là vĩnh viễn
- Không ALTER table có trigger phức tạp mà không kiểm tra trigger logic
- Không drop FK constraint mà không check inbound references
