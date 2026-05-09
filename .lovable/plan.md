## Chẩn đoán

- Function `pinterest-list-boards` đang chạy thành công HTTP 200, nhưng response thực tế là `boards: []`.
- Token Pinterest vẫn hợp lệ: `test-pinterest-connection` trả về account `flowasite`, loại `BUSINESS`.
- Bảng cache `pinterest_boards` hiện đang rỗng, nên dropdown không có gì để hiển thị.
- Khả năng cao endpoint `GET /v5/boards` không trả board cho app/token hiện tại trong trường hợp này, dù account tồn tại. Cần bổ sung fallback/diagnostic để không “thành công giả” khi API trả rỗng.

## Kế hoạch sửa

1. **Tăng khả năng debug ở backend**
   - Sửa `supabase/functions/pinterest-list-boards/index.ts` để log rõ:
     - `connectionId`, username/platform hiện tại.
     - Số board trả về từ Pinterest.
     - `bookmark`/pagination.
     - Khi API trả `items: []`, log metadata response để phân biệt “không có board thật” với “API endpoint trả rỗng do quyền/tài khoản”.

2. **Không trả “Đã đồng bộ” nếu thật sự không có board**
   - Nếu Pinterest trả 0 board, response vẫn không crash nhưng thêm thông tin `boardCount: 0` và `message/hint` rõ ràng.
   - Frontend `PinterestBoardSelector.tsx` sẽ đọc response này và hiện toast kiểu cảnh báo: tài khoản Pinterest đang trả 0 board, cần tạo board trên Pinterest hoặc kiểm tra quyền app.
   - Tránh tình trạng người dùng thấy “Đã đồng bộ board” nhưng dropdown vẫn rỗng.

3. **Bổ sung fallback kiểm tra board trên response shape khác**
   - Làm parser linh hoạt hơn cho response Pinterest: hỗ trợ `data.items`, `data.boards`, hoặc array trực tiếp nếu API/version trả shape khác.
   - Giữ mapping hiện tại vào `pinterest_boards` khi có dữ liệu.

4. **Tự xác thực lại sau sync**
   - Sau khi gọi sync, frontend reload bảng `pinterest_boards` và nếu vẫn rỗng thì hiển thị thông báo chính xác thay vì success.

## File dự kiến sửa

- `supabase/functions/pinterest-list-boards/index.ts`
- `src/components/brand/PinterestBoardSelector.tsx`

## Kết quả mong đợi

- Nếu Pinterest API có board: board được upsert vào `pinterest_boards`, dropdown hiển thị ngay.
- Nếu Pinterest API trả 0 board: UI báo đúng lý do/next step, không báo thành công giả.
- Có log đủ chi tiết để xác định tiếp liệu tài khoản `flowasite` thật sự chưa có board hay app/token không có quyền đọc board.