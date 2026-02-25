

# Fix: Strategy Agent hiển thị nội dung trên Chat UI

## Vấn đề gốc

Khi bạn gõ "Tạo 1 content cho Facebook", luồng thực thi là:
**Research Agent** (hiển thị) -> **Strategy Agent** (BI AN MAT) -> **Content Agent** (hiển thị)

Strategy Agent chạy thành công nhưng output bị ẩn vì:
- Planning tools trả về JSON -> AI tổng hợp lại cũng thường bắt đầu bằng `{`
- Supervisor kiểm tra `isJson` -> skip `agent_step_result` -> frontend không nhận được gì

## Giải pháp

### 1. Cập nhật Strategy Agent prompt - yêu cầu trả TEXT

**File**: `supabase/functions/_shared/agents/strategy-agent.ts`

Thêm quy tắc bắt buộc trả về dạng text vào system prompt:

```
## QUY TAC QUAN TRONG
- LUON tra ve dang van ban (TEXT), KHONG BAO GIO tra ve JSON thuan
- Format output:

**Chien luoc noi dung**
- Topic chinh: [ten topic]
- Kenh: [Facebook/TikTok/...]
- Thoi gian dang: [goi y]

**Content Mix**
- [ty le cac loai content]

**Priority Topics**
1. [topic 1]
2. [topic 2]
```

### 2. Loai bo filter JSON cho strategy-agent trong Supervisor

**File**: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

Thay doi logic `agent_step_result` o ca 2 noi (multi-step va linear workflow):

Hien tai:
```
if (!isJson) { emit agent_step_result }
```

Sua thanh:
```
// Luon emit cho strategy-agent (ke ca khi output la JSON)
if (!isJson || agentName === 'strategy-agent') { emit agent_step_result }
```

Ngoai ra, neu content la JSON, chuyen thanh text summary truoc khi gui len frontend.

## Ket qua mong doi

Khi gox "Tao 1 content cho Facebook":

```text
Chat UI:
  [Research Agent] (2.1s)
  **Topic duoc chon**: Quyet toan thue TNCN 2026...

  [Strategy Agent] (1.5s)          <-- MOI: hien thi noi dung
  **Chien luoc noi dung**
  - Topic chinh: Quyet toan thue TNCN 2026
  - Kenh: Facebook
  - Content Mix: 60% giao duc, 30% tips, 10% CTA...

  [Content Agent] (8.2s)
  Noi dung da kenh...
```

## File thay doi

| File | Thay doi |
|------|----------|
| `strategy-agent.ts` | System prompt bat buoc tra TEXT, khong tra JSON |
| `supervisor-loop.ts` | Bo filter JSON cho strategy-agent, dam bao agent_step_result luon duoc emit |
