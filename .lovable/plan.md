
## Sửa lỗi: Core Content bị đứng ở 10%

### Nguyên nhân gốc

Hàm `generateSinglePass` trong edge function `generate-core-content` chỉ gửi **2 sự kiện progress**:
- 10% khi bắt đầu gọi AI
- 95% khi AI trả về xong hoàn toàn

Trong khoảng giữa (có thể kéo dài 30-120 giây), **không có progress nào được gửi**. Dù text streaming hoạt động, thanh tiến trình vẫn hiển thị 10%.

Thêm vào đó, log cho thấy lỗi "connection closed before message completed" - kết nối SSE bị ngắt trước khi hoàn thành.

### Kế hoạch sửa

**File: `supabase/functions/generate-core-content/index.ts`**

1. **Thêm progress động trong `generateSinglePass`**: Theo dõi số ký tự đã nhận được từ streaming và tính toán progress dựa trên tỷ lệ so với `maxTokens`. Progress sẽ tăng dần từ 10% đến 90% khi nhận được text chunks.

2. **Cụ thể**: Wrap callback `onChunk` để mỗi khi nhận chunk mới, tính `estimatedProgress = 10 + (accumulatedLength / expectedLength) * 80`, gửi progress event mỗi ~500 ký tự (tránh gửi quá nhiều).

### Chi tiết kỹ thuật

Trong hàm `generateSinglePass` (dòng 333-383):
- Thêm biến `accumulatedLength` để theo dõi text đã nhận
- Tính `expectedLength` dựa trên `maxTokens * 3.5` (ước tính chars per token)
- Wrap `onChunk` để gửi progress mỗi 500 chars
- Progress tăng từ 10 -> 90 theo tỷ lệ text nhận được
- Cap tại 90% để 95% vẫn dành cho bước finalize

Thay đổi nhỏ, chỉ sửa 1 hàm trong edge function. Không ảnh hưởng frontend vì frontend đã xử lý progress events đúng cách.
