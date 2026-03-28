

# Fix: Agent-generated multichannel content saves empty (null content fields)

## Root Causes Found

### Cause 1: Channel `blog` not mapped to DB column
The campaign plan AI creates pieces with `target_channel: "blog"`, but the `generate-multichannel` function only recognizes `website` as a valid channel (maps to `website_content` column). When `channels: ["blog"]` is passed, AI generates content keyed as `blog_content`, which doesn't exist in the DB schema. Result: content is generated but silently discarded during insert.

**Evidence**: DB records show `selected_channels: ["blog"]` with `website_content: null`.

### Cause 2: Missing `tiktok_content` and `threads_content` in non-streaming insert
The non-streaming DB insert (line 5200-5208) includes all channel columns except `tiktok_content` and `threads_content`. So even when TikTok/Threads content is generated, it's not saved.

**Evidence**: DB records show `selected_channels: ["tiktok"]` with `tiktok_content: null`.

### Cause 3: Cache returning empty data
Cache stores results from previous (possibly failed) generations. Subsequent calls return cached empty content. This amplifies Causes 1 and 2.

## Fix Plan

### 1. `supabase/functions/generate-multichannel/index.ts`
**a)** Add `blog` alias to `CHANNEL_COLUMN_MAP`:
```typescript
blog: 'website_content',  // blog is alias for website
```

**b)** Add channel normalization early in the request handler (after `formData` is parsed): normalize `blog` → `website` in `formData.channels` so the entire pipeline uses `website` consistently.

**c)** Add missing columns to non-streaming insert (line ~5208):
```typescript
tiktok_content: (generatedData.tiktok_content && generatedData.tiktok_content.length > 0) ? generatedData.tiktok_content : null,
threads_content: (generatedData.threads_content && generatedData.threads_content.length > 0) ? generatedData.threads_content : null,
```

### 2. `supabase/functions/agent-pipeline/index.ts`
Add channel normalization when extracting `target_channels` from plan pieces (line ~561):
```typescript
target_channels: [piece.target_channel].map(ch => ch === 'blog' ? 'website' : ch),
```

### 3. `supabase/functions/_shared/tool-executor.ts`
Add channel normalization in `executeGenerateMultichannel` before passing channels to the API call, ensuring `blog` → `website` mapping.

## Result
- All agent-created content will correctly save channel content to DB
- `blog` channel from campaign plans maps to `website_content`
- TikTok and Threads content no longer silently lost

Total: 3 files modified.

