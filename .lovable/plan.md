

# Kế hoạch: Chuyển sang Text-in-Prompt (Bỏ Satori Overlay)

## Tổng quan

Thay đổi kiến trúc tạo ảnh carousel: từ 2 bước (background + overlay text) sang 1 bước (AI render cả ảnh lẫn text). Giữ overlay-text-canvas function nhưng không gọi nữa.

## File 1: `supabase/functions/generate-carousel-image/index.ts`

### A. Sửa `buildBackgroundPrompt` — thêm textContent + overlayConfig params

- Thêm 2 params mới: `textContent`, `overlayConfig`
- **Thay safeZoneNote**: Bỏ "Do NOT render any text" → thành "This is a COMPLETE slide with BOTH visual AND text"
- **Thêm textInstruction block**: Từ `textContent` (structured object), tạo TEXT RENDERING instruction chi tiết:
  - dataValue → "very large bold number"
  - headline → "main headline, bold, prominent"
  - subtitle → "smaller, lighter weight"
  - caption → "small, subtle"
  - Position từ overlayConfig (center, bottom-left, etc.)
  - Background treatment (glass, solid-block, cta-button, drop shadow)
  - Font description từ dbTokens
  - Text color từ overlayConfig
  - Rules: render EXACT text, Vietnamese diacritics, no extra text
- **Bỏ regex strip text directives**: Chỉ giữ strip font-family/size/weight (dòng 1126-1131)
- **Bỏ "no text" final line** (dòng 1163): thay bằng textInstruction + updated safeZoneNote

### B. Sửa call site `buildBackgroundPrompt` (dòng 494-497)

Truyền thêm `textContent` và `overlayConfig` (cần compute overlayConfig trước call):
```
const overlayConfig = getOverlayConfig(visualPreset || 'minimalist', slideRole, dbPreset?.overlay_config);
const backgroundPrompt = buildBackgroundPrompt(
  prompt, platform, carouselStyle, slideNumber, totalSlides, slideRole,
  seamlessContext, blendedTokens, brandColors, carouselTopic, slideObjective,
  textContent, overlayConfig  // ← NEW
);
```

### C. Bỏ gọi overlay-text-canvas (dòng 742-877)

Thay toàn bộ STEP 2 overlay block bằng:
- Gallery `visual` slides: vẫn skip text (giữ nguyên dòng 710-740)
- Tất cả slides khác: `backgroundUrl` chính là final image → return trực tiếp
- Giữ metrics save + response format

## File 2: `supabase/functions/generate-carousel/index.ts`

### D. Sửa system prompt section "NGUYÊN TẮC QUAN TRỌNG VỀ fullPrompt" (dòng 495-554)

Thay nội dung:
- fullPrompt mô tả CẢNH CỤ THỂ — text được thêm tự động bởi hệ thống
- KHÔNG viết text content trong fullPrompt
- Giữ các luật: cảnh cụ thể, cùng thế giới, palette, tối thiểu 30 từ
- Thêm luật: để lại không gian cho text overlay
- Giữ nguyên ví dụ tốt (đã rất chi tiết)

### E. Sửa tool description cho fullPrompt (dòng 778)

Cập nhật description: bỏ "ảnh nền", thành "ảnh slide" — nhấn mạnh "KHÔNG viết text content, để lại không gian cho text"

## Không thay đổi
- `overlay-text-canvas/index.ts` — giữ nguyên file, chỉ không gọi nữa
- `generate-carousel` tool schema cho textContent — giữ nguyên
- Self-critique, brand voice, industry memory — giữ nguyên
- Gallery visual skip — giữ nguyên
- Seamless/cross-slide context — giữ nguyên

## Rủi ro & Mitigation
- AI có thể render text sai dấu tiếng Việt → TEXT RENDERING rules yêu cầu exact diacritics
- AI có thể thêm text thừa → Rules: "DO NOT add any extra text not specified"
- Nếu cần rollback → overlay-text-canvas vẫn còn, chỉ cần uncomment call

