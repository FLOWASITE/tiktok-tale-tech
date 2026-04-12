

# Chuyển Fallback từ Lovable AI sang PoYo

## Vấn đề

Hiện tại khi KIE hoặc GeminiGen thất bại, hệ thống fallback sang Lovable AI Gateway (`google/gemini-3-pro-image-preview`). Bạn muốn fallback sang **PoYo** thay vì Lovable.

## Phạm vi thay đổi

**2 file** cần sửa:

### 1. `supabase/functions/generate-carousel-image/index.ts`

3 điểm fallback cần đổi:

- **Dòng 576-581** (PoYo fail → Lovable): Đổi thành fallback sang model PoYo khác (ví dụ `poyo/nano-banana-pro` nếu model gốc là `poyo/nano-banana-2-new`, hoặc ngược lại). Nếu chính PoYo đã fail → giữ nguyên return error (không fallback vòng lặp).
- **Dòng 614-619** (KIE fail → Lovable): Đổi thành gọi `generateImageViaPoyo()` với `poyo/nano-banana-pro` làm fallback.
- **Dòng 651-656** (GeminiGen fail → Lovable): Đổi thành gọi `generateImageViaPoyo()` với `poyo/nano-banana-pro` làm fallback.

Khi fallback sang PoYo, set `externalImageUrl` trực tiếp thay vì để rơi xuống block Lovable AI Gateway (dòng 660+).

### 2. `supabase/functions/generate-brand-image/index.ts`

2 điểm fallback (dòng ~638 và ~709): Đổi từ `generateImageWithRetry` (Lovable) sang `generateImageViaPoyo()`.

## Logic fallback mới

```text
KIE fail      → PoYo (nano-banana-pro) → Nếu PoYo cũng fail → return error
GeminiGen fail → PoYo (nano-banana-pro) → Nếu PoYo cũng fail → return error  
PoYo fail     → return error (không fallback vòng lặp)
```

## Lưu ý

- Block Lovable AI Gateway (dòng 660+) vẫn giữ lại cho trường hợp model mặc định không phải external provider.
- Cần kiểm tra `POYO_API_KEY` tồn tại trước khi fallback, nếu không có thì return error luôn.

