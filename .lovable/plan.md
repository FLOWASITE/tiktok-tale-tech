

# Cập nhật Edge Functions Registry

## Vấn đề phát hiện

### 1. Phantom entries (có trong registry nhưng KHÔNG tồn tại thực tế)
- `suggest-campaign-kpis` (line 181) — thư mục không tồn tại
- `suggest-kpi-adjustments` (line 182) — thư mục không tồn tại

### 2. Bug nghiêm trọng trong `semantic-search/index.ts`
- Line 113: `Deno.Deno.serve(...)` — gọi sai, phải là `Deno.serve(...)`
- Function này sẽ **crash khi deploy**

### 3. Thiếu semantic cache flag
- `improve-script` đã có `withSemanticCache` nhưng registry đã đánh dấu đúng (line 77) ✅
- `optimize-ad-copy` cũng đã có flag ✅
- `summarize-conversation` cũng đã có flag ✅

## Thay đổi

| File | Thay đổi |
|------|----------|
| `src/data/edgeFunctionRegistry.ts` | Xóa 2 phantom entries (`suggest-campaign-kpis`, `suggest-kpi-adjustments`) |
| `supabase/functions/semantic-search/index.ts` | Sửa `Deno.Deno.serve` → `Deno.serve` |

## Tác động
- Registry: 113 → 111 entries (khớp chính xác với thực tế)
- `semantic-search` function sẽ hoạt động được sau khi sửa bug

