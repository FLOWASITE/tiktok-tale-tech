

# Brainstorm AI: Mở fullscreen trên mobile thay vì embed inline

## Vấn đề
Tab Brainstorm AI hiện embed trong khung `h-[280px]` — trên điện thoại quá chật để chat, bàn phím ảo chiếm thêm không gian, gần như không thể sử dụng.

## Giải pháp
Trên mobile, khi user chọn tab "Brainstorm AI", mở `TopicBrainstormSheet` (drawer fullscreen) thay vì hiển thị inline. Trên desktop giữ nguyên embed.

## Thay đổi: `TopicIdeaHub.tsx`

1. Import `useIsMobile` và `TopicBrainstormSheet`
2. Thêm state `showBrainstormSheet`
3. Khi `isMobile` và user chọn tab "brainstorm":
   - Không chuyển tab, giữ tab "suggestions" active
   - Mở `TopicBrainstormSheet` fullscreen thay thế
4. Trên desktop: giữ nguyên hành vi embed inline hiện tại
5. Render `TopicBrainstormSheet` với `onSelectTopic` → gọi `onSelect`

```text
Mobile flow:
  Tap "Brainstorm AI" tab → opens Sheet fullscreen
  Select topic in sheet → closes sheet, fills input

Desktop flow:
  Click "Brainstorm AI" tab → shows inline 280px embed (unchanged)
```

Chỉ sửa 1 file: `TopicIdeaHub.tsx`.

