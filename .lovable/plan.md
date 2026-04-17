
## Vấn đề
OAuth đã thành công (connection `93f8e1ea...` đã lưu, `is_active: true`). Nhưng khi bấm "Xác minh" → gọi Google Business API → bị Google trả về:

> Quota exceeded for quota metric 'Requests' and limit 'Requests per minute' of service 'mybusinessaccountmanagement.googleapis.com'

## Nguyên nhân
Đây là **giới hạn cứng từ Google Cloud**, không phải bug code:

- Google Business Profile API có quota mặc định **rất thấp** (thường **1 request/phút** cho project mới chưa được approve).
- Mỗi lần bấm "Test connection" gọi `GET /v1/accounts` + `GET /v1/{account}/locations` = 2 requests → vượt quota ngay.
- Project Google Cloud `31483738041` đang dùng quota mặc định.

## Giải pháp

### A. Phía Google Cloud (user phải tự làm — bắt buộc)
1. Vào [Google Cloud Console → Quotas](https://console.cloud.google.com/iam-admin/quotas) cho project `31483738041`
2. Filter service: `mybusinessaccountmanagement.googleapis.com`
3. Submit **Quota increase request** cho "Requests per minute" (Google duyệt 2-7 ngày)
4. Hoặc chờ ~1 phút giữa mỗi lần test

### B. Phía code (cải thiện UX)
Hiện tại code không xử lý lỗi 429 quota tốt — báo `needs_reauth: true` gây hiểu nhầm là phải kết nối lại. Cần sửa:

**1. `supabase/functions/test-google-business-connection/index.ts`**
- Phát hiện lỗi quota (`RESOURCE_EXHAUSTED` / status 429 / message chứa "Quota exceeded") → **KHÔNG** set `needs_reauth: true`, **KHÔNG** disable connection
- Trả về `errorCode: 'QUOTA_EXCEEDED'` + message thân thiện tiếng Việt
- Giữ nguyên `is_active: true` vì token vẫn hợp lệ

**2. `supabase/functions/publish-google-business/index.ts`**
- Tương tự: bắt lỗi quota khi publish, trả message rõ ràng "Google đang giới hạn tốc độ, vui lòng thử lại sau X giây"
- Implement exponential backoff đơn giản (retry 1 lần sau 60s) hoặc trả lỗi để user retry

**3. UI hiển thị connection (Connections tab)**
- Khi nhận `errorCode: 'QUOTA_EXCEEDED'` → hiện banner vàng "Google rate limit — thử lại sau 1 phút" thay vì badge đỏ "Cần kết nối lại"

**4. Cache locations**
- Sau lần fetch locations đầu tiên (lúc OAuth callback), lưu vào `metadata.locations` và **không refetch** ở mỗi lần test
- Test connection chỉ cần check token validity bằng 1 API call nhẹ nhất (ví dụ: `GET /v1/accounts` với rate limit aware)

## Files sửa
- `supabase/functions/test-google-business-connection/index.ts`
- `supabase/functions/publish-google-business/index.ts`
- File UI hiển thị status connection (cần xác định: có thể là `src/components/connections/SocialConnectionCard.tsx` hoặc tương tự — sẽ tìm khi thực hiện)

## Lưu ý quan trọng cho user
**Code fix chỉ giúp UX rõ ràng hơn, KHÔNG giải quyết được giới hạn Google.**
Nếu muốn dùng Google Business Profile thực tế, **bắt buộc phải request quota increase** từ Google Cloud Console, nếu không sẽ tiếp tục fail mỗi lần publish/test trong cùng 1 phút.
