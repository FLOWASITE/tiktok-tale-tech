
Mục tiêu: khôi phục luồng tạo ảnh bằng cách xử lý lỗi backend đang chặn toàn bộ request, rồi làm cho frontend báo đúng trạng thái khi backend chưa persist được ảnh.

1. Kết luận hiện tại
- Log backend mới nhất của `generate-brand-image` vẫn đang crash với:
  - `ReferenceError: Cannot access 'effectiveImageContentType' before initialization`
- Trong code hiện tại, `effectiveImageContentType` đã được khai báo sau khi load brand/content và trước khi build prompt.
- Nhưng log runtime lại báo ở line khác (`index.ts:414`) không khớp đoạn khai báo hiện tại, dấu hiệu mạnh cho thấy:
  - runtime đang chạy bản code cũ/chưa deploy đúng
  - hoặc bundle deploy bị lệch/stale so với source đang thấy
- Vì function crash rất sớm, ảnh không được generate và cũng không có gì để recovery ở frontend.

2. Việc cần làm ở backend trước
- File: `supabase/functions/generate-brand-image/index.ts`
- Rà lại toàn bộ chỗ dùng `effectiveImageContentType` và `effectiveTextToInclude` để bảo đảm:
  - không có helper/log/prompt builder nào tham chiếu trước lúc khai báo
  - mọi biến phụ thuộc text overlay đều được compute trong cùng một block rõ ràng
- Refactor thành thứ tự cứng:
  1. parse request
  2. normalize text
  3. load brand/content
  4. resolve `brandLanguage`
  5. resolve `effectiveImageContentType`
  6. build prompt / structured prompt
- Tránh mọi implicit access qua closure/helper trước initialization.

3. Làm cho code chống tái phát kiểu TDZ
- Trong `generate-brand-image/index.ts`:
  - gom logic overlay vào helper riêng, ví dụ kiểu `resolveOverlayRuntime(...)`
  - helper trả về:
    - `effectiveImageContentType`
    - `effectiveTextToInclude`
    - `textSuppressedBecauseTooLong`
    - `textSuppressedBecauseLanguageMismatch`
    - `detectedOverlayLanguage`
    - `brandLanguage`
- Như vậy phần main handler chỉ dùng object đã resolve xong, tránh lỗi “dùng trước khi khai báo”.

4. Xử lý khả năng runtime đang dùng bundle cũ
- Sau khi refactor, tạo một thay đổi rõ ràng trong `generate-brand-image/index.ts` để buộc function build/deploy lại sạch.
- Đồng thời rà các import liên quan trong function này để chắc không có cache/stale compile từ helper cũ.
- Nếu cần, cập nhật một log version marker trong function, ví dụ:
  - `console.log('[generate-brand-image] build marker: 2026-04-23-fix-tdz-v2')`
- Mục tiêu:
  - nhìn log là biết runtime đã chạy đúng bản mới.

5. Tăng khả năng chẩn đoán nếu backend còn fail
- Trong `generate-brand-image/index.ts`:
  - log rõ ngay sau mỗi mốc:
    - request parsed
    - brand loaded
    - overlay resolved
    - prompt built
    - provider selected
    - persistence scheduled
- Nếu fail, log phải cho biết fail trước hay sau:
  - resolve overlay
  - build prompt
  - call provider
  - persist history

6. Giữ background persistence nhưng không che lỗi thật
- Hiện function đã có `persistGeneratedImage(...)` + `EdgeRuntime.waitUntil(...)`.
- Giữ pattern này, nhưng bổ sung:
  - chỉ schedule persistence sau khi đã có `imageUrl` hợp lệ
  - nếu crash trước provider hoàn thành thì update task sang `failed` với message cụ thể hơn
- Mục tiêu:
  - frontend recovery chỉ chạy khi thực sự có gì để recover.

7. Đồng bộ frontend để báo đúng nguyên nhân
- File: `src/hooks/useAutoImageGeneration.ts`
- Khi backend trả 500 kiểu runtime error:
  - nếu recovery không tìm thấy ảnh thì báo rõ đây là lỗi backend sớm, không phải “đang tạo nền”
- Thay vì luôn nghiêng về “recoverable”, phân loại:
  - lỗi transport/network/timeout => thử recover
  - lỗi runtime 500 có message cụ thể => fail nhanh, toast rõ hơn
- Kết quả:
  - user không bị hiểu nhầm là ảnh “đang xử lý nền” khi thực tế function chết ngay.

8. Đồng bộ manual flow
- File: `src/hooks/useSocialImageGeneration.ts`
- Áp dụng cùng rule:
  - chỉ nói “ảnh đã hoàn tất ở nền” khi `waitForRecoveredBrandImage()` thật sự tìm thấy image
  - nếu backend 500 runtime error và không recover được thì hiển thị lỗi backend rõ ràng

9. Củng cố recovery query
- File: `src/lib/recoverGeneratedBrandImage.ts`
- Giữ 3 nguồn recover hiện có:
  - `channel_image_history`
  - `multi_channel_contents.channel_images`
  - `generation_tasks.result_metadata`
- Nhưng thêm phân biệt kết quả:
  - `task exists but failed`
  - `task exists but no persisted image`
  - `no task/no image`
- Để UI/debug biết “không tạo được ảnh” là do:
  - backend crash sớm
  - provider fail
  - hay persistence fail

10. Cập nhật debug hiển thị đúng bản chất lỗi
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung trạng thái riêng cho image failure:
  - `backend_runtime_error`
  - `request_interrupted_but_recovered`
  - `provider_failed`
  - `persistence_missing`
- Mục tiêu:
  - nhìn debug là biết ảnh không tạo vì function chết trước hay do provider.

11. File cần sửa
- `supabase/functions/generate-brand-image/index.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/hooks/useSocialImageGeneration.ts`
- `src/lib/recoverGeneratedBrandImage.ts`
- `src/components/ui/RenderDebugTimeline.tsx`

12. Tiêu chí nghiệm thu
- Gọi `generate-brand-image` không còn 500 với lỗi:
  - `Cannot access 'effectiveImageContentType' before initialization`
- Nếu backend chạy bình thường:
  - ảnh được tạo và persist như cũ
- Nếu request bị đứt sau khi ảnh đã tạo:
  - frontend recover được từ history/content/task result
- Nếu backend crash sớm:
  - UI báo lỗi backend rõ ràng, không nói sai là “đang tạo nền”
- Log backend phải cho thấy marker bản mới và bước fail chính xác nếu còn lỗi.
