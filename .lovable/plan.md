# Bug: Card content hiện title = prompt người dùng ("đăng liền nha")

## Triệu chứng
Trên `ContentTaskCard`, dòng `h3` hiển thị `content.title` và dòng dưới hiển thị `content.topic` — cả hai đều là chuỗi gốc "đăng liền nha" người dùng nhập cho Agent. AI đã sinh nội dung Facebook đầy đủ nhưng headline thật bị bỏ qua.

## Root cause
`supabase/functions/generate-multichannel/index.ts` → `resolveBundleTitle()`:

```ts
const prioritizedCandidates = useTopicAsTitle
  ? [cleanedTopic, cleanedExplicitTitle]
  : [cleanedTopic, cleanedExplicitTitle];   // ❌ giống branch trên
```

Hai nhánh ternary giống hệt nhau → `cleanedTopic` (chính là `formData.topic` = prompt người dùng) **luôn** thắng `cleanedExplicitTitle`. Cờ `useTopicAsTitle` mất tác dụng.

Thêm nữa, **2 call site** của `resolveBundleTitle` ở line ~4031 (critique) và ~4288 (INSERT vào `multi_channel_contents`) chỉ truyền `topic` + `useTopicAsTitle`, **không truyền `explicitTitle`** dù LLM đã sinh field `title` trong `channelResults` (schema bắt buộc tại line 5021–5027). → Title AI bị vứt đi.

Hệ quả với Agent: `agent-creator-v2` gọi `generate-multichannel` với `topic = "đăng liền nha"` (instruction người dùng). Vì cả 2 bug trên, DB lưu `title = "đăng liền nha"` thay vì headline AI sinh.

## Fix (chỉ chạm 1 file edge function)

`supabase/functions/generate-multichannel/index.ts`:

### 1. Sửa ternary `resolveBundleTitle` (line 797–799)
```ts
const prioritizedCandidates = useTopicAsTitle
  ? [cleanedTopic, cleanedExplicitTitle]
  : [cleanedExplicitTitle, cleanedTopic];   // ✅ explicit (AI) ưu tiên khi flag=false
```

### 2. Truyền `explicitTitle` từ `channelResults` ở 2 call site
- Line ~4031 (critique payload):
  ```ts
  title: resolveBundleTitle({
    explicitTitle: channelResults.title || channelResults.seo_title || null,
    topic: formData.topic,
    useTopicAsTitle: formData.useTopicAsTitle,
  }),
  ```
- Line ~4288 (INSERT `multi_channel_contents`): tương tự, thêm `explicitTitle: channelResults.title || channelResults.seo_title || null`.

`channelResults.title` đã có sẵn từ LLM (schema required, line 5027). `seo_title` là fallback cho long-form mode.

## Verify
1. Trigger Agent với prompt ngắn ("đăng liền nha") + 1 kênh FB.
2. Sau pipeline complete: check row mới trong `multi_channel_contents`:
   - `topic` = "đăng liền nha" (giữ nguyên)
   - `title` = headline AI sinh, không trùng topic, độ dài ≥ 4 ký tự, không phải chuỗi gốc.
3. Reload `/tasks` (hoặc trang chứa `ContentTaskCard`) → `h3` hiển thị headline thật, `topic` line vẫn show "đăng liền nha".
4. Backfill (tùy chọn, không bắt buộc): script update các row cũ có `title = topic` bằng cách lấy câu đầu tiên của `facebook_content`/`website_content`. Hỏi user trước khi chạy.

## Không động đến
- `ContentTaskCard.tsx` (chỉ render — đang đúng).
- `agent-creator-v2`, `agent-pipeline` (không cần đổi contract).
- Flow manual UI (`MultiChannelCreate.tsx`) — flow này thường có `formData.topic` chính là headline; với fix mới, nếu user muốn dùng topic làm title thì FE đã set `useTopicAsTitle = true` (giữ nguyên hành vi).
