## Vấn đề

Sau khi OAuth Google thành công, callback redirect `success=true` về UI nhưng:
- DB query xác nhận **không có row nào** trong `social_connections` cho `platform='blogger'` (0 rows).
- UI poll mỗi 3s → không thấy row mới → không update.

## Nguyên nhân

`supabase/functions/blogger-oauth-callback/index.ts` **swallow lỗi DB** ở 2 chỗ:

```ts
if (existing) {
  await supabase.from('social_connections').update(...);  // ❌ no error check
} else {
  await supabase.from('social_connections').insert(...);  // ❌ no error check
}
```

→ Insert fail nhưng vẫn redirect `success=true`. Không có log nào trong edge function logs để biết lỗi cụ thể.

Khả năng cao là 1 trong các vấn đề sau (cần log để xác định chính xác):
- RLS policy chặn (mặc dù dùng service role — nhưng có thể có trigger/check constraint)
- Một field nào đó vi phạm constraint (vd `platform` enum không chứa `'blogger'`, hoặc `scopes` array format sai)
- Trigger `prevent_byob_collision_with_default_bot` hoặc tương tự fail

## Giải pháp

### Fix 1: `supabase/functions/blogger-oauth-callback/index.ts` (line 144-148)
Check error sau update/insert + log chi tiết + throw để UI thấy lỗi thật:

```ts
if (existing) {
  const { error: updErr } = await supabase
    .from('social_connections').update(connectionData).eq('id', existing.id);
  if (updErr) {
    console.error('[blogger-oauth-callback] UPDATE failed:', updErr);
    throw new Error(`DB update failed: ${updErr.message}`);
  }
} else {
  const { data: inserted, error: insErr } = await supabase
    .from('social_connections').insert(connectionData).select('id').single();
  if (insErr) {
    console.error('[blogger-oauth-callback] INSERT failed:', insErr,
      'payload:', JSON.stringify({ ...connectionData, access_token: '[redacted]', refresh_token: '[redacted]' }));
    throw new Error(`DB insert failed: ${insErr.message}`);
  }
  console.log('[blogger-oauth-callback] INSERT ok, id:', inserted?.id);
}
```

### Fix 2: Verify `social_connections.platform` enum chấp nhận `'blogger'`
Check via psql: `SELECT enum_range(NULL::social_platform_type)` (hoặc check column type). Nếu là enum và thiếu `'blogger'` → cần migration `ALTER TYPE ... ADD VALUE 'blogger'`.

Nếu column là text (không enum) → bỏ qua fix này.

### Fix 3 (nếu cần): Migration thêm `'blogger'` vào enum
Chỉ tạo nếu Fix 2 phát hiện thiếu:
```sql
ALTER TYPE public.social_platform_type ADD VALUE IF NOT EXISTS 'blogger';
```

## Testing sau khi triển khai

1. Connect Blogger lại từ UI
2. Check edge function logs `blogger-oauth-callback` — phải thấy `INSERT ok` hoặc lỗi cụ thể
3. Query DB: `SELECT * FROM social_connections WHERE platform='blogger'` → phải có row
4. UI hiện badge "Đã kết nối"

## Files thay đổi

- `supabase/functions/blogger-oauth-callback/index.ts` (Fix 1 — log + propagate error)
- (Tuỳ chẩn đoán) Migration enum nếu cần

## Lưu ý

Đây là plan **bước 1**: thêm logging để biết lỗi thật. Sau khi user retry và logs hiện lỗi cụ thể, sẽ fix tiếp (RLS / enum / constraint / trigger) ở bước 2.
