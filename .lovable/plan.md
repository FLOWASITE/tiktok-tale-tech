## Vấn đề

Trong viewer Multi-channel, mỗi kênh có thanh action gồm "Lên lịch đăng bài" + nút "Đăng ngay" (component `DirectPublishButton`). Riêng tab Pinterest **không hiện nút Đăng ngay** vì `DirectPublishButton` chưa map kênh `pinterest` sang platform — `if (!platform) return null;` ở line 409 khiến component biến mất hoàn toàn.

Backend đã sẵn sàng:
- Edge function `publish-pinterest` hoạt động, auto-resolve board từ `connection.metadata.default_board_id` hoặc board cache đầu tiên.
- `channel-publisher` đã có route `pinterest → publish-pinterest` (line 23) và mapping cột `pinterest_post_url/id` (line 36).
- `SocialPlatform` type đã bao gồm `'pinterest'`.

Chỉ thiếu wiring ở frontend.

## Thay đổi (chỉ frontend)

### 1. `src/hooks/useDirectPublish.ts`
- Thêm hàm `publishToPinterest(options: PublishOptions & { title?: string; link?: string })` gọi `publishMutation.mutateAsync({ platform: 'pinterest', options })`.
- Export trong return object.

### 2. `src/components/social/DirectPublishButton.tsx`
- Thêm `pinterest: 'pinterest'` vào `CHANNEL_TO_PLATFORM`.
- Thêm `pinterest: 'Pinterest'` vào `PLATFORM_DISPLAY_NAMES`.
- Thêm `'pinterest'` vào mảng `isSupported` (line 412).
- Thêm prop `pinterestTitle?: string` vào `DirectPublishButtonProps`.
- Trong `handlePublish` thêm case `'pinterest'`: gọi `publishToPinterest({ ...publishOptions, title: pinterestTitle, link: linkUrl || blogBacklink || undefined })`.
- Trong dialog confirm (state `'confirm'`): khi `platform === 'pinterest'` hiển thị thêm field "Pin Title" (tối đa 100 ký tự) đọc/ghi từ state mới `pinTitle`, default = `pinterestTitle` prop. Description = `editableContent` (đã có sẵn, max 500 — có thể thêm hint).
- Pinterest cần ít nhất 1 ảnh: nếu `!mediaUrls?.length` thì disable nút và tooltip "Cần ảnh để đăng Pinterest" (giống pattern Zalo cover).

### 3. `src/components/MultiChannelViewer.tsx`
- Tại chỗ render `<DirectPublishButton ... />` (line 1551–1566), thêm prop:
  ```tsx
  pinterestTitle={channel === 'pinterest' ? (content as any).pinterest_title : undefined}
  ```

## Không thay đổi
- Không sửa edge functions, migrations, RLS, hoặc `_shared/`.
- Không thay đổi logic Pinterest connection / board selector — đã hoạt động.
- Không sửa các kênh khác.

## Kiểm tra sau khi build
1. Vào `/multichannel` → mở 1 content có kênh `pinterest` → tab Pinterest phải thấy nút "Đăng ngay" cạnh "Lên lịch đăng bài".
2. Click → dialog hiện Pin Title (prefill từ `pinterest_title`) + description.
3. Nếu chưa kết nối Pinterest → redirect `/connections` (hành vi default đã có).
4. Nếu chưa có ảnh → nút disabled với tooltip.
5. Sau publish thành công → badge "Đã đăng" hiện, `pinterest_post_url` được lưu (channel-publisher xử lý sẵn).
