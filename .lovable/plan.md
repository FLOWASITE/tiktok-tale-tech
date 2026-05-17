## Vấn đề
Ở Step "Xác nhận" (GoalWizard → ContentScheduleStudio), mỗi bài chỉ hiển thị: tiêu đề · ngày · giờ · kênh · pillar. **Loại nội dung (Post / Carousel / Video) bị ẩn trong popover**, nên user nhìn lịch không biết bài nào là Post, bài nào là Carousel, bài nào là Video.

## Giải pháp
Thêm **chip Loại nội dung** hiển thị trực tiếp trên mỗi `ScheduleRow`, đồng bộ với 3 type đã định nghĩa trong `CONTENT_TYPES` (Post / Carousel / Video).

## Phạm vi
Chỉ sửa `src/components/agents/ContentScheduleStudio.tsx`. Không đụng logic, không đụng API, không đụng `GoalWizard.tsx`.

## Chi tiết implement

### 1. Thêm `ContentTypeChip` (component nhỏ trong file)
Một chip nhỏ dùng lại data từ `CONTENT_TYPES`:
- Icon (FileText / Layers / Video) + label rất ngắn (Post / Carousel / Video)
- Style: viền mảnh, `bg-muted/50`, `text-[10px]`, `h-5`, `rounded-full`, padding ngang 1.5
- Màu icon theo loại để dễ phân biệt khi liếc:
  - Post → `text-slate-600` (neutral)
  - Carousel → `text-amber-600`
  - Video → `text-violet-600`
- Có `title` (tooltip native) ghi description đầy đủ của loại

### 2. Gắn chip vào `ScheduleRow` (line 327-358)
Chèn chip ngay **bên cạnh tiêu đề** (cùng dòng với title, align top, shrink-0) để dù title 2 dòng vẫn thấy loại ngay. Cấu trúc:

```text
[●pillar]  [Tiêu đề bài viết dài có thể 2 dòng...]   [📄 Post]
           Thu 12/6 · 09:00 · 📘 Facebook · awareness
```

Khi đang ở mode edit title (`isEditing`), chip vẫn render bên phải input để vị trí ổn định.

### 3. Chip có thể bấm để đổi nhanh loại (bonus, low-risk)
Wrap chip trong `<Select>` ngầm (giống pattern Loại trong popover) để user click chip → đổi loại ngay mà không cần mở popover. Nếu phức tạp hóa layout → fallback: chip read-only, vẫn phải mở popover để đổi (giữ behavior cũ).

→ **Mặc định: chip read-only** (đơn giản, ít rủi ro layout). User vẫn đổi loại qua popover như cũ. Có thể nâng cấp sau.

### 4. Empty/legacy values
Nếu `p.content_type` không nằm trong `CONTENT_TYPES` (data cũ) → fallback hiển thị chip "Post" (giống default khi `addPiece` ở line 178).

## Kiểm tra sau khi sửa
- Mỗi row trong lịch hiển thị rõ chip loại nội dung ở góc phải.
- 3 loại có icon + màu khác nhau, phân biệt được khi scan nhanh.
- Hover chip thấy mô tả đầy đủ (native title).
- Layout không vỡ trên viewport mobile 707px (user đang ở 707x662) — chip `shrink-0`, title `min-w-0 line-clamp-2`.
- Popover Loại + tooltip (i) vẫn hoạt động như cũ.