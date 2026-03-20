

# Tối ưu Prompt theo từng Định dạng Kịch bản

## Vấn đề hiện tại

Hàm `buildSystemPrompt` trong edge function `generate-script` luôn dùng **cùng một prompt** cho cả 3 định dạng. Cụ thể:

1. **Intro luôn nói "VEO 3 → Minimax → CapCut"** — sai cho Teleprompter và Production
2. **Section "QUY ƯỚC VISUAL"** (shot, camera, lighting) luôn xuất hiện — không cần cho Teleprompter
3. **Lines 1363-1380 bị duplicate** — hardcode lại format VEO 3 SAU `getOutputFormat()`, gây nhiễu cho Teleprompter/Production
4. **Self-correction checklist** luôn check "BODY LANGUAGE" — không phù hợp với Teleprompter
5. **"YÊU CẦU ĐẦU RA"** luôn nói "VEO 3", "VISUAL DIRECTION, CHARACTER ACTION..." — sai cho 2 format kia

## Giải pháp

Tách prompt thành các **section có điều kiện theo `effectivePurpose`**, giữ phần chung (video type, character, brand voice) nhưng thay đổi:

### Thay đổi trong `buildSystemPrompt()`:

#### A. Intro — tùy purpose
- `ai_video`: "chuyên tạo PROMPT VIDEO cho AI video generators (VEO 3, Minimax)"
- `teleprompter`: "chuyên tạo KỊCH BẢN ĐỌC cho người thật quay/thu âm trực tiếp"
- `production`: "chuyên tạo KỊCH BẢN SẢN XUẤT cho team chuyên nghiệp (đạo diễn, quay phim, biên tập)"

#### B. Section Visual — chỉ cho `ai_video` và `production`
- `teleprompter`: Bỏ "QUY ƯỚC VISUAL", thay bằng "QUY ƯỚC TRÌNH BÀY" (font size lớn, đánh dấu nhấn mạnh, pause markers)

#### C. Xóa duplicate lines 1363-1380
- Đoạn `[CHARACTER ACTION]`, `[DIALOGUE]`, `[TONE & DELIVERY]`, `[AUDIO NOTES]` bị hardcode lại sau `getOutputFormat()` → xóa

#### D. Self-correction checklist — tùy purpose
- `ai_video`: Giữ check BODY LANGUAGE, VISUAL DIRECTION
- `teleprompter`: Thay bằng check CUE, NHẤN MẠNH, PAUSE, GIỌNG
- `production`: Check CAMERA, LIGHTING, AUDIO setup, EDITOR NOTES

#### E. "YÊU CẦU ĐẦU RA" — tùy purpose
- `ai_video`: "Mỗi PROMPT có: timestamp, VISUAL DIRECTION, CHARACTER ACTION, DIALOGUE, TONE & DELIVERY, AUDIO NOTES"
- `teleprompter`: "Mỗi ĐOẠN có: CUE, Lời thoại, NHẤN MẠNH, PAUSE, GIỌNG"
- `production`: "Mỗi SCENE có: CAMERA, LIGHTING, AUDIO, ACTION, DIALOGUE, NOTES FOR EDITOR"

### Tạo helper functions mới:

```text
getPurposeIntro(purpose, videoTypeName) → string
getPurposeVisualRules(purpose, videoTypeName) → string
getPurposeSelfCheck(purpose, videoTypeName, characterTypeName, promptCount) → string
getPurposeOutputRequirements(purpose, videoTypeName, characterTypeName) → string
```

## File thay đổi

| File | Thay đổi |
|------|----------|
| `supabase/functions/generate-script/index.ts` | Tách prompt theo purpose: intro, visual rules, self-check, output requirements. Xóa duplicate lines 1363-1380 |

