## Mục tiêu
Bổ sung khả năng **lọc & quản lý file Storage theo Workspace (Organization)** trong tab `Storage Buckets` của trang `/admin/storage`.

## Hiện trạng
- Tab Storage hiện hiển thị tất cả file của bucket cho admin global, không phân biệt workspace.
- File path không nhất quán: carousel = `{carouselId}/...`, brand image = `{contentId}/...`, một số dùng `social/{orgPath}/...`.
- Cần backend resolver: cho mỗi file → tra ra `organization_id` qua bảng `carousels`, `multi_channel_contents`, `core_contents`, `brand_templates`, v.v.

## Phạm vi triển khai

### A. Backend — `supabase/functions/admin-storage-manager/index.ts`
1. **Thêm action `list_organizations`** trả danh sách workspace (`id`, `name`, `slug`) để dropdown filter.
2. **Sửa action `list_bucket_files`** nhận thêm tham số `organization_id?: string`:
   - Sau khi `deepListBucket`, build map `{firstSegment → org_id}` bằng cách:
     - Trích `firstSegment = name.split('/')[0]`
     - Nếu là UUID, query song song các bảng theo bucket:
       - `carousel-images` → `carousels` (id, organization_id) + `carousel_images` (id, carousel_id) fallback
       - `brand-images` / `content-images` → `multi_channel_contents` (id, organization_id), `core_contents`, `scripts`
       - `brand-assets` → `brand_templates` (id, organization_id)
       - Các bucket khác → cố gắng match theo prefix `social/{org_id}/...` hoặc folder = `{org_id}`
     - Cache map per request
   - Gắn `organization_id` + `organization_name` vào mỗi file response
   - Nếu `organization_id` truyền vào → filter list trước khi paginate
3. **Sửa action `get_overview`**: nhận `organization_id?` optional. Khi có → mỗi bucket trả thêm `org_file_count`, `org_total_size` (chỉ tính file thuộc org đó). Giữ field cũ để hiển thị "Tổng" lẫn "Của workspace".
4. **Action mới `cleanup_bucket_for_org`**: xóa toàn bộ file của 1 workspace trong 1 bucket (có dry-run). Audit log đầy đủ.

### B. Frontend — `src/pages/AdminStorageMemory.tsx`
1. **Thêm dropdown Workspace selector** ở đầu `StorageTab` (load qua action `list_organizations`):
   - Option mặc định: "Tất cả workspace"
   - Option: từng workspace với badge số file
2. **Truyền `organization_id`** xuống `BucketBrowser` qua props; mọi query (`list_bucket_files`, `cleanup_bucket_older_than`) đều gửi kèm.
3. **Thêm cột "Workspace"** trong bảng file (hiển thị badge org name, click để filter nhanh).
4. **Card bucket** hiển thị 2 dòng số liệu khi đã chọn workspace: "Của workspace: X file / Y MB" và "Tổng bucket: ... ".
5. **Nút mới** trong `BucketBrowser` khi có workspace filter: **"Xóa toàn bộ file của workspace này"** → confirm dialog → gọi `cleanup_bucket_for_org`.

### C. Resolver mapping (backend helper)
Thêm hàm `resolveOrgForFiles(svc, bucket, files[])`:
```ts
// Trả Map<filename, organization_id>
// 1. Gom các firstSegment unique
// 2. Switch theo bucket:
//    'carousel-images' → SELECT id, organization_id FROM carousels WHERE id = ANY($1)
//    'brand-images'    → multi_channel_contents + core_contents
//    'brand-assets'    → brand_templates
//    'content-images'  → core_contents + multi_channel_contents
//    others            → check 'social/{uuid}/' pattern → orgs.id
// 3. Cache theo bucket trong process
```
Audit log mỗi action mới: `storage_cleanup_org`, payload `{bucket, organization_id, count, total_bytes}`.

## File thay đổi
**Sửa:**
- `supabase/functions/admin-storage-manager/index.ts` (thêm 2 action + resolver + filter)
- `src/pages/AdminStorageMemory.tsx` (selector + truyền props + cột mới + nút cleanup-by-org)

**Không cần:**
- Migration mới (dùng query trực tiếp từ service role).
- Đổi tab Bộ nhớ DB / Audit (ngoài phạm vi).

## Bảo mật
- Chỉ admin (đã verify trong `getAdminUser`) mới gọi được — giữ nguyên rate limit 30 ops/phút.
- `cleanup_bucket_for_org` thêm `confirm: true` bắt buộc trong body để tránh nhầm.
- Resolver chỉ SELECT id + organization_id, không leak nội dung.

## Ngoài phạm vi
- Quản lý quota storage per-workspace (kế hoạch sau khi có metric ổn định).
- Đổi naming convention upload mới (sẽ tách kế hoạch riêng để chuẩn hóa `{org_id}/...` cho mọi function).
- Workspace-scoping cho tab "Bộ nhớ DB" (các bảng cache/log đa số toàn cục, làm sau).
