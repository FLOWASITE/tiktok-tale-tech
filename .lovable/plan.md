## Tiếp tục: Layer 4 + Layer 5 — Cohesion & Model Strategy

Layer 1-3 đã xong (anti-hallucination, visual preset override, palette softening). Còn 2 layer cuối để hoàn thiện chất lượng aesthetic.

---

### LAYER 4 — Visual Cohesion giữa các slide
**File:** `supabase/functions/generate-carousel-images-batch/index.ts`

**4.1. Visual Lexicon Lock (mở rộng `seriesBible`)**
- Sau khi slide 1 generate xong, chạy 1 Gemini Flash Lite call (~200 tokens) để extract từ slide 1:
  - `metaphor`: motif chính (vd "growth journey via abstract paths")
  - `lighting`: hướng + chất sáng (vd "soft top-left light, no harsh shadows")
  - `medium`: rendering style (vd "flat 2D vector" / "soft 3D clay" / "editorial photography")
  - `perspective`: góc nhìn chủ đạo
- Inject 4 thuộc tính này vào `seriesBible` cho slide 2-N → khoá visual world thực sự thay vì chỉ palette.
- Hiện tại `buildSeriesBibleFromSlides()` chỉ regex-extract từ prompt → upgrade thành "AI-extracted lexicon".

**4.2. Post-gen Text Bake-in Detection**
- Sau mỗi slide image generate xong, gọi Gemini Flash 1 call cheap để check: "Does this image contain visible text/letters/numbers/logos that aren't part of the typography overlay area?"
- Nếu detect → tự động regen với negative prompt mạnh hơn (thêm "ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO LOGOS" sandwich 3 lần).
- Reuse `MAX_ATTEMPTS = 2` budget hiện có.

**4.3. Composition Scaffold Rotation**
- Inject per-slide composition archetype để tránh monotone:
  - Slide 1 (Hook): hero subject left + breathing space right
  - Slide 2-N-1: rotate qua [split 60/40, full-width metaphor center, icon + negative space, top-down flat lay]
  - Slide N (CTA): single strong icon + lots of negative space
- Pass vào `slideContext` hiện có trong batch.

---

### LAYER 5 — Model Strategy
**File:** `supabase/functions/generate-carousel-image/index.ts` (model selection logic)

**5.1. Preset-aware Model Routing**
- `flat_design` + `minimalist` + `editorial_minimal` → ưu tiên `google/gemini-3.1-flash-image-preview` (Nano Banana 2 — clean editorial output, ít cinematic-ize hơn PoYo)
- `gradient` + `geometric` + `illustration` → giữ PoYo nano-banana (hiện tại)
- `product_only` → giữ PoYo (text rendering tốt cho product shots)
- Fallback chain: gemini-3.1-flash-image → PoYo → KIE → gemini-2.5-flash-image

**5.2. Trust Model Boost**
- Khi model = `gemini-3.1-flash-image-preview`: skip thêm 1 layer "anti-cinematic" guard vì model này tự nhiên thiên editorial.

---

### Validation
Sau deploy:
1. Regen carousel `2454080d-060b-4e09-9666-e1be0cc2f5c3` (educational + flat_design) để A/B compare với 4 slide cũ.
2. Test thêm 1 carousel `seamless + minimalist` và 1 `gallery + gradient` để confirm các preset khác không bị regress.
3. Mục tiêu: aesthetic ≥7.5/10, không còn fake logo, không còn double text.

---

### Update memory
- Cập nhật `aesthetic-guardrails-vn.md` thêm section "Layer 4 Cohesion + Layer 5 Routing" sau khi implement xong.

---

### Out of scope (defer)
- OCR-based text detection (heavy, dùng Gemini vision check thay thế)
- Custom fine-tuning model
- A/B test framework tự động (manual A/B đủ ở giai đoạn này)
