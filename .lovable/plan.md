Mình đã rà soát code và dữ liệu. Vấn đề không chỉ ở mockup: dữ liệu hiện tại cho Blogger/WordPress đang bị rỗng ở DB nên UI/publish fallback sang `website_content`, làm người dùng thấy Blog / WordPress / Web giống nhau.

Số liệu DB hiện tại:
- `blogger` selected: 8 bản, `blogger_content` thiếu: 8 bản.
- `wordpress` selected: 7 bản, `wordpress_content` thiếu: 7 bản.
- `website` selected: 132 bản, `website_content` thiếu: 6 bản.

Nguyên nhân chính cần xử lý dứt điểm:
1. Frontend vẫn fallback `blogger_content || website_content` và `wordpress_content || website_content` trong viewer/export/compare.
2. Nút phụ trong Website viewer đang đăng `channel="blogger"` nhưng truyền chính `website_content`, nên Blogger có thể bị đăng bằng nội dung Website.
3. Streaming generation có prompt riêng cho 3 kênh, nhưng vẫn cho phép lưu record khi Blogger/WordPress trả rỗng; sau đó UI/publish fallback làm lỗi bị che giấu.
4. Preview mode chưa có rule riêng cho Blogger/WordPress nên preview cũng dễ giống Website.
5. Dữ liệu cũ đã thiếu nội dung riêng, cần được đánh dấu/không fallback thay vì âm thầm dùng Website.

Kế hoạch xử lý:

1. Bỏ fallback hiển thị/xuất/so sánh sang Website
- Sửa `MultiChannelViewer.getContentForChannel`:
  - `website` chỉ đọc `website_content`.
  - `blogger` chỉ đọc `blogger_content`.
  - `wordpress` chỉ đọc `wordpress_content`.
- Sửa `ChannelComparison` và `EnhancedExportMenu` tương tự.
- Khi kênh được chọn nhưng chưa có nội dung riêng, hiển thị trạng thái rõ ràng: “Kênh này chưa có nội dung riêng. Bấm Tạo lại nội dung cho kênh này.” thay vì hiển thị bài Website.

2. Gỡ nút đăng Blogger ẩn trong tab Website
- Trong `MultiChannelViewer`, xóa block `channel === 'website'` đang render thêm `DirectPublishButton channel="blogger"` với `content={website_content}`.
- Mỗi kênh chỉ đăng từ tab của chính nó:
  - Website/Blog nội bộ dùng `website_content`.
  - Blogger dùng `blogger_content`.
  - WordPress dùng `wordpress_content`.

3. Siết publish backend để không đăng sai nội dung
- Trong `channel-publisher`:
  - Blogger/WordPress chỉ dùng `blogger_content` / `wordpress_content`.
  - Không fallback sang `website_content` cho record mới.
  - Nếu thiếu nội dung riêng, trả 400 `EMPTY_CHANNEL_CONTENT` với hướng dẫn tạo lại kênh đó.
- Giữ backward-compat có kiểm soát nếu cần: chỉ cho fallback với dữ liệu cũ khi kênh không nằm trong `selected_channels` hoặc khi có flag rõ ràng; mặc định không fallback.

4. Chặn generation lưu thiếu nội dung riêng cho long-form
- Trong `generate-multichannel` streaming create/expand:
  - Sau khi `generateChannelsParallel` xong, kiểm tra các kênh selected: `website`, `blogger`, `wordpress`.
  - Nếu kênh nào thiếu nội dung hoặc quá ngắn, không âm thầm insert null.
  - Thử auto-regenerate riêng kênh thiếu 1 lần bằng prompt đặc thù.
  - Nếu vẫn thiếu, trả lỗi rõ: “Blogger/WordPress chưa tạo được nội dung riêng, vui lòng tạo lại kênh.”
- Khi expand thêm Blogger/WordPress vào content cũ, cũng áp dụng rule này trước khi update DB.

5. Làm prompt/preview tách biệt hơn
- Update preview mode trong `generate-multichannel`:
  - Thêm `blogger` và `wordpress` vào `PREVIEW_CHANNEL_LIMITS` và `PREVIEW_CHANNEL_LABELS`.
  - Inject rule khác nhau:
    - Website: corporate SEO, schema-friendly.
    - Blogger: casual/personal, ngắn hơn, không SEO chặt.
    - WordPress: in-depth/expert, dài hơn, có H2/H3/FAQ/callout.
- Update `MultiChannelPreviewDialog` mapping để Blogger dùng mockup Blogger và WordPress dùng mockup WordPress thay vì `general`.

6. Cập nhật metadata/label gây hiểu nhầm
- Sửa `CHANNELS` description:
  - Blogger không còn “nội dung dùng chung Website”.
  - Website / Blogger / WordPress mô tả rõ 3 output độc lập.
- Sửa `BASE_CHANNEL_CONFIG` label cho Blogger/WordPress nếu còn hiển thị “Website/Blog”.
- Sửa length label trong viewer cho Blogger/WordPress theo settings hiện tại.

7. Dọn dữ liệu cũ theo hướng an toàn
- Không tự copy `website_content` sang `blogger_content`/`wordpress_content` vì sẽ tiếp tục sai logic “cùng 1 nội dung”.
- Với các bản cũ đang selected Blogger/WordPress nhưng content riêng rỗng:
  - UI sẽ hiện missing state và nút “Tạo lại”.
  - Người dùng có thể regenerate từng kênh để sinh nội dung riêng đúng format.
- Nếu muốn, có thể thêm một tác vụ sau để batch-generate lại 8 Blogger + 7 WordPress records, nhưng mình không làm tự động trong plan này để tránh tốn credits/ghi sai hàng loạt.

8. Kiểm tra sau sửa
- Tạo nội dung mới chọn cùng lúc `website + blogger + wordpress` và xác nhận DB có đủ 3 cột khác nhau.
- Mở viewer, compare, export: mỗi kênh đọc đúng cột riêng, không fallback.
- Publish Blogger/WordPress khi thiếu content riêng phải bị chặn với message rõ, không đăng bài Website.
- Publish từng kênh khi có content riêng phải gửi đúng nội dung tương ứng.