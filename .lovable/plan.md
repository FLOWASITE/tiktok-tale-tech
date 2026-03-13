

## Plan: Cải thiện UX tạo ảnh AI — Thêm hướng dẫn trực quan

### Vấn đề hiện tại
UI tạo ảnh có quá nhiều option hiển thị cùng lúc, thiếu hướng dẫn theo bước, user không biết bắt đầu từ đâu. Cụ thể:
- Setup form hiện: Channel picker → V3 Style Preview → Keywords → Settings Summary → Nút Tạo → Advanced Options (collapsible) — tất cả dồn vào 1 trang dài
- Không có step indicator hay giải thích ngắn cho từng phần
- Prompt Mode, Style, Text overlay nằm sâu trong "Tùy chỉnh nâng cao" — user dễ bỏ qua
- Thiếu tooltip/helper text cho các thuật ngữ kỹ thuật (V3, negative prompt, typography style...)

### Giải pháp: Guided Steps + Contextual Help

#### 1. `SimpleImageGenerator.tsx` — Thêm Step Labels cho setup form
- Thêm numbered step headers cho mỗi section trong `setupFields`:
  - **Bước 1**: "Chọn kênh" — Channel Picker (giữ nguyên)
  - **Bước 2**: "Xem trước & Tạo ảnh" — V3 Preview + Keywords + Settings Summary + CTA button
  - **Bước 3**: "Tùy chỉnh (tùy chọn)" — Advanced Options
- Mỗi step header có: số thứ tự (circle badge), tiêu đề, mô tả ngắn 1 dòng
- Thêm "quick start" hint dưới DialogDescription: "Chỉ cần chọn kênh → nhấn Tạo ảnh. AI sẽ tự tối ưu mọi thứ!"

#### 2. `ImageAdvancedOptions.tsx` — Thêm inline help text
- Thêm helper text ngắn cho mỗi section:
  - **Phong cách ảnh**: "AI gợi ý phong cách phù hợp nhất. Bạn có thể chọn khác nếu muốn."
  - **Tỉ lệ khung hình**: "'Tự động' sẽ chọn tỉ lệ tối ưu cho từng mạng xã hội."
  - **Logo overlay**: "Logo thương hiệu sẽ được đặt lên ảnh ở vị trí bạn chọn."
  - **Text lên ảnh**: "Thêm tiêu đề hoặc hook message trực tiếp lên ảnh."
  - **Negative prompt**: "Liệt kê những gì KHÔNG muốn xuất hiện trong ảnh."
- Đổi label "Chế độ prompt" thành "Mức độ kiểm soát AI" cho dễ hiểu
- Cập nhật 3 mode descriptions rõ ràng hơn:
  - Full → "Để AI lo tất cả" 
  - Brand only → "Bạn viết ý tưởng, AI giữ brand"
  - Raw → "Bạn kiểm soát hoàn toàn"

#### 3. Thêm Tooltip cho thuật ngữ kỹ thuật
- Wrap "V3 gợi ý" label bằng Tooltip: "Hệ thống V3 phân tích nội dung và gợi ý phong cách ảnh phù hợp nhất"
- Wrap "Ngữ cảnh chiến lược" label bằng Tooltip: "Thông tin về vai trò nội dung (Seed/Sprout/Harvest) và góc tiếp cận"

### Thay đổi (2 files)
- `src/components/multichannel/SimpleImageGenerator.tsx` — Step headers + quick start hint
- `src/components/multichannel/ImageAdvancedOptions.tsx` — Helper texts + label renames + tooltips

### Không thay đổi
- Logic tạo ảnh, props, state management — giữ nguyên 100%
- Mobile layout — giữ nguyên
- Advanced Options vẫn là Collapsible, chỉ thêm guidance text bên trong

