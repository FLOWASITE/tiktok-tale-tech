## Scope
Client-side patch để đồng bộ với F6 error shape mới của `generate-brand-image`. Chỉ 2 file frontend, không đụng edge function.

## Vấn đề
Sau khi F6 chuẩn hóa env-missing errors → `status: 200 + success: false + errorCode: 'PROVIDER_CONFIG_MISSING'`, client còn 2 lỗ hổng:

1. **Retry phí công**: `useAutoImageGeneration.ts` retry tất cả channel với cùng provider config dù key thiếu → spam log + UX kém.
2. **Toast tiếng Anh raw**: `parseEdgeFunctionError` không nhận diện code mới → user thấy "POYO_API_KEY not configured..." thay vì thông báo thân thiện tiếng Việt.

## Thay đổi

### 1. `src/lib/edgeFunctionErrors.ts`
- Thêm `'PROVIDER_CONFIG_MISSING'` vào `EdgeFunctionErrorCode` union.
- Thêm nhánh mapping trong `parseEdgeFunctionError`:
  ```ts
  if (body.errorCode === 'PROVIDER_CONFIG_MISSING') {
    code = 'PROVIDER_CONFIG_MISSING';
    message = 'Provider AI tạo ảnh chưa được cấu hình. Liên hệ admin để thêm API key.';
  }
  ```

### 2. `src/hooks/useAutoImageGeneration.ts`
- Cập nhật `isNonRetryableImageError(errorCode, message)` (line 41-49) để bao gồm `'PROVIDER_CONFIG_MISSING'`:
  ```ts
  errorCode === 'PROVIDER_CONFIG_MISSING' ||
  ```
  và mở rộng regex message match: `PROVIDER_CONFIG_MISSING|...not configured/i`.
- Kết quả: pipeline thấy `PROVIDER_CONFIG_MISSING` sẽ break ngay (như CREDITS_EXHAUSTED), không retry channel kế.

## Không làm
- Không đụng `generate-brand-image/index.ts` (F1/F3/F4/F5/F6 đã đóng).
- Không đụng `useSocialImageGeneration.ts` (đã đi qua `useImageGeneration.ts` đọc đúng `errorCode`).
- Không tạo migration / thay schema.

## Verify
- Đọc lại 2 file sau khi edit, confirm union type + retry guard có code mới.
- Build pass (tsc tự chạy).

Khoảng <20 dòng code thay đổi, không có rủi ro tới flow khác.
