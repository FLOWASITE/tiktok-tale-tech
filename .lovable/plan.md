

# Fix: Nút refresh chủ đề gây lỗi "Converting circular structure to JSON"

## Nguyên nhân gốc

Khi click nút refresh (icon xoay tròn), React truyền **event object** làm tham số đầu tiên:

```
onClick={onRefresh}  →  onRefresh(MouseEvent)  →  refreshSuggestions(MouseEvent)
```

`refreshSuggestions` nhận tham số đầu là `categoryHint?: string`, nhưng lại nhận được MouseEvent (chứa HTMLButtonElement) → khi JSON.stringify để gửi lên edge function → lỗi "Converting circular structure to JSON".

## Giải pháp

### File: `src/components/TopicSuggestionPanel.tsx` (~line 188)

Thay `onClick={onRefresh}` thành `onClick={() => onRefresh()}` để không truyền event object vào hàm refresh.

```tsx
// Trước
onClick={onRefresh}

// Sau
onClick={() => onRefresh()}
```

Chỉ cần sửa 1 dòng duy nhất.

