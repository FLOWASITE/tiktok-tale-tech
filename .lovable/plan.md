

## Carousel Expert Assessment — Trạng thái hiện tại vs Gaps

### ĐÃ IMPLEMENT (Backend + UI)

| Phase | Tính năng | Trạng thái |
|-------|-----------|------------|
| **Phase 5** | Gallery dark gradient overlay (programmatic) | ✅ **Done** — `bottomGradient` in `overlay-text-canvas`, gradient `rgba(0,0,0,0) → rgba(0,0,0,0.65)` cho gallery hook |
| **Phase 1 (partial)** | Multi-layer text parsing | ✅ **Done (heuristic)** — `parseTextLayers()` tách `textContent` string thành headline/subtitle/body/accent dựa trên newlines + slideRole |
| **Phase 4 (partial)** | Listicle number badge + progress dots | ✅ **Done** — `decorations.slideNumberBadge` (circle badge top-left) + `progressDots` (bottom-center dots) rendered in Satori |
| **Phase 3 (partial)** | Brand color injection vào background prompt | ✅ **Done** — `brandColorDirective` injected into AI prompt; `brandColors.textColor/backgroundColor` passed to overlay |
| — | Design Token DB (`carousel_style_presets`) | ✅ **Done** — 6 presets with `tokens` + `overlay_config` JSONB |
| — | Slide Role Detection | ✅ **Done** — `detectSlideRole()` returns hook/cta/visual/dataPoint/body |
| — | Gallery visual skip | ✅ **Done** |
| — | Lucide icons cho Carousel/Visual selectors | ✅ **Done** (vừa implement) |

---

### CHƯA IMPLEMENT — Gaps còn lại

| Phase | Tính năng | Mô tả | Effort |
|-------|-----------|-------|--------|
| **Phase 1.1** | Structured `textContent` schema | AI vẫn output `textContent` dạng **string** (plain text). `parseTextLayers()` dùng heuristic split newlines — không có semantic structured output (headline/subtitle/dataValue/caption riêng biệt). Cần upgrade tool calling schema trong `generate-carousel` để AI trả về object `{headline, subtitle, caption, dataValue, dataLabel}` | 2-3 ngày |
| **Phase 6** | Text length guidelines theo visual preset | `generate-carousel` chưa có `getTextLengthGuidelines()` — AI tạo text không biết visual space constraints | 0.5 ngày |
| **Phase 3 (deep)** | Brand color blending vào design tokens | Backend chỉ inject brand colors vào prompt text + overlay textColor. **Chưa có** `blendBrandColors()` — không thay accent, gradient, dataPalette theo brand. 2 brand cùng preset → output gần giống nhau | 2 ngày |
| **Phase 4 (remaining)** | Educational progress indicator + flat_design dividers + product badges | Chỉ có listicle decorations. **Chưa có**: Educational step indicator, flat_design thick divider giữa headline/subtitle, product_only sale badge | 2 ngày |
| **Phase 2** | Seamless consistency validation | **Chưa có** — không có post-generation AI vision check cho color/brightness consistency. Không có `seamless_consistency_score` column | 2-3 ngày |
| **Phase 7** | Layout preview trước generate | **Chưa có** `CarouselLayoutPreview` component — user không xem được mockup layout trước khi tốn API | 3 ngày |
| **Phase 1.2** | Overlay render structured text (dataValue to lớn, caption nhỏ) | `overlay-text-canvas` có multi-layer nhưng chỉ từ heuristic parsing. Chưa render `dataValue` kiểu số liệu khổng lồ, chưa có `caption` layer riêng | 2 ngày |

---

### Đề xuất thứ tự implement

```text
Sprint 1 (quick wins):
  1. Phase 6  — Text length guidelines (0.5 ngày, chỉ thêm text vào system prompt)
  2. Phase 4  — Educational/flat_design/product decorations (2 ngày)

Sprint 2 (core quality):
  3. Phase 1.1 — Structured textContent schema từ AI (2-3 ngày)
  4. Phase 1.2 — Overlay render structured layers (2 ngày)

Sprint 3 (differentiation):
  5. Phase 3  — Brand color deep blending (2 ngày)
  6. Phase 2  — Seamless validation (2-3 ngày, cần thêm DB columns)

Sprint 4 (UX):
  7. Phase 7  — Layout preview component (3 ngày)
```

Bạn muốn bắt đầu từ phase/sprint nào?

