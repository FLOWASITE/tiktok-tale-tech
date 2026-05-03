## Mục tiêu
Tối ưu UI/UX của tab **AI Research Lab v2** (`KeywordResearchLabTab.tsx`) để:
- Hành động chính (Deep research) trở thành CTA rõ ràng, không bị Run research lấn át.
- Brand context và seed hiển thị gọn, có hierarchy.
- Tiến trình research dễ hiểu hơn (timeline phases thay vì 1 thanh % + dòng text).
- Tuân thủ Soft Luxury: neutral gray, minimalist spacing, không màu loè loẹt (bỏ amber bg).

## Thay đổi UI

### 1. Hero header gọn gàng
- Bỏ 2 badge "SERP grounded" + "Auto từ brand" trong title (di chuyển thành sub-text).
- Title một dòng: `AI Research Lab` + dot + brand context inline (nếu có).
- Khi không có brand: thay banner amber bằng inline text muted + link "Chọn brand →".

### 2. Brand seed panel — gộp 1 khối
- Layout 2 cột nhỏ: trái = brand summary (name · industry · N pillars), phải = chip seed (tối đa 5).
- Border `border-border/50`, bg `bg-muted/30` — đúng Soft Luxury.
- Override active → đổi label chip "Manual seeds" với dot accent neutral, không primary.
- Empty seed → inline warning icon + text muted (không bg amber).

### 3. CTA primary = Deep research
- **Deep research** thành nút primary lớn (full text "Auto research bộ keyword brand"), có sub-label "AI mở rộng 2 vòng → lưu 100-200 keyword".
- **Run preview** thành nút secondary nhỏ ở bên cạnh (variant ghost/outline) — dành cho user muốn xem trước rồi chọn.
- Bỏ dòng "N seed · preset: default" → di chuyển vào subtle footer dưới CTA.

### 4. Progress phases timeline
Thay block progress hiện tại bằng **stepper 4 bước**:
```text
[●] SERP grounding → [●] Expand seeds → [○] AI generation → [○] Save pool
```
- Bước đang chạy: dot pulse, label đậm.
- Mỗi bước hoàn tất: dot filled muted-foreground.
- Thanh `Progress` mỏng (h-1) đặt dưới stepper.
- `serpInfo` + `expandedSeeds` chỉ show inline dưới step tương ứng (collapsed nếu không liên quan).
- Cancel button đặt cạnh % thay vì rời rạc.

Mapping pct → phase: 0-15 SERP, 15-40 Expand, 40-90 Generation, 90-100 Save.

### 5. Advanced collapsible — minimal
- Trigger ngắn: `⚙ Tùy chỉnh nâng cao` (không liệt kê dài).
- Khi mở: 3 row gọn — Seed override + Competitor URLs + (preset chips inline + limit).
- Border-top thay vì padding-top, separator nhẹ.

### 6. History jobs polish
- Compact rows hơn (py-2.5).
- Status badge dùng dot-color thay vì variant nhiều màu — outline đơn giản.

## Technical notes (cho dev)
- File duy nhất: `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`.
- Không đổi logic SSE/handleRun/data fetching — chỉ refactor JSX + thêm helper `getPhase(progress)` thuần client.
- Component mới inline (không tạo file riêng): `<PhaseStepper progress={progress} running={running} />`.
- Dùng tokens: `bg-muted/30`, `border-border/50`, `text-muted-foreground`, `text-foreground`. Không dùng `amber-*`, `primary/5` cho background lớn.
- Giữ nguyên Brand context panel khi `!currentBrand` nhưng đổi sang style neutral (bg-muted/40, icon `Info` thay `AlertTriangle`).
- Giữ nguyên KeywordPreviewTable, IntentFunnelMatrix, jobs query, deriveBrandSeeds.

## Out of scope
- Không sửa edge function `keyword-research-v2`.
- Không sửa `KeywordExplorerTab` (đã polish ở turn trước).
- Không thay đổi data model / SSE event names.
