

## Layout Preview trước Generate — Kế hoạch sửa

### Vấn đề
`CarouselLayoutPreview` hiện chỉ hiển thị **sau khi generate** (trong `CarouselViewer` dialog). User không xem được mockup layout trước khi bấm tạo.

### Giải pháp
Thêm `CarouselLayoutPreview` vào **`CarouselForm.tsx`**, hiển thị giữa Step 3 (Phong cách) và nút Submit. Preview sẽ tạo mock slides dựa trên các giá trị form hiện tại (`carouselStyle`, `visualPreset`, `platform`, `slideCount`) — không cần gọi API.

### Chi tiết kỹ thuật

**File: `src/components/CarouselForm.tsx`**
- Import `CarouselLayoutPreview` và `CarouselSlide`
- Tạo hàm `generateMockSlides(slideCount, carouselStyle)` — trả về mảng `CarouselSlide[]` giả với:
  - `slideNumber` 1→N
  - `objective` mặc định theo role (hook/body/cta)
  - `textContent` là `StructuredTextContent` mẫu (headline placeholder theo role)
- Render `CarouselLayoutPreview` **sau Step 4 (Cài đặt)**, trước nút Submit
- Preview tự cập nhật khi user thay đổi `slideCount`, `carouselStyle`, `visualPreset`, hoặc `platform`
- Gói trong border nhẹ với label "Xem trước bố cục"

**Không cần sửa `CarouselLayoutPreview.tsx`** — component đã hỗ trợ đầy đủ props cần thiết.

