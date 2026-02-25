
✅ HOÀN THÀNH - Sửa luồng chat → tạo nội dung đa kênh

## Đã sửa:
1. `useChatStreaming.ts` - Gửi user JWT thay vì publishable key
2. `chat-topics/index.ts` - Validate user từ JWT, chỉ set userAccessToken khi JWT hợp lệ (không dùng anon key)
3. `supervisor-loop.ts` - Thêm userAccessToken vào SupervisorOptions + execContext
4. `agent-base.ts` - Thêm userAccessToken vào AgentExecutionContext + gửi đầy đủ {success, result, error} cho tool results
5. `tool-executor.ts` - Forward userAccessToken khi gọi generate-multichannel, gửi cả camelCase + snake_case userId/orgId
6. `generate-multichannel/index.ts` - Service-role fallback mở rộng: nhận diện cả anon key + service key, fallback userId từ body khi JWT fail, kiểm tra org membership

## Root cause đã xử lý (lần 3):
- Frontend khi không có session gửi anon key (VITE_SUPABASE_PUBLISHABLE_KEY) thay vì user JWT
- chat-topics trước đó coi anon key như userAccessToken → forward xuống tool-executor
- tool-executor gửi anon key đến generate-multichannel
- generate-multichannel không nhận ra anon key (chỉ check service role key) → getUser(anon_key) → "missing sub claim"
- Fix: chat-topics chỉ set userAccessToken khi confirmed valid user JWT
- Fix: generate-multichannel nhận diện cả anon key và fallback body userId khi JWT validation fails
