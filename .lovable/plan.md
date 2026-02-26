
Mục tiêu: khôi phục hiển thị text “Chủ đề được chọn” + “Lý do chọn” ổn định trên UI chat, kể cả khi topic đã qua bước refine.

Những gì đã xác nhận từ code hiện tại:
1) UI text block vẫn còn trong `ChatMessageBubble.tsx` (đã render bằng `Star` + `Lightbulb`).
2) `useChatStreaming.ts` đã nhận `best_topic_reason` và gán `selectedTopicReason`.
3) `VirtualizedMessageList.tsx` đã thêm compare cho `selectedTopic`/`selectedTopicReason`.
4) Backend chỉ phát `topic_suggestions` khi node `research` chạy.
5) Điểm dễ mất “lý do” hiện tại nằm ở dữ liệu: `best_topic` có thể là topic đã refine, nhưng `reasoning` trong mảng topics gốc không match 1-1 với topic refine.

Kế hoạch implement (đề xuất fix bền vững):

1) Chuẩn hóa “reason” ở backend khi phát event topic_suggestions  
- File: `supabase/functions/_shared/graph/graph-engine.ts`  
- Cập nhật cách tính `best_topic_reason` theo fallback mạnh hơn:
  - Ưu tiên reasoning của topic match `best_topic` (so khớp thường + normalize).
  - Nếu không match, fallback sang `refined_variants[0].angle` (hoặc variant match tên topic).
  - Nếu vẫn trống, fallback sang reasoning của topic đứng đầu.
- Kết quả: luôn có `best_topic_reason` hợp lệ khi có topic được chọn.

2) Đồng bộ dữ liệu refined topic với danh sách suggested topics  
- File: `supabase/functions/_shared/graph/nodes/research-node.ts`  
- Khi refine trả về topic mới:
  - đảm bảo topic refine xuất hiện trong `suggestedTopics` (hoặc có mapping rõ ràng),
  - gắn reasoning từ `angle` của refined variant nếu thiếu.
- Kết quả: frontend có thể suy ra “lý do” ngay cả khi `selectedTopic` là phiên bản đã refine.

3) Gia cố state streaming để không rơi metadata giữa các chunk  
- File: `src/hooks/useChatStreaming.ts`  
- Giữ `pendingRefinedVariants` ở scope toàn stream (không local trong 1 block event), và truyền nhất quán vào tất cả nhánh `onMessageCreate`/`onMessageUpdate` liên quan.
- Kết quả: dữ liệu topic/reason/variant không bị hụt khi message tiếp tục stream.

4) Fallback render ở UI để luôn hiện “Lý do” khi dữ liệu có sẵn gián tiếp  
- File: `src/components/topic/chatbot/ChatMessageBubble.tsx`  
- Tạo `resolvedTopicReason`:
  - `message.selectedTopicReason`
  - hoặc tìm trong `message.suggestedTopics` theo `selectedTopic`
  - hoặc lấy từ `message.refinedVariants` (angle)
- Render phần “Lý do” theo `resolvedTopicReason` thay vì chỉ phụ thuộc 1 field.
- Kết quả: UI vẫn hiển thị lý do dù field chính bị thiếu tạm thời.

5) Kiểm thử sau sửa (quan trọng)  
- Case A: prompt brainstorm/topic discovery → phải thấy cả “Chủ đề được chọn” + “Lý do”.  
- Case B: topic có refine → lý do vẫn hiển thị đúng với topic refine.  
- Case C: đang stream nhiều chunk → text không mất sau khi message hoàn tất.  
- Case D: prompt không chạy research → không hiện block selected-topic (hành vi đúng, tránh hiểu nhầm là lỗi).

Rủi ro & lưu ý:
- Nếu orchestrator chọn flow không có `research`, block selected-topic sẽ không xuất hiện (đây là behavior đúng theo pipeline hiện tại, không phải lỗi render).
- Có warning ref trong `ToolResultCard` trên console, nhưng không phải nguyên nhân chính của lỗi selected topic/reason.

Phạm vi file dự kiến chỉnh:
- `supabase/functions/_shared/graph/graph-engine.ts`
- `supabase/functions/_shared/graph/nodes/research-node.ts`
- `src/hooks/useChatStreaming.ts`
- `src/components/topic/chatbot/ChatMessageBubble.tsx`
