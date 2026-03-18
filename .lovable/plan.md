

# Cải thiện phản hồi khi click topic trong danh sách quick-action

## Vấn đề
Khi click vào một topic trong danh sách mở rộng (ví dụ "→ Nội dung triệu view tuần này..."), UI không có feedback trực quan nào — không highlight, không animation, không toast. User không biết click đã thành công hay chưa.

## Giải pháp
Thêm 3 lớp phản hồi tức thì khi click topic:

### Thay đổi trong `TopicIdeaHub.tsx`

1. **State `lastSelectedTopic`** — lưu topic vừa chọn để highlight tạm thời
2. **Visual feedback** — topic vừa click được highlight xanh (bg-primary/10 + text-primary) trong ~1.5s rồi fade
3. **Checkmark icon** — hiện ✓ nhỏ bên cạnh topic đã chọn
4. **Scale animation** — thêm `active:scale-95` cho cảm giác "nhấn" khi click

```text
Trước: Click topic → không có gì thay đổi trên UI
Sau:   Click topic → nút scale nhỏ lại → highlight xanh + ✓ → fade sau 1.5s
```

Chỉ sửa 1 file: `src/components/topic/TopicIdeaHub.tsx`

