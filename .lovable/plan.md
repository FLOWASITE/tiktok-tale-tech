

# Gộp VEO 3 + Minimax → "Video AI" (5 định dạng → 4)

## Ý tưởng

Gộp `ai_video_veo3` và `ai_video_minimax` thành 1 option duy nhất `ai_video`. Hệ thống tự chọn output format (VEO 3 hoặc Minimax) dựa trên nội dung — hoặc luôn dùng VEO 3 format (đầy đủ hơn) rồi export ra Minimax khi cần.

## Phân tích kỹ thuật

**Sự khác biệt thực tế giữa VEO 3 và Minimax:**
- VEO 3: Output chi tiết (Visual Direction, Camera, Lighting, Character Action, Dialogue, Audio Notes) — block label "PROMPT"
- Minimax: Output gọn (Scene, Camera motion, Voice, Duration) — block label "CLIP"

**Nhận xét:** VEO 3 format **bao trùm** Minimax. Từ VEO 3 hoàn toàn có thể extract ra Minimax format (đã có sẵn `formatForMinimax` trong ScriptExportMenu). Vậy chỉ cần giữ 1 format VEO 3, và export ra Minimax khi cần.

## Giải pháp

### 1. `src/types/script.ts` — Gộp type
- Thay `'ai_video_veo3' | 'ai_video_minimax'` → `'ai_video'`
- Cập nhật `SCRIPT_PURPOSE_CONFIG`: 1 entry `ai_video` với label "Video AI", description "Tạo kịch bản video AI — tự động tối ưu cho VEO 3, Minimax, và các provider khác"
- `blockLabel`: "Prompt", `blockLabelVi`: "Prompt"

### 2. `src/components/script/ScriptPurposeSelector.tsx`
- Xóa entry `ai_video_minimax` khỏi `ICON_MAP`
- Thêm entry `ai_video` với icon `Video`
- Bỏ badge "Hot" (không cần phân biệt nữa)

### 3. `src/components/script/ScriptFormStepper.tsx`
- Default `script_purpose` từ `'ai_video_veo3'` → `'ai_video'`

### 4. `supabase/functions/generate-script/index.ts`
- `SCRIPT_PURPOSE_LABELS`: gộp thành `ai_video: 'Video AI'`
- `getOutputFormat`: case `'ai_video'` dùng format VEO 3 (đầy đủ nhất)
- `buildSystemPrompt`: xử lý `'ai_video'` thay vì 2 case riêng

### 5. `src/utils/parsePrompts.ts` — Backward compatible
- `getBlockPattern`: default case vẫn match `PROMPT`, thêm fallback match `CLIP` cho scripts cũ dạng Minimax
- `getBlockNumberPattern`: tương tự
- Parse logic: `'ai_video'` → dùng `parseVeo3Block`, fallback `parseMinimaxBlock` nếu không tìm thấy PROMPT blocks

### 6. `src/components/script/ScriptExportMenu.tsx`
- `PURPOSE_EXPORT_OPTIONS`: `ai_video: { veo3: true, minimax: true, dialogue: true, standard: true }` — cho phép export cả 2 format

### 7. `src/components/ScriptCard.tsx`
- `PURPOSE_ICONS`: thêm `ai_video`, giữ backward compat cho `ai_video_veo3`/`ai_video_minimax`

### 8. `src/components/script/PurposeAwarePromptCard.tsx`
- Case `'ai_video'` → render VEO3Card, fallback MinimaxCard cho scripts cũ

### 9. Backward compatibility
- Scripts cũ trong DB vẫn có `script_purpose = 'ai_video_veo3'` hoặc `'ai_video_minimax'`
- Tất cả các file sẽ thêm mapping: nếu gặp `'ai_video_veo3'` hoặc `'ai_video_minimax'` → xử lý như `'ai_video'`
- Helper function `normalizePurpose(purpose)` trong `types/script.ts` để chuẩn hóa

## Files thay đổi

| File | Thay đổi |
|------|----------|
| `src/types/script.ts` | Gộp type, thêm `normalizePurpose()` helper |
| `src/components/script/ScriptPurposeSelector.tsx` | 4 options thay vì 5 |
| `src/components/script/ScriptFormStepper.tsx` | Default purpose → `'ai_video'` |
| `supabase/functions/generate-script/index.ts` | Gộp labels + output format |
| `src/utils/parsePrompts.ts` | Backward compat parsing |
| `src/components/script/ScriptExportMenu.tsx` | Gộp export options |
| `src/components/ScriptCard.tsx` | Gộp icon mapping |
| `src/components/script/PurposeAwarePromptCard.tsx` | Gộp render case |

