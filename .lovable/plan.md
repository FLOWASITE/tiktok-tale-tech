

# Tự động gắn Backlink Blog vào bài đăng Social

## Vấn đề hiện tại

Khi một nội dung đa kênh bao gồm cả **Website/Blog** và các kênh social (Facebook, Twitter, LinkedIn...), hệ thống đăng từng kênh độc lập — không tự động thêm link bài blog vào nội dung social. Người dùng phải copy-paste link thủ công.

## Giải pháp

### 1. Agent Pipeline — Tự động gắn backlink khi publish đa kênh

Trong `supabase/functions/agent-pipeline/index.ts`, khi publish nhiều kênh:

- **Ưu tiên publish `website` trước** các kênh social
- Sau khi blog publish thành công, lấy `postUrl` từ kết quả (ví dụ: `/blog/my-post`)
- Tạo URL đầy đủ: `https://flowa.vn/blog/{slug}` (nếu is_public) hoặc domain của app
- **Tự động append backlink** vào cuối nội dung social hoặc truyền qua `linkUrl` (cho Facebook)

```text
Luồng publish hiện tại:
  facebook → twitter → website  (song song, không liên kết)

Luồng publish mới:
  website (trước) → lấy blogUrl
  facebook (linkUrl = blogUrl) → twitter (append link cuối bài)
```

### 2. Facebook — Truyền `linkUrl` tự động

Facebook hỗ trợ `linkUrl` gốc (hiện đã có trong `publish-facebook`). Chỉ cần truyền blog URL vào `pubPayload.linkUrl`.

### 3. Twitter/LinkedIn/Threads — Append link cuối nội dung

Các kênh không có trường `linkUrl` riêng → append dòng `\n\n📖 Đọc thêm: {blogUrl}` vào cuối content text (trước khi áp dụng UTM).

### 4. DirectPublishButton — Auto-fill link khi có blog post

Khi người dùng publish thủ công qua DirectPublishButton, nếu `contentId` đã có blog post published, tự động query `blog_posts` theo `content_id` để lấy slug và pre-fill `linkUrl`.

## File thay đổi

- **Edit**: `supabase/functions/agent-pipeline/index.ts` — Sắp xếp publish website trước, capture blogUrl, inject vào payload các kênh social
- **Edit**: `src/components/social/DirectPublishButton.tsx` — Query blog_posts theo contentId, auto-fill linkUrl cho Facebook và hiển thị backlink suggestion cho các kênh khác

## Chi tiết kỹ thuật

**Agent pipeline logic** (trong vòng lặp publish):
1. Tách `targetChannels` thành 2 nhóm: `['website']` và `socialChannels`
2. Publish website trước, lưu `blogUrl` từ `publishResults['website'].postUrl`
3. Xây dựng full URL: kiểm tra `is_public` → `https://flowa.vn/blog/{slug}` hoặc app domain
4. Khi publish social channels:
   - Facebook: thêm `linkUrl` vào payload
   - Các kênh khác: append `\n\n📖 Đọc thêm: {fullBlogUrl}` vào `enrichedText`

**DirectPublishButton logic**:
1. Khi dialog mở, nếu có `contentId`, query `blog_posts` where `content_id = contentId AND status = 'published'`
2. Nếu tìm thấy → auto-set `linkUrl` = `https://flowa.vn/blog/{slug}` (nếu is_public) hoặc app blog URL
3. Hiển thị badge nhỏ "🔗 Backlink blog đã được thêm tự động"

