
Mục tiêu
- Làm cho Research Agent trả topic mới thực sự (không lặp lại list cũ), đồng thời đảm bảo trending được gọi đúng.

Phát hiện từ code/log
1) `discover_topics` đang gửi `action` ở URL query (`...?action=...`) nhưng `topic-ai` chỉ đọc `action` từ JSON body → cả 2 call đều rơi về mặc định `suggest`.
2) Kết quả `trending` từ `topic-ai` trả về ở field `data`, nhưng tool executor chỉ đọc `suggestions/topics/trendingTopics` → mất dữ liệu trending thật.
3) `suggest` đang cache theo brand/goal/time bucket nhưng KHÔNG có `query` trong cache key, và prompt suggest cũng chưa dùng `query` → dễ trả lại topic cũ cho nhiều yêu cầu khác nhau.
4) Log hiện tại xác nhận: `topic-ai` chỉ thấy `Action: suggest` dù ResearchNode gọi cả suggest + trending.

Kế hoạch triển khai
1. Sửa contract gọi discover_topics (backend tool layer)
- File: `supabase/functions/_shared/tool-executor.ts`
- Đưa `action` vào request body (giữ query param chỉ để tương thích ngược nếu cần).
- Hỗ trợ thêm cờ `force_refresh`/`forceRefresh` để ép dữ liệu mới khi Research prefetch.
- Chuẩn hóa parser kết quả:
  - Ưu tiên đọc `data.data` cho action `trending`
  - Fallback `suggestions/topics/trendingTopics`
  - Mapping score hỗ trợ cả `velocity_score`, `scores.trend`, `scores.engagement`.

2. Sửa topic-ai để hiểu action ổn định và dùng query thật
- File: `supabase/functions/topic-ai/index.ts`
- Action resolution: ưu tiên `request.action`, fallback từ URL search param `action` (để không vỡ client/test cũ).
- Mở rộng `TopicAIRequest` có `query?: string`.
- `handleSuggest`:
  - Đưa `query` vào prompt để topic bám đúng yêu cầu user.
  - Thêm `queryHash` vào cache key (không dùng chung cache cho query khác nhau).
  - Dùng `forceRefresh` đúng semantics (bỏ lệch tên `forceWebSearch` ở luồng discover_topics).
- (Tùy mức chặt) giảm TTL suggest cache cho flow research để tăng độ mới.

3. Ép freshness ở Research prefetch
- File: `supabase/functions/_shared/graph/nodes/research-node.ts`
- Khi prefetch:
  - suggest: gửi `force_refresh: true` + query user
  - trending: gửi `force_refresh: true` (hoặc chỉ force khi user yêu cầu “mới” nếu muốn tiết kiệm chi phí).
- Mục tiêu: lần chạy mới không bị dính list cũ từ cache DB.

4. Cập nhật test để bắt lỗi regression
- File: `supabase/functions/chat-topics/index.test.ts`
- Thêm/điều chỉnh test:
  - trending phải thực sự trả shape `data` hoặc list hợp lệ từ action trending.
  - verify endpoint nhận action từ body (không phụ thuộc query param).
  - smoke test: gọi suggest + trending liên tiếp, đảm bảo không cùng một payload giả mạo do route sai action.

Tiêu chí nghiệm thu
- Trong log phải thấy 2 action tách biệt:
  - `[topic-ai] Action: suggest`
  - `[topic-ai] Action: trending`
- `ResearchNode Prefetch done` thường có `merged > suggest` (không còn cố định 5 do trùng 100%).
- Hai lần tạo topic liên tiếp với query khác nhau cho ra danh sách khác nhau rõ rệt.
- Không còn hiện tượng “toàn topic cũ” khi user yêu cầu ý tưởng mới.

Rủi ro & cân bằng
- Ép force refresh toàn phần sẽ tăng chi phí/latency.
- Nếu cần cân bằng, giữ force refresh cho `trending`, còn `suggest` dùng query-aware cache + TTL ngắn là đủ mới trong đa số trường hợp.
