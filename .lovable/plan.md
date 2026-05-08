## Fix: PROMPT 1 nhân bản & "Same as" vỡ scene

### Nguyên nhân
1. **Parser frontend (`src/utils/parsePrompts.ts`):** regex `(?=PROMPT\s*\d+)` chia block ở **mọi chỗ** thấy chữ "PROMPT 1". AI hay viết tham chiếu trong nội dung như:
   ```
   PROMPT 2 [00:10-00:20]: Same as PROMPT 1
   • Camera: Static …
   ```
   → "PROMPT 1" giữa câu bị parser hiểu là header scene mới, sinh ra scene "PROMPT 1 • Camera: Static" lặp lại nhiều lần (đúng như storyboard 7 ô trong screenshot).
2. **Prompt backend (`generate-script/index.ts`):** chính prompt instruction (line 1689) yêu cầu AI viết `(Same setting/wardrobe/lighting as previous PROMPT)` và một số chỗ output PROMPT 2/3 chỉ ghi "Same as" + bullet list — khiến AI dễ chèn "PROMPT 1" trong body.

### Fix

**A. `src/utils/parsePrompts.ts` — chỉ match header ở đầu dòng + dấu `:` hoặc `[`**

Thay 2 regex (line 47, 59) sang multiline + line-start + look-ahead bracket/colon:

- `getBlockPattern` cho `ai_video`:
  ```ts
  return /(?=^\s*(?:\*\*\s*)?(?:PROMPT|CLIP)\s*\d+\s*(?:\*\*)?\s*[:\[])/im;
  ```
- `getBlockNumberPattern` cho `ai_video`:
  ```ts
  return /^\s*(?:\*\*\s*)?(?:PROMPT|CLIP)\s*(\d+)\s*(?:\*\*)?\s*[:\[]/im;
  ```
- Tương tự `teleprompter` (`ĐOẠN N` phải đứng đầu dòng + theo sau `:` hoặc `---`) và `production` (`SCENE N` / `SHOT N` đầu dòng + `:` hoặc `[`).

Thêm `flags.includes('m')` khi build `globalPattern` trong `getPromptCount` (line 362) để vẫn count đúng.

**B. `supabase/functions/generate-script/index.ts` — siết format**

- Đổi gợi ý "(Same setting/wardrobe/lighting as previous PROMPT)" → "(Same setting/wardrobe/lighting as previous scene)" — bỏ chữ "PROMPT" để AI không in lại.
- Ở `getOutputFormat` (ai_video), thêm dòng RULE rõ ràng vào header section template + 1 dòng vào `purposeChecks`:
  ```
  - MỖI scene PHẢI bắt đầu bằng "PROMPT <N> [HH:MM-HH:MM]:" ở ĐẦU DÒNG.
  - TUYỆT ĐỐI không nhắc lại chuỗi "PROMPT <số>" bên trong nội dung của scene khác (nếu cần tham chiếu, viết "scene trước" / "previous scene").
  - Nếu kế thừa setting → viết "Same as previous scene" (KHÔNG viết "Same as PROMPT 1").
  ```
- Ở `purposeChecks` `case 'ai_video'` (line 1746): thêm checklist:
  ```
  □ KHÔNG có chuỗi "PROMPT <số>" nào xuất hiện ngoài header của chính scene đó?
  □ Mỗi PROMPT có CHARACTER ACTION + DIALOGUE riêng (không chỉ "Same as")?
  ```

**C. Test parser**

Thêm `src/utils/__tests__/parsePrompts.test.ts` (hoặc bổ sung) với case:
- Input có "PROMPT 2: Same as PROMPT 1\n• Camera…" → kết quả 2 prompts (1, 2), không phải 3.
- Input chứa markdown bullet "• PROMPT 1" giữa câu → không split.

### Files
- `src/utils/parsePrompts.ts` — sửa regex.
- `supabase/functions/generate-script/index.ts` — sửa wording line 1689 + purposeChecks ai_video + getOutputFormat header rule.
- `src/utils/__tests__/parsePrompts.test.ts` — test mới.
