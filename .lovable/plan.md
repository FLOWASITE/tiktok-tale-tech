## Vấn đề

Khi xem nội dung đa kênh, slide Bluesky luôn hiển thị "0 từ" và không có text — mặc dù backend (`generate-multichannel`) đã sinh và lưu `bluesky_content` vào DB chuẩn (đã có map column, prompt, label, limit).

## Nguyên nhân

Trong `src/components/MultiChannelViewer.tsx`, hàm `getContentForChannel(content, channel)` (dòng 257–276) là một `switch` thủ công ánh xạ từ tên kênh sang cột DB tương ứng. Tất cả kênh khác (facebook, instagram, threads, pinterest, …) đều có `case`, **nhưng `bluesky` bị thiếu** → rơi xuống `default: return null` → viewer hiển thị `null` ⇒ 0 từ, không có nội dung dù DB có `bluesky_content`.

(Backend, types, hook `useMultiChannelContents`, `channelConfig` icon/label, mockup… đều đã hỗ trợ Bluesky đầy đủ.)

## Sửa

Trong `src/components/MultiChannelViewer.tsx`, thêm vào `switch` của `getContentForChannel`:

```tsx
case 'bluesky': return content.bluesky_content;
```

(Đặt ngay trước `default`, cùng vị trí với pinterest/threads để đồng nhất.)

## Tác động

- Slide Bluesky hiển thị đúng nội dung đã sinh, đếm từ chuẩn.
- Không thay đổi logic nào khác, không cần migration, không đụng backend.
- Chỉ 1 dòng thay đổi trong 1 file.
