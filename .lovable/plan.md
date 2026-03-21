

# Fix: `test-zalo-credentials` thiếu `corsHeaders`

## Nguyên nhân

Edge function log: `ReferenceError: corsHeaders is not defined` (dòng 7 và 113, 123).

Khi refactor trước đó để dùng `decryptCredential`, `corsHeaders` constant đã bị xóa mất nhưng vẫn được dùng ở 4 chỗ (dòng 7, 113, 123).

## Sửa

**File:** `supabase/functions/test-zalo-credentials/index.ts`

- Thêm khai báo `corsHeaders` sau dòng import (trước `serve`):
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

- Cũng thiếu `interface TestRequest` — cần thêm:
```typescript
interface TestRequest {
  platform: string;
  useStoredCredentials?: boolean;
  consumerKey?: string;
  consumerSecret?: string;
}
```

- Deploy lại function `test-zalo-credentials`.

Chỉ 1 file thay đổi, thêm ~10 dòng.

