
# Bỏ prefix tên kênh khỏi title và không dùng dòng đầu channel content làm title nữa

## Vấn đề đã xác định
Trong `supabase/functions/generate-multichannel/index.ts` hiện có 2 nguồn gây ra title xấu:

1. **Streaming path**
   - `extractTitleFromChannels()` đang lấy:
     - Markdown heading đầu tiên, hoặc
     - dòng meaningful đầu tiên của channel content
   - nên rất dễ bị dính prefix như `Facebook:`, `Instagram -`, `LinkedIn`, v.v.

2. **Non-streaming path**
   - tool schema hiện vẫn yêu cầu AI trả về field `title`
   - nếu prompt/channel output bị “nhiễm” nhãn kênh, AI có thể trả title kiểu `Facebook ...`

## Mục tiêu
- Loại hoàn toàn prefix tên kênh khỏi title lưu trong `multi_channel_contents`
- Không còn dùng “dòng đầu của channel content” làm title thô
- Title phải là **bundle title độc lập**, ưu tiên từ:
  1. `formData.topic` nếu đã đủ tốt
  2. title AI trả riêng cho bundle
  3. fallback an toàn đã được sanitize

## Cách triển khai

### 1) Thay `extractTitleFromChannels()` bằng cơ chế title độc lập
Trong `supabase/functions/generate-multichannel/index.ts`:

- Ngừng logic:
  - lấy heading đầu tiên từ channel content
  - lấy dòng đầu tiên từ channel content
- Thay bằng helper mới, ví dụ:
  - `stripChannelNamePrefix(title: string)`
  - `resolveBundleTitle({ explicitTitle, topic, useTopicAsTitle })`

Nguyên tắc:
- `explicitTitle` = title AI trả riêng cho bundle
- `topic` = fallback chính
- không đọc raw line từ `facebook_content`, `linkedin_content`, ...

### 2) Chuẩn hóa hàm loại prefix tên kênh
Tạo helper sanitize title để xóa các mẫu phổ biến ở đầu chuỗi, ví dụ:

- `Facebook: ...`
- `Facebook - ...`
- `Instagram | ...`
- `LinkedIn Post: ...`
- `Bài đăng Facebook: ...`
- `Post Facebook ...`
- `Kênh Facebook: ...`
- `X/Twitter: ...`
- `Threads: ...`
- `Zalo OA: ...`
- `Telegram: ...`
- `TikTok: ...`

Helper cần:
- ignore case
- xử lý dấu `:`, `-`, `|`, `•`
- xử lý cả tiếng Việt lẫn English label
- chạy lặp nhiều lần nếu title có nhiều prefix lồng nhau

### 3) Streaming path: dùng topic/title riêng, không dùng channel text
Hiện có 2 chỗ dùng `extractTitleFromChannels(channelResults, formData.topic)`:
- block critique `contentForCritique.title`
- block insert DB `title`

Sẽ đổi sang:
- `resolveBundleTitle({ explicitTitle: null, topic: formData.topic, useTopicAsTitle: formData.useTopicAsTitle })`

Tức là:
- nếu `useTopicAsTitle` → giữ topic đã sanitize
- nếu không → vẫn ưu tiên topic đã sanitize, không lấy từ dòng đầu channel content nữa

### 4) Non-streaming path: giữ title AI riêng nhưng sanitize chặt
Ở non-streaming path, `generatedData.title` vẫn có thể giữ lại vì đây là field title độc lập do model trả về.

Nhưng trước khi:
- log
- critique
- insert/update DB

sẽ chạy qua:
- `stripChannelNamePrefix(...)`
- trim / collapse spaces
- fallback về `formData.topic` nếu title sau khi sanitize bị rỗng hoặc quá ngắn

### 5) Cập nhật prompt/schema để title là “bundle title”, không phải title của kênh đầu tiên
Trong tool schema hiện có:
- `title: "Tiêu đề ngắn gọn cho bộ nội dung (dựa trên chủ đề)"`

Sẽ siết rõ hơn mô tả:
- title là **tiêu đề chung cho cả bộ nội dung đa kênh**
- **không được chứa tên kênh/platform**
- **không copy nguyên dòng đầu của bất kỳ channel content nào**
- phải là tiêu đề trung tính, dùng được cho toàn bộ bundle

Nếu cần, bổ sung rule trong prompt:
- cấm prefix như Facebook / Instagram / LinkedIn / TikTok / Threads / Telegram / Zalo / X / Twitter / Website / Blog / Email / YouTube

### 6) Áp dụng sanitize ở mọi chỗ persist title
Rà lại toàn file `generate-multichannel/index.ts` để đảm bảo mọi nơi ghi `title` vào `multi_channel_contents` đều đi qua cùng một helper:
- streaming create
- non-streaming create
- regenerate/update nếu có đụng title
- dedup return path nếu có rebuild title

Mục tiêu:
- chỉ có **một source of truth** cho title normalization

## File cần sửa
- `supabase/functions/generate-multichannel/index.ts`

## Không cần sửa
- DB schema
- frontend form
- UI viewer
- Telegram webhook
- `src/integrations/supabase/types.ts`

## QA sau khi implement

### Case 1 — Streaming manual multi-channel
Tạo nội dung thủ công 2–3 kênh.

Kỳ vọng:
- title không còn bắt đầu bằng `Facebook`, `Instagram`, `LinkedIn`, ...
- title không bị lấy từ dòng đầu của channel content

### Case 2 — Non-streaming multi-channel
Chạy luồng non-streaming.

Kỳ vọng:
- nếu AI trả `Facebook: ...` thì prefix bị strip trước khi lưu DB

### Case 3 — Topic-based fallback
Tạo bài với topic chuẩn.

Kỳ vọng:
- title ra từ topic đã sanitize
- không phụ thuộc nội dung của kênh đầu tiên

### Case 4 — Weird prefixes
Test các title như:
- `Facebook: Bí quyết chăm da...`
- `LinkedIn - Xu hướng AI...`
- `Bài đăng Instagram: ...`

Kỳ vọng:
- lưu thành title sạch, chỉ còn nội dung chủ đề

## Kết quả mong muốn
Sau khi sửa:
- title của bộ nội dung đa kênh sẽ là title trung tính, sạch, không chứa prefix platform
- hệ thống không còn dùng dòng đầu/heading của channel content làm title thô nữa
- streaming và non-streaming đều cho ra title nhất quán hơn
