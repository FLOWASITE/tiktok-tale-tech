
Mục tiêu: biến stream hiện tại từ “giả lập tiến trình” thành stream thật, nhất quán ở mọi màn hình, và ổn định khi user rời trang.

1. Chuyển `generate-carousel` sang stream thật theo từng slide
- Hiện tại stream chỉ trả heartbeat giả rồi đợi JSON branch hoàn tất mới bắn `slide_done`.
- Refactor `runCarouselPipelineStreaming()` để sinh từng slide trong pipeline streaming, emit trực tiếp:
  - `progress` cho planning / validation / compliance
  - `slide_start`
  - `slide_chunk` hoặc ít nhất `slide_preview`
  - `slide_done`
  - `result`
- Vẫn giữ JSON mode fallback để không làm hỏng caller cũ.

2. Làm frontend parse stream như một state machine hoàn chỉnh
- Mở rộng `CarouselGenerationContext` để xử lý thêm:
  - `slide_start`
  - `slide_chunk`
  - `slide_done`
  - `result`
  - `error`
- Thêm state riêng cho:
  - `streamingSlidesByNumber`
  - `lastEventAt`
  - `abortReason`
  - `phase`
- Sửa các race/stale-state hiện có khi cancel/watchdog/result cùng xảy ra.

3. Hiển thị preview thật thay vì chỉ hiện sau khi xong
- `CarouselGenExpandedPanel` sẽ render:
  - slide đang viết dở từ `slide_chunk`
  - slide hoàn tất từ `slide_done`
  - placeholder cho slide chưa bắt đầu
- `GlobalCarouselGenTracker` đổi status text sang phase thật, bỏ cảm giác “đếm thời gian giả”.

4. Loại bỏ luồng UI cũ đang gây lệch trạng thái
- `CarouselGenerationTracker` ở page `/carousel` vẫn dùng fake step/timer riêng.
- Gộp về một nguồn sự thật duy nhất là `CarouselGenerationContext`.
- Trang Carousel chỉ đọc job hiện tại từ context thay vì tự dựng tracker cục bộ + tracker hidden song song.

5. Tinh chỉnh tiến trình để trông “chuẩn”
- Không dùng phần trăm heartbeat kiểu tăng đều ảo quá lâu.
- Percent mới sẽ bám theo:
  - planning nhỏ
  - mỗi slide đóng góp rõ ràng
  - compliance/final save là phần cuối
- ETA chỉ hiển thị khi đủ dữ liệu thực; nếu chưa đủ thì hiện phase text thay vì số giây không đáng tin.

6. Tăng độ bền của stream
- Phân biệt rõ:
  - user cancel
  - watchdog timeout
  - stream đóng sớm
  - backend error
- Khi stream đứt nhưng backend vẫn có thể hoàn tất, frontend sẽ chuyển sang trạng thái “đang đồng bộ kết quả” thay vì báo fail ngay.
- Nếu có row carousel xuất hiện qua realtime thì job tự complete.

7. Đồng bộ với luồng tạo ảnh nền
- Khi prompt stream hoàn tất, trigger tạo ảnh vẫn phải tiếp tục độc lập route.
- UI tracker cần phản ánh rõ: “đã xong prompt” và “đang tạo ảnh” là 2 pha khác nhau, tránh user hiểu nhầm stream bị đứng.

8. File sẽ cần chỉnh
- `supabase/functions/generate-carousel/index.ts`
- `src/contexts/CarouselGenerationContext.tsx`
- `src/components/carousel/GlobalCarouselGenTracker.tsx`
- `src/components/carousel/CarouselGenExpandedPanel.tsx`
- `src/components/carousel/CarouselGenerationTracker.tsx`
- `src/pages/Carousel.tsx`

9. Kết quả mong đợi
- Vào 1-2 giây đầu đã có event thật.
- User thấy slide đang được viết dần, không phải đợi 80s rồi hiện một lượt.
- Thoát màn hình vẫn theo dõi được.
- Cancel/retry/watchdog hoạt động rõ ràng, không nhảy sai trạng thái.
- Tracker trên mọi màn hình và tracker trong trang Carousel hiển thị cùng một sự thật.

Chi tiết kỹ thuật quan trọng
- Log hiện tại cho thấy nhánh stream trả về rất nhanh nhưng nhánh JSON nội bộ chạy ~85s, nghĩa là stream đang “bọc” pipeline cũ chứ chưa stream thật.
- `CarouselGenerationTracker` vẫn là UI giả lập theo timer, nên dù backend có stream tốt hơn thì trải nghiệm trên trang Carousel vẫn chưa chuẩn nếu không gộp lại.
- Ưu tiên triển khai theo hướng “single source of truth + real per-slide events”, thay vì vá thêm animation lên stream giả hiện tại.
