## Vấn đề UI hiện tại

Sau khi chọn pillar, KeywordTargetPicker:
1. **Popover search trộn toàn bộ keyword org** — không scope theo cluster, user phải gõ tay tìm keyword pillar
2. **Hai bước remove → add** mới đổi được keyword (vì 5/5 disabled nút Thêm)
3. **Chip chỉ hiển thị volume** — thiếu intent/KD để user judge nhanh nên giữ keyword nào
4. **Không có quick action** — không reset, không "chọn top 5", không thấy còn keyword nào trong cluster chưa được dùng

## UX Mục tiêu

Thay cách "popover search" bằng **inline checklist scope-cluster** với 1-click toggle:
- User thấy NGAY top 8-10 keyword của pillar đang chọn (xếp theo priority_score)
- Click checkbox = toggle on/off, KHÔNG cần remove trước
- Mỗi row có chip Vol / KD / Intent để judge nhanh
- Counter "5/5 đã chọn" + warning soft khi vượt
- Nút "Top 5" và "Bỏ chọn" reset nhanh
- Search-in-cluster (optional input) nếu cluster có >10 keyword

## Implementation

### 1. Refactor `KeywordTargetPicker.tsx` → thêm prop `clusterId`
```ts
interface Props {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  clusterId?: string | null;   // NEW: scope keywords to cluster
}
```

Khi có `clusterId`:
- Query top 50 keyword của cluster đó (sort priority_score desc)
- Render **inline checklist** thay vì popover. Layout:
  ```
  ┌─────────────────────────────────────────┐
  │ Keyword mục tiêu        [Top 5] [Bỏ]    │
  │ 5/5 đã chọn  ·  3 keyword chưa dùng     │
  ├─────────────────────────────────────────┤
  │ ☑ chăm sóc da mặt   [Info] Vol 12K KD 45│
  │ ☑ skincare routine  [Info] Vol 8K  KD 32│
  │ ☐ kem dưỡng ẩm      [Comm] Vol 5K  KD 28│
  │ ☐ serum vitamin C   [Trans]Vol 3K  KD 51│
  │ ... (max 8 visible, "Xem thêm 12" link) │
  └─────────────────────────────────────────┘
  ```
- Khi user check vượt `max=5` → hiện toast "Đã đạt giới hạn 5 keyword" thay vì silent disable. Cho phép check tới 7 nhưng đánh dấu ngoài-target (xám hơn) — KHÔNG, scope nhỏ thôi: hard cap 5 kèm shake animation feedback.
- Search input trên cùng nếu `keywords.length > 10`

Khi KHÔNG có `clusterId`:
- Giữ nguyên popover hiện tại (legacy fallback cho idea-mode-không-cluster)

### 2. Cập nhật `PillarKeywordSection.tsx`
Truyền `clusterId={clusterId}` xuống KeywordTargetPicker.

### 3. Bỏ helper text "Mặc định gắn 5 keyword..." — thay bằng counter inline (đã có trong layout mới)

### 4. Quick actions
- **"Top 5"**: `onChange(top5IdsByPriority)` 
- **"Bỏ chọn"**: `onChange([])` (kèm confirm nếu user đã thay đổi)
- Pillar keyword (is_pillar=true) luôn pin lên đầu list + có badge "PILLAR"

### 5. Empty state
Nếu cluster không có keyword nào: show CTA "Thêm keyword vào nhóm này →" link tới `/seo?tab=plan&clusterId=X`

## Không thay đổi

- Backend đã có fallback top-5 (vừa fix tuần trước), giữ nguyên làm safety net
- `selectedKeywordIds` state shape không đổi — chỉ improve cách user interact
- Pop-up search org-wide vẫn dùng được khi `clusterId=null` (idea mode)
