

# Tối ưu chất lượng text rendering tiếng Việt trên ảnh multichannel

## Vấn đề hiện tại

AI render text trực tiếp (ai_render mode) nhưng prompt chưa đủ mạnh để đảm bảo:
1. **Dấu tiếng Việt** bị AI render sai (ă→a, ơ→o, ư→u, ê→e)
2. **Text bị thay đổi/rút gọn** — AI tự ý rephrase hoặc bỏ chữ
3. **Font không hỗ trợ Unicode** — AI chọn font Latin-only
4. **Contrast kém** — text khó đọc trên background phức tạp

## Giải pháp: 3 cải tiến

### 1. Thêm Vietnamese Text Rendering Builder vào pipeline
- Tạo builder mới `buildVietnameseTextAccuracy` trong `image-prompt-builders.ts`
- Priority cao (95) để đứng gần cuối prompt (sandwich reinforcement)
- Nội dung:
  - Liệt kê CHÍNH XÁC text cần render (character-by-character)
  - Cấm AI thay đổi bất kỳ ký tự nào
  - Yêu cầu font hỗ trợ Unicode Vietnamese đầy đủ
  - Đưa ra ví dụ cụ thể các dấu dễ sai: ă≠a, ơ≠o, ư≠u, ê≠e, đ≠d

### 2. Nâng cấp `structuredElementsToPromptText` trong `generate-brand-image`
- Thêm "TEXT VERIFICATION CHECKLIST" — liệt kê từng đoạn text cần render kèm character count
- Thêm hướng dẫn: "Nếu không thể render chính xác, HÃY BỎ TEXT thay vì render sai"
- Tăng cường contrast rules: minimum font size, mandatory text shadow/backdrop

### 3. Cải thiện `buildCriticalRules` cho with_text mode
- Thêm rule: "Vietnamese diacritics VERIFICATION — count accent marks in output must match input"
- Thêm rule: "NEVER substitute similar-looking characters"
- Thêm rule: "Use at least 48px equivalent font size for headlines"

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/_shared/image-prompt-builders.ts` | Thêm `buildVietnameseTextAccuracy` builder, cải thiện `buildCriticalRules` |
| `supabase/functions/generate-brand-image/index.ts` | Nâng cấp `structuredElementsToPromptText` với verification checklist |

