## Rà toàn diện Prompt tạo Kịch bản AI Video

Đã đọc `supabase/functions/generate-script/index.ts` (2613 LOC) — toàn bộ 7 hàm liên quan đến prompt: `buildSystemPrompt`, `VIDEO_TYPE_INSTRUCTIONS`, `getOutputFormat`, `getPurposeIntro/VisualRules/SelfCheck/OutputRequirements`. Dưới đây là các vấn đề nghiêm trọng tìm được + cách sửa, theo mức độ ảnh hưởng.

---

### 🔴 P0 — Nguyên nhân trực tiếp gây vỡ scene (đã thấy trong UI)

**1. Mâu thuẫn cấu trúc cứng vs scene count động**
`VIDEO_TYPE_INSTRUCTIONS` (line 75-450) hard-code `1. PROMPT 1: Hook authority`, `2. PROMPT 2-3: …`, `7. PROMPT CUỐI: …` cho 9 thể loại — fixed 5–7 prompt. Nhưng `platformSpec.recommendedScenes` tính động theo platform/duration (TikTok 30s ≈ 6, YT Shorts 60s ≈ 8, Reels 15s ≈ 3). → AI bị **2 nguồn yêu cầu mâu thuẫn**:
- Block 1: "tổng số PROMPT cần tạo: 7" (platform spec)
- Block 2: VIDEO_TYPE bảo "PROMPT 1..PROMPT CUỐI = 6 mục"

→ AI thường dập khuôn 1 mục thành 2 prompt y hệt nhau (lặp nội dung "PROMPT 1") hoặc "Same as PROMPT 1". 

**Fix:** viết lại `VIDEO_TYPE_INSTRUCTIONS` theo **STAGE/PHASE** thay vì PROMPT cố định. Ví dụ `expert_share`:
```
GIAI ĐOẠN BẮT BUỘC (chia tỉ lệ theo tổng số scene đã cấp):
- 1 scene đầu (HOOK): Hook authority — khẳng định vị thế
- ~30% scene tiếp (INSIGHT 1): Kiến thức #1 + ví dụ
- ~30% scene tiếp (INSIGHT 2): Kiến thức #2, deeper
- ~20% scene tiếp (optional INSIGHT 3 hoặc tổng kết)
- 1 scene cuối (CTA): Value summary + CTA nhẹ
```
AI sẽ tự map vào N scene mà platform yêu cầu, không còn xung đột. Áp cho tất cả 9 video types.

**2. `getOutputFormat` template dùng `PROMPT X` placeholder**
Line 1519: `return \`PROMPT X [00:00-${endTs}]:` — placeholder `X` mơ hồ, AI hay copy nguyên `X` hoặc reset về `1`. Đồng thời `endTs` luôn dùng cap (8/10s) thay vì scene plan thực tế.

**Fix:** đổi thành ví dụ cụ thể có chú thích, kèm rule:
```
PROMPT <N> [HH:MM-HH:MM]:    ← thay <N> bằng số scene (1, 2, 3…),
                                thay timestamp bằng giá trị từ "DURATION BUDGET" ở trên
```
Thêm 1 dòng "DEMO" ngay dưới template với 2 scene mẫu (scene 1 hook ~3s + scene 2 ~8s) để AI có anchor.

**3. `[DIALOGUE - max ~X từ cho Ys]` dùng cap thay vì scene plan**
Line 1530 dùng `sceneSec` (cap) → AI hiểu lầm mọi scene đều có cùng word budget. Trong khi scene 1 (hook 3s) chỉ nên ~7 từ.

**Fix:** bỏ cứng số trong template, chỉ ghi `[DIALOGUE - tuân thủ word budget của scene này theo CONTENT DENSITY ở trên]`. Word budget đã có table riêng từng scene ở line 2053-2054.

---

### 🟠 P1 — Vấn đề chất lượng nội dung

**4. CONTINUITY rule lặp 3 chỗ, gợi ý "Same setting as previous scene" dễ bị AI lạm dụng**
- `getOutputFormat` modelLine
- `getPurposeVisualRules` section 5
- `getPurposeSelfCheck` continuity bullet

→ AI đọc 3 lần "ghi Same setting as previous scene" → hiểu nhầm là **toàn bộ scene** copy từ scene trước, dẫn đến VISUAL DIRECTION trống / chỉ "Same as".

**Fix:** consolidate về 1 chỗ duy nhất (`getPurposeVisualRules` section 5) với wording rõ:
```
- VẪN PHẢI viết đầy đủ VISUAL DIRECTION + CHARACTER ACTION + DIALOGUE cho mọi scene.
- Chỉ THÊM 1 dòng note ở Background: "(Same setting/wardrobe/lighting as previous scene)" để AI render hiểu cần match.
- KHÔNG được rút gọn scene thành "Same as ..." — Render engine sẽ không có dữ liệu để dựng.
```
Bỏ continuity duplicate ở 2 chỗ kia.

**5. Hook section (line 1882-1900) ép `opening_line` verbatim vào PROMPT 1**
Nếu hook có 25+ từ nhưng scene 1 chỉ 3s (~7 từ budget) → AI buộc phải chọn: (a) phá word budget, (b) cắt hook, (c) cram vào scene 2. Thường chọn (c) → scene 1 trống.

