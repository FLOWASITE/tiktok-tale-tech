
Mục tiêu: khôi phục phần “Lý do chọn topic” hiển thị đúng, rõ nghĩa và ổn định trong mọi case stream/research-refine.

Những gì đã xác nhận từ code + logs:
1) UI đã có block hiển thị selected topic trong `ChatMessageBubble.tsx`, nhưng reason đang lấy fallback theo thứ tự chưa tối ưu.
2) `useChatStreaming.ts` đã giữ `selectedTopicReason` xuyên suốt stream, nên lỗi chính không còn ở memo/render cơ bản.
3) Log backend thực tế cho thấy đang emit `best_topic_reason: "practical"` (quá ngắn, không phải câu lý do).
4) Khi workflow timeout sau node research, `chat-topics/index.ts` đang fallback render object `researchData` thành JSON string, làm text UI “rác” và che mất trải nghiệm.
5) `bestTopic` sau refine có thể không trùng topic gốc trong `suggestedTopics`, nên frontend khó suy luận reason chuẩn từ danh sách topics.

Phạm vi chỉnh sửa đề xuất:
- `supabase/functions/_shared/graph/graph-engine.ts`
- `supabase/functions/_shared/graph/nodes/research-node.ts`
- `supabase/functions/chat-topics/index.ts`
- `src/hooks/useChatStreaming.ts`
- `src/components/topic/chatbot/ChatMessageBubble.tsx`
- `src/components/topic/chatbot/types.ts` (mở rộng kiểu `RefinedVariant`)

Cách implement chi tiết:

1) Sửa thuật toán chọn `best_topic_reason` ở backend (nguồn gốc chính của text sai)
- Trong `graph-engine.ts`, đổi ưu tiên reason:
  - a. reasoning của topic match `best_topic` (exact + normalize)
  - b. reasoning của topic gốc có score cao nhất nhưng có reasoning hợp lệ
  - c. `hook` của refined variant match `best_topic`
  - d. `angle` của refined variant (chỉ dùng fallback cuối)
- Bổ sung normalize helper (trim/lowercase/bỏ ký tự thừa) để match tốt hơn.
- Tránh trả về reason dạng 1 từ nếu có candidate giàu ngữ nghĩa hơn.

2) Đồng bộ refined topic vào suggested topics để frontend luôn có “điểm bám”
- Trong `research-node.ts`, khi có refine:
  - tạo bản ghi normalized cho refined topic (reasoning ưu tiên `hook`, rồi `angle`)
  - merge vào `suggestedTopics` nếu chưa tồn tại (case-insensitive)
  - giữ score/category hợp lý từ raw best topic nếu có
- Mục đích: selected topic sau refine vẫn map được sang 1 item có reasoning.

3) Chặn trường hợp UI nhận raw JSON khi graph timeout
- Trong `chat-topics/index.ts`, đổi fallback `finalContent`:
  - ưu tiên `state.generatedContent`
  - nếu không có, ưu tiên `state.researchData.summary` (string)
  - tuyệt đối không stringify toàn bộ object researchData để đẩy lên chat bubble
- Kết quả: text hiển thị sạch, không lẫn JSON.

4) Gia cố frontend reason fallback để hiển thị dễ hiểu
- Trong `types.ts`, mở rộng `RefinedVariant` thêm optional field như `hook` (và các field phụ nếu cần).
- Trong `ChatMessageBubble.tsx`, tạo `resolvedReason` với thứ tự:
  - `message.selectedTopicReason`
  - reasoning từ `suggestedTopics` theo `selectedTopic` (normalize)
  - `refinedVariants[].hook` theo topic match
  - `refinedVariants[].angle` (fallback cuối)
- Đổi UI copy thành có nhãn rõ: “Lý do chọn:” để người dùng nhận biết ngay, thay vì chỉ hiển thị text rời.

5) Giữ reason ổn định xuyên event trong stream
- Trong `useChatStreaming.ts`:
  - nếu event mới không có `best_topic_reason`, không ghi đè reason cũ bằng `undefined`
  - fallback nội bộ từ `topics`/`refined_variants` trước khi update message
- Mục tiêu: tránh mất reason do event thiếu field.

Trình tự triển khai:
1. Backend reason mapping (`graph-engine.ts`)  
2. Backend topic normalization/merge (`research-node.ts`)  
3. Fallback content sạch (`chat-topics/index.ts`)  
4. Frontend type + render fallback (`types.ts`, `ChatMessageBubble.tsx`)  
5. Streaming guard (`useChatStreaming.ts`)  
6. Retest end-to-end

Tiêu chí hoàn thành:
- Luôn thấy “Chủ đề được chọn” và “Lý do chọn” với câu nghĩa đầy đủ (không chỉ “practical/educational”) khi có dữ liệu.
- Không còn raw JSON xuất hiện trong bubble khi workflow timeout ở research.
- Topic đã refine vẫn hiển thị đúng reason sau khi stream hoàn tất.
- Không làm regress các case không chạy research (khi đó block selected topic không xuất hiện là đúng).

Kế hoạch kiểm thử:
- Case A: prompt discovery bình thường -> selected topic + reason đầy đủ.
- Case B: có refine -> reason ưu tiên hook hoặc reasoning giàu nghĩa.
- Case C: timeout/research-only -> không có JSON rác, vẫn có text summary hợp lệ.
- Case D: mobile viewport -> reason vẫn đọc rõ, không bị ẩn/nhạt quá mức.
- Case E: prompt không có research -> không hiển thị block selected-topic (đúng hành vi).
