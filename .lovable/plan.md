
## Mục tiêu

Gộp 2 trang riêng biệt:
- **Kịch bản Video** (`/scripts`) — tạo + quản lý kịch bản AI
- **Video Studio** (`/videos`) — Quick Clip, Storyboard, Audio, Gallery, Chi phí

thành **1 trang duy nhất** tại `/videos` với tên "Video Studio", thêm tab Kịch bản vào hệ thống tab hiện có.

## Cấu trúc mới

```text
Video Studio (/videos)
├─ Tab: Kịch bản       (mới — gộp từ /scripts)
│   ├─ Danh sách scripts (grid/list + filters + pagination)
│   └─ Tạo mới → mở dialog/inline stepper (thay vì navigate /scripts/new)
├─ Tab: Quick Clip      (giữ nguyên)
├─ Tab: Từ Storyboard   (giữ nguyên)
├─ Tab: Audio Studio    (giữ nguyên)
├─ Tab: Thư viện        (giữ nguyên)
└─ Tab: Chi phí         (giữ nguyên)
```

## Thay đổi chi tiết

### 1. `VideoStudioPage.tsx` — thêm tab "Kịch bản"

- Thêm tab `scripts` vào đầu mảng `TABS` (icon: `Clapperboard`, hint: "Viết kịch bản AI cho video")
- Tab content render `ScriptsTab` component mới (xem mục 2)
- Default tab vẫn là `quick`, trừ khi navigate từ link cũ `/scripts` → auto chọn tab `scripts`

### 2. Component mới: `src/components/video/ScriptsTab.tsx`

Tổng hợp logic từ `Index.tsx` (scripts list) + `ScriptNew.tsx`:
- Hiện danh sách scripts với filters, pagination, grid/list toggle (lấy từ `Index.tsx`)
- Button "Tạo mới" mở ScriptForm inline hoặc trong dialog (thay vì navigate)
- ScriptViewer dialog khi click vào script
- Nút "Chuyển sang Video" từ script → set activeScript + switch tab sang Quick Clip/Storyboard

### 3. Routes (`src/app/routes.tsx`)

- Giữ `/videos` route
- `/scripts` → redirect sang `/videos?tab=scripts` (backward compat)
- Xóa `/scripts/new` route riêng

### 4. Sidebar (`AppSidebar.tsx`)

- Xóa item "Kịch bản Video" (`/scripts`)
- Giữ "Video Studio" (`/videos`) — đổi icon thành `Clapperboard` hoặc giữ `Video`

### 5. Navigation links

- Tất cả `navigate('/scripts')` → `navigate('/videos', { state: { tab: 'scripts' } })` hoặc dùng query param
- `navigate('/scripts/new')` → `navigate('/videos', { state: { tab: 'scripts', action: 'new' } })`

### 6. Dọn dẹp

- `src/pages/Index.tsx` — rename hoặc xóa (hiện đang serve `/scripts`)
- `src/pages/ScriptNew.tsx` — logic chuyển vào ScriptsTab, file có thể xóa

## Không thay đổi

- Database schema, edge functions, hooks (`useScripts`, `useScriptToVideo`)
- Logic ScriptForm, ScriptViewer, ScriptCard, ScriptFilters — reuse nguyên
- ScriptToVideoContext — vẫn hoạt động, chỉ không cần navigate giữa 2 page nữa
- Các tab hiện có của Video Studio (Quick Clip, Storyboard, Audio, Gallery, Costs)
