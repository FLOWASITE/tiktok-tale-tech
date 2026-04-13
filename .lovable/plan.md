

## Căn thẳng hàng "Đoạn chat mới" và "Tìm kiếm đoạn chat"

### Vấn đề
- Header dùng `flex justify-between` → nút "Đoạn chat mới" nằm bên phải, nút collapse bên trái
- Search input bên dưới chiếm full width trong `px-3`
- Hai phần tử không thẳng hàng trái-phải vì header có 2 item chia 2 bên

### Giải pháp

**`src/components/topic/chatbot/ConversationHistorySidebar.tsx`**

Đổi layout header: đưa nút collapse và nút "Đoạn chat mới" ra 2 dòng riêng hoặc cùng hàng nhưng nút "Đoạn chat mới" chiếm full width giống search input.

Cụ thể:
- Tách nút collapse thành một hàng riêng (hoặc absolute position)
- Nút "Đoạn chat mới" đổi thành full-width button với `w-full justify-start` trong container `px-3`
- Search input giữ nguyên `px-3`
- Cả hai sẽ có cùng padding trái-phải → thẳng hàng hoàn toàn

```text
┌─────────────────────────┐
│ [≡]              [collapse] │  ← header row nhỏ
│ [🖊 Đoạn chat mới       ] │  ← full-width, px-3
│ [🔍 Tìm kiếm đoạn chat..] │  ← full-width, px-3
│                             │
│ Hôm nay                    │
│  Cuộc hội thoại 1          │
│  Cuộc hội thoại 2          │
└─────────────────────────┘
```

### Chi tiết kỹ thuật
- Header (line 192): giữ lại chỉ nút collapse, bỏ nút "Đoạn chat mới" ra khỏi hàng này
- Thêm một div mới ngay dưới header chứa nút "Đoạn chat mới" với `px-3 w-full`
- Nút "Đoạn chat mới": `variant="ghost"`, `w-full justify-start`, cùng style text-[13px]
- Search div (line 219): giữ nguyên `px-3`
- Kết quả: cả 2 cùng `px-3` và `w-full` → thẳng hàng trái-phải

