## Mục tiêu
Mở **SEO Hub** cho mọi user của workspace (không chỉ admin), vì dữ liệu SEO (`seo_clusters`, `seo_keywords`, `seo_keyword_enrichment_jobs`, `seo_rank_tracking`) đã RLS theo `organization_id` — mỗi org chỉ thấy data của mình.

## Bối cảnh hiện trạng
- Route `/admin/seo` được bọc `<AdminProtectedRoute>` → chỉ admin app vào được.
- Sidebar chỉ hiển thị mục SEO Hub trong nhóm Admin.
- 4 tab: **Discover / Plan / Track** đều dùng `useOrganization` + RLS org-scope ⇒ an toàn cho user thường.
- Tab **Produce** (`AdminSeoPages.tsx`) thao tác `seo_landing_pages` — bảng này RLS chỉ cho `app_role='admin'` (landing pages public của flowa.one) → **phải ẩn** khỏi user thường.

## Kế hoạch

### 1. Tạo route mới `/seo` cho user thường (`src/app/routes.tsx`)
- Thêm:
  ```tsx
  <Route path="/seo" element={
    <ProtectedRoute><AppLayout>
      <Suspense fallback={<LoadingFallback />}><SeoHub /></Suspense>
    </AppLayout></ProtectedRoute>
  } />
  ```
- Giữ nguyên `/admin/seo` (admin vẫn có full quyền + tab Produce).
- Thêm legacy redirect: không cần (route admin còn nguyên).

### 2. Tách `AdminSeoHub.tsx` → `SeoHub.tsx` (component dùng chung)
Tạo `src/pages/SeoHub.tsx` nhận prop `isAdmin?: boolean`:
- Render 3 tab Discover/Plan/Track cho mọi user.
- Chỉ render tab **Produce** + `<AdminSeoPages />` khi `isAdmin === true`.
- TabsList grid columns: `grid-cols-3` (user) hoặc `grid-cols-4` (admin) — dynamic theo prop.
- Cập nhật `AdminSeoHub.tsx` chỉ là wrapper: `<SeoHub isAdmin />`.

### 3. Sidebar — thêm mục SEO Hub cho user thường (`src/components/AppSidebar.tsx`)
- Thêm vào `managementItems` (nhóm 3 — Management) hoặc tạo mục riêng dưới Content tools:
  ```ts
  { title: 'SEO Hub', titleKey: 'app.sidebar.seoHub', url: '/seo', icon: Search }
  ```
- Giữ `SEO Hub` trong `adminItems` (admin vẫn vào `/admin/seo`).
- Bổ sung i18n key `app.sidebar.seoHub` (vi/en/th) — value: "SEO Hub".

### 4. Kiểm tra component con không có lệnh hardcoded admin
- `DiscoverWorkspace`, `PlanWorkspace`, `TrackWorkspace` và các tab keyword (Overview/Pillars/KeywordExplorer/Enrichment/RankTracker) đã dùng `useOrganization` + `organization_id`. **Không sửa.**
- `SuggestTopicsDialog`, edge functions `keyword-research-v2`, `seo-rank-tracker`, `suggest-cluster-topics` đều check JWT user — không yêu cầu admin role ⇒ giữ nguyên.

### 5. (Tuỳ chọn) Quota/limit
- Hiện chưa có limit per-tier cho keyword research. Để sau; chỉ flag note: nếu Free abuse → cân nhắc thêm `can_use_unit('seo_research')` ở edge function.

### 6. Memory update
Cập nhật `.lovable/memory/features/seo/hub-ia-v2-vn.md`:
- "Truy cập: mọi user qua `/seo` (3 tab Discover/Plan/Track). Admin có thêm tab Produce qua `/admin/seo`."

## Files thay đổi
- **Mới**: `src/pages/SeoHub.tsx`
- **Sửa**: `src/pages/AdminSeoHub.tsx` (wrapper trả `<SeoHub isAdmin />`)
- **Sửa**: `src/app/routes.tsx` (thêm route `/seo`)
- **Sửa**: `src/components/AppSidebar.tsx` (thêm menu user)
- **Sửa**: `src/i18n/locales/{vi,en,th}.ts` (key `app.sidebar.seoHub`)
- **Sửa**: `.lovable/memory/features/seo/hub-ia-v2-vn.md`

## Không đổi
- Schema DB, RLS policies, edge functions.
- Tab Produce vẫn admin-only.
- `AdminProtectedRoute` cho `/admin/seo` giữ nguyên.

## Kết quả
- User thường: vào `/seo` từ sidebar → Discover (research keyword), Plan (pillar/cluster), Track (rank). Mọi data scoped theo workspace họ đang chọn.
- Admin: `/admin/seo` vẫn có đủ 4 tab gồm Produce (quản lý landing pages public).