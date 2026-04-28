## Mục tiêu
Thêm chức năng **"Xóa file chưa gắn workspace"** (unresolved files) vào tab Dashboard Workspace của trang `/admin/storage`.

## Bối cảnh
- KPI card "Chưa gán workspace" (line 1102-1108 trong `AdminStorageMemory.tsx`) đang hiển thị số file/bytes của các file mà resolver không map được về `organization_id` nào.
- Hiện chưa có cách xóa hàng loạt các file mồ côi này — chỉ có `cleanup_bucket_for_org` (xóa theo 1 org) và `cleanup_bucket_older_than` (xóa theo tuổi).
- File "chưa gắn workspace" thường là file rác từ các flow lỗi, content bị xóa nhưng asset còn lại, hoặc file không tuân theo naming convention `{id}/...`.

## Triển khai

### A. Backend — `supabase/functions/admin-storage-manager/index.ts`
Thêm action mới **`cleanup_unresolved`**:

```ts
case "cleanup_unresolved": {
  const { bucket, dry_run = false, confirm } = body;
  // bucket optional → nếu không truyền: quét tất cả buckets
  if (!dry_run && confirm !== true) return json({ error: "Cần confirm=true để xóa thật" }, 400);

  const { data: bucketsData } = await svc.storage.listBuckets();
  const targetBuckets = bucket ? [{ id: bucket }] : (bucketsData || []);

  const perBucket: Record<string, { count: number; bytes: number; sample: any[] }> = {};
  let totalDeleted = 0, totalBytes = 0;

  for (const b of targetBuckets) {
    const files = await deepListBucket(svc, b.id).catch(() => []);
    const orgMap = await resolveOrgForFiles(svc, b.id, files);
    const orphans = files.filter((f: any) => !orgMap.get(f.name));
    const bytes = orphans.reduce((s: number, f: any) => s + (f.metadata?.size || 0), 0);
    perBucket[b.id] = { count: orphans.length, bytes, sample: orphans.slice(0, 5).map((f: any) => f.name) };

    if (!dry_run && orphans.length > 0) {
      for (let i = 0; i < orphans.length; i += 100) {
        const batch = orphans.slice(i, i + 100).map((f: any) => f.name);
        const { data } = await svc.storage.from(b.id).remove(batch);
        totalDeleted += data?.length || 0;
      }
      totalBytes += bytes;
    }
  }

  if (!dry_run) {
    await audit(svc, user.id, "storage_cleanup_unresolved", {
      bucket: bucket || "all", deleted: totalDeleted, total_bytes: totalBytes, per_bucket: perBucket,
    });
  }
  return json({ dry_run, per_bucket: perBucket, deleted: totalDeleted, total_bytes: totalBytes });
}
```

### B. Frontend — `src/pages/AdminStorageMemory.tsx`
1. **KPI card "Chưa gán workspace"** (line 1102-1108): thêm nút **"Xóa..."** nhỏ ở góc card, mở `AlertDialog`.
2. **Confirm dialog** 2 bước:
   - Bước 1 (auto): gọi `cleanup_unresolved` với `dry_run=true` → hiển thị bảng breakdown per-bucket (bucket name, count, bytes, sample 5 path).
   - Bước 2: button đỏ "Xác nhận xóa N file (X MB)" → gọi `cleanup_unresolved` với `confirm=true`.
3. **Toast** + **invalidate** `["admin-storage-workspace-dashboard"]` sau khi xóa thành công.
4. Disable button khi `unresolved.files === 0`.

### C. UX an toàn
- Mặc định preview (dry-run) trước; bắt buộc nhấn confirm lần 2 mới xóa thật.
- Cảnh báo rõ ràng: *"Hành động này KHÔNG THỂ HOÀN TÁC. File chưa gắn workspace có thể là dữ liệu của carousel/content vừa tạo nhưng resolver chưa kịp map (ví dụ background task đang chạy)."*
- Audit log đầy đủ trong `admin_audit_logs` action `storage_cleanup_unresolved`.

## File thay đổi
- `supabase/functions/admin-storage-manager/index.ts` — thêm 1 action `cleanup_unresolved`
- `src/pages/AdminStorageMemory.tsx` — thêm nút + dialog trong `WorkspaceDashboardTab`

## Ngoài phạm vi
- Per-bucket selective cleanup từ UI (lần này xóa toàn bộ bucket hoặc tất cả buckets — đủ cho use-case dọn rác).
- Soft-delete / quarantine (chưa cần, audit log đã đủ traceability).
