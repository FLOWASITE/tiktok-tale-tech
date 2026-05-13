## Đánh giá chuyên gia — Carousel "Tối ưu content marketing 2026" (4 slide)

Tôi đã pull 4 slide nền vừa generate (carousel `2454080d…`, style `educational + flat_design`) và xem trực tiếp. Đồng ý với bạn — **aesthetic dưới mức 2026-tier**. Chấm tổng quan: **5.5/10**.

### Điểm số từng slide
| Slide | Điểm | Vấn đề chính |
|---|---|---|
| 1 (Hook) | 5/10 | Logo "alero" giả; calendar + clock + bit-stream + circuit overlap → quá đông; text card đè lên subject |
| 2 (Pain) | 4/10 | Logo "mopd" giả; AI tự vẽ headline + 3 bullets vào nền → sẽ DOUBLE TEXT khi overlay; chip glow lấn safe zone |
| 3 (Insight) | 7/10 | Clean nhất, wave + 3 trạm Awareness/Consideration/Decision rõ; nhưng logo "(attached)" và card "4.2x" do AI vẽ là vấn đề |
| 4 (CTA) | 5.5/10 | Logo Flowa đúng nhưng "với Flowa Pro 2026" + bullets do AI vẽ; hand+stamp+UI panel chồng nhau |

### 6 lỗi gốc (root cause)
1. **Logo hallucination** — 4 slide ra 4 logo khác nhau (alero / mopd / (attached) / Flowa). Pipeline đang để model tự render logo trong background → sai brand identity nghiêm trọng. Prompt không có chỉ thị "no fake logos / no watermarks".
2. **Text bake-in vào background** — Nano-banana đang vẽ headline + bullets + numbers ("4.2x", "0.5%", "$50", "1.2%") trực tiếp vào nền. Khi Satori overlay text thật lên trên → DOUBLE TEXT. Đây là bug nghiêm trọng nhất, vì sao bạn thấy "rối" — mắt thấy 2 lớp chữ.
3. **Cliché "tech corporate red"** — cả 4 slide đều motif circuit board / glowing nodes / dark navy + đỏ neon. Không liên quan content marketing. Style preset `flat_design` KHÔNG được apply (output đang là cinematic 3D render).
4. **Mâu thuẫn directive** — `educational` style nói "background SUPPORT text, subtle, not distracting" nhưng `gallery` block nói "8K cinematic editorial maximum quality" → model thiên về cinematic, bỏ qua flat.
5. **Palette quá nghèo** — chỉ 1-2 hex brand → toàn slide ra monotone red, không breathing room, mệt mắt.
6. **Safe zone bị vi phạm** — text card AI vẽ + subject overlap đúng vùng overlay Satori sẽ chiếm.

### Quan sát phụ
- Slide 3 (wave) chứng minh model làm tốt khi prompt minimal & symbolic — đây là direction nên nhân bản.
- Composition không có hierarchy (focal point → secondary → background) — mọi thứ cùng độ sáng.
- Slide 1 vs 4 gap visual quá lớn (calendar/clock vs hand/stamp/UI) — không cảm giác cùng một series.

---

## Plan cải thiện — 4 layer, ưu tiên impact/effort

### LAYER 1 — Chặn bake-in text & fake logo (impact cao nhất, effort thấp)
**File:** `supabase/functions/generate-carousel-image/index.ts` (block `textInstruction` + negative prompt mới)

- Thêm **NEGATIVE PROMPT cứng** cuối prompt:
  ```
  ABSOLUTELY DO NOT render: text, words, letters, numbers, headlines, bullets,
  paragraphs, captions, watermarks, logos, brand names, signatures, UI labels,
  speech bubbles, callout cards with text, infographic numbers, chart labels,
  subtitle bars, percentage badges. The image must be PURE BACKGROUND
  imagery only — typography is added later by the renderer.
  ```
- Strip mọi reference đến brand name & topic số liệu khỏi `cleanedPrompt` trước khi gửi (regex chặn "Flowa", "Pro 2026", "%", "$", "x" lẻ).
- Khi `slideRole !== 'visual'` (tức có overlay text Satori): **force "no text in image"** override cả `gallery` block.
- Sandwich: lặp negative ở đầu + cuối prompt (trick proven với Nano Banana).