**Fix:** trong `hookSection`, thêm rule:
```
- Nếu hook dài hơn word budget của scene 1, CẮT giữ phần ấn tượng nhất (opening 1-2 câu),
  phần còn lại chuyển sang Text Overlay hoặc scene 2.
- KHÔNG được để scene 1 không đủ thời lượng dialogue.
```

**6. AUDIO NOTES "For VEO 3" hard-code**
Line 1536 ghi `[AUDIO NOTES - For VEO 3]` nhưng `platformSpec.recommendedVideoModel` có thể là Seedance (không generate audio). AI vẫn ghi audio prompt vô nghĩa → wasted tokens.

**Fix:** conditional theo `spec.recommendedVideoModel`:
- Veo 3.x → giữ AUDIO NOTES section
- Seedance/Kling → đổi thành `[AUDIO NOTES - voiceover hậu kỳ]` chỉ ghi tone/cảm xúc cho TTS, không SFX/Music.

**7. VISUAL DIRECTION mixed VN/EN — AI video model không hiểu tiếng Việt tốt**
Memory `Prompt Localization` chuẩn là English-Instruction-Target-Output. Hiện VISUAL DIRECTION (Shot/Camera/Lighting/Background) đang ghi tiếng Việt → Veo/Seedance prompt quality giảm.

**Fix:** trong `getOutputFormat` ai_video, đổi labels sang English + chú thích "(viết bằng tiếng Anh để AI render hiểu chính xác)":
```
[VISUAL DIRECTION — English]
• Shot: Medium shot (35mm)
• Camera: Slow push-in
• Lighting: Soft natural daylight from left window
• Background: Modern minimalist office, blurred
```
DIALOGUE vẫn giữ tiếng Việt (vì là lời thoại nhân vật / TTS). CHARACTER ACTION cho phép song ngữ.

---

### 🟡 P2 — Robustness / parser

**8. AI hay output `**PROMPT 1:**` markdown bold**
Parser đã handle `**`, nhưng cleaner là cấm markdown bold trong header.

**Fix:** trong selfCheck thêm: "Header PROMPT là plain text, KHÔNG dùng `**...**`".

**9. Không có separator rule giữa các scene**
AI thỉnh thoảng gộp scene liên tiếp không có blank line → khó đọc.

**Fix:** trong `getPurposeOutputRequirements` ai_video thêm: "Mỗi scene cách nhau đúng 1 dòng trống. KHÔNG có markdown horizontal rule (`---`) giữa các scene."

**10. Multi-character không enforce trong scene**
Khi có 2+ character profiles, prompt chỉ inject ở suffix (line 2330) — không nhắc lại ở scene template. AI có thể swap nhân vật giữa scenes.

**Fix:** trong template `[CHARACTER ACTION]` đổi thành `[CHARACTER ACTION - chỉ định rõ nhân vật nào]` + selfCheck thêm bullet "Mỗi scene xác định rõ nhân vật xuất hiện (tên), KHÔNG dùng đại từ mơ hồ".

---

### Files sẽ chỉnh

1. **`supabase/functions/generate-script/index.ts`**
   - Lines 75-450: viết lại `VIDEO_TYPE_INSTRUCTIONS` (9 thể loại) theo PHASE thay vì PROMPT cố định.
   - Lines 1509-1587 `getOutputFormat`: 
     - Đổi `PROMPT X` → `PROMPT <N>` + chú thích
     - VISUAL DIRECTION dùng English labels
     - DIALOGUE bỏ word budget cứng
     - AUDIO NOTES conditional theo model
     - Thêm DEMO 2 scene mẫu
   - Lines 1669-1691 `getPurposeVisualRules` ai_video: consolidate continuity rule, rõ "vẫn phải viết đầy đủ".
   - Lines 1744-1779 `getPurposeSelfCheck` ai_video: gọn, bỏ duplicate continuity, thêm check markdown bold + multi-character.
   - Lines 1815-1830 `getPurposeOutputRequirements` ai_video: thêm separator rule.
   - Lines 1882-1900 hookSection: thêm rule cắt hook dài.

2. **`src/utils/__tests__/parsePrompts.test.ts`**: thêm test case AI output có English VISUAL DIRECTION + multi-character labels vẫn parse đúng.

3. Cập nhật memory `mem://features/video/script-prompt-architecture-vn` ghi nhận: dynamic phase mapping + English visual + consolidated continuity.

### Out-of-scope (không sửa lần này)
- Tách prompt ra file riêng (refactor lớn).
- Đổi sang JSON output mode (cần đổi cả parser + UI).
- Streaming progress cho AI script generation.

### Validation
- Test parser với output mẫu mới (English visual + dynamic scene count).
- Manual test: tạo kịch bản TikTok 30s + Reels 15s + YT Shorts 60s với 3 video_types khác nhau → kiểm storyboard không còn duplicate "PROMPT 1".
- Edge function deploy + curl test với 1 case thực tế.
