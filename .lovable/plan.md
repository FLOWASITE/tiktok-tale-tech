

## Vấn đề

1. **"Kết nối để đăng" vẫn hiển thị**: Social connections được lưu với `brand_template_id`, không có `organization_id`. Carousel không có `brand_template_id` → `useSocialConnections` trả về rỗng → hiển thị "Kết nối để đăng".

2. **Thiếu nút "Lên lịch đăng"**: Chưa có trên CarouselViewer.

## Giải pháp

### Bước 1: Tra cứu `brand_template_id` từ `brand_name` trong CarouselViewer

Trong `CarouselViewer.tsx`, thêm query lookup:
```typescript
const { data: brandTemplate } = useQuery({
  queryKey: ['brand-template-by-name', carousel?.brand_name],
  queryFn: async () => {
    const { data } = await supabase
      .from('brand_templates')
      .select('id')
      .eq('brand_name', carousel!.brand_name)
      .limit(1)
      .single();
    return data;
  },
  enabled: !!carousel?.brand_name,
});
```

Truyền `brandTemplateId={brandTemplate?.id}` vào `DirectPublishButton`.

### Bước 2: Sửa `DirectPublishButton` — Hỗ trợ schedule

Thêm nút "Lên lịch" bên cạnh nút "Đăng ngay" khi đã kết nối:
- Khi chưa kết nối: Hiển thị 1 nút "Kết nối để đăng" (giữ nguyên)
- Khi đã kết nối: Hiển thị 2 nút:
  - **"Đăng ngay"** (nút chính, màu platform) 
  - **"Lên lịch"** (nút phụ, icon CalendarClock) → mở dialog chọn ngày giờ → gọi `useContentSchedules.createSchedule()`

### Bước 3: Thêm Schedule Dialog trong DirectPublishButton

Dialog đơn giản với:
- Date/time picker cho thời gian đăng
- Timezone (mặc định Asia/Ho_Chi_Minh)
- Ghi chú (optional)
- Nút "Lên lịch" để xác nhận

Sử dụng hook `useContentSchedules` hiện có để tạo schedule.

### Files cần sửa
- `src/components/CarouselViewer.tsx` — thêm brand template lookup, truyền `brandTemplateId`
- `src/components/social/DirectPublishButton.tsx` — thêm nút lên lịch + schedule dialog

