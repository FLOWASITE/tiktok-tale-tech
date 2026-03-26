

# Tại sao Agent không tạo được Multichannel nhưng UI tạo bình thường

## Nguyên nhân gốc

Có **2 code path hoàn toàn khác nhau** trong `generate-multichannel`:

1. **UI (tạo thủ công)** → gửi `stream: true` → vào **Streaming Mode** (line 2455)
   - Gọi AI dạng **plain text** (không dùng tool calling)
   - Mỗi channel được generate riêng lẻ bằng `generateChannelStreaming()`
   - AI chỉ cần viết text thẳng → **bất kỳ model nào cũng chạy được**

2. **Agent (agent-creator-v2)** → gọi `callFunction()` **KHÔNG có `stream: true`** → vào **Normal Mode** (line 3421)
   - Bắt buộc AI phải trả về format `tool_calls` với function name `generate_multichannel_content`
   - Dùng `toolChoice: { type: "function", function: { name: "generate_multichannel_content" } }`
   - Model phải hỗ trợ **structured tool calling** → nhiều model (như Qwen) trả về sai format → fail sau 3 retries

**Bằng chứng từ logs:**
```
[single] Generating single channel facebook with model qwen/qwen3.5-plus-02-15
[ai-format] Invalid response format, retry 1/2
[ai-format] Invalid response format, retry 2/2
Error: Invalid AI response format
```

## Giải pháp: Agent dùng streaming-style generation (plain text, không tool calling)

### Thay đổi trong `agent-creator-v2/index.ts`

Trong `routeMultichannel()`, thêm `stream: false` nhưng kèm `agentMode: true` vào params gửi cho `generate-multichannel`:

```typescript
const mcParams = {
  ...existingParams,
  agentMode: true,  // Signal to use text-based generation instead of tool calling
};
```

### Thay đổi trong `generate-multichannel/index.ts` (Normal Mode)

Khi phát hiện `agentMode: true`, thay vì dùng `generateAIContentForChannels` (tool calling), sẽ:

1. Gọi AI dạng plain text cho từng channel riêng lẻ (giống streaming mode nhưng không stream)
2. Parse kết quả text trực tiếp thành `channelResults`
3. Bỏ qua hoàn toàn tool calling

Cụ thể, thêm một function `generatePlainTextForChannel()` trước block parallel generation (line ~3930):

```typescript
// Agent mode: generate plain text per channel (no tool calling required)
if (formData.agentMode) {
  for (const channel of formData.channels) {
    const channelConfig = channelModelConfigs.get(channel);
    const model = channelConfig?.model || aiConfig.model;
    const temp = channelConfig?.temperature ?? aiConfig.temperature;
    
    const result = await callAI({
      functionName: 'generate-multichannel',
      organizationId,
      modelOverride: model,
      temperatureOverride: temp,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + `\nViết nội dung cho kênh: ${channel.toUpperCase()}\nViết TRỰC TIẾP, KHÔNG giải thích.` },
      ],
      // NO tools, NO toolChoice → plain text response
    });
    
    channelResults[channel] = result.data?.choices?.[0]?.message?.content || '';
  }
  // Skip to save step
}
```

### Phạm vi thay đổi: 2 files

| File | Thay đổi |
|------|----------|
| `supabase/functions/agent-creator-v2/index.ts` | Thêm `agentMode: true` vào `mcParams` (1 dòng) |
| `supabase/functions/generate-multichannel/index.ts` | Thêm branch `agentMode` trong Normal Mode (~40 dòng) — generate plain text per channel, skip tool calling, map results vào DB columns |

### Lợi ích

- Agent hoạt động với **mọi model** (Qwen, Claude, Gemini, GPT...) — không phụ thuộc tool calling
- Tái sử dụng cùng system prompt, brand context, channel overrides đã có
- Không ảnh hưởng đến UI flow (vẫn dùng streaming mode như cũ)
- Không cần thay đổi model config

