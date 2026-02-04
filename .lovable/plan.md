
## Mục tiêu
Khi mở nội dung đã tạo trước đây → nhấn “Xem” → “Tạo ảnh”, hệ thống phải **tự lấy được text overlay từ bài viết/hook đã lưu**, không hiện lỗi “Vui lòng nhập text”.

## Chẩn đoán (dựa trên code hiện tại)
- `UnifiedImageGenerator` đang cố đọc:
  - `content.selected_hooks` và `content.global_hook` (snake_case) để auto-fill text.
- Nhưng hook `useMultiChannelContents` có `transformContent()` **không map 2 field này** từ database vào `MultiChannelContent`.
  - Dù query đang `.select('*')`, dữ liệu có về nhưng bị “rơi” trong bước transform.
- Kết quả: khi xem lại nội dung cũ, `contentAny.selected_hooks/global_hook` = `undefined` → auto-fill không có gì → validation chặn và hiện “Vui lòng nhập text…”.

## Hướng sửa (ưu tiên chắc chắn, ít thay đổi nhất)
### A) Fix dữ liệu content: đưa selected_hooks/global_hook vào object `content` (root fix)
1) **Cập nhật type `MultiChannelContent`** để có các field hook:
   - `selected_hooks?: MultiChannelSelectedHook[] | null`
   - `global_hook?: GlobalHook | null`
   (giữ snake_case để khớp code hiện tại trong `UnifiedImageGenerator` và `getHookForChannel`)

2) **Cập nhật `transformContent()` trong `useMultiChannelContents.ts`**:
   - Map trực tiếp từ row:
     - `selected_hooks: (Array.isArray(data.selected_hooks) ? data.selected_hooks : null)`
     - `global_hook: (data.global_hook && typeof data.global_hook === 'object' ? data.global_hook : null)`
   - Nếu cần, “sanitize” shape tối thiểu (đảm bảo có `channel`, `opening_line`, `text_overlay`).

> Sau bước này, khi user mở lại nội dung cũ, dialog tạo ảnh sẽ có đủ dữ liệu hook để auto-fill.

### B) Bổ sung fallback lấy text từ chính “bài viết” (để nội dung cũ không có hooks vẫn chạy)
Ngay cả khi một số nội dung cũ chưa lưu `selected_hooks/global_hook` (NULL), ta vẫn nên auto-fill từ content text:
- Tạo helper trong `UnifiedImageGenerator`:
  - `getBestOverlayText(channel): string`
  - Priority:
    1. `selected_hooks[channel].text_overlay`
    2. `global_hook.text_overlay`
    3. `selected_hooks[channel].opening_line`
    4. `global_hook.opening_line`
    5. “Câu đầu/đoạn đầu” của nội dung kênh (facebook_content/instagram_content/...) đã được clean markdown và cắt gọn (ví dụ 80–120 ký tự)

Áp dụng helper này cho:
- Single mode auto-fill (`setTextToInclude(...)`)
- Batch mode auto-fill (shared text hoặc per-channel text)

### C) Làm cho auto-fill chạy đúng thời điểm (tránh race giữa state)
Hiện `useEffect` batch mode có dependency nhưng có thể không chạy khi:
- `useSharedText` toggle đổi sau khi dialog mở
- `imageContentType` chuyển sang `with_text` sau đó

Cải thiện:
- Trigger auto-fill khi:
  - `open === true`
  - `imageContentType === 'with_text'`
  - `mode` / `singleChannel` / `selectedChannels` thay đổi
  - `useSharedText` thay đổi
- Chỉ auto-fill nếu field đang rỗng để không overwrite user input.

### D) Debug UX (để confirm ngay trong UI)
Thêm log nhẹ (console) khi dialog mở:
- `console.log('[UnifiedImageGenerator] hooks available', { hasSelectedHooks: !!contentAny.selected_hooks?.length, hasGlobalHook: !!contentAny.global_hook })`
- `console.log('[UnifiedImageGenerator] autofill result', { mode, channel, textPreview: text.slice(0, 40) })`

## File sẽ chỉnh
1) `src/hooks/useMultiChannelContents.ts`
- Bổ sung map `selected_hooks` + `global_hook` trong `transformContent`.

2) `src/types/multichannel.ts`
- Mở rộng `MultiChannelContent` với `selected_hooks` + `global_hook` (snake_case).
  - (Không đụng file auto-generated integrations.)

3) `src/components/multichannel/UnifiedImageGenerator.tsx`
- Thay logic auto-fill hiện tại bằng helper `getBestOverlayText()`.
- Mở rộng điều kiện chạy auto-fill theo `imageContentType === 'with_text'`.
- Bổ sung fallback lấy từ nội dung bài viết nếu hooks không có.

## Tiêu chí kiểm tra sau khi làm
1) Mở một nội dung cũ (đã tạo trước đây) → “Xem” → “Tạo ảnh”
   - Chọn “Ảnh có text” → ô text **tự có nội dung** (không còn lỗi “Vui lòng nhập text”).
2) Test cả:
   - Single mode (1 kênh)
   - Batch mode (shared text ON)
   - Batch mode (shared text OFF, per-channel)
3) Nếu hooks null:
   - Text fallback lấy từ câu đầu của bài viết và vẫn generate được (Canvas overlay hiển thị chuẩn).

## Rủi ro & xử lý
- Một số bản ghi có `selected_hooks` không đúng shape (Json lẫn loại): sẽ guard bằng `Array.isArray` + fallback.
- Nội dung có markdown/emoji: fallback sẽ “clean nhẹ” và truncate để overlay đẹp.

