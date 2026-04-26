## 🐛 Bug đã xác định

**Triệu chứng**: 100% bài multichannel có channel `website` đều bị `website_content = NULL` trong DB, kể cả khi `facebook_content` / `instagram_content` của cùng bài vẫn OK (1000-2500 chars). Bug này tồn tại ít nhất 24h gần đây trên 13/13 bài có `website` trong `selected_channels`.

**Root cause** (trong `supabase/functions/generate-multichannel/index.ts`):

Channel `website` đặc biệt vì AI trả về **object** `{ content, title, meta_description, h1, h2_headings, … }` (xem schema line 3876, post-process line 4648), trong khi 11 channels khác trả về **string**.

Có 3 path persistence:
1. **Path A — Streaming/parallel** (line 3459): `website_content: channelResults.website || null` — `channelResults` là `Record<string, string>` (line 3068). Nếu refined loop / parallel generator trả về object hoặc empty string, gán thẳng → NULL. **← Đây là path đang bị lỗi.**
2. **Path B — Non-streaming create** (line 5444): xử lý đúng cả string lẫn object via `typeof === 'object' ? .content : value`.
3. **Path C — Expand mode update** (line 5366): xử lý đúng tương tự Path B.

→ Path A thiếu logic unwrap object → `NULL` được lưu.

## 🔧 Plan fix

### 1. Helper unwrap dùng chung
Thêm helper `extractWebsiteContent(value)` ở đầu file (gần `CHANNEL_COLUMN_MAP`) trả về `{ text: string|null, seoData: object|null }`. Logic: nếu object → lấy `.content`; nếu string → giữ nguyên; nếu rỗng → null.

### 2. Sửa Path A (line 3459)
Thay 1 dòng `website_content: channelResults.website || null` thành:
- Unwrap qua helper
- Lưu cả `website_content` và `website_seo_data` (giống Path B/C)

### 3. Sửa luôn `channelResults` upstream
Tại line 3125 (`channelResults[channel] = content`) và 3243 (refine), nếu `channel === 'website'` và content là object → unwrap về string trước khi gán, để các consumers khác (dedup, persona-fit, cross-channel check) không bị break.

### 4. Đồng bộ Path B & C dùng cùng helper
Refactor lines 5366-5371 và 5444-5449 dùng helper để tránh drift trong tương lai.

### 5. Validation log
Thêm `console.warn` khi detect `website_content` empty sau generation (giúp catch regression sớm).

## ⚠️ Không làm theo yêu cầu của bạn
- ❌ KHÔNG backfill các bài cũ bị NULL
- ❌ KHÔNG đụng bài `ec82d405...` — giữ nguyên trạng thái lỗi để bạn quan sát

## ✅ Kết quả mong đợi
- Bài multichannel mới có channel `website` sẽ có `website_content` (markdown 1000-2000 chữ) và `website_seo_data` (object SEO) đầy đủ
- 11 channels khác không bị ảnh hưởng
- Path agent (queue-based) cũng tự fix vì dùng cùng edge function

## 📁 Files thay đổi
- `supabase/functions/generate-multichannel/index.ts` (1 file, ~30 dòng thay đổi)

## 🧪 Test sau khi fix
Tôi sẽ gọi `supabase--curl_edge_functions` với payload `channels: ['website']` topic test → verify DB có `website_content` không null.