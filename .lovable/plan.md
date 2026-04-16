

## Phân tích lỗi

**Nguyên nhân gốc**: Preflight check tới `media.flowa.one` trả về HTTP 400. Có 2 vấn đề:

1. **Worker route chưa hoạt động đúng** — request tới `media.flowa.one` không qua Worker hoặc Worker forward sai
2. **Sử dụng `/storage/v1/render/image/public/`** — endpoint image transformation của Supabase có thể không hoạt động qua proxy. Các file ảnh đã là `.jpg` rồi nên **không cần chuyển đổi format**

## Kế hoạch sửa

### 1. Bỏ `/render/image/` — dùng `/object/public/` trực tiếp
Ảnh carousel đã là `.jpg`, không cần Supabase image transformation. Hàm `rewriteImageUrlForTikTok` sẽ **không** rewrite path sang `/render/image/`, chỉ thay hostname sang `media.flowa.one`.

### 2. Thêm fallback: nếu `media.flowa.one` lỗi, dùng URL Supabase gốc
Nếu preflight tới `media.flowa.one` fail, tự động fallback về URL gốc `rllyipiyuptkibqinotz.supabase.co` và thử lại. Điều này cho phép đăng bài ngay cả khi Worker chưa sẵn sàng (với rủi ro TikTok có thể yêu cầu verified domain).

### 3. Preflight dùng HEAD thay vì GET
Tránh download toàn bộ ảnh trong preflight — chỉ kiểm tra reachability bằng `HEAD` request.

### Thay đổi cụ thể

**File**: `supabase/functions/publish-tiktok/index.ts`

- `rewriteImageUrlForTikTok()`: Bỏ logic replace `/object/public/` → `/render/image/`, bỏ `format=jpeg&quality=90`. Chỉ thay hostname.
- `verifyTikTokMediaReachability()`: Đổi method từ `GET` sang `HEAD`. Nếu fail với `media.flowa.one`, fallback về URL Supabase gốc và rewrite lại toàn bộ `imageUrls`.
- Thêm hàm `fallbackToDirectUrls()` để rewrite ngược về Supabase host khi proxy không hoạt động.

