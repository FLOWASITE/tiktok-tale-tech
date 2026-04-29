## Vấn đề xác nhận được

Log backend gần nhất cho thấy request đúng là chỉ chọn WordPress:

```text
originalChannels: ["wordpress"]
```

Nhưng backend vẫn log:

```text
Starting PARALLEL generation for 2 channels
```

Nguyên nhân có khả năng nằm ở 2 lớp:

1. Backend đang collapse `wordpress -> website` để dùng chung pipeline long-form, nhưng danh sách kênh dùng cho streaming/UI vẫn có thể bị giữ/merge thành cả `website` và `wordpress` ở một số nhánh.
2. UI tiến trình mobile/desktop đang lấy `totalChannels` từ nhiều nguồn khác nhau: lúc từ SSE backend, lúc từ `formData.channels`. Khi backend phát `website` nhưng form vẫn là `wordpress`, UI có thể hiển thị thành 2 ô/cột khác nhau dù về dữ liệu thật chỉ có một bài long-form.

## Mục tiêu sửa

Khi người dùng chỉ chọn WordPress:

```text
Input UI:       [wordpress]
Generate thật:  [website]      // internal canonical long-form pipeline
UI hiển thị:    [wordpress]     // không hiện thêm Website
DB lưu:         selected_channels = [wordpress]
Content lưu:    website_content = nội dung WordPress
```

Tương tự với Blogger:

```text
Input UI:       [blogger]
Generate thật:  [website]
UI hiển thị:    [blogger]
DB lưu:         selected_channels = [blogger]
Content lưu:    website_content = nội dung Blogger
```

Nếu người dùng chọn cả Website và WordPress thì mới hiển thị cả hai lựa chọn, nhưng backend vẫn chỉ tạo long-form một lần và dùng chung `website_content`.

## Kế hoạch triển khai

### 1. Tách rõ 2 danh sách kênh trong `generate-multichannel`

Trong `supabase/functions/generate-multichannel/index.ts`, tạo helper dùng thống nhất:

- `generationChannels`: kênh nội bộ để AI generate, collapse alias long-form thành `website`.
- `displayChannels`: kênh để SSE/UI hiển thị, giữ đúng lựa chọn người dùng (`wordpress` hoặc `blogger`).
- `persistedSelectedChannels`: kênh lưu vào DB, cũng giữ đúng lựa chọn người dùng.

Quy tắc mapping:

```text
wordpress -> website for generation, wordpress for display/persistence
blogger   -> website for generation, blogger   for display/persistence
website   -> website for generation, website   for display/persistence
```

### 2. Sửa streaming SSE để không báo thừa Website

Ở nhánh streaming:

- `generateChannelsParallel` vẫn nhận `generationChannels`.
- `emit({ totalChannels })` dùng `displayChannels`, không dùng raw internal `website` nếu user chỉ chọn WordPress/Blogger.
- Khi stream chunk từ channel nội bộ `website`, map ngược `website -> wordpress` hoặc `website -> blogger` nếu user chỉ chọn alias đó.
- `completedChannels` cũng emit bằng display channel để UI chỉ thấy một kênh.

Ví dụ:

```text
AI chunk channel: website
SSE chunk channel gửi UI: wordpress
```

### 3. Sửa save DB để lưu đúng selected_channels nhưng vẫn lấy content đúng

- Khi lưu content, vẫn ghi nội dung long-form vào `website_content` từ `channelResults.website`.
- `selected_channels` chỉ là `['wordpress']` nếu user chỉ chọn WordPress.
- `channel_statuses` dùng `persistedSelectedChannels`, tránh thêm status `website` khi user không chọn Website.

### 4. Sửa các path phụ để đồng bộ

Áp dụng cùng helper cho:

- create mode
- expand mode
- regenerate mode
- preview mode nếu channel là WordPress/Blogger
- non-streaming/agent mode nếu có dùng `formData.channels` trực tiếp

Mục tiêu là không còn nhánh nào dùng lẫn lộn `formData.channels` sau khi alias đã collapse.

### 5. Sửa frontend hiển thị tiến trình

Trong `src/pages/MultiChannelCreate.tsx` và các component tiến trình liên quan:

- Ưu tiên `sseProgress.totalChannels` đã được backend map đúng.
- Nếu chưa có SSE event đầu tiên, fallback về `formData.channels`.
- Không trộn `streamingTexts` có key `website` với `totalChannels` là `wordpress`; nếu còn nhận `website` từ stream cũ, map về channel alias đang được chọn.

### 6. Sửa auto image pipeline cho WordPress/Blogger

Hiện `VISUAL_IMAGE_CHANNELS` chỉ có `website`, không có `wordpress/blogger`, nên sau khi tạo WordPress có thể không tạo ảnh đúng kênh.

Cập nhật:

- Cho `wordpress` và `blogger` là visual channels.
- Khi lấy text để tạo ảnh: `wordpress/blogger -> website_content`.
- Khi lưu/hiển thị ảnh: dùng đúng key người dùng chọn (`wordpress` hoặc `blogger`) để UI không hiện Website.

### 7. Thêm log kiểm chứng ngắn gọn

Thêm log backend dạng:

```text
[channel-alias] original=[wordpress] generation=[website] display=[wordpress] persist=[wordpress]
```

Sau khi sửa, trường hợp user chọn WordPress phải log:

```text
Starting PARALLEL generation for 1 channels
```

## Files dự kiến sửa

- `supabase/functions/generate-multichannel/index.ts`
- `src/pages/MultiChannelCreate.tsx`
- Có thể thêm chỉnh nhỏ ở:
  - `src/components/multichannel/AIGenerationProgress.tsx`
  - `src/components/multichannel/MobileGenerationSheet.tsx`
  - `src/components/multichannel/GeneratingBanner.tsx`

## Không thay đổi

- Không đổi schema database.
- Không đổi logic kết nối/publish WordPress.
- Không đổi icon vừa sửa.
- Không đổi RLS/auth.