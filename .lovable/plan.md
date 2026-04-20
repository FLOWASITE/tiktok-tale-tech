
# Fix: `/status` vẫn leak pipeline của brand khác

## Vấn đề đã xác định

DB hiện tại cho thấy:

- Chat `501332455` đang có `active_brand_template_id = 8dd69b10-17e1-4daf-968a-4ec8a241c858` (`Flowa - Agentic Content Marketing Platform`)
- Brand này hiện **không có pipeline nào**
- Toàn bộ pipeline của org đang nằm ở brand khác: `Thuế Hộ by TAF.vn`

Nếu `/status` vẫn hiển thị các pipeline đó, thì logic live đang **không áp filter brand một cách thực sự** trên đường chạy hiện tại.

## Root cause khả dĩ nhất

Có 2 điểm cần khóa lại để hết lỗi hẳn:

1. `handleStatus` hiện filter pipeline bằng bước trung gian:
   - lấy `goalIdsForBrand`
   - rồi `.in("goal_id", goalIdsForBrand)`

   Cách này dễ fail im lặng nếu:
   - `activeBrandId` resolve sai ở runtime
   - query goal trả rỗng nhưng code path không đi vào empty-state như kỳ vọng
   - function live chưa dùng đúng code path mới

2. Thiếu log chẩn đoán ở `/status`, nên hiện chưa thấy được runtime thực tế đang resolve:
   - brand nào
   - goal ids nào
   - query cuối trả bao nhiêu pipeline

## Cách sửa

### 1. Siết chặt `/status` bằng query filter theo quan hệ goal-brand, không phụ thuộc prefetch list

Thay vì:
- query `agent_goals` trước
- rồi filter `agent_pipelines.goal_id IN (...)`

Sửa sang query pipeline kèm relation `agent_goals` và filter trực tiếp theo `agent_goals.brand_template_id`.

Hướng làm:
- `runningQ` và `recentQ` select thêm relation goal
- chỉ lấy pipeline có `agent_goals.brand_template_id = activeBrandId`
- nếu active brand có nhưng không match row nào thì trả empty-state rõ ràng

Lợi ích:
- bỏ hẳn lớp trung gian `goalIdsForBrand`
- giảm khả năng mismatch giữa brand → goals → pipelines
- debug dễ hơn vì filter nằm ngay trên query cuối

### 2. Thêm logging bắt buộc trong `handleStatus`

Thêm log cho mỗi lần `/status`:
- `chatId`
- `activeBrandId`
- `activeBrandName`
- số goal thuộc brand
- số running/recent pipeline sau filter
- có fallback sang org-wide hay không

Ví dụ log cần có:
```ts
console.log("[handleStatus] scope", {
  chatId,
  orgId,
  activeBrandId,
  activeBrandName: activeBrand?.brand_name ?? null,
});
console.log("[handleStatus] result", {
  runningCount: running.length,
  recentCount: recent.length,
  usedOrgWide: true,
});
```

### 3. Làm empty-state quyết liệt hơn khi đang có active brand

Nếu đã có `activeBrandId`, tuyệt đối không được rơi về “show toàn org”.

Khi brand hiện tại không có pipeline:
- hiện:
  - `🎨 Brand đang xem: <name>`
  - `ℹ️ Brand này chưa có pipeline nào`
  - `👉 /generate <mô tả> để tạo campaign đầu tiên`

Không render block pipeline org-wide trong case này.

### 4. Kiểm tra lại `getActiveBrandContext` và `getActiveBrandId` dùng cùng một nguồn

Hiện có 2 helper:
- `getActiveBrandId()`
- `getActiveBrandContext()`

Sẽ đồng bộ để cả 2:
- đọc cùng row `telegram_chat_bindings`
- cùng fallback mặc định
- cùng trả về brand hiện hành nhất quán

Mục tiêu là tránh case:
- `/brand` nhìn một brand
- `/status` resolve brand khác

### 5. Xác minh sau sửa bằng dữ liệu thực tế của chat đang lỗi

Test đúng với chat đang báo lỗi:
- chat `501332455`
- active brand = `Flowa - Agentic Content Marketing Platform`
- expected `/status` = không còn thấy pipeline của `Thuế Hộ by TAF.vn`

## File thay đổi

- `supabase/functions/telegram-webhook/index.ts`
  - refactor `handleStatus`
  - đồng bộ `getActiveBrandContext` / `getActiveBrandId`
  - thêm runtime logs

## Kết quả mong muốn

### Case hiện tại
- Active brand: `Flowa - Agentic Content Marketing Platform`
- Brand này không có pipeline
- `/status` phải trả:
  - header brand đúng
  - empty-state đúng
  - không còn leak pipeline của `Thuế Hộ by TAF.vn`

### Case đổi về brand có pipeline
- Chuyển sang `Thuế Hộ by TAF.vn`
- `/status` chỉ hiện pipeline của brand đó

### Case chưa chọn brand
- vẫn có thể fallback org-wide
- nhưng phải hiện hint rõ ràng rằng đây là toàn org

## Test sau implement

1. `/brand` chọn `Flowa - Agentic Content Marketing Platform`
2. Gõ `/status`
3. Kiểm tra logs `telegram-webhook`:
   - thấy đúng `activeBrandId = 8dd69b10-17e1-4daf-968a-4ec8a241c858`
   - `runningCount = 0`, `recentCount = 0`
4. Trên Telegram:
   - không còn pipeline của `Thuế Hộ by TAF.vn`
   - hiện message “brand chưa có pipeline”
5. Đổi sang `Thuế Hộ by TAF.vn`
6. Gõ lại `/status`
7. Xác nhận chỉ hiện pipeline của brand này

## Ước tính

20–30 phút, chỉ cần sửa 1 file nhưng có thêm log chẩn đoán để khóa lỗi dứt điểm.
