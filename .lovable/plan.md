## Vấn đề

Hiện tại `Website`, `Blogger`, `WordPress` là 3 nút chọn riêng trên UI nhưng pipeline cố ý gộp chung vào **1 cột `website_content`** + chạy long-form pipeline **1 lần duy nhất**. Hệ quả: chọn cả 3 → cùng một bài. Khi publish ra Blogger / WordPress / website đều đăng nội dung giống hệt.

Bạn muốn **3 bài hoàn toàn khác nhau**, đặc thù chính là **độ dài & cấu trúc heading**.

## Định hướng

Tách 3 kênh thành 3 dòng dữ liệu độc lập, mỗi dòng có cấu hình riêng:

| Kênh | Độ dài | Cấu trúc | Tone |
|------|--------|----------|------|
| **Website** | 800–1200 từ | H1 → 3-4× H2, đoạn ngắn, có CTA cuối, schema-friendly | Corporate, súc tích |
| **Blogger** | 500–800 từ | H1 → 2× H2 + bullet list, paragraph thoáng, conversational | Casual / personal blog, có labels |
| **WordPress** | 1200–2000 từ | H1 → 4-6× H2 + H3 lồng, có TOC, FAQ block, callout, internal-link suggestions | Chuyên môn sâu, in-depth guide |

Mỗi kênh chạy AI call riêng (~3× token long-form, có cảnh báo cost trên UI).

## Các thay đổi

### 1. Database (migration mới)
Thêm 2 cột vào `multi_channel_contents`:
- `blogger_content text`
- `wordpress_content text`
(Giữ nguyên `website_content` để không phá data cũ.)

### 2. Channel settings (`src/types/channelSettings.ts`)
- `website`: 800–1200 từ, format guidance "H1 + 3-4 H2, paragraph 2-3 câu, CTA cuối"
- `blogger`: 500–800 từ, format "casual blog, H1 + 2 H2, bullet list, conversational"
- `wordpress`: 1200–2000 từ, format "in-depth guide, H1 + 4-6 H2 + H3, TOC, FAQ block, callouts"

### 3. Generator (`supabase/functions/generate-multichannel/index.ts`)
- **Bỏ logic collapse** `blogger`/`wordpress` → `website` (dòng ~1537–1560).
- Trong `CHANNEL_CONTENT_FIELD` map: `blogger` → `blogger_content`, `wordpress` → `wordpress_content`.
- Mở rộng `LONG_FORM_CHANNELS` để cả 3 đều chạy long-form pipeline song song (mỗi cái 1 prompt riêng dùng `format_description` + `min/max_length` từ channel settings).
- Áp dụng **deduplication Jaccard** giữa 3 output để tránh AI vô tình viết giống nhau (đã có sẵn pattern dedup).
- Cảnh báo cost ở response metadata khi user chọn ≥2 trong nhóm long-form.

### 4. Frontend
- `src/types/multichannel.ts`: thêm `blogger_content`, `wordpress_content` vào `MultiChannelContent` interface + `LONG_FORM_FIELDS`.
- `useContentAnalysis.ts`, viewer/editor: đọc đúng cột theo channel thay vì luôn fallback `website_content`.
- `ContentMockupToggle` / preview: render Blogger và WordPress với mockup riêng (header style khác) thay vì dùng chung "general" frame.
- Cảnh báo nhỏ khi user tick cả 3: "Sẽ tạo 3 bài khác nhau (~3× tokens long-form)".

### 5. Publishers
- `publish-blogger`: đọc `blogger_content` (fallback `website_content` nếu null cho data cũ).
- `publish-wordpress`: đọc `wordpress_content` (fallback `website_content`).
- `publish-blog` / website publisher: giữ `website_content`.

### 6. Backward compatibility
- Data cũ: nếu `blogger_content` / `wordpress_content` NULL → tự động dùng `website_content` (read-side fallback). Không cần backfill.
- Regenerate đơn lẻ: chọn "Regenerate Blogger" sẽ ghi `blogger_content`, không đụng `website_content`.

## Tệp dự kiến chỉnh sửa

- `supabase/migrations/<timestamp>_add_blogger_wordpress_columns.sql` (mới)
- `src/types/channelSettings.ts`
- `src/types/multichannel.ts`
- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/publish-blogger/index.ts`
- `supabase/functions/publish-wordpress/index.ts`
- `src/hooks/useContentAnalysis.ts`
- `src/components/viewer/ContentMockupToggle.tsx` (+ mockup riêng cho Blogger / WordPress nếu cần)
- Memory: `mem://features/multichannel/longform-channel-separation-vn.md` (mới)

## Ghi chú cost
Mỗi long-form ~ 1.5–2k output tokens. Chọn cả 3 sẽ tốn gấp 3 → khoảng 4.5–6k tokens output cho phần long-form. Sẽ hiển thị badge cảnh báo trong UI khi tick nhiều hơn 1 kênh long-form.