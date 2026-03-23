

# Sửa lỗi Creator Agent — `Cannot read properties of undefined (reading 'maxWords')`

## Nguyên nhân

Khi pipeline gọi `generate-core-content`, request body không có `lengthMode`. Hàm `getLengthConfig(undefined)` trả về `undefined` → `getMaxTokens()` crash tại `config.maxWords`.

## Giải pháp

Sửa 2 file — thêm fallback `'medium'` tại gốc thay vì chỉ patch caller:

### 1. `supabase/functions/_shared/core-content-pipeline.ts`
- `getLengthConfig()`: fallback `'medium'` khi `lengthMode` không hợp lệ
- `getMaxTokens()`: tương tự fallback

### 2. `supabase/functions/generate-core-content/index.ts`  
- Dòng 482: Sau khi destructure, thêm `const effectiveLengthMode = lengthMode || 'medium'`
- Thay tất cả `lengthMode as CoreContentLengthMode` bằng `effectiveLengthMode` (dòng 611, 612, 620, 621)

## Files

| File | Loại |
|------|------|
| `supabase/functions/_shared/core-content-pipeline.ts` | Sửa — defensive fallback trong `getLengthConfig` và `getMaxTokens` |
| `supabase/functions/generate-core-content/index.ts` | Sửa — default `lengthMode` = `'medium'` |

