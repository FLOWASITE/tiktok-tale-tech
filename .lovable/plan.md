## Mục tiêu
Nâng cấp 2 màn hình Pillar (`PillarsTab` list + `PillarDetailView`) theo 3 hướng đã chọn, ưu tiên **UX hiển thị/tổ chức** trước khi tới quick actions.

---

## 1. Pillar List (`PillarsTab.tsx`) — UX richer

**Toolbar mới (sticky trên grid):**
- Search box: lọc theo `name` + `description` (client-side, ~10 pillar/org là phổ biến).
- Status filter chips: All / Planning / Active / Completed / Archived (badge count mỗi nhóm).
- Sort dropdown: `Mới tạo ↓` (default) · `Coverage % ↓` · `Số keyword ↓` · `Tên A→Z`.
- View toggle: Grid (hiện tại) ↔ Compact list (1 row/pillar, dùng khi >10 pillar).
- Đếm hiển thị: "Hiển thị 8/12 pillar".

**Card cải thiện:**
- Thêm mini health dot (trái title): xanh ≥70% coverage, vàng 30-70%, đỏ <30% — purely visual hint, KHÔNG tính score phức tạp (đó là phase sau).
- Hàng meta thêm "X orphan" nếu có (link nhanh vào detail, scroll tới block orphan).
- Hover card → highlight border `ring-1 ring-foreground/10` (Soft Luxury).

**Compact list mode:**
- 1 row: dot · name · status badge · `kw covered/total` · progress bar mini · actions (mở/xóa).
- Phù hợp khi org có >15 pillar.

**Empty state filter:** khi search/filter ra 0, hiện CTA "Xóa bộ lọc".

---

## 2. Pillar Detail (`PillarDetailView.tsx`) — Group + Chart

**A. Universe grouping cho Cluster Keywords list**
- Dùng `categorizeKeyword()` (đã có ở `src/lib/seo/keywordCategorizer.ts`) để phân keyword thành 6 segment: Brand 👑 / Product 💎 / Competitor ⚔️ / Commercial 💰 / Problem 🩹 / Topical 🌐.
- Toolbar phía trên list:
  - Group by dropdown: **None** (hiện tại) · **Universe Category** (default mới) · **Intent** · **Funnel Stage**.
  - Universe filter chips (count mỗi loại) — multi-select.
  - Search box trong cluster (lọc theo keyword text).
- Render: collapsible group header (icon + label + count + avg priority) → list keyword. Mặc định mở 3 group đầu tiên.

**B. Intent × Funnel Matrix (chart mới)**
- Card mới đặt sau "Drill-down summary", trước "Top covered" (hoặc thay thế Funnel breakdown card hiện tại nếu chật).
- Heatmap 4 cột (Info / Commercial / Transactional / Nav) × 3 dòng (TOFU / MOFU / BOFU).
- Mỗi ô: số keyword + màu nền theo density (`bg-muted` → `bg-primary/40`). Click ô → filter list bên dưới.
- Mục đích: nhanh chóng phát hiện gap (vd: BOFU-Transactional trống = thiếu landing trang chuyển đổi).
- Reuse component `IntentFunnelMatrix.tsx` đã tồn tại (đọc lại để chắc chắn match signature; nếu không thì viết inline trong detail).

**C. Expand row keyword (lazy)**
- Click vào row → expand inline panel:
  - Universe category badge + lý do match.
  - Volume/KD/CPC/Priority breakdown (nếu có sẵn trong DB).
  - Quick action: "Đặt làm pillar" · "Tạo content từ keyword này" (link `/multi-channel/create?clusterId=X&keywordIds=Y`) · "Bỏ khỏi pillar".
- Không gọi API khi expand (tránh tốn) — chỉ render dữ liệu đã fetch.

---

## 3. Quick Actions (bulk + AI)

**A. Bulk select trong list keyword:**
- Checkbox đầu mỗi row + "Select all in group".
- Action bar nổi (sticky bottom): **Move to pillar...** (dropdown chọn pillar khác) · **Remove from pillar** · **Set funnel stage** (TOFU/MOFU/BOFU).

**B. AI Auto-cluster orphans (nút trên header detail):**
- Nút "AI gợi ý gom orphan" → mở Dialog.
- Edge function mới `seo-auto-cluster-orphans` (Deno):
  - Input: `{ clusterId }` (pillar đích) hoặc `{ orgId }` (gom toàn org vào nhiều pillar).
  - Lấy keyword `cluster_id IS NULL` của org, gọi Lovable AI Gateway (Gemini 2.5 Flash) phân loại từng keyword vào 1 trong các pillar hiện có (theo name + sample keywords) hoặc "skip".
  - Trả `{ assignments: [{keywordId, suggestedClusterId, confidence, reason}] }`.
- Dialog hiển thị bảng đề xuất + checkbox accept → batch update `cluster_id`.

**C. Bulk move keyword giữa pillars:**
- Đã cover trong (A) ở trên.

---

## File changes

| File | Change |
|------|--------|
| `src/components/admin/seo-keywords/PillarsTab.tsx` | Thêm toolbar (search/filter/sort/view toggle), compact list mode, health dot, orphan count |
| `src/components/admin/seo-keywords/PillarDetailView.tsx` | Group by + Universe chips + search; expand row; bulk select + action bar; nút AI auto-cluster |
| `src/components/admin/seo-keywords/IntentFunnelMatrix.tsx` | Reuse hoặc refactor để nhận `keywords` + `coverageMap` props; click ô emit filter |
| `src/components/admin/seo-keywords/AutoClusterOrphansDialog.tsx` | **NEW** — gọi edge function + render bảng đề xuất + accept |
| `supabase/functions/seo-auto-cluster-orphans/index.ts` | **NEW** edge function (Gemini 2.5 Flash, JWT verify, category=`seo`) |
| `supabase/config.toml` | Đăng ký function mới (verify_jwt mặc định) |
| `.lovable/memory/features/seo/research-lab-v2-vn.md` | Update note về Pillar UX v2 |

---

## Acceptance criteria

- [ ] List Pillar có search box, status filter, 4 sort options, grid/compact toggle.
- [ ] Card hiện health dot màu theo coverage.
- [ ] Detail có group by (4 mode) + Universe chip filter + search trong cluster.
- [ ] Intent × Funnel matrix hiển thị, click ô filter list.
- [ ] Click row keyword expand inline panel (universe badge + actions).
- [ ] Checkbox bulk select + action bar (move/remove/set stage) hoạt động.
- [ ] Nút "AI gợi ý gom orphan" gọi edge function mới + dialog accept hoạt động.
- [ ] Không vỡ existing flow (set pillar keyword, suggest topics, add keyword).
