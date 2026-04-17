

## Vấn đề: Tab "Quy định" lỗi 400 — sai tên cột

Network log: `column industry_knowledge_nodes.quality_score does not exist` → tab Regulations không load được data.

### Root cause
File `src/hooks/usePackRegulationSources.ts` (line 81) SELECT cột `quality_score`, nhưng schema thật là **`content_quality_score`** (xác nhận qua `db functions` như `get_detailed_quality_stats`, `find_node_duplicates`).

Ngoài ra `parse_status` trong DB dùng giá trị `'parsed'` / `'pending'` / `'failed'` / `'skipped'` (theo function `get_detailed_quality_stats`), nhưng UI `PackCrawledRegulations.tsx` đang check `'completed'` và `'needs_reparse'` → badge sai.

### Thay đổi

**1. `src/hooks/usePackRegulationSources.ts`**
- Đổi SELECT: `quality_score` → `content_quality_score`.
- Interface `CrawledRegulation`: rename field `quality_score` → `content_quality_score: number | null` (giá trị 0–100, không phải 0–1).

**2. `src/components/admin/pack-detail/PackCrawledRegulations.tsx`**
- Đọc `reg.content_quality_score` thay vì `quality_score`.
- `getQualityBadge`: scale 0–100 (≥80 Tốt, ≥50 TB, <50 Cần xem lại) — bỏ `* 100` khi hiển thị.
- `getParseStatusBadge`: thêm case `'parsed'` (Hoàn thành ✅) bên cạnh `'completed'` để tương thích cả 2; thêm `'skipped'`.
- Stats `avgScore`: dùng `content_quality_score` (không nhân 100).

### Không đổi
- DB schema, RLS, edge functions.
- Các tabs khác.

### Kết quả
Tab Quy định sẽ load thành công danh sách regulation đã crawl cho pack `medical_aesthetic_clinic` với điểm chất lượng và parse status đúng.

