## Chẩn đoán

Bài đăng Blogger/WordPress trống ký tự **không phải lỗi ở publish** mà là lỗi ở `generate-multichannel`: dữ liệu `blogger_content` và `wordpress_content` trong DB **luôn rỗng / null** ngay từ lúc generate.

Bằng chứng từ DB (10 row gần nhất):

```
title                                                 | web_len | blogger_len | wp_len
------------------------------------------------------+---------+-------------+-------
Tại sao 30% nội dung của bạn bị bỏ rơi…              |       0 |           0 |      0
Flowa kiểm chứng: Một AI Agent tự vận hành…          |       0 |           0 |      0
... (tất cả đều 0)
```

→ AI có chạy generate (token được dùng), nhưng cột long-form không bao giờ được ghi.

## Root cause

File: `supabase/functions/generate-multichannel/index.ts`

### Lỗi 1: CREATE path quên insert blogger_content / wordpress_content

Ở block INSERT (dòng ~5615–5635) chỉ liệt kê tay từng cột:

```ts
.insert({
  website_content: ...,
  facebook_content: ...,
  instagram_content: ...,
  // ... đủ các social
  bluesky_content: ...,
  // ❌ KHÔNG có blogger_content
  // ❌ KHÔNG có wordpress_content
})
```

Trong khi UPDATE path (expand mode, dòng ~5532–5547) thì loop qua `CHANNEL_COLUMN_MAP` đúng nên insert được cả 2 cột mới này. Vì vậy lần đầu tạo bài (đa số trường hợp) → 2 cột long-form trống.

### Lỗi 2: Có thể AI chưa được prompt để trả `blogger_content` / `wordpress_content`

Cần verify schema yêu cầu AI output có khai báo 2 key này hay không (chỗ `channelProperties` quanh dòng 4030/4212 đang chỉ thấy `website_content`). Nếu AI không bao giờ trả 2 key này → kể cả vá insert cũng vẫn rỗng.

## Plan sửa

### 1. Vá CREATE path ghi đủ long-form cột

Trong `generate-multichannel/index.ts` block INSERT:
- Thêm `blogger_content: generatedData.blogger_content || null`
- Thêm `wordpress_content: generatedData.wordpress_content || null`

Tốt hơn: refactor để dùng cùng `CHANNEL_COLUMN_MAP` loop như UPDATE mode (tránh lặp lại bug khi thêm channel mới sau này).

### 2. Đảm bảo AI sinh `blogger_content` và `wordpress_content`

Kiểm tra schema/prompt builder của generate-multichannel:
- Khi `channels` có `blogger` → schema phải yêu cầu key `blogger_content` (string, 500–800 từ, casual).
- Khi `channels` có `wordpress` → schema phải yêu cầu key `wordpress_content` (string, 1200–2000 từ, in-depth).
- Nếu hiện tại đang fallback sang `website_content` chung → tách riêng theo `channelSettings.format_description` đã định nghĩa trong memory.

Sau sửa, AI output JSON sẽ có dạng:
```json
{
  "website_content": { "content": "...", "seo_data": {...} },
  "blogger_content": "Bài casual 500-800 từ...",
  "wordpress_content": "Bài in-depth 1200-2000 từ..."
}
```

### 3. Thêm log để dễ debug lần sau

Trước khi insert/update, log:
```
[generate-multichannel] persist channels=[blogger,wordpress,...]
  blogger_len=N wordpress_len=N website_len=N
```

Nếu len=0 mà channel được chọn → warning rõ ràng để biết bug ở generation chứ không phải DB.

### 4. (Tuỳ chọn) Recovery cho các bài đã tạo rỗng

Hiện tại 9/10 bài gần nhất đã có `blogger_len = wp_len = 0`. Sau khi vá, user sẽ phải:
- Hoặc dùng nút "Regenerate channel" (UPDATE mode đã chạy đúng) cho từng bài cũ.
- Hoặc tạo bài mới.

Tôi **không** đề xuất chạy backfill tự động vì việc này sẽ tốn quota AI của user. Chỉ cần báo trong UI khi publish gặp content rỗng: "Kênh này chưa có nội dung, hãy bấm Regenerate".

## File sẽ sửa

- `supabase/functions/generate-multichannel/index.ts`
  - INSERT block: thêm `blogger_content`, `wordpress_content` (hoặc refactor sang loop CHANNEL_COLUMN_MAP).
  - Schema/prompt: đảm bảo AI sinh 2 key này khi channel được chọn.
  - Thêm log persist length per channel.

- `supabase/functions/channel-publisher/index.ts` (nhỏ)
  - Khi resolve content rỗng cho blogger/wordpress, message lỗi rõ hơn: gợi ý user bấm "Tạo lại nội dung kênh này".

Không động database schema (cột đã có sẵn từ migration trước), không động OAuth, không backfill data cũ.