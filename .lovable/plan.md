## Vấn đề
Khi click "Nội dung đa kênh" từ sidebar, trình duyệt thực hiện **full page reload** (logo Flowa nhấp nháy, mất toàn bộ state, AuthProvider/BrandProvider khởi tạo lại). Bằng chứng kiểm chứng được trên preview:

1. Console emit lại "React Router Future Flag Warning" mỗi lần vào /multichannel — `warnOnce` chỉ phát một lần per module instance, nên việc nó phát lại = React app instance mới = full reload.
2. Cảnh báo `favicon preloaded ... within a few seconds from the window's load event` được gắn nguồn `/multichannel:1` mỗi lần — chứng tỏ document `multichannel` được tải lại từ đầu.
3. Các trang khác (/, /videos, …) KHÔNG có triệu chứng này.

Trong toàn bộ `src/` **không** có `location.reload()` hay `window.location.href = ...` trỏ tới `/multichannel`, nên reload không phải do code chủ động gọi. Nguyên nhân khả dĩ nhất là một effect trên route /multichannel (hoặc component con) đang gây navigation không qua React Router (vd: anchor có `href` nhưng nằm ngoài React Router Context, button submit form mặc định, hoặc một redirect đến chính URL hiện tại). Cần thêm telemetry để khoanh vùng chính xác.

## Phạm vi
Chỉ frontend, không đụng backend / edge functions / DB.

## Kế hoạch

### Bước 1 — Cài instrument để bắt thủ phạm (1 file mới, dev-only)
Thêm `src/lib/debugReload.ts`:
- Đăng ký `window.addEventListener('beforeunload', ...)` log stack trace + URL hiện tại + URL đích (nếu nắm được qua `document.activeElement`).
- Hook `window.addEventListener('click', ...)` capture phase: nếu target là `<a>` có `href` cùng origin và **không** đi qua React Router (kiểm tra `e.defaultPrevented === false` sau microtask), log warning kèm outerHTML phần tử.
- Chỉ bật khi `import.meta.env.DEV` để không ảnh hưởng production bundle.

Import 1 lần ở `src/main.tsx`.

### Bước 2 — Rà soát 3 nghi phạm chính trong path /multichannel
1. `src/pages/MultiChannel.tsx` lines 96–126: hai `useEffect` gọi `navigate(...)` + `window.history.replaceState({}, document.title)`. `replaceState` truyền `''` là URL có thể bị một số polyfill diễn dịch lạ; chuẩn hoá thành `window.history.replaceState({}, '', window.location.href)`.
2. `src/components/multichannel/MultiChannelHeroSection.tsx` + `MultiChannelFilters` + `MultiChannelCard`: kiểm tra mọi `<a>`, `<button type="submit">`, `onClick` có gọi `window.open` / set `.href`.
3. `src/contexts/BrandContext.tsx` + `OrganizationContext.tsx`: nếu khi vào /multichannel mà `currentBrand` thay đổi và context gọi reload/redirect (đã có memory ghi nhận `Global Brand Context` lưu vào localStorage), xác nhận không gọi `window.location.*`.

### Bước 3 — Sửa theo kết quả Bước 1/2
Phương án sửa phụ thuộc thủ phạm:
- Nếu là `<a href>` không phải `Link/NavLink` → đổi sang `Link to=`.
- Nếu là `replaceState` lỗi → sửa chữ ký `replaceState`.
- Nếu là context gây re-mount ProtectedRoute hoặc dispatch redirect → bọc state update trong điều kiện và dùng `navigate` thay vì set `window.location`.

### Bước 4 — Verify
- Hard refresh preview, click sidebar → kiểm tra console: KHÔNG còn cảnh báo `React Router Future Flag` lặp lại, KHÔNG còn cảnh báo favicon preload mới ở `/multichannel:1`.
- Quan sát Network tab: không có request document mới tới `lovableproject.com/multichannel`.

## Lưu ý cho dev (technical)
- File debug chỉ phục vụ chẩn đoán; sau khi xác định và fix sẽ xoá hoặc giữ lại dưới flag `VITE_DEBUG_RELOAD`.
- Không chạm vào `src/integrations/supabase/*` (auto-gen) và không đụng backend.
- Không thay đổi RLS, edge functions, hay migration.
