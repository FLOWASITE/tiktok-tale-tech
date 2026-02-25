

## Kế hoạch: Rà soát và hoàn thiện Chat UI

Sau khi kiểm tra toàn bộ code, phát hiện **3 vấn đề** cần sửa:

---

### 1. Console Warning: ChatThinkingIndicator thiếu forwardRef

**Vấn đề**: `SimpleMessageList` bọc `ChatThinkingIndicator` trong `AnimatePresence`, nhưng `ChatThinkingIndicator` là function component thường — React cảnh báo "Function components cannot be given refs".

**Sửa**: Bọc `ChatThinkingIndicator` bằng `React.forwardRef` để tương thích với `AnimatePresence`.

**File**: `src/components/topic/chatbot/ChatThinkingIndicator.tsx`

---

### 2. FlowaChatPage: onNavigate là no-op

**Vấn đề**: `FlowaChatPage` truyền `onNavigate={() => {}}` — khi user bấm nút "Multi", "Script", "Carousel" trên extracted topics, không có gì xảy ra.

**Sửa**: Dùng `useNavigate()` từ `react-router-dom` để thực hiện navigation thực sự.

**File**: `src/pages/FlowaChatPage.tsx`

```text
// Hiện tại:
onNavigate={() => {}}

// Sửa thành:
const navigate = useNavigate();
onNavigate={(path, state) => navigate(path, { state })}
```

---

### 3. ActiveView type naming (nhỏ, cosmetic)

**Vấn đề**: Type `ActiveView = 'chat' | 'discovery'` nhưng UI hiển thị "Insights" + icon `Brain`. Không gây lỗi nhưng code đọc confusing.

**Quyết định**: Giữ nguyên value `'discovery'` để tránh breaking change ở nhiều file. Chỉ cần nhận biết rằng `'discovery'` = tab Insights trong ngữ cảnh mới.

---

### Tổng hợp thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/topic/chatbot/ChatThinkingIndicator.tsx` | Wrap bằng `forwardRef` |
| `src/pages/FlowaChatPage.tsx` | Thêm `useNavigate`, truyền navigation handler thực |

### Kết quả
- Hết console warning về ref
- Các nút hành động topic (Multi/Script/Carousel) hoạt động đúng trên trang `/chat`
- Code ổn định, không breaking change

