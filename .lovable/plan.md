
## Fix: Không bấm được các social icon khoanh đỏ trên mobile

### Nguyên nhân
- Lỗi đang nằm ở `src/components/social/DirectPublishButton.tsx`, không phải `SchedulePopoverButton`.
- Ở chế độ `iconOnly`, mỗi social button vẫn còn bọc bởi `TooltipProvider > Tooltip > TooltipTrigger`.
- Trên mobile, Tooltip bắt touch event trước nên `onClick={handleClick}` không chạy ổn định.
- Component này cũng vẫn dùng `PLATFORM_ICONS` riêng, nên icon TikTok ở hàng publish chưa đồng bộ với icon chuẩn của hệ thống.

### Cách sửa
1. Trong `DirectPublishButton`, bỏ toàn bộ Tooltip wrapper ở các nhánh `iconOnly`.
2. Render `button` trực tiếp với:
   - `type="button"`
   - `title` / `aria-label` thay cho tooltip
   - `touch-manipulation` để tối ưu tap trên điện thoại
   - giữ nguyên `handleClick` hiện tại:
     - đã kết nối → mở publish flow
     - chưa kết nối → chuyển sang `/settings?tab=social`
3. Ở nhánh `iconOnly`, đổi icon sang `ChannelIcon` chuẩn để TikTok/LinkedIn/X hiển thị đúng, thay vì icon emoji cũ trong `PLATFORM_ICONS`.
4. Giữ nguyên luồng publish dialog hiện tại, chỉ sửa hàng icon nhỏ ở header để tránh ảnh hưởng logic publish/schedule.

### File cần cập nhật
- `src/components/social/DirectPublishButton.tsx`
  - bỏ Radix Tooltip trong `iconOnly`
  - thêm direct mobile-safe button handling
  - dùng `ChannelIcon` cho hàng publish icon-only
  - dọn import tooltip/icon không còn dùng

### Kết quả mong đợi
- Các icon social khoanh đỏ bấm được trên điện thoại
- Nút chưa kết nối vẫn bấm được để đi tới trang kết nối social
- TikTok icon ở hàng publish hiển thị đúng, đồng bộ với phần còn lại của app
