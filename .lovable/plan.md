

# Fix: Nội dung expand bị mất khi client ngắt kết nối

## Nguyên nhân gốc

Trong `supabase/functions/generate-multichannel/index.ts` dòng 2961-2964, khi `clientDisconnected = true`, code thực hiện `controller.close(); return;` — **bỏ qua toàn bộ bước lưu vào database**. 

Khi bạn expand thêm kênh Twitter, AI mất ~71 giây để tạo nội dung. Client (trình duyệt) ngắt kết nối trước khi server hoàn thành (~1.2 giây trước), dẫn đến nội dung tạo xong nhưng không được lưu vào database.

## Giải pháp

### Sửa `supabase/functions/generate-multichannel/index.ts`

Thay đổi logic tại dòng 2961-2964: khi `clientDisconnected = true`, **vẫn tiếp tục lưu database** thay vì return ngay. Chỉ skip các bước gửi SSE events và critique/dedup (không cần thiết khi client đã ngắt).

```text
Hiện tại (dòng 2961-2964):
  if (clientDisconnected) {
    controller.close();
    return;                    ← BỎ QUA SAVE DB
  }

Sau fix:
  if (clientDisconnected) {
    console.log('[streaming-mode] Client disconnected, continuing to save...');
    // Skip SSE events nhưng VẪN lưu DB bên dưới
  }
```

Cụ thể sẽ wrap các bước SSE emit (gửi progress, critique, dedup events) trong `if (!clientDisconnected)` block, nhưng giữ nguyên bước save DB (dòng 3168+) chạy bình thường. Cuối cùng, sau khi save xong, nếu `clientDisconnected` thì `controller.close(); return;`.

### File thay đổi
- **Edit**: `supabase/functions/generate-multichannel/index.ts` — Cho phép save DB ngay cả khi client disconnect
- **Deploy**: Redeploy function

