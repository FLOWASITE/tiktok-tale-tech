## Mục tiêu
Thêm **streaming progress** cho luồng Import Brand (website + fanpage), thay vì để user nhìn spinner "Đang phân tích..." chết 15-30s không biết gì đang xảy ra. Pattern theo `carousel/streaming-prompt-generation` đã dùng cho Carousel: SSE event-stream với phase thật, không heartbeat giả.

## Vì sao stream "phase" thay vì "token"
Brand extractor dùng **tool-calling** (`extract_brand` function) → AI trả structured JSON ở bước cuối, gần như không có token-by-token hữu ích để show. Giá trị thực sự cho user là biết **đang ở pha nào**:

```text
Scraping homepage (Firecrawl)  →  Scraping /about, /gioi-thieu  →
AI analyzing (qwen-plus)  →  [fallback to qwen-turbo nếu 402]  →
Parsing structured output  →  Done
```

## Backend changes (2 edge functions)

### `supabase/functions/import-brand-from-website/index.ts`
- Detect `body.stream === true` → trả `text/event-stream` thay vì JSON.
- Wrap toàn bộ logic trong `EdgeRuntime.waitUntil` để background-safe khi client disconnect (đã có pattern trong project).
- Emit SSE events:
  - `progress` { step: 'scrape_home', percent: 10, message: 'Đang đọc trang chủ flowa.one' }
  - `progress` { step: 'scrape_subpages', percent: 25, message: 'Đang đọc 3 trang phụ' }
  - `subpage_done` { url, success } cho từng sub-page (live ticker)
  - `progress` { step: 'ai_analyzing', percent: 50, message: 'AI phân tích nội dung (qwen-plus)' }
  - `model_fallback` { from, to, reason } khi extractor rotate model (402/429)
  - `progress` { step: 'parsing', percent: 90 }
  - `result` { success, suggestion, raw_meta } (terminal)
  - `error` { message, code } (terminal)
- Backward compat: không truyền `stream:true` → giữ JSON branch cũ (legacy callers, tests).

### `supabase/functions/import-brand-from-fanpage/index.ts`
Cùng pattern:
- `progress` scrape page about (10%) → fetch posts (30%) → ai_analyzing (50%) → parsing (90%) → result (100%)
- `posts_loaded` { count } ticker.

### `supabase/functions/_shared/brand-extractor.ts`
Thêm optional `onProgress?: (event) => void` callback vào `extractBrandSuggestions()`. Khi rotate qua FALLBACK_MODELS chain, gọi `onProgress({ type: 'model_fallback', from, to, reason })`. Edge function bridge callback → SSE writer.

## Frontend changes

### `src/hooks/useBrandImport.ts` — chuyển sang fetch + SSE reader
- Thay `supabase.functions.invoke()` bằng raw `fetch()` với `body: { ..., stream: true }` (giống pattern `useStreamingRegenerate.ts` đã có sẵn trong project).
- Parse SSE: cập nhật state `progress: { step, percent, message }` + array `events: ProgressEvent[]` (cho activity feed).
- Watchdog 60s không có data → abort + toast.
- Vẫn map 402/503/quota errors như cũ → giữ toast "Nạp credit" / "Tạm ngưng".
- Return signature mới: `{ loading, progress, events, importFromWebsite, importFromFanpage, cancel }`.

### `src/components/brand/BrandImportDialog.tsx` — UI live progress
- Khi `loading === true` và chưa có `result`: hiện **inline progress panel** trong dialog body (thay vì chỉ spinner trên button):
  - Top: `Progress` bar (shadcn `<Progress value={progress.percent} />`)
  - Below: current step message + spinner
  - Activity feed (max 5 dòng cuối): list `events` với icon ✓ done / ◌ active, ví dụ:
    - ✓ Đã đọc trang chủ flowa.one
    - ✓ Đã đọc 2/3 trang phụ
    - ◌ AI đang phân tích (qwen-plus)…
    - ⚠ qwen-plus hết quota → fallback qwen-turbo (nếu có model_fallback event)
- Nút "Phân tích" → "Đang phân tích…" + thêm "Hủy" (gọi `cancel()` abort fetch).
- Khi nhận `result` event → set `result`, panel biến mất, chuyển sang preview fields như cũ.

### Component mới (nhỏ, presentation-only)
`src/components/brand/BrandImportProgressPanel.tsx` — nhận `{ progress, events, onCancel }`, render bar + ticker. Tách để dialog gọn.

## Edge cases & resilience
- **Client disconnect**: `EdgeRuntime.waitUntil` cho phép function chạy hết để cache log (không write DB nên không quan trọng lắm, nhưng tránh lỗi).
- **Stream stall**: watchdog 60s ở client → abort, toast "Phân tích bị treo, thử lại".
- **No SSE support fallback**: nếu response Content-Type không phải `text/event-stream` → đọc làm JSON như cũ (backward compat tự động).
- **Cancel during AI call**: AbortController hủy fetch; backend tiếp tục chạy nhưng kết quả bị bỏ (chấp nhận được, không có side-effect DB).
- **Multi sub-page parallel**: `Promise.allSettled` đã chạy parallel, sẽ emit `subpage_done` từng cái khi xong (race-safe).

## Files thay đổi
- `supabase/functions/import-brand-from-website/index.ts` — thêm stream branch
- `supabase/functions/import-brand-from-fanpage/index.ts` — thêm stream branch
- `supabase/functions/_shared/brand-extractor.ts` — thêm `onProgress` callback
- `src/hooks/useBrandImport.ts` — chuyển sang fetch SSE
- `src/components/brand/BrandImportDialog.tsx` — render progress panel + cancel
- `src/components/brand/BrandImportProgressPanel.tsx` — **NEW**, ~60 lines

## Ngoài scope
- Không đổi schema DB, RLS, AI config, tool schema, fallback model chain.
- Không stream raw AI tokens (vì là tool-call structured output).
- Không thay đổi logic apply/preview fields sau khi có result.

## Verification
1. Test `import-brand-from-website` với `https://flowa.one` qua `curl_edge_functions` — confirm SSE events đúng thứ tự.
2. Mở dialog Import Brand trong UI, paste URL → quan sát Progress bar + activity feed cập nhật mượt.
3. Test cancel giữa chừng → fetch abort, panel reset.
4. Test với URL invalid → SSE `error` event → toast như cũ.
5. Test legacy: gọi `supabase.functions.invoke('import-brand-from-website')` không có `stream:true` → vẫn trả JSON (đảm bảo không breaking).