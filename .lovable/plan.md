
# Polish TikTok Composer Dialog

Mục tiêu: dialog hiện tại đã có đủ 5 phần theo compliance nhưng còn "web-ish" — spacing, typography, hierarchy chưa đúng phong cách TikTok native. Lượt này chỉ refine **UI/UX**, không đụng logic publish hay edge function.

## Những điểm khác biệt so với TikTok native

So sánh với composer thật (TikTok app v34+ "Post to TikTok"):

| Yếu tố | Hiện tại | TikTok native |
|---|---|---|
| Header | Chỉ "Đăng lên TikTok" | "Đăng bài" + avatar account ở giữa hoặc dòng "Đăng dưới tên @username" |
| Caption block | Textarea + thumbnail 88×140 nằm cạnh | Caption full-width, thumbnail nhỏ 56×72 góc phải nổi trên |
| Chip Hashtag/Mention | Pill nhỏ rời rạc | Toolbar dính ngay dưới caption, kèm icon location, music |
| Section rows | Card có border, divider mảnh | Row liền mạch, chỉ divider mảnh 1px, không border bo |
| Privacy row | Mở ra RadioGroup inline | Mở ra **bottom sheet riêng** hoặc list full-width không indent |
| Toggle Comment/Duet/Stitch | 3 toggle dọc trong "Tùy chọn khác" | 3 row độc lập ở cấp gốc, mỗi row 1 dòng + switch phải |
| Disclose section | Card với checkbox indent | Row gốc → mở ra panel có 2 card lớn "Your brand" / "Branded content" với mô tả + icon |
| Footer | 2 nút Nháp + Đăng pill đỏ | 1 nút "Đăng" full-width đỏ, "Nháp" là link text nhỏ phía trên hoặc ở top-right |
| Font weight | font-medium đều | Tiêu đề row semibold 15px, summary text-muted 13px |
| Padding | px-4 dày | px-4 nhưng row height đồng đều 56px |
| Màu accent | Đỏ destructive | TikTok đỏ `#FE2C55` (pure brand red) cho CTA chính |

## Files thay đổi

**Sửa duy nhất:**
- `src/components/publishing/TikTokComposerDialog.tsx`

**Không động:**
- `useTikTokCreatorInfo.ts`, `publish-tiktok/index.ts`, `get-tiktok-creator-info/index.ts`, `useDirectPublish.ts`, `PublishVideoMenu.tsx`.

## Refinements cụ thể

### 1. Header
- Thay title bằng cụm 2 dòng: "Đăng bài" (semibold 15px) + dòng phụ "Đăng dưới tên @username" (text-muted-foreground 11px).
- Nút "Nháp" chuyển thành text link ở góc phải header (thay vì button viền dưới footer).
- Footer chỉ còn duy nhất nút **Đăng** full-width, h-12, bg `#FE2C55`, text trắng, rounded-md.

### 2. Caption + thumbnail
- Thumbnail thu nhỏ 64×84, bo `rounded-lg`, đặt floating góc phải-trên của khối caption (absolute), caption full-width bên dưới.
- Counter `0/4000` lùi xuống dưới-phải caption, font 11px.
- Bỏ label "Xem trước" overlay; chỉ hiện icon ▶ nhỏ nếu là video.

### 3. Toolbar dưới caption
- Pill chuyển sang dạng inline text + icon, không border, gap-4: `# Hashtag`, `@ Bạn bè`, gắn separator dọc mảnh giữa các item.

### 4. Section rows (privacy / disclose / interactions)
- Bỏ border bo từng row, dùng divider mảnh `border-b border-border/40`.
- Row chính cao 56px, layout: `[icon 20px] [title + summary 2 dòng] [chevron]`.
- Title: text-sm font-medium. Summary: text-[12px] text-muted-foreground, ellipsis 1 dòng.

### 5. Privacy
- Tách "Ai có thể xem video này" thành row riêng, mở ra list full-width (không indent thụt vào), mỗi option là row 48px với icon trái + radio phải.
- Option SELF_ONLY khi disable hiện badge nhỏ "Không khả dụng với Branded".

### 6. Allow Comment/Duet/Stitch
- Bỏ collapsible "Tùy chọn khác". Đưa 3 toggle thành 3 row độc lập cùng cấp với Privacy, mỗi row 56px, switch bên phải.
- Khi tài khoản forced-off: switch grey + dòng summary "TikTok đã tắt".

### 7. Disclose
- Khi mở: thay 2 checkbox dòng → 2 **card lựa chọn** dọc full-width:
  - Card "Thương hiệu của bạn" (icon Megaphone) — label "Promotional content".
  - Card "Nội dung có thương hiệu" (icon Handshake) — label "Paid partnership".
- Card được chọn → border `foreground/40` + tick góc phải; bỏ Checkbox primitive.
- Warning Branded + SELF_ONLY hiển thị banner màu amber dưới card, không destructive.

### 8. Tokens màu & typography
- Thêm const `TIKTOK_RED = '#FE2C55'` dùng cho CTA chính (inline style — đây là brand red bắt buộc, không dùng semantic destructive đỏ tối).
- Tiêu đề row: `text-[15px] font-semibold tracking-tight`.
- Footnote Music Usage Confirmation: căn giữa, max-w-xs mx-auto, text-[11px].

### 9. Micro-interaction
- Khi nhấn vào row → background flash `bg-muted/60` 150ms (active:bg).
- Chevron xoay 90° khi row mở.
- Switch dùng màu `#25F4EE` (TikTok cyan) khi ON — đồng bộ brand TikTok.

## Verify

1. Mở `/video-studio` → Đăng ngay → TikTok.
2. So sánh layout với ảnh native TikTok đính kèm (nếu có) hoặc reference: https://developers.tiktok.com/doc/content-sharing-guidelines.
3. Check responsive ở viewport 360, 414, 768 — dialog full-screen mobile, max-w-md desktop.
4. Bật Branded content → SELF_ONLY hiển thị badge "Không khả dụng", không cho chọn.
5. Toggle Comment/Duet/Stitch hoạt động độc lập, forced-off hiển thị đúng note.
