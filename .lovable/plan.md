
Mục tiêu: chặn dứt điểm lỗi `file_format_check_failed` khi đăng carousel lên TikTok.

Do I know what the issue is? Có.
- Log cho thấy `media.flowa.one` đã truy cập được, nên lỗi không còn nằm ở proxy/domain.
- Request hiện tại đang gửi các URL `.jpg` gốc của carousel.
- Không có log `Converted PNG→JPEG`, nghĩa là helper hiện tại chỉ convert khi URL chứa `.png`.
- Vì TikTok fail ở bước xử lý async, vấn đề nằm ở binary/encoding thực tế của ảnh gốc, không phải ở extension hay preflight.

Kế hoạch sửa

1. Chuẩn hóa toàn bộ ảnh TikTok trong `supabase/functions/publish-tiktok/index.ts`
- Thay `convertImagesToJpeg()` bằng helper mới kiểu `normalizeImagesForTikTok()`.
- Helper này sẽ fetch mọi ảnh TikTok-bound, đọc `content-type` + bytes, rồi re-encode lại thành một file JPEG mới “sạch”.
- Không còn tin vào extension `.jpg/.png`; ảnh raster nào cũng được chuẩn hóa lại trước khi publish.
- Flatten alpha về nền trắng nếu cần, nén về quality an toàn, giới hạn dimensions/file size ở mức an toàn cho TikTok.
- Nếu ảnh là SVG hoặc không decode được, fail sớm với lỗi rõ ràng thay vì âm thầm giữ URL gốc.

2. Chỉ publish bằng ảnh đã chuẩn hóa
- Upload ảnh mới vào `carousel-images/social/tiktok-optimized/...jpg`.
- Trong `publishPhotoPost()`, chỉ dùng các URL này rồi mới rewrite sang `media.flowa.one` và chạy preflight.
- Bỏ fallback “giữ ảnh gốc nếu convert lỗi”, vì chính fallback đó đang để file không hợp lệ lọt vào TikTok.

3. Tăng logging để xác minh nguyên nhân
- Log cho từng ảnh: URL gốc, content-type gốc, kích thước bytes gốc, dimensions gốc, URL chuẩn hóa, kích thước sau nén.
- Log rõ nếu ảnh bị chặn trước khi gọi TikTok.
- Mục tiêu là lần sau chỉ nhìn log là biết fail vì SVG, decode lỗi, size, hay upload optimize lỗi.

4. Cải thiện thông báo lỗi
- Trong `publish-tiktok`, khi TikTok trả `file_format_check_failed`, đổi message sang thông điệp rõ hơn: TikTok từ chối file ảnh gốc vì định dạng/encoding không tương thích.
- Trong `src/hooks/useDirectPublish.ts`, thêm nhánh toast riêng cho lỗi này để người dùng không chỉ thấy lỗi kỹ thuật chung.

5. Kiểm tra sau khi triển khai
- Test lại đúng carousel đang fail: `2d097bd6-2779-4893-8e77-e1d1b8b9368b`.
- Xác nhận log có URL mới trong `social/tiktok-optimized/...`.
- Xác nhận không còn publish bằng URL gốc `slide-*-bg-...jpg`.
- Xác nhận status không còn `file_format_check_failed`.

Chi tiết kỹ thuật
- File chính cần sửa: `supabase/functions/publish-tiktok/index.ts`
- File UX nên sửa thêm: `src/hooks/useDirectPublish.ts`
- Không cần đổi flow publish ở frontend hay logic proxy hiện tại.
- Không cần thêm dependency nặng mới; giữ `imagescript` để giảm rủi ro deploy timeout.
