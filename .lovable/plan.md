

## Cải thiện UI hiển thị danh sách chủ đề gợi ý

### Vấn đề hiện tại

Khi bạn yêu cầu "chọn 5 chủ đề", UI có 3 vấn đề:

1. **Tự động chọn topic**: Hệ thống tự hiển thị "Chủ đề được chọn" mà bạn chưa chọn gì
2. **Ẩn nội dung AI**: Phần giải thích/phân tích của AI bị ẩn hoàn toàn khi có topic cards
3. **Nút hành động thay vì nút chọn**: Mỗi topic hiển thị 3 nút (Multi/Script/Carousel) thay vì 1 nút "Chọn" đơn giản

### Giải pháp

#### 1. Hiển thị lại nội dung markdown kèm topic cards

**File:** `src/components/topic/chatbot/ChatMessageBubble.tsx`

- Bỏ điều kiện `!message.suggestedTopics?.length` ở dòng 210 -- luôn hiển thị markdown content
- Nội dung AI (giải thích, phân tích) sẽ hiện phía trên, topic cards hiện phía dưới

#### 2. Không tự động hiển thị "Chủ đề được chọn" khi user chưa chọn

**File:** `src/components/topic/chatbot/ChatMessageBubble.tsx`

- Thêm state tracking: chỉ hiển thị banner "Chủ đề được chọn" khi user thực sự click chọn, không phải từ `best_topic` tự động
- Ban đầu tất cả topics đều bình đẳng, không topic nào bị highlight sẵn

#### 3. Thay đổi UI topic card: ưu tiên nút "Chọn" rõ ràng

**File:** `src/components/topic/chatbot/ChatMessageBubble.tsx`

- Standalone mode: Thêm nút "Chọn topic này" nổi bật bên cạnh các nút Multi/Script/Carousel
- Khi click "Chọn", topic đó được highlight và banner "Chủ đề được chọn" mới xuất hiện
- Các nút Multi/Script/Carousel vẫn giữ nhưng nhỏ hơn, ở hàng thứ 2

#### 4. Cập nhật streaming: không auto-select best_topic cho UI

**File:** `src/hooks/useChatStreaming.ts`

- Vẫn nhận `best_topic` từ backend nhưng lưu riêng, không gán vào `selectedTopic` ngay
- `selectedTopic` chỉ được set khi user click chọn

### Layout mới cho topic cards

```text
[Nội dung AI - giải thích, phân tích]
─────────────────────────────────
5 topics gợi ý         [AI đề xuất: Topic X]
┌──────────────────────────────────────┐
│ ⭐ Topic 1                    85 pts │
│ Lý do: ...                          │
│ [✓ Chọn] [Multi] [Script] [Carousel]│
├──────────────────────────────────────┤
│ Topic 2                       72 pts │
│ ...                                  │
└──────────────────────────────────────┘
```

- "AI đề xuất" chỉ là label nhỏ, không phải banner lớn
- User click "Chọn" để xác nhận topic

### Chi tiết kỹ thuật

1. **`ChatMessageBubble.tsx`**: Bỏ condition ẩn markdown (dòng 210). Thêm state `userSelectedTopic`. Refactor topic cards layout với nút "Chọn" primary. Chuyển `selectedTopic` từ auto-display sang user-triggered.
2. **`useChatStreaming.ts`**: Lưu `best_topic` vào field `aiRecommendedTopic` thay vì `selectedTopic`. `selectedTopic` bắt đầu là `undefined`.
3. **`types.ts`**: Thêm field `aiRecommendedTopic?: string` vào `ChatMessage` interface.

