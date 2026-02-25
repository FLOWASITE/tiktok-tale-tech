

## Kế hoạch: Fix SSE Connection Timeout - Thêm Heartbeat cho Supervisor Stream

### Phân tích nguyên nhân gốc

Sau khi kiểm tra kỹ edge function logs, tôi xác nhận:

**Backend ĐANG emit `agent_step_result` thành công:**
```text
[Supervisor] agent_step_result check (linear): agent=content-agent, success=true, contentLength=806
[Supervisor] Emitting agent_step_result for content-agent, 806 chars
```

**Vấn đề thực sự: SSE connection bị timeout do không có dữ liệu trong thời gian dài.**

Luồng thời gian thực tế:
```text
04:19:10  tool_executing (content-agent) → Frontend nhận ✓ (pipeline bar cập nhật)
04:19:12  generate_multichannel bắt đầu
   ...60 GIÂY IM LẶNG - không có dữ liệu SSE nào...
04:20:12  generate_multichannel xong
04:21:05  content-agent Turn 2 (AI tạo summary)
04:21:10  agent_step_result emit → Frontend KHÔNG nhận ✗ (connection đã bị đóng)
```

Trong 60+ giây mà tool `generate_multichannel` chạy, không có bất kỳ dữ liệu nào được gửi qua SSE. Proxy/CDN (Cloudflare) tự động đóng connection sau khoảng 30-60 giây không hoạt động. Sau đó, tất cả events tiếp theo (bao gồm `agent_step_result`) không đến được frontend.

**Bằng chứng:** Frontend nhận được `tool_executing` event (gửi TRƯỚC khi tool chạy) nhưng KHÔNG nhận `agent_step_result` (gửi SAU khi tool chạy xong).

### Giải pháp

#### 1. Thêm SSE Heartbeat vào Supervisor stream (`chat-topics/index.ts`)

Gửi SSE comment `:heartbeat` mỗi 15 giây để giữ connection sống:

```text
// Trong async IIFE, trước khi gọi executeSupervisorLoop:
const heartbeatInterval = setInterval(() => {
  writer.write(encoder.encode(':heartbeat\n\n')).catch(() => {});
}, 15000);

// Trong finally block, clear interval:
clearInterval(heartbeatInterval);
```

SSE comment (bắt đầu bằng `:`) được đặc tả SSE spec cho phép, browser tự động bỏ qua (không parse), nhưng giữ connection alive.

#### 2. Thêm response headers chống buffering (`chat-topics/index.ts`)

Thêm headers để ngăn proxy buffering:

```text
return new Response(readable, {
  headers: {
    ...corsHeaders,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',    // Nginx
  },
});
```

#### 3. Frontend: Bỏ qua SSE comments (`useChatStreaming.ts`)

Frontend đã có logic `if (line.startsWith(':')) continue;` tại dòng 245, nên heartbeat comments sẽ tự động bị bỏ qua. Không cần sửa frontend.

### Files cần sửa

| File | Thay doi |
|------|----------|
| `supabase/functions/chat-topics/index.ts` | Thêm heartbeat interval 15s + response headers chống buffering |

### Sau khi sửa

```text
04:19:10  tool_executing (content-agent) → Frontend nhan
04:19:12  generate_multichannel bat dau
04:19:25  :heartbeat → Connection song
04:19:40  :heartbeat → Connection song
04:19:55  :heartbeat → Connection song
04:20:10  :heartbeat → Connection song
04:20:12  generate_multichannel xong
04:21:10  agent_step_result → Frontend NHAN ✓ → Chat hien noi dung!
```

