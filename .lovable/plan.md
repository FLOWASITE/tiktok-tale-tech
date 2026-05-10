Mình tìm thấy lý do khả năng cao vẫn “không được”:

1. Dialog chọn ngành chỉ hiện mục “AI gợi ý” khi edge function trả packId khớp. Nếu AI lỗi/trả code lệch/không có network call, UI chỉ rơi về “Phổ biến”, nên user không thấy danh sách ngành cần xác nhận.
2. Màu brand vẫn bị chọn sẵn trong popup import: `BrandImportDialog` đang lấy `palette.primary` làm màu chính và pass qua flow tạo mới. Sau đó form tạo brand chỉ hiện banner chọn màu ở Step 1, không đủ rõ và vẫn có thể đang giữ màu sai.
3. Khi tạo mới sau import, phần “Ngành (gợi ý)” trong popup import vẫn được auto-check, gây cảm giác hệ thống đã chọn ngành thay user dù form sau đó chưa show danh sách xác nhận rõ ràng.

Plan sửa cụ thể:

- Trong `BrandImportDialog.tsx`:
  - Không auto-check field `industry` khi đang tạo brand mới (chỉ gợi ý, không áp dụng thẳng).
  - Không auto-check `primary_color` theo 1 màu duy nhất khi tạo brand mới; vẫn hiển thị các swatch để user thấy nguồn màu.
  - Cho phép click trực tiếp từng swatch màu trong popup import để chọn màu chính trước khi bấm áp dụng.
  - Inject màu đã chọn vào `raw_meta.selected_primary_color` để `BrandCreate` ưu tiên dùng đúng màu user chọn.

- Trong `BrandCreate.tsx`:
  - Ưu tiên `raw_meta.selected_primary_color` nếu user đã chọn màu trong popup import.
  - Nếu chưa chọn màu, hiển thị khối chọn màu nổi bật ngay đầu Step 1 và label rõ “Chưa chốt màu — chọn một màu”.
  - Thêm khối “Xác nhận ngành” ngay đầu Step 1 với nút rõ ràng “Chọn ngành từ AI gợi ý”, luôn hiện sau import cho tới khi user chọn ngành.
  - Mở `IndustrySelectionDialog` sau import nhưng không phụ thuộc hoàn toàn vào auto-open; user vẫn có nút mở lại nếu dialog bị đóng hoặc không hiện.

- Trong `IndustrySelectionDialog.tsx`:
  - Thêm fallback “Ngành AI đề xuất từ import” dựa trên `industry_suggestion` text: map/smartFilter vào pack có sẵn để luôn có ít nhất vài ngành cho user xác nhận, kể cả khi `suggest-industry` không trả kết quả.
  - Nếu không có ngành phổ biến (`popularPacks.length === 0`), không render vùng rỗng; thay bằng danh mục ngành chính để user vẫn chọn được.
  - Hiển thị trạng thái lỗi AI gợi ý ngắn gọn và vẫn show fallback danh sách ngành.

Phạm vi: chỉ frontend cho flow import/chọn ngành/chọn màu; không đổi backend, không đổi schema.