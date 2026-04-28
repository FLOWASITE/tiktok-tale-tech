## Vấn đề

Click **"+ Thêm Fanpage khác"** không vào được màn page picker để chọn fanpage thứ 2. Lý do:

Trong `BrandViewConnectionsTab.handleConnect()` (line 219–247), sau khi mở popup OAuth, code poll DB mỗi 3s:

```ts
const { data } = await supabase
  .from('social_connections')
  .select('id, platform, is_active')
  .eq('brand_template_id', template.id)
  .eq('platform', platform)
  .eq('is_active', true)
  .maybeSingle();   // ⚠ throws khi có >1 row
if (data) {
  clearInterval(pollInterval);
  refetch();
  toast.success('Đã kết nối ... thành công!');
  if (popup && !popup.closed) popup.close();   // ⚠ ĐÓNG luôn popup picker
}
```

Vì brand đã có sẵn 1 fanpage active, ngay tick poll đầu tiên (3s sau khi click), code:
1. Tìm thấy connection cũ → tưởng là kết nối thành công.
2. Bắn toast "Đã kết nối thành công!" (sai).
3. **Đóng popup picker** trước khi user kịp chọn page thứ 2.

Logic này được viết cho platform single-connection, không tương thích với Facebook multi-fanpage.

Ngoài ra `.maybeSingle()` sẽ throw khi đã có ≥2 connection (khi user thêm page thứ 3 trở đi), nhưng `try/catch` đang nuốt lỗi nên không thấy.

## Giải pháp

Sửa logic polling trong `BrandViewConnectionsTab.handleConnect()` để hỗ trợ Facebook multi-page:

### Thay đổi chính
1. **Snapshot existing connections trước khi mở OAuth** — lưu set của `platform_user_id` đang active của brand cho platform đó.
2. **Đổi `.maybeSingle()` → list query**, chỉ coi là "thành công" khi có connection MỚI (page_id chưa có trong snapshot).
3. **Không tự đóng popup** đối với Facebook (để user chọn nhiều page); chỉ refetch khi popup tự đóng hoặc khi phát hiện page mới.
4. **Toast chính xác**: "Đã thêm fanpage mới" thay vì "Đã kết nối thành công" khi đây là page thứ 2+.

### Pseudo-code

```ts
// Snapshot trước OAuth
const { data: existing } = await supabase
  .from('social_connections')
  .select('platform_user_id')
  .eq('brand_template_id', template.id)
  .eq('platform', platform)
  .eq('is_active', true);
const existingIds = new Set((existing || []).map(r => r.platform_user_id));

// Mở popup …

const pollInterval = setInterval(async () => {
  if (popup && popup.closed) {
    clearInterval(pollInterval);
    setTimeout(() => refetch(), 1500);   // user đóng tay
    return;
  }
  const { data } = await supabase
    .from('social_connections')
    .select('id, platform_user_id')
    .eq('brand_template_id', template.id)
    .eq('platform', platform)
    .eq('is_active', true);
  const newOne = (data || []).find(r => !existingIds.has(r.platform_user_id));
  if (newOne) {
    // Refetch UI nhưng KHÔNG đóng popup (cho phép pick thêm page khác)
    refetch();
    existingIds.add(newOne.platform_user_id);   // tránh trigger toast lặp
    toast.success(
      platform === 'facebook' && existingIds.size > 1
        ? 'Đã thêm fanpage mới!'
        : `Đã kết nối ${PLATFORM_CONFIG[platform].name} thành công!`
    );
    // không close popup, không clearInterval — để user pick thêm
  }
}, 3000);
```

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/brand/BrandViewConnectionsTab.tsx` | Refactor `handleConnect` polling: snapshot existing IDs, đổi `.maybeSingle()` → list, không auto-close popup cho Facebook |

## Tóm tắt cho user

Đang fix bug: nút "Thêm Fanpage khác" của Facebook không mở được trang chọn page vì hệ thống tưởng đã kết nối (do đã có 1 fanpage cũ). Sau fix, click nút sẽ mở đúng màn picker, bạn chọn page nào thì page đó được thêm, popup không tự đóng để bạn có thể chọn nhiều page liên tiếp.