### LAYER 2 — Fix style preset không được apply
**Files:** `generate-carousel-image/index.ts` (prompt assembly), `carouselStylePresets.ts` (DB seed)

- Khi `visualPreset = flat_design`: **chèn directive cứng đầu prompt** (override cinematic):
  ```
  STYLE: 2D flat vector illustration, geometric shapes, solid color fills,
  minimal gradients, generous whitespace, isometric or top-down perspective,
  Notion/Stripe/Linear-tier editorial illustration. NO photorealism, NO 3D
  render, NO cinematic photography, NO circuit boards, NO neon glow.
  ```
- Tách `styleDirective` thành map `{visualPreset → directive}` thay vì chỉ map `{carouselStyle → directive}`. Hiện tại `flat_design` bị `educational` block ghi đè.
- Thêm preset `editorial_minimal` & `soft_organic` để có alternative cho ngành B2B/marketing.

### LAYER 3 — Palette & composition richness
**File:** `generate-carousel-image/index.ts`

- Khi brand chỉ có 1-2 hex: **tự auto-expand palette** bằng analogous + tints + 1 contrast accent (4-5 hex), pass full vào `COLOR PALETTE` directive. Tránh monotone.
- Inject **composition scaffold** per-slide (rotate qua 4 archetype):
  - Slide 1: hero focal subject left + breathing space right (cho overlay)
  - Slide 2: split 60/40 với data viz nhỏ
  - Slide 3: full-width metaphor với subject center-bottom
  - Slide 4: 1 strong icon/object + lots of negative space
- Force **safe zone trống** ở vị trí overlay sẽ render (top-left 50% width × 60% height cho hầu hết template) — directive: "Keep this area visually quiet — no subjects, no patterns, no busy detail".

### LAYER 4 — Visual cohesion giữa các slide
**File:** `generate-carousel-images-batch/index.ts`

- `seriesBible` hiện đang generic. Bổ sung **"visual lexicon" lock** vào series bible khi tạo: 1 metaphor xuyên suốt + 1 lighting style + 1 perspective. Inject vào MỌI slide (không chỉ slide 1 anchor).
- Hiện đang lock palette từ slide 1 — tốt. Bổ sung lock thêm: **lighting direction** (vd "soft top-left light, no harsh shadows") và **rendering medium** (vd "flat vector" hoặc "soft 3D clay") qua 1 Gemini Flash Lite call sau slide 1.
- `MAX_ATTEMPTS = 2` giữ; nhưng thêm **post-gen check**: nếu slide chứa text bake-in (OCR confidence > threshold) → auto-regen với negative prompt mạnh hơn.

### Optional layer 5 — Model strategy
- Thử `google/gemini-3.1-flash-image-preview` (Nano Banana 2) cho slide aesthetic, fallback Nano Banana cũ chỉ khi 402.
- Cho preset `flat_design` + `editorial_minimal`: ưu tiên gateway (Gemini 3.1 flash image) hơn PoYo nano-banana — thực tế PoYo hay cinematic-ize.

---

## Technical notes
- Line ~1726 hiện đang chỉ `replace(/\bfont.../)` — cần extend regex để strip headline + numbers.
- Block `gallery → slideRole='visual'` (line 1683-1693) đang mâu thuẫn với educational; cần guard `if (carouselStyle==='gallery') else if educational` đúng thứ tự ưu tiên.
- `brandColorReinforcement` (line 1742) đẩy quá mạnh "must remain dominant" → góp phần làm slide đỏ rực. Giảm xuống "should be present in 30-40% of pixels".
- `textInstruction` hiện chưa thấy ở snippet — cần kiểm tra (search `textInstruction =` trong file) để xác định liệu nó có đang yêu cầu render text hay không.

## Deliverable nếu approve
1 commit duy nhất: edit `generate-carousel-image/index.ts` (Layer 1+2+3) + `generate-carousel-images-batch/index.ts` (Layer 4). Layer 5 để follow-up sau khi validate Layer 1-4. Sau deploy, regen lại carousel `2454080d…` để A/B compare.
