## Mục tiêu
Khi tài khoản Pinterest **chưa có board nào**, hiện UI hướng dẫn rõ ràng — thay vì chỉ một dòng placeholder mờ + toast đỏ thoáng qua, người dùng cần biết chính xác phải làm gì.

## Thay đổi (chỉ trong `src/components/brand/PinterestBoardSelector.tsx`)

### 1. Empty state inline (chính)
Khi `!loading && boards.length === 0`, thay phần `<Select>` + nút refresh bằng một **callout box** nằm ngay dưới mô tả:

```
┌────────────────────────────────────────────────┐
│  📌  Chưa có Board nào trên Pinterest           │
│                                                 │
│  Để đăng Pin từ Flowa, bạn cần ít nhất 1       │
│  board công khai trên tài khoản Pinterest.     │
│                                                 │
│  1. Mở pinterest.com → đăng nhập @{username}   │
│  2. Bấm "+" → "Board" → đặt tên                │
│  3. Đặt Privacy = Public (KHÔNG Secret)        │
│  4. Quay lại đây và bấm "Đồng bộ board"        │
│                                                 │
│  [ Mở Pinterest ↗ ]   [ 🔄 Đồng bộ board ]     │
└────────────────────────────────────────────────┘
```

Chi tiết:
- Dùng `bg-muted/40 border-dashed` cho callout, icon `Info` hoặc `AlertCircle` từ lucide.
- Button **"Mở Pinterest"** = `<a href="https://www.pinterest.com/board-create/" target="_blank">` (deep-link tới trang tạo board).
- Button **"Đồng bộ board"** gọi lại `refreshFromPinterest` với spinner.
- Nếu function trả `hint`, hiện thêm dòng `hint` nhỏ dưới checklist (server-side message).

### 2. State khi chưa từng đồng bộ (lần đầu mở brand)
Phân biệt 2 case:
- `boards.length === 0` **và chưa từng refresh** → hiện callout "Chưa đồng bộ — bấm Đồng bộ để tải board từ Pinterest" (nhẹ nhàng, không alarm).
- `boards.length === 0` **và vừa refresh xong** → hiện callout hướng dẫn tạo board ở trên (alarm hơn).

Track bằng local state `hasSynced: boolean` set `true` sau lần đầu `refreshFromPinterest` xong.

### 3. Bỏ toast đỏ "Không tìm thấy board nào"
Vì đã có inline callout, toast destructive không còn cần thiết — chỉ giữ toast khi **lỗi thật** (network/auth). Trường hợp `count === 0` thành công → không toast.

### 4. Khi có board → giữ nguyên UI hiện tại
Select dropdown + refresh icon button như cũ.

## Không thay đổi
- Backend `pinterest-list-boards` (đã trả `boardCount` + `hint`).
- Logic save / auto-pick board duy nhất.
- Bất kỳ file nào khác.

## Verify
- Brand chưa sync: thấy callout xanh nhẹ "Chưa đồng bộ".
- Sau khi bấm Đồng bộ và Pinterest trả 0 board: thấy callout hướng dẫn 4 bước + 2 nút.
- Tạo board public trên Pinterest → bấm "Đồng bộ board" → callout biến mất, dropdown hiện.
