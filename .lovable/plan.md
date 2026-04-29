Mình thấy đúng vấn đề trong screenshot: nội dung đang mở là bài Blogger của brand TAF nhưng UI đang render như `Website/Blog`, word count = 0 và mockup chỉ có ảnh/khung blog, không có body text. Nguyên nhân khả năng cao là Blogger đang bị alias quá mạnh sang `website`, trong khi UI/generation/publish chưa xử lý đầy đủ case `blogger` như một kênh hiển thị riêng.

Kế hoạch sửa:

1. Tách hiển thị Blogger khỏi Website/Blog trong viewer
- Đổi `blogger` trong `MultiChannelViewer` từ label/shortLabel `Website/Blog`/`Web` thành `Blogger`/`Blogger` hoặc `Blog`.
- `getContentForChannel()` sẽ map `blogger -> website_content`, để Blogger vẫn dùng cùng bài viết dài nhưng UI không báo sai là Website/Blog.
- Các điều kiện riêng cho website như SEO preview/mockup sẽ áp dụng cho cả `website` và `blogger` khi dữ liệu nằm ở `website_content`/`website_seo_data`.

2. Sửa mockup Blogger để luôn hiển thị body text
- Trong `ContentMockupToggle`, truyền `seoData` cho cả `website` và `blogger` thay vì chỉ `website`.
- Trong mockup blog, nếu `content` rỗng nhưng `seoData.content` có dữ liệu thì dùng `seoData.content` làm fallback.
- Nếu cả hai đều rỗng, hiển thị empty state rõ ràng: “Chưa có nội dung bài Blogger” thay vì để vùng bài viết trắng.

3. Sửa dữ liệu trả về khi tạo/tạo lại Blogger
- Hiện backend normalize `blogger -> website` quá sớm, nên có thể làm mất dấu kênh gốc hoặc khiến selected channel/UI lệch.
- Điều chỉnh `generate-multichannel` để:
  - vẫn lưu body Blogger vào `website_content`,
  - vẫn lưu SEO object vào `website_seo_data`,
  - nhưng `selected_channels` giữ được `blogger` khi user chọn Blogger,
  - regenerate/expand channel `blogger` vẫn tạo nội dung bài dài thay vì chỉ map về social/website sai nhãn.

4. Sửa auto image pipeline cho Blogger
- Thêm `blogger` vào danh sách visual channels ở `MultiChannelCreate`, để khi tạo bài Blogger thì ảnh hero được tạo theo kênh Blogger.
- Đảm bảo text summary/image prompt của Blogger lấy từ `website_content` và ảnh lưu dưới key `blogger` hoặc fallback đọc được từ `website` khi publish.

5. Sửa publish Blogger dùng đúng text và ảnh
- `DirectPublishButton` cho Blogger sẽ gửi `stripSeoMetadata(channelContent)` giống blog/website để tránh metadata lẫn vào bài.
- `channel-publisher` khi publish Blogger sẽ tìm featured image theo thứ tự: `channel_images.blogger`, rồi `channel_images.website`, rồi `featured_image_url`.
- Sau publish Blogger, trạng thái nên đánh dấu `blogger` là published nếu selected_channels có Blogger; chỉ fallback sang `website` nếu content cũ không có blogger.

6. Kiểm tra nhanh sau sửa
- Mở lại bài TAF trong viewer: sidebar phải hiện Blogger, header chính là Blogger, word count > 0 nếu có `website_content`.
- Mockup Blogger phải có ảnh hero và phần thân bài text dưới metadata tác giả.
- Nút Đăng Blogger phải publish đúng body text, không chỉ ảnh.

Không cần đổi schema database mới nếu giữ kiến trúc hiện tại: Blogger dùng chung `website_content` và `website_seo_data`, chỉ sửa mapping/hiển thị/publish để không mất text và không bị gọi là “Website/Blog”.