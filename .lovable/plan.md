

# Fix Core Content Generation Failure

## Root Cause Analysis

### Issue 1: Database Column Errors (Critical)
File `supabase/functions/generate-core-content/index.ts` line 489 queries columns that DO NOT EXIST in the `customer_personas` table:
- `short_description` - does not exist
- `is_active` - does not exist  
- `psychological_triggers` - does not exist

This causes a Postgres error (`column customer_personas.short_description does not exist` visible in DB logs), which makes the persona data query fail silently (no error thrown, just null data).

### Issue 2: Streaming Returns Empty Content (Critical)
Edge function logs show:
```
[callAIStreaming] Success via openrouter, content length: 0
```

The model `qwen/qwen3.5-397b-a17b` is a reasoning/thinking model. OpenRouter returns reasoning tokens in `delta.reasoning` field, but the streaming parser in `callAIStreaming` (line 300) only reads `delta.content`:
```javascript
const delta = parsed.choices?.[0]?.delta?.content || '';
```

When a thinking model outputs its response, reasoning tokens go to `delta.reasoning` and the actual answer goes to `delta.content`. If the model puts everything in reasoning mode, `content` stays empty = 0 length content = generation fails with "Generated content too short".

## Fixes

### Fix 1: `supabase/functions/generate-core-content/index.ts` - Fix persona query (lines 487-502)

Replace the select query to only use columns that actually exist in the table:
- Change `short_description` to `occupation` (closest existing descriptive field)
- Remove `is_active` filter (column doesn't exist)
- Change `psychological_triggers` to `buying_triggers` (closest existing column)

Before:
```sql
.select('name, short_description, pain_points, psychological_triggers, communication_style')
.eq('is_active', true)
```

After:
```sql
.select('name, occupation, pain_points, buying_triggers, communication_style')
```

And update the mapping:
```typescript
description: p.occupation || undefined,
triggers: p.buying_triggers || undefined,
```

### Fix 2: `supabase/functions/generate-core-content/index.ts` - Fix streaming parser for reasoning models (lines 293-307)

Update the streaming chunk parser to also capture `delta.reasoning` content from thinking models. When the model uses reasoning mode, we should still capture the final content output:

```javascript
const delta = parsed.choices?.[0]?.delta?.content || '';
const reasoning = parsed.choices?.[0]?.delta?.reasoning || '';
if (delta) {
  fullText += delta;
  onChunk?.(delta);
}
// For reasoning models: if no content but has reasoning, 
// accumulate it separately (don't stream to user)
```

Additionally, add a check: if after streaming, `fullText` is empty but there was a non-streaming response structure in the final chunk (some providers send the complete message in the last chunk), extract it.

### Fix 3: Add non-streaming fallback for empty streaming results

In `callAIStreaming`, after the streaming loop, if `fullText` is empty, attempt a non-streaming call as fallback to ensure the user always gets content:

```typescript
if (!fullText) {
  console.warn('[callAIStreaming] Streaming returned empty, retrying non-streaming...');
  return callAI(model, systemPrompt, userPrompt, maxTokens, temperature);
}
```

## Technical Details

### Files to modify:
1. `supabase/functions/generate-core-content/index.ts`
   - Lines 487-501: Fix persona query columns
   - Lines 293-314: Fix streaming parser + add fallback

### Expected outcome:
- Persona data loads correctly without DB errors
- Reasoning/thinking models (Qwen3.5, DeepSeek R1, etc.) produce content correctly
- If streaming fails, automatic non-streaming retry ensures content generation completes

