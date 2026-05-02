## Nguyên nhân gốc (đã xác nhận từ DB + logs + code)

Logs `generate-multichannel` cho thấy backend tạo nội dung Blogger (1257 chars) và WordPress (sau retry: 4071 chars) thành công, đoạn code insert cũng truyền đúng:

```ts
blogger_content: channels.includes('blogger') ? (channelResults.blogger || null) : null,
wordpress_content: channels.includes('wordpress') ? (channelResults.wordpress || null) : null,
```

NHƯNG truy vấn DB cho 7 record gần nhất (kể cả `86cd337f...`) đều cho `blogger_content` và `wordpress_content` = NULL, dù `selected_channels` chứa `blogger`/`wordpress` và `website_content` đầy đủ vài nghìn chars.

Lý do: payload đi qua `sanitizeMultiChannelPayload()` ở `supabase/functions/generate-multichannel/index.ts:736`. Hàm này filter tất cả key không nằm trong whitelist `MULTI_CHANNEL_CONTENT_COLUMNS` (line 684-734). Whitelist này có `website_content`, `facebook_content`, `instagram_content`, ... **nhưng KHÔNG có `blogger_content` và `wordpress_content`**. Hai trường này bị strip trước khi gửi xuống Postgres → DB nhận NULL → UI mockup hiển thị trống dù streaming đã thấy text chạy.

Đây là lý do bug "lặp đi lặp lại": mọi guard/retry/prompt fix đều đúng, nhưng giá trị bị filter ngay tại bước cuối cùng nên không bao giờ tới được DB.

## Fix

1 thay đổi nhỏ trong `supabase/functions/generate-multichannel/index.ts`:

Thêm 2 dòng vào `MULTI_CHANNEL_CONTENT_COLUMNS` (sau dòng `'website_seo_data'`):

```ts
'blogger_content',
'wordpress_content',
```

Tác động:
- Áp dụng cho cả 2 path (streaming `insert` line 3880 và non-streaming `insert` line 5991) vì cả 2 đều dùng `buildMultiChannelCreatePayload` → `sanitizeMultiChannelPayload`.
- Cũng fix path `expand` (update) vì dùng chung `sanitizeMultiChannelPayload`.
- Cũng fix path regenerate single-channel cho blogger/wordpress vì update payload chạy qua cùng sanitize.

## Bonus hardening (cùng file, không bắt buộc nhưng nên làm)

- Thêm `industry`, `content_role` đã có rồi — kiểm tra nhanh các cột long-form khác có thể bị thiếu (ví dụ nếu sau này thêm channel mới): viết unit test đảm bảo whitelist đồng bộ với schema. Hiện tại chỉ thêm 2 cột thiếu để fix dứt điểm bug user đang gặp.
- Sau khi deploy, các record cũ (NULL) vẫn cần user bấm "Tạo lại nội dung" trong tab Blogger/WordPress để sinh text mới. Bài mới tạo sau khi fix sẽ tự có text Blogger/WordPress đúng.

## Files thay đổi

- `supabase/functions/generate-multichannel/index.ts` (chỉ thêm 2 entry vào Set)
- `.lovable/memory/features/multichannel/longform-channel-separation-vn.md` (note bug + fix để tránh tái diễn)

## Test sau deploy

1. Tạo bài mới chọn cả Website + Blogger + WordPress.
2. Chạy SQL: `SELECT length(blogger_content), length(wordpress_content) FROM multi_channel_contents WHERE id = '<new_id>'` → cả 2 phải > 0.
3. Mở viewer → tab Blogger và tab WordPress phải hiển thị nội dung trong mockup, không còn banner "Chưa có nội dung riêng".
