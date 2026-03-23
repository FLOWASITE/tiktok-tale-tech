

# Chuyển Satori text overlay → AI render trực tiếp trong generate-brand-image

## Phân tích hiện tại

Pipeline tạo ảnh gồm 4 bước:
```text
Step 1: AI tạo ảnh nền (generate-brand-image)
Step 2: Logo overlay (overlay-logo-canvas) 
Step 3: Text overlay đơn giản (overlay-text-canvas — Satori)  ← BỎ
Step 4: Structured overlay phức tạp (overlay-text-canvas — Satori)  ← BỎ
```

**Đã có sẵn `ai_render` mode** trong code — truyền `structuredElements` vào `generate-brand-image` để AI render text trực tiếp. Tuy nhiên mode này chưa được dùng mặc định.

## Đề xuất: Mặc định dùng AI render, bỏ Satori

### Pipeline mới (3 bước → 2 bước):
```text
Step 1: AI tạo ảnh + render text/structured elements trực tiếp
Step 2: Logo overlay (giữ nguyên — raster compositing chính xác hơn AI)
```

### Ưu điểm
- **Nhanh hơn**: Bỏ 1-2 API call (overlay-text-canvas), tiết kiệm 10-30s
- **Đẹp hơn**: AI tự tích hợp text vào composition, không bị "dán đè" như Satori
- **Đơn giản hơn**: Giảm complexity pipeline

### Rủi ro cần xử lý
- **Tiếng Việt**: AI đôi khi render sai dấu (ă, ơ, ư) — cần prompt rõ ràng
- **Chính xác text**: AI có thể thay đổi/bỏ chữ — cần validation hoặc retry

## Thay đổi cụ thể

### 1. `src/hooks/useAutoImageGeneration.ts`
- Đổi default `overlayMode` từ `'satori'` → `'ai_render'`
- Bỏ Step 3 (simple text overlay) và Step 4 (structured overlay) khi mode = `ai_render`
- Luôn truyền `structuredElements` và `textToInclude` vào generate-brand-image
- Pipeline chỉ còn: Step 1 (AI generate+text) → Step 2 (Logo overlay)

### 2. `supabase/functions/generate-brand-image/index.ts`
- Nâng cấp prompt builder: khi nhận `structuredElements`, inject layout instructions chi tiết vào prompt
- Thêm Vietnamese text accuracy instructions: "Render EXACTLY these Vietnamese characters"
- Truyền text content vào prompt thay vì chỉ content summary

### 3. `src/hooks/useAutoImagePipeline.ts`
- Cập nhật `genOptions` để set `overlayMode: 'ai_render'` mặc định
- Bỏ `useCanvasFallback: true`

### Files cần sửa
| File | Thay đổi |
|------|----------|
| `src/hooks/useAutoImageGeneration.ts` | Default ai_render, simplify pipeline steps |
| `supabase/functions/generate-brand-image/index.ts` | Enhanced prompt with text/structured elements |
| `src/hooks/useAutoImagePipeline.ts` | Set ai_render default |

