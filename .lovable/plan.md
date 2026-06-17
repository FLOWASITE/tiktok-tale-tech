# Audit — Multichannel Image Generation

## Phạm vi đã review

- Prompt pipeline backend: `supabase/functions/_shared/image-prompt-builders.ts` (892 dòng, 13 segment builders), `image-prompt-style-computer.ts`, `image-prompt-assembler.ts`, `generate-brand-image/index.ts`.
- UX/data-flow client: `src/hooks/useAutoImagePipeline.ts`, `src/hooks/useAutoImageGeneration.ts`, `src/config/channelImageConfig.ts`, `MultiChannelFormWizard.tsx`.

Không review: provider routing/fallback (PoYo/KIE/GeminiGen/9Router), cost-tracking, security.

---

## A. Chất lượng prompt & visual — Vấn đề phát hiện

### A1. 🔴 P0 — Structured layout & CTA hard-code tiếng Việt + màu vàng/cam
`image-prompt-builders.ts:371-432` (`buildStructuredLayoutContent`) viết toàn tiếng Việt ("VÙNG TRÊN", "TIÊU ĐỀ", "Liên hệ ngay để được tư vấn miễn phí!") và force CTA dùng `#FFD700`/`#FF8C00`.
- Hậu quả: brand non-VN (EN/TH) → AI render text VN trong ảnh; brand không phải y tế/spa → CTA vẫn vàng/cam phá brand palette.
- Fix: i18n theo `brandLanguage` (đã có `getUILanguageFromCountry`); CTA color = brand secondary thay vì hard-coded.

### A2. 🔴 P0 — `CHANNEL_TEXT_LAYOUTS` chỉ có 5/19 kênh
`image-prompt-builders.ts:200-230` định nghĩa layout riêng cho `tiktok/instagram/youtube/linkedin/email`. 14 kênh còn lại (facebook, threads, twitter, pinterest, bluesky, zalo_oa, telegram, google_maps, website, blogger, wordpress, shopify, wix, medium) rơi vào `buildStructuredLayoutContent` (VN-only ở trên).
- Fix: bổ sung layout cho ít nhất `facebook/threads/twitter/pinterest/bluesky/zalo_oa/google_maps`; long-form (website/blogger/wp/shopify/wix/medium) dùng 1 layout chung "editorial hero".

### A3. 🟠 P1 — Brand color rule quá cứng (40-60% dominant + forbid list sai)
`buildBrandColors` (line 162-171):
- Force "PRIMARY ≥ 40-60% visible color area" — phá photorealistic/portrait/product shots.
- Forbid `#3B82F6` (generic blue) — nhưng nhiều brand fintech/SaaS dùng đúng màu này.
- Fix: hạ ngưỡng còn "noticeable accent 20-40%" cho `photorealistic`, giữ 40-60% chỉ cho `flat_design/illustration/minimalist`; bỏ forbid list cứng, chỉ nói "if brand primary is blue, use it; otherwise avoid generic blue".

### A4. 🟠 P1 — `buildCreativeVariation` reseed mỗi call
Line 851: `seed = hash(content+brand) + Date.now()` → retries trong cùng request cũng đổi composition/lighting/camera → khó reproduce ảnh tốt; cũng chặn cache.
- Fix: seed = `hash(contentId + channel)` (deterministic per-channel), exposed cho client để regen "different variation" bằng nonce.

### A5. 🟠 P1 — V3 style preset chọn 1 lần cho `firstChannel`
`useAutoImagePipeline.ts:166-186`: gọi `suggestImageStylesV3` với `channel = channels[0]` rồi áp `imageStylePreset` cho TẤT CẢ kênh.
- Hậu quả: TikTok 9:16 + LinkedIn 16:9 cùng style → mất bản sắc kênh.
- Fix: chạy V3 per-channel, cache theo `channel+brand`.

### A6. 🟠 P1 — Aspect ratio chưa tối ưu cho 3 kênh
`channelImageConfig.ts:536-555`:
- `bluesky: 1:1` → Bluesky card preview hiển thị tốt nhất ở 1.91:1 (OG style).
- `google_maps: 1:1` → Google Business Profile khuyến nghị 16:9 (1080×608) cho banner photo, 1:1 chỉ cho profile.
- `pinterest: 2:3` ✅ đúng.
- Fix: `bluesky → 16:9` (hoặc thêm option), `google_maps → 16:9`.

### A7. 🟡 P2 — Style picker weighted-random gây drift visual
`image-prompt-style-computer.ts:99-106`: weighted pick top-3 (55/30/15) mỗi call → cùng brand+industry vẫn ra style khác nhau giữa các lần regen → mất nhất quán visual identity.
- Fix: mặc định pick top-1 deterministic; chỉ random khi user bấm "regenerate variation".

