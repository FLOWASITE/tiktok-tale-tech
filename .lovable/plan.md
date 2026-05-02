Mình đã kiểm tra trực tiếp code và dữ liệu mới nhất. Hiện lỗi không phải do mockup nữa, mà do pipeline vẫn cho phép lưu Blogger/WordPress rỗng.

Dữ liệu hiện tại xác nhận vấn đề:
- Các bài mới chọn `blogger`/`wordpress` vẫn có `blogger_content = 0`, `wordpress_content = 0`.
- Ví dụ bài mới nhất `e18f220a...` chọn `[blogger, bluesky, facebook, website, wordpress]`: `website_len = 5830`, nhưng `blogger_len = 0`, `wordpress_len = 0`.

Nguyên nhân chính mình thấy trong code:
1. Streaming create path vẫn chỉ `console.warn` khi Blogger/WordPress rỗng rồi insert `null`.
2. Non-streaming create/expand cũng vẫn lưu `null` nếu AI không trả `blogger_content` / `wordpress_content`.
3. Regenerate path cho Blogger/WordPress dùng prompt chung, không có hard validation sau khi AI stream xong; nếu AI trả rỗng vẫn update DB bằng rỗng.
4. UI có banner “Tạo nội dung riêng”, nhưng nếu regenerate trả rỗng thì người dùng vẫn thấy không có text.
5. Sidebar vẫn chỉ hiện `0 từ`, chưa đánh dấu rõ kênh bị thiếu text.

Kế hoạch xử lý dứt điểm:

1. Thêm guard bắt buộc nội dung cho Blogger/WordPress trước khi lưu
- Trong `generate-multichannel`, tạo helper dùng chung:
  - `normalizeGeneratedText(value)` để unwrap string/object an toàn.
  - `isLongformContentMissing(channel, text)` để check rỗng/quá ngắn.
  - `getLongformMinimumChars(channel)` với ngưỡng tối thiểu thực dụng:
    - Blogger: tối thiểu khoảng 800 ký tự.
    - WordPress: tối thiểu khoảng 1500 ký tự.
- Áp dụng cho `website`, `blogger`, `wordpress` khi kênh được selected.
- Nếu Blogger/WordPress rỗng hoặc quá ngắn: không được âm thầm insert/update `null`.

2. Auto-retry riêng Blogger/WordPress ngay trong backend
- Sau lần generate chính, nếu `blogger_content` hoặc `wordpress_content` thiếu:
  - Gọi AI lại riêng đúng kênh đó 1 lần bằng prompt tối giản nhưng rất chặt.
  - Blogger prompt: 500-900 từ, casual/personal, ngôi “tôi/mình”, markdown nhẹ, kết bằng câu hỏi.
  - WordPress prompt: 1200-2200 từ, expert/in-depth, H2/H3, FAQ/callout, markdown chuẩn.
- Nếu retry thành công thì lưu đúng cột riêng.
- Nếu retry vẫn rỗng: trả lỗi rõ `EMPTY_GENERATED_CHANNEL_CONTENT` thay vì tạo bài “không có text”.

3. Sửa streaming create path
- Sau `generateChannelsParallel`, kiểm tra các kênh long-form selected.
- Auto-retry Blogger/WordPress nếu thiếu.
- Chỉ emit `result` và insert DB khi các kênh required có text hợp lệ.
- Nếu fail, emit SSE error rõ: “Blogger/WordPress chưa tạo được nội dung riêng, vui lòng thử lại”.

4. Sửa non-streaming create/expand path
- Trước khi insert/update DB, validate `generatedData.blogger_content` và `generatedData.wordpress_content`.
- Auto-retry thiếu text giống streaming.
- Expand thêm Blogger/WordPress vào bài cũ cũng phải tạo được text trước khi update `selected_channels`.

5. Sửa regenerate path cho Blogger/WordPress
- Inject channel-specific hard prompt vào `systemPrompt`/`userPrompt` khi `channel === 'blogger'` hoặc `channel === 'wordpress'`.
- Tăng token budget nếu cần để WordPress không bị cắt ngắn.
- Sau streaming/non-streaming regenerate:
  - Nếu output rỗng/quá ngắn, thử regenerate lại 1 lần bằng fallback non-streaming prompt.
  - Nếu vẫn fail, không update DB bằng rỗng; trả lỗi cho UI.

6. Sửa UI feedback để người dùng thấy đúng trạng thái
- Sidebar kênh Blogger/WordPress nếu text rỗng: hiện badge “Thiếu text” thay vì chỉ `0 từ`.
- Nút “Tạo nội dung riêng” đang có sẵn sẽ giữ lại, nhưng khi backend trả lỗi rỗng thì toast hiển thị message dễ hiểu.
- Khi regenerate thành công, refetch/update content để text hiện ngay trong mockup.

7. Không fallback về Website
- Giữ nguyên quyết định đã chốt: Blogger/WordPress không fallback `website_content`.
- Publish vẫn bị chặn nếu thiếu text riêng.

8. Dữ liệu cũ
- Không tự copy Website sang Blogger/WordPress.
- Các bài cũ đang `0 từ` sẽ được sửa bằng cách bấm “Tạo nội dung riêng” từng kênh.
- Sau khi backend guard xong, việc bấm tạo lại sẽ phải sinh text thật hoặc báo lỗi rõ, không còn trạng thái “xong nhưng vẫn trống”.

Các file dự kiến chỉnh:
- `supabase/functions/generate-multichannel/index.ts`
- `src/hooks/useStreamingRegenerate.ts`
- `src/components/MultiChannelViewer.tsx`
- Có thể cập nhật memory `longform-channel-separation-vn` để ghi rule mới: “selected Blogger/WordPress mà output rỗng thì fail, không lưu null”.

Kết quả mong đợi:
- Tạo mới chọn Website + Blogger + WordPress: DB phải có đủ 3 cột text riêng.
- Tạo lại Blogger/WordPress từ bài cũ: text xuất hiện trong đúng tab.
- Không còn trường hợp AI/backend báo hoàn thành nhưng Blogger/WordPress vẫn không có text.