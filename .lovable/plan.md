

# Fix: AI Agent không lưu nội dung kênh (facebook_content = null)

## Nguyên nhân gốc
Trong agent mode (`generate-multichannel/index.ts` line 4284-4290), khi `callAI` trả về content rỗng (`''`), giá trị được gán là `''`, sau đó khi lưu DB (`line 5037: generatedData.facebook_content || null`), `'' || null` = `null`. Pipeline vẫn báo "completed" nhưng nội dung thực tế bị mất.

Không có retry logic hay validation nào kiểm tra content có thực sự được tạo hay không trước khi lưu.

## Thay đổi

### 1. Sửa `supabase/functions/generate-multichannel/index.ts`

**A. Thêm retry logic trong agent mode (line ~4284-4291)**
- Nếu `callAI` trả content rỗng hoặc quá ngắn (< 50 chars), retry tối đa 2 lần với delay
- Log rõ ràng khi content rỗng để debug

**B. Thêm validation sau agent mode (line ~4294)**
- Kiểm tra xem có ít nhất 1 channel có content > 50 chars
- Nếu tất cả channel đều rỗng → throw Error thay vì lưu record rỗng vào DB
- Log warning chi tiết: model nào, channel nào, error gì

**C. Sửa save logic (line ~5037)**
- Thay `generatedData.facebook_content || null` bằng kiểm tra explicit: nếu string rỗng `''` thì retry hoặc flag

### 2. Sửa `supabase/functions/agent-creator-v2/index.ts`

**Thêm validation response từ generate-multichannel**
- Sau khi nhận `mcOutput`, kiểm tra xem content của target channels có tồn tại hay không
- Nếu content null cho tất cả channels → set `success: false` với error message rõ ràng thay vì tiếp tục pipeline

## Code mẫu

```typescript
// generate-multichannel/index.ts — Agent mode với retry
for (const channel of formData.channels) {
  let content = '';
  const MAX_CHANNEL_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_CHANNEL_RETRIES; attempt++) {
    const result = await callAI({ ... });
    if (result.success) {
      content = result.data?.choices?.[0]?.message?.content || '';
      if (content.length >= 50) break; // Good content
      console.warn(`[agent-mode] ⚠️ ${channel} attempt ${attempt+1}: content too short (${content.length} chars)`);
    } else {
      console.warn(`[agent-mode] ❌ ${channel} attempt ${attempt+1} failed: ${result.error}`);
    }
    if (attempt < MAX_CHANNEL_RETRIES) await new Promise(r => setTimeout(r, 2000));
  }
  
  agentData[`${channel}_content`] = content || '';
}

// Validation sau agent mode
const hasAnyContent = formData.channels.some(
  ch => (agentData[`${ch}_content`] || '').length >= 50
);
if (!hasAnyContent) {
  throw new Error(`Agent mode: All ${formData.channels.length} channels returned empty content`);
}
```

## File thay đổi
- **Sửa**: `supabase/functions/generate-multichannel/index.ts`
- **Sửa**: `supabase/functions/agent-creator-v2/index.ts`

