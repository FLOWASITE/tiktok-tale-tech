# 🎯 Mục tiêu
Cải thiện độ chính xác và thẩm mỹ của **text render trong ảnh AI** (đặc biệt tiếng Việt có dấu) — vốn là điểm yếu cố hữu của Nano Banana / Imagen / Gemini Image.

# 🔍 Hiện trạng (đã verify trong code)
File `supabase/functions/_shared/image-prompt-builders.ts` đã có:
- ✅ `buildVietnameseTextAccuracy` — đếm dấu, liệt kê rule ă/â/ơ/ô/ư/ê/đ, yêu cầu font Noto Sans/Be Vietnam Pro
- ✅ `buildTextLayout` — position + typography style guide
- ✅ Sandwich reinforcement (priority 95, suffix)

**Điểm yếu còn lại** (nguyên nhân text vẫn sai/xấu):
1. Không giới hạn độ dài → text > 60 ký tự bị AI **rút gọn hoặc bịa**
2. Không có **character-by-character breakdown** → AI dễ skip dấu trong từ dài
3. Không tính **safe-zone theo aspect ratio** → text bị crop ở 9:16 / 1:1
4. Không có **post-render verification** (OCR check) → ảnh sai vẫn được trả về user
5. Không có **fallback layer**: khi text quá phức tạp, nên overlay text bằng Canvas thay vì để AI render

---

# 🛠️ 5 cải tiến đề xuất (priority cao → thấp)

## 1️⃣ **Text Length Guard + Auto-Split** (CAO)
**File:** `supabase/functions/_shared/image-prompt-builders.ts` (sửa `buildVietnameseTextAccuracy` + `buildTextInImageContent`)

- Đếm ký tự `textToInclude`. Nếu > 60 ký tự (tiếng Việt) hoặc > 80 (tiếng Anh):
  - Cảnh báo trong prompt: `"⚠️ TEXT IS LONG (${len} chars). Render in 2-3 lines, max 6 words/line."`
  - Đề xuất line break tại dấu phẩy/khoảng trắng gần nhất
- Nếu > 120 ký tự: **reject sớm** trong `generate-brand-image`, trả error `TEXT_TOO_LONG` → UI hiện toast gợi rút gọn

## 2️⃣ **Character-by-Character Breakdown cho text VN** (CAO)
**File:** cùng builder trên

Thêm vào prompt khi diacriticCount > 0:
```
SPELLING BREAKDOWN (render exactly these characters in order):
"Chăm sóc da" → C-h-ă-m | s-ó-c | d-a
- Position 3: "ă" (a + breve ̆) — NOT "a"
- Position 7: "ó" (o + acute ́) — NOT "o"
```
Nano Banana Pro xử lý tốt hơn rõ rệt khi nhìn thấy từng ký tự tách rời (đã test trong cộng đồng Imagen/Gemini).

## 3️⃣ **Safe-Zone Aware Positioning** (TRUNG)
**File:** `image-prompt-builders.ts` → mở rộng `positionGuide`

Thay vì chỉ "top/bottom/center", inject **tỉ lệ % an toàn theo aspect ratio**:
- 9:16 (TikTok/Reels): text trong vùng 10%-75% chiều cao (tránh UI overlay top + caption bottom)
- 1:1 (Instagram): margin 8% mỗi cạnh
- 16:9 (YouTube/Facebook): tránh 20% bottom (subtitle zone)

Thêm explicit: `"Keep text within ${safeZone.top}%-${safeZone.bottom}% vertical, ${safeZone.left}%-${safeZone.right}% horizontal"`.

## 4️⃣ **Post-Render OCR Verification** (TRUNG — optional toggle)
**File mới:** `supabase/functions/_shared/text-in-image-verifier.ts`
**Sửa:** `supabase/functions/generate-brand-image/index.ts`

Sau khi GeminiGen trả ảnh:
1. Gọi Gemini 2.5 Flash với prompt: `"Đọc chính xác text trong ảnh này (giữ nguyên dấu tiếng Việt). Chỉ trả text, không giải thích."`
2. So sánh fuzzy (Levenshtein) với `textToInclude`
3. Nếu similarity < 85% → **retry tự động 1 lần** với prompt được tăng cường (thêm "PREVIOUS ATTEMPT FAILED — text was rendered as: [X]. CORRECT IT to: [Y]")
4. Log vào `ai_metrics`: `text_accuracy_score`

Chi phí: ~$0.0001/check (Flash). Có toggle `ENABLE_TEXT_OCR_VERIFY` trong workspace settings.

## 5️⃣ **Canvas Overlay Fallback Layer** (THẤP — phức tạp nhất, value cao nhất)
**File:** `supabase/functions/_shared/branded-image-composer.ts` (đã tồn tại — mở rộng)

Cho phép user chọn mode `text_overlay = 'ai' | 'canvas' | 'auto'`:
- **ai**: như hiện tại (Nano Banana render)
- **canvas**: AI tạo ảnh nền sạch (không text), sau đó dùng `Deno Canvas API` overlay text bằng font Noto Sans Bevn → **100% chính xác chữ**
- **auto** (default): nếu text > 40 ký tự HOẶC chứa nhiều dấu (>15) → tự động dùng canvas mode

UI bổ sung 1 dropdown trong `ImageAdvancedOptions.tsx`.

---

# 📊 Phạm vi triển khai

| Cải tiến | Files thay đổi | Effort | Impact |
|---|---|---|---|
| 1. Length guard | 2 files | 15 phút | ⭐⭐⭐⭐ |
| 2. Char breakdown | 1 file | 10 phút | ⭐⭐⭐⭐⭐ |
| 3. Safe-zone | 1 file + data table | 20 phút | ⭐⭐⭐ |
| 4. OCR verify | 2 files mới + 1 sửa | 45 phút | ⭐⭐⭐⭐ |
| 5. Canvas overlay | 3 files + UI | 90 phút | ⭐⭐⭐⭐⭐ |

# ✅ Khuyến nghị
**Làm ngay #1 + #2 + #3** (45 phút, tác động lớn, không rủi ro). 
**#4 và #5** làm sau, có toggle để bật dần — đặc biệt #5 sẽ giải quyết triệt để vấn đề text VN sai dấu.

Bạn muốn tôi triển khai **gói nào** trước?
- (A) Chỉ #1+#2+#3 — quick win
- (B) #1+#2+#3+#4 — thêm verification loop
- (C) Toàn bộ #1→#5 — full overhaul (gồm canvas fallback)
