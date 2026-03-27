

# Tích hợp dynamic-tokens.ts vào cả Agent Mode và Manual Mode

## Vấn đề

`dynamic-tokens.ts` đã được import (line 32) nhưng **chưa bao giờ được gọi**. Cả hai mode đều dùng token budget cố định:

- **Manual Mode** (line 3868): `modelConfig.maxTokens ?? (includesWebsite ? 12288 : aiConfig.max_tokens)` — cố định, không theo channel
- **Agent Mode** (line 4285): `channelConfig?.maxTokens ?? aiConfig.max_tokens` — cố định per-channel từ DB config

Kết quả: Instagram nhận cùng token budget với Website, gây lãng phí token và content dài bất thường ở kênh ngắn.

## Thay đổi

### 1. Manual Mode — `generateAIContentForChannels()` (line ~3868)

Thay fixed token calculation bằng `calculateTotalMaxTokens()`:

```typescript
// TRƯỚC:
const effectiveMaxTokens = modelConfig.maxTokens ?? (includesWebsite ? Math.max(aiConfig.max_tokens, 12288) : aiConfig.max_tokens);

// SAU:
const dynamicMaxTokens = calculateTotalMaxTokens(channelsToGenerate, {
  contentGoal: formData.contentGoal || derivedContentGoal,
  qualityMode: qualityMode,
});
const effectiveMaxTokens = modelConfig.maxTokens ?? Math.max(dynamicMaxTokens, aiConfig.max_tokens);
```

### 2. Manual Mode — `channelModelMap` build (line ~4006-4013)

Khi build per-channel config cho parallel generation, inject dynamic tokens:

```typescript
const maxTokens = channelConfig?.maxTokens ?? calculateChannelMaxTokens(channel, {
  contentGoal: formData.contentGoal || derivedContentGoal,
  qualityMode: qualityMode,
});
```

### 3. Agent Mode — per-channel token (line ~4285)

Thay cố định bằng dynamic:

```typescript
// TRƯỚC:
const maxTokens = channelConfig?.maxTokens ?? aiConfig.max_tokens;

// SAU:
const maxTokens = channelConfig?.maxTokens ?? calculateChannelMaxTokens(channel, {
  contentGoal: formData.contentGoal || derivedContentGoal,
  qualityMode: qualityMode,
});
```

### 4. Logging — thêm token budget transparency

Thêm log cho cả hai mode để track dynamic token allocation:

```typescript
console.log(`[dynamic-tokens] ${channel}: ${maxTokens} tokens (goal=${contentGoal}, quality=${qualityMode})`);
```

## File thay đổi

- **Sửa**: `supabase/functions/generate-multichannel/index.ts` — 3 điểm sửa (Manual grouped, Manual parallel, Agent per-channel)

## Tác động

| Channel | Trước (cố định) | Sau (dynamic) | Tiết kiệm |
|---------|-----------------|---------------|------------|
| Instagram | 4096 | 500 | -88% |
| Twitter | 4096 | 400 | -90% |
| Facebook | 4096 | 2000 | -51% |
| Website | 4096→12288 | 8000 | -35% |
| LinkedIn | 4096 | 2500 | -39% |

Admin override (`channelConfig.maxTokens` từ DB) vẫn được ưu tiên cao nhất — dynamic tokens chỉ là fallback thông minh thay vì hardcode.