### A8. 🟡 P2 — Instagram layout nói "2-3 words max" nhưng caller có thể đẩy hook dài
`CHANNEL_TEXT_LAYOUTS.instagram` mâu thuẫn với `getTextLengthTier` (cho phép very_long 4 lines).
- Fix: gating ở `useAutoImagePipeline.resolveOverlayText` — IG max 25 ký tự; vượt → suppress thay vì truyền cho AI rồi dùng `lengthTier=very_long`.

### A9. 🟡 P2 — Double-random `textPosition`
- `useAutoImageGeneration.ts:355`: truyền `textPosition` từ user.
- `generate-brand-image/index.ts:947-952`: nếu `textPosition` undefined thì backend lại random.
- `buildCreativeVariation` cũng có `rotateTextPosition`.
- Fix: chỉ 1 nguồn truth — backend, dựa trên `seed` ở A4.

---

## B. UX & Data flow client — Vấn đề phát hiện

### B1. 🔴 P0 — Step 3 & Step 4 disabled toàn cục nhưng code path vẫn tính toán
`useAutoImageGeneration.ts:636-656`: cả 2 steps log "globally disabled". Tuy nhiên `shouldFallbackText` / `shouldFallbackStructured` / `recommendedOverlayMode` / `branded-image-composer.ts` (472 dòng), `footerOverlay`, `fullStructuredOverlay` payload vẫn được build và gửi.
- Hậu quả: dead code 1000+ dòng, payload phình to, debug timeline gây hiểu nhầm (`finalPath='structured_fallback'` nhưng không có overlay).
- Fix: hoặc bật lại có điều kiện (feature flag per channel/brand), hoặc xóa toàn bộ branch fallback + `branded-image-composer.ts`.

### B2. 🔴 P0 — `inFlightContentIdRef` không reset khi error
`useAutoImagePipeline.ts:135-139`: set ref, nhưng catch block (sau line 310) không thấy clear → nếu pipeline lỗi giữa chừng, user không thể retry cho cùng `contentId` đến khi reload page.
- Fix: `finally { inFlightContentIdRef.current = null }`.

### B3. 🟠 P1 — `slowWarningTimer` spam toast khi nhiều channel
`useAutoImageGeneration.ts:318-323`: setTimeout 60s per-channel → batch 3 channel slow → 3 toast info giống nhau xếp chồng.
- Fix: dedupe theo `contentId` (1 toast tổng "X channels đang xử lý lâu...").

### B4. 🟠 P1 — `extractContentSummary` cắt 3 câu đầu + 500 chars
`useAutoImagePipeline.ts:81-91`: long-form blog 2000+ từ → AI chỉ "thấy" 3 câu đầu (thường là intro chung chung) → ảnh không match nội dung sâu.
- Fix: cho long-form channels (website/blogger/wp/medium/shopify/wix) lấy thêm 1 đoạn từ midsection hoặc dùng h2/h3 chính làm anchor.

### B5. 🟠 P1 — `getBatchSize` cap 3 cho 7+ channel
`useAutoImageGeneration.ts:797-806`: 12-15 kênh × ~30-60s/ảnh ÷ batch 3 = 2-5 phút chờ.
- Fix: nâng batch 4-5 cho 7+ channel (providers đã có rate-limit); hoặc tách 2 pool: fast-providers (PoYo/9Router) batch 5, slow (GeminiGen) batch 2.

### B6. 🟠 P1 — Suppress overlay text không có UI signal
`useAutoImageGeneration.ts:279-281`: text bị suppress vì too long / language mismatch → ảnh sinh ra ở mode `background_only` mà user không biết tại sao thiếu text. `renderDebug.overlayText.reason` có ghi nhưng UI không show.
- Fix: hiển thị badge "Text bị bỏ qua vì quá dài / sai ngôn ngữ" trên `ImageStreamingCard`.

### B7. 🟡 P2 — `taskId=null` vẫn proceed
`useAutoImageGeneration.ts:333-337`: warn nhưng tiếp tục → ảnh không xuất hiện trong `GlobalCarouselJobsBadge` / recovery flow.
- Fix: nếu `taskId=null` lần 1, retry tạo task 1 lần; vẫn null → toast warning rõ ràng.

### B8. 🟡 P2 — Fallback `getAspectRatioForChannel` về `16:9` âm thầm
Line 215-225: kênh ngoài union 5 ratio → cast string không khớp → `return '16:9'`. Pinterest đã ở `2:3` nên OK; nhưng nếu config thêm `21:9` v.v. sẽ silently drop.
- Fix: thêm runtime warn khi rơi vào default branch.

