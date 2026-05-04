## Vấn đề hiện tại

`keyword-research-v2` đã có SSE, nhưng **chỉ stream sau khi AI chạy xong toàn bộ** (6 rounds tool-call) và làm post-processing. Trong lúc AI sinh keyword (giai đoạn 50% → 78%), FE chỉ thấy "AI đang sinh keyword..." cùng heartbeat tăng đều giả lập — không có keyword nào hiện ra. Với deep mode (150 keyword, 6 rounds, 30–60s) UX cảm giác đứng hình.

## Mục tiêu

Stream keyword **ngay sau mỗi round tool-call của AI** → user thấy keyword chảy ra theo nhịp 20 từ / round, kèm progress thật (theo `collected/limit`).

## Thay đổi

### 1. `supabase/functions/keyword-research-v2/index.ts` — `callAI` nhận callback

```ts
async function callAI(
  ...,
  onRoundBatch?: (rawKws: KeywordSuggestion[], round: number, total: number) => void
)
```

Bên trong vòng `for (round...)`:
- Sau khi parse xong `args.keywords` của round, gọi `onRoundBatch(addedThisRound, round, collected.length)` ngay.
- Không đổi logic tool-loop / fallback.

### 2. Hook callback vào SSE writer

Trong `Deno.serve` (đoạn 747–785):
- Bỏ heartbeat fake-progress (`hb` interval) — thay bằng comment ping `: ping\n\n` mỗi 10s thuần để giữ keep-alive (không bump pct giả).
- Truyền callback:
  ```ts
  const onRoundBatch = (raw, round, total) => {
    const pct = Math.min(78, 50 + Math.round((total / limit) * 28));
    send("progress", { pct, message: `AI vòng ${round + 1}: ${total}/${limit} keyword` });
    send("ai_keywords_raw", { batch: raw, round, total, limit });
  };
  const r = await callAI(..., onRoundBatch);
  ```

### 3. FE `KeywordResearchLabTab.tsx`

Thêm xử lý event mới:
- `ai_keywords_raw` → push thẳng vào `previewKeywords` với flag `_pending: true`, hiển thị skeleton/badge "đang chấm điểm" trong `KeywordPreviewTable`.
- Khi event `keyword_batch` (final, đã enrich) bắt đầu đến → reset `previewKeywords` về `[]` rồi mới append batch enriched (vì có thể đã filter off-brand, sort lại theo `final_score`).

```ts
} else if (currentEvent === "ai_keywords_raw") {
  setPreviewKeywords(prev => [
    ...prev,
    ...(data.batch || []).map((k: any) => ({ ...k, _pending: true })),
  ]);
} else if (currentEvent === "keyword_batch") {
  // First final batch resets pending list
  setPreviewKeywords(prev => {
    const hasPending = prev.some((p: any) => p._pending);
    return hasPending ? [...(data.batch || [])] : [...prev, ...(data.batch || [])];
  });
}
```

### 4. `KeywordPreviewTable.tsx` — visual cho row pending

Khi row có `_pending: true`:
- Cột Priority hiện skeleton nhỏ (`<Skeleton className="h-4 w-8" />`) thay vì badge.
- Cột Volume / KD / CPC hiện "—" muted.
- Row có `opacity-70` + `animate-pulse` nhẹ ở cột priority.

Không cần đổi schema, chỉ render conditional.

### 5. Memory update

`mem://features/seo/research-lab-v2-vn.md` — bổ sung dòng:
> Streaming AI rounds: `callAI` emit callback sau mỗi tool-round → SSE event `ai_keywords_raw` → FE hiện row pending (skeleton priority); event `keyword_batch` final reset list khi có pending.

## Files

- `supabase/functions/keyword-research-v2/index.ts` (callAI signature + serve handler)
- `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx` (event handler)
- `src/components/admin/seo-keywords/KeywordPreviewTable.tsx` (render pending state)
- `.lovable/memory/features/seo/research-lab-v2-vn.md`

Không cần migration. Không đụng `_shared/ai-provider.ts` (tận dụng tool-call non-stream sẵn có, stream ở tầng round).
