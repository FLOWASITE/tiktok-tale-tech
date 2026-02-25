
✅ HOÀN THÀNH - Sửa luồng chat → tạo nội dung đa kênh

## Đã sửa:
1. `useChatStreaming.ts` - Gửi user JWT thay vì publishable key
2. `chat-topics/index.ts` - Validate user từ JWT, truyền resolvedUserId + userAccessToken xuống agent/tool chain
3. `supervisor-loop.ts` - Thêm userAccessToken vào SupervisorOptions + execContext
4. `agent-base.ts` - Thêm userAccessToken vào AgentExecutionContext + gửi đầy đủ {success, result, error} cho tool results
5. `tool-executor.ts` - Forward userAccessToken khi gọi generate-multichannel, gửi cả camelCase + snake_case userId/orgId
6. `generate-multichannel/index.ts` - Service-role fallback: đọc userId từ body khi là internal call, kiểm tra org membership, hỗ trợ organizationId camelCase
