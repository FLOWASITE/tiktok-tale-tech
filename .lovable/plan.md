

## Kết quả rà soát: Gaps chưa implement đầy đủ

### Đã implement ✅

| # | Component | Status |
|---|-----------|--------|
| 1 | `contentComplexityAnalyzer.ts` — logic phân tích | ✅ Đầy đủ |
| 2 | `ComplexityWarning.tsx` — UI component | ✅ Đầy đủ |
| 3 | `ComplexityWarning` tích hợp trong `SimpleImageGenerator` | ✅ Đã gọi ở Step 3 |
| 4 | `hybridImageGenerator.ts` — `decomposeRequest()` logic | ✅ File tồn tại, logic đầy đủ |
| 5 | `overlay-text-canvas` — `StructuredOverlayRequest` + `buildStructuredElement()` | ✅ Backend edge function đã extend |
| 6 | `useAutoImageGeneration.ts` — `structuredOverlay` option trong pipeline | ✅ Path có sẵn |
| 7 | `useGenerationSignals.ts` — hook tracking | ✅ File tồn tại |
| 8 | `generation_signals` DB table + RLS | ✅ Migration đã tạo |

### Chưa implement / Thiếu tích hợp ❌

| # | Gap | Mức độ |
|---|-----|--------|
| 1 | **`MultiChannelFormWizard` thiếu ComplexityWarning** — Plan yêu cầu tích hợp ở cả Step 6 wizard, nhưng chỉ có trong SimpleImageGenerator | Quan trọng |
| 2 | **`decomposeRequest()` chưa được gọi từ đâu** — Utility function tồn tại nhưng không component/hook nào import hoặc sử dụng nó | Quan trọng |
| 3 | **`useGenerationSignals` chưa được gọi từ component nào** — Hook tồn tại nhưng không được import vào SimpleImageGenerator hay MultiChannelFormWizard | Quan trọng |
| 4 | **Hybrid mode chưa có UI trigger** — `structuredOverlay` option tồn tại trong pipeline nhưng không có UI nào cho phép user kích hoạt hoặc tự động kích hoạt khi complexity = complex | Quan trọng |

### Kế hoạch fix

| # | Thay đổi | File | Effort |
|---|----------|------|--------|
| 1 | Thêm `ComplexityWarning` vào Step 6 của MultiChannelFormWizard | `MultiChannelFormWizard.tsx` | ~10 dòng |
| 2 | Tích hợp `useGenerationSignals` vào SimpleImageGenerator và MultiChannelFormWizard — gọi `recordSignal` khi generate xong, `updateSignal` khi user accept/regenerate/edit | `SimpleImageGenerator.tsx`, `MultiChannelFormWizard.tsx` | ~30 dòng mỗi file |
| 3 | Khi complexity = `complex`, tự động gọi `decomposeRequest()` để tách background prompt vs overlay config, rồi truyền `structuredOverlay` vào pipeline | `SimpleImageGenerator.tsx` hoặc hook wrapper | ~25 dòng |
| 4 | Thêm UI toggle hoặc auto-detect: khi ComplexityWarning hiện `complex`, hiện thêm checkbox "Dùng chế độ Hybrid (AI nền + text chính xác)" — nếu bật, pipeline dùng decomposed request | `SimpleImageGenerator.tsx`, `MultiChannelFormWizard.tsx` | ~20 dòng mỗi file |

Tổng: ~135 dòng thay đổi, 2-3 files. Không breaking change — chỉ wire up các components đã tạo sẵn.

