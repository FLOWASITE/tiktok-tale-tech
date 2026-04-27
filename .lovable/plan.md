## Tình trạng hiện tại

Đã kiểm tra Edge Function logs trong 30 phút gần nhất:
- `decompose-image-request` chạy thành công 2 lần (status 200) — bước AI phân tích nội dung khi mở dialog ✅
- `generate-brand-image` **chưa từng được gọi** — không có invocation nào trong log
- Bảng `generation_tasks`: chưa có task type `image_generation` nào được tạo bao giờ
- Console có lỗi `Failed to fetch` lặp lại từ `useBackgroundGeneration` (poll fallback của Realtime)

**Kết luận:** Click vào nút "Tạo ảnh" không tới được edge function. Nguyên nhân khả dĩ:

1. **Nút bị disable âm thầm** — `batchGen.isGenerating || selectedChannels.length === 0 || isDecomposing` đang true ở thời điểm click (ví dụ: `isDecomposing` chưa kết thúc, hoặc state đang stuck).
2. **`createImageGenerationTask` fail trước khi gọi edge function** — vì Realtime/network đang flaky (trùng với "Failed to fetch" trong console), `taskId` trả về `null` nhưng pipeline vẫn tiếp tục → gọi `generate-brand-image` với `taskId=null` → bị reject sớm bên server.
3. **Dialog đóng/unmount giữa chừng** — `cancelled = true` ở effect decompose, hoặc parent re-render đổi `key`.
4. **Connection layer 502/abort** — `invokeWithTimeout` swallow lỗi mạng (không log gì) và return error mà toast bị skip.

## Việc sẽ làm

### 1. Thêm log chi tiết tại entry point `handleGenerate` (`SimpleImageGenerator.tsx`)
Trước khi gọi `batchGen.generateAllImages`, log đầy đủ điều kiện guard:
```
[SimpleImageGenerator] handleGenerate triggered {
  selectedChannels, contentId, brandTemplateId, isDecomposing,
  isGenerating: batchGen.isGenerating, hybridOverlay: !!hybridOverlay,
  contentSummariesKeys: Object.keys(contentSummaries),
  contentSummariesLengths: ...
}
```
→ Nếu user click mà **không thấy log này** → button thực sự bị disabled.
→ Nếu thấy log nhưng `selectedChannels=[]` → guard chặn → toast đã hiển thị.

### 2. Fail-safe cho `createImageGenerationTask` (`useAutoImageGeneration.ts` line 311–317)
Hiện tại function này swallow error và return `null`. Sửa để:
- Log rõ khi `taskId === null` với lý do (network error, RLS, etc.)
- **Vẫn tiếp tục** gọi `generate-brand-image` với `taskId=null` (edge function tự handle), KHÔNG block pipeline.
- Hiện code đã làm vậy nhưng không log → cần thêm `console.warn('[Pipeline:${channel}] taskId=null, proceeding without task tracking')`.

### 3. Thêm toast khi `generate-brand-image` invocation thực sự bị fetch error
Hiện tại nếu `invokeWithTimeout` reject với "Failed to fetch", chỉ log `[useAutoImageGeneration] Function error` nhưng toast generic "Lỗi tạo ảnh: Failed to fetch" có thể bị nuốt do `setGenerating(null)` race. Đảm bảo:
- Toast lỗi **luôn fire** ngay khi catch (không chờ batch finish)
- Hiển thị rõ "Mạng kết nối tới máy chủ AI bị gián đoạn — vui lòng kiểm tra mạng và thử lại"

### 4. Nút "Tạo ảnh": tooltip giải thích vì sao bị disable
Hiện tại button disable với 3 điều kiện gộp; user không biết lý do. Bọc button trong tooltip hiển thị:
- "Đang tạo ảnh..." nếu `isGenerating`
- "Vui lòng chọn ít nhất 1 kênh" nếu `selectedChannels.length === 0`
- "Đang phân tích nội dung..." nếu `isDecomposing`

### 5. Sau khi triển khai, yêu cầu user thử lại
Mở dialog "Tạo ảnh", chọn kênh, click "Tạo ảnh". Console sẽ cho biết chính xác bước nào fail. Sau đó mình sẽ fix root cause cụ thể (KHÔNG đoán mò trước).

## Chi tiết kỹ thuật

| File | Thay đổi |
|---|---|
| `src/components/multichannel/SimpleImageGenerator.tsx` | Thêm console.log trước `batchGen.generateAllImages`; bọc button bằng Tooltip hiển thị lý do disable |
| `src/hooks/useAutoImageGeneration.ts` | Log `taskId=null` warning; đảm bảo toast lỗi fetch hiển thị ngay |
| `src/lib/imageGenerationTasks.ts` | Log chi tiết error (RLS / network / unique violation) khi insert fail |

## Việc KHÔNG làm trong bước này
- Không refactor pipeline image generation (chưa rõ root cause)
- Không sửa Realtime "Failed to fetch" (đó là warning của background polling, không liên quan trực tiếp luồng generate)
- Không chuyển sang async queue pattern (hệ thống đã có `generation_tasks` + persist nền — vấn đề không phải timeout)
