
# Tối ưu nội dung kịch bản & thời lượng video

## Vấn đề hiện tại

Phân tích code `generate-script/index.ts` cho thấy mấy điểm yếu:

1. **Tốc độ đọc (WPM) không được kiểm soát**: System prompt không hướng dẫn AI về số từ/giây phù hợp. Tiếng Việt nói tự nhiên khoảng 2.5-3 từ/giây, nhưng AI hay nhồi quá nhiều lời thoại vào 1 prompt ngắn (5-10s) hoặc quá ít vào prompt dài.

2. **Line 2001 sai cố định**: `Mỗi ${blockLabel} ≈ 8 giây` — hardcoded 8s bất kể platform spec đã tính scenePlan chi tiết (có thể 2s hook, 3.5s body).

3. **Dialogue length không ràng buộc theo duration**: Prompt format yêu cầu DIALOGUE nhưng không giới hạn số từ/câu theo thời lượng scene.

4. **Thiếu content density guideline**: Không có hướng dẫn về "1 ý chính / scene" hay "max 2 câu / 5s scene".

## Thay đổi kỹ thuật

### 1. Thêm WPM constraint vào system prompt (generate-script/index.ts)

Trong `buildSystemPrompt()`, thêm section mới "CONTENT DENSITY RULES":

```
## CONTENT DENSITY — BẮT BUỘC
- Tốc độ nói tiếng Việt tự nhiên: ~2.5 từ/giây (150 WPM)
- Scene Xs → tối đa X×2.5 = Y từ dialogue
- Mỗi scene CHỈ truyền tải 1 Ý CHÍNH duy nhất
- KHÔNG nhồi nhiều ý vào 1 scene ngắn
- Scene ≤5s: max 2 câu ngắn (12 từ)
- Scene 6-8s: max 3 câu (18-20 từ)  
- Scene 9-10s: max 4 câu (25 từ)
```

### 2. Fix hardcoded "≈ 8 giây" (line 2001)

Thay bằng giá trị dynamic từ `spec.avgSceneSec` hoặc `Math.round(duration / promptCount)`.

### 3. Thêm word count vào scene plan format

Trong `formatSceneDurationPlan()`, thêm word budget:
```
PROMPT 1: 2s (~5 từ) · PROMPT 2: 3.5s (~9 từ) · ...
```

### 4. Cập nhật self-check checklist

Thêm mục kiểm tra content density:
```
□ DIALOGUE CÓ VỪA THỜI LƯỢNG?
  - Mỗi scene Xs có ≤ X×2.5 từ dialogue?
  - Không có scene nào im lặng >2s (trừ visual-only scene)?
  - Không có scene nào nhồi quá 4 từ/giây?
```

### 5. Cập nhật output format template

Thêm word budget hint vào mỗi PROMPT template:
```
[DIALOGUE - max ~Y từ cho Xs scene]
```

### Files thay đổi

- `supabase/functions/generate-script/index.ts` — tất cả thay đổi trên
- `.lovable/memory/features/video/smart-model-pick-vn.md` — ghi nhận content density rules
