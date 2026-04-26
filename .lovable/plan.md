## 🐛 Vấn đề

Ảnh Facebook gần nhất render đúng text tiếng Việt được yêu cầu, nhưng **Nano Banana tự thêm text tiếng Anh decorative** (kiểu "NEW", "SALE", "BEST", taglines, badges...) — gây lệch ngôn ngữ với brand VN.

## 🔍 Root cause

Trong `supabase/functions/_shared/image-prompt-builders.ts`:

1. **`buildCriticalRules` (with_text mode, dòng 595-608)** chỉ yêu cầu render đúng text VN nhưng **không cấm AI thêm text khác** (decorative English words, badges, stickers).
2. **`buildNegativePrompt` (dòng 540-557)** — negative prompt `text, words, letters` **chỉ áp dụng cho `background_only` mode**. Khi `with_text`, negative prompt **rỗng** → AI free thêm text phụ tuỳ ý.
3. AI image models (Gemini-Image, Nano Banana) có bias mạnh thêm English decorative text trên social graphics nếu không bị cấm tường minh.

## ✅ Fix plan (1 file, 2 thay đổi nhỏ)

### File: `supabase/functions/_shared/image-prompt-builders.ts`

**A. `buildCriticalRules` — with_text mode (full + brand_only):**
Thêm 2 rule mới sau rule "render verbatim":
- `Render ONLY the exact text specified above. DO NOT add any other text, words, badges, labels, stickers, watermarks, or decorative typography (especially NO English words like "NEW", "SALE", "BEST", "PREMIUM", "OFFICIAL", taglines, slogans, or call-to-action phrases).`
- `If brand language is Vietnamese, ALL visible text in the image must be Vietnamese — no English words allowed anywhere in the composition.`

**B. `buildNegativePrompt` — extend cho with_text mode:**
Thêm negative prompt riêng cho `with_text`:
```
extra text, additional words, English decorative words, badges, stickers, sale tags, banners with text, watermark, secondary captions, foreign language text
```
(giữ nguyên text được chỉ định, chỉ cấm text PHỤ ngoài text chỉ định)

### Optional Layer 2 — Brand language signal
Truyền `brandLanguage` (đã có ở frontend qua `useAutoLanguage`) vào `ImagePromptParams` để critical rule biết khẳng định "ALL visible text must be Vietnamese" thay vì hardcode. (Nếu phức tạp sẽ skip, hardcode VN ổn vì đa số user là VN.)

## 🧪 Verification

- Sau khi deploy `generate-brand-image`, tạo lại 1 ảnh Facebook cho brand Flowa
- Quan sát ảnh: phải KHÔNG có English decorative text
- Check log `[generate-brand-image] FINAL PROMPT` để xác nhận 2 rule mới có mặt

## 📦 Scope
- Chỉ sửa 1 file shared: `supabase/functions/_shared/image-prompt-builders.ts`
- Không đụng frontend, không migration
- Auto-deploy qua Lovable Cloud khi commit