### B9. 🟡 P2 — Trust-check model dựa list cứng
`isTrustedTextBakingModel` (chưa thấy nguồn trong context) — nếu PoYo/9Router thêm model mới mà không update list → frontend coi như "untrusted" → bypass logic sai (mặc dù canvas disabled nên không hậu quả thật).
- Fix: chuyển list sang `ai_function_configs` (DB) hoặc dùng metadata từ response.

---

## C. Đánh giá tổng thể

| Hạng mục | Đánh giá | Ghi chú |
|---|---|---|
| Builder pipeline architecture | ✅ Tốt | 13 segment, priority-based, dễ extend |
| Vietnamese diacritic handling | ✅ Xuất sắc | Character breakdown, font requirement, verification rule |
| Sandwich technique (prefix+suffix reinforcement) | ✅ Tốt | Brand color + localization được lặp 2 đầu |
| Channel-specific layout coverage | ⚠️ Chỉ 5/19 kênh | Xem A2 |
| i18n/localization của prompt | ❌ VN-only structured layout | Xem A1 |
| Variation/diversity strategy | ⚠️ Quá random | Xem A4, A7 |
| Aspect ratio mapping | ⚠️ 3 kênh sai | Xem A6 |
| Client pipeline (steps + retry) | ⚠️ Dead code 1000+ dòng | Xem B1 |
| Error recovery & idempotency | ⚠️ Lỗi → khóa contentId | Xem B2 |
| Long-form content summary cho ảnh | ⚠️ Thiếu midsection | Xem B4 |

---

## D. Plan fix theo priority

### Sprint 1 (P0 — phá UX/brand thật)
1. **A1+A2**: Refactor `buildStructuredLayoutContent` + `CHANNEL_TEXT_LAYOUTS`:
   - Tách strings ra `image-prompt-i18n.ts` (vi/en/th), chọn theo `brand.countryCode`.
   - Bổ sung layout cho 7 kênh thiếu (facebook, threads, twitter, pinterest, bluesky, zalo_oa, google_maps).
   - CTA color = `brand.secondary[0]` (fallback `#FFD700` chỉ khi brand không có).
2. **B1**: Quyết định bật/tắt canvas overlay branch:
   - Nếu giữ disabled vĩnh viễn → xóa `branded-image-composer.ts`, `fullStructuredOverlay`, `footerOverlay`, các nhánh `shouldFallback*` trong `useAutoImageGeneration`.
   - Nếu cần fallback → re-enable có feature flag `image_canvas_fallback` ở `ai_function_configs`.
3. **B2**: Thêm `finally` block reset `inFlightContentIdRef` trong `useAutoImagePipeline.startPipeline`.

### Sprint 2 (P1 — chất lượng visual)
4. **A3**: Hạ ngưỡng dominant color theo style preset; bỏ forbid blue cứng.
5. **A5**: V3 style picker chạy per-channel trong `useAutoImagePipeline`.
6. **A6**: Sửa aspect ratio `bluesky` và `google_maps` → `16:9`.
7. **A4 + A9**: Seed deterministic per-channel; loại bỏ random ở `generate-brand-image` (chuyển hết về builder).
8. **B3**: Dedupe slow toast theo `contentId`.
9. **B4**: Cho long-form channels lấy thêm midsection summary (regex h2/h3).
10. **B5**: Tách batch size theo provider speed; nâng cap lên 4-5 cho 7+ kênh.
11. **B6**: UI badge "text suppressed" trên `ImageStreamingCard`.

### Sprint 3 (P2 — polish)
12. **A7**: Style picker deterministic top-1 mặc định, random chỉ khi user request variation.
13. **A8**: Gate IG overlay text length ở client.
14. **B7+B8+B9**: Defensive logging, retry taskId, DB-driven trusted model list.

---

## Technical notes

- File chính sẽ sửa: `supabase/functions/_shared/image-prompt-builders.ts`, `image-prompt-style-computer.ts`, `image-prompt-i18n.ts` (mới), `src/config/channelImageConfig.ts`, `src/hooks/useAutoImagePipeline.ts`, `src/hooks/useAutoImageGeneration.ts`, `src/components/multichannel/streaming/ImageStreamingCard.tsx`.
- Không cần migration DB cho Sprint 1-2 (trừ khi muốn DB-driven model list ở B9).
- Không cần đổi provider routing / fallback chain.
- Tổng ước tính: Sprint 1 ~1 ngày, Sprint 2 ~1.5 ngày, Sprint 3 ~0.5 ngày.

Bạn muốn implement luôn từ Sprint 1, hay cherry-pick từng item cụ thể?
