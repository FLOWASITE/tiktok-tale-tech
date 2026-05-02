## Mục tiêu
Tách mockup WordPress ra thành component riêng (`WordPressMockup.tsx`) với look-and-feel của theme WordPress mặc định (Twenty Twenty-Four / Twenty Twenty-Five) — thay vì dùng chung `WebsiteMockup` corporate như hiện nay.

## Vì sao cần
Hiện `wordpress` đang map về `'general'` → render `WebsiteMockup` (browser bar, FAQ, schema, breadcrumbs corporate). Người xem không nhận ra đây là blog WordPress. Sau khi đã có Blogger mockup riêng, WordPress cũng cần identity riêng để mockup phản ánh đúng nơi bài sẽ được publish.

## Đặc điểm thiết kế WordPressMockup
Lấy cảm hứng từ Twenty Twenty-Four (theme mặc định WordPress hiện tại):

- **Header**: tên site to, sans-serif (Inter / system-ui), nav menu ngang đơn giản (Home · Blog · About · Contact), không browser bar.
- **Post hero**: ảnh full-bleed (nếu có), categories nhỏ phía trên tiêu đề.
- **Title**: serif lớn (Source Serif / Georgia), align trái, font-weight 400.
- **Meta line**: avatar nhỏ + "By **{brand}** · {date} · {readTime} min read".
- **Body**: typography prose chuẩn WordPress (line-height 1.7, paragraph spacing rộng), blockquote có border trái dày, code block nền xám.
- **Tags**: chip "Tagged: {keyword1}, {keyword2}…" theo style WP classic.
- **Comments section stub**: "Leave a Reply" form mock + "0 responses".
- **Footer**: "Proudly powered by **WordPress**" — signature WP cổ điển.
- **Màu accent**: dùng `primaryColor` của brand cho link/tag, nền trắng/`#1a1a1a` (dark mode WP standard).
- **Domain hint**: `{brand}.wordpress.com` hoặc `{brand}.com` nếu self-hosted (lấy từ `seoData?.canonical_url` nếu có).

## Thay đổi file

### 1. Tạo `src/components/preview/WordPressMockup.tsx`
Component standalone, props giống `BloggerMockup` (`content`, `brandName`, `logoUrl`, `primaryColor`, `isGenerating`, `seoData`, `channelImage`). Tái sử dụng pattern: `ensureMarkdownFormat`, ReactMarkdown + remarkGfm, strip duplicate title, derive `readTime` từ `seoData.reading_time_minutes` hoặc word count.

### 2. `src/components/preview/ChannelMockupFrame.tsx`
- Thêm `'wordpress'` vào union `ChannelType` (dòng 61).
- Import `WordPressMockup`.
- Thêm `case 'wordpress'` trong switch render (gần dòng 2338) trả về `<WordPressMockup {...rest} ... />`.
- Cập nhật `isWebsiteLike` check (dòng 87) bao gồm `'wordpress'`.

### 3. `src/components/viewer/ContentMockupToggle.tsx`
- Mở rộng union type `channelToMockupType` (dòng 37) để chứa `'wordpress'`.
- Đổi `wordpress: 'general'` → `wordpress: 'wordpress'` (dòng 48).

## Không thay đổi
- Generic `WebsiteMockup` vẫn dùng cho `website`, `google_maps`, `youtube`, `zalo_oa`, `telegram`.
- Không động vào edge functions, prompt, hay DB schema — chỉ là UI preview.

## Memory update
Cập nhật `mem://ui-ux/multichannel/blogger-mockup-vn` thành "Longform mockup separation" tổng quát, ghi nhận thêm `WordPressMockup` để thống nhất pattern: mỗi long-form channel có mockup riêng (`WebsiteMockup` cho corporate, `BloggerMockup`, `WordPressMockup`).
