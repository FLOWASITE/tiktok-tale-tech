
# Chuẩn hóa split-to-stack và section gap cho canvas chật

## Mục tiêu
Điều chỉnh renderer để các layout có xu hướng `split` hoặc bố cục ngang sẽ tự chuyển sang dạng `stack / dọc / compact` khi canvas chật, đặc biệt cho:

- `1:1`
- `9:16`

Kết quả mong muốn:
- không cố giữ 2 cột khi chiều ngang không đủ
- khoảng cách giữa các section gọn hơn nhưng vẫn readable
- cards / hero / CTA / footer giữ nhịp dọc ổn định, không bị “rời” hoặc “kẹt”

## Hiện trạng đã xác nhận
Trong `supabase/functions/overlay-text-canvas/index.ts` đã có nền tốt nhưng chưa khóa rule đủ chặt:

- `getRatioProfile(...)` đã có:
  - `sectionGap`
  - `compactSectionGap`
  - `splitGap`
  - `splitPaddingX`
  - `leftColumnWidth/rightColumnWidth`
- `split` hiện chỉ auto-fallback sang stack theo rule đơn giản:
  - `const isPortraitOrSquare = imageWidth <= imageHeight`
  - `const isSplit = request.layout === 'split' && !isPortraitOrSquare`
- điều này nghĩa là:
  - `1:1` đã rơi khỏi split, nhưng mới chỉ theo điều kiện thô
  - `9:16` cũng không split, nhưng spacing dọc chưa được ép compact rõ ràng
- cards hiện mới có rule:
  - portrait/square → ép `vertical`
- phần root layout vẫn dùng `gap: spacingTokens.sectionGap` chung
- split row hiện hard-code:
  - `flexDirection: 'row'`
  - `alignItems: 'center'`
  - left/right gap riêng
- chưa có helper “canvas quá chật” để quyết định:
  - khi nào split phải stack
  - khi nào section gap phải compact
  - khi nào cards ngang/grid phải dồn về vertical

## Cách triển khai

### 1) Tạo layout-density helper cho structured overlay
Trong `supabase/functions/overlay-text-canvas/index.ts`, thêm helper chuyên quyết định hành vi bố cục theo độ chật thực tế, ví dụ:

- `getLayoutBehavior(imageWidth, imageHeight, ratioProfile, elements)`

Helper nên trả về:
- `forceStack: boolean`
- `forceCompact: boolean`
- `useCompactSectionGap: boolean`
- `cardsShouldStack: boolean`
- `heroShouldStack: boolean`
- `splitAlign: 'center' | 'stretch'`
- `rootJustify: 'center' | 'flex-start'`

Rule gợi ý:
- `9:16` → luôn `forceStack = true`, `forceCompact = true`
- `1:1` → luôn `forceStack = true`, `useCompactSectionGap = true`
- `4:5` → chỉ compact nếu nhiều section / nhiều cards / footer dài
- `16:9` → giữ split ngang nếu không crowded

Ngoài ratio, nên cộng thêm heuristic:
- nhiều hơn 4 section
- có cả `hero/headline + cards + cta + footer`
- cards từ 3 item trở lên
- có `summaryRibbon`

### 2) Chuẩn hóa “split-to-stack” từ rule thô sang rule chính thức
Thay đoạn:
- `isPortraitOrSquare`
- `isSplit = request.layout === 'split' && !isPortraitOrSquare`

bằng rule dùng helper mới, ví dụ:
- `shouldUseSplitRow = request.layout === 'split' && !layoutBehavior.forceStack`

Mục tiêu:
- `1:1` luôn stack
- `9:16` luôn stack
- `4:5` có thể stack nếu nội dung dày
- `16:9` mới thật sự giữ split ngang

Điều này giúp toàn bộ template `split` như:
- `infographic`
- `comparison_card`
- `problem_solution`

không còn bị cố gắng giữ logic 2 cột ở canvas hẹp.

### 3) Thêm compact section-gap profile cho canvas chật
Hiện root layout đang dùng:
- `gap: spacingTokens.sectionGap`

Cần chuyển sang gap động:
- `resolvedSectionGap = layoutBehavior.useCompactSectionGap ? spacingTokens.compactSectionGap : spacingTokens.sectionGap`

Áp dụng nhất quán cho:
- root container
- split/stack wrapper
- left column / right column
- khoảng cách headline → cards
- cards → ribbon
- ribbon → CTA
- CTA → footer

Có thể bổ sung thêm token trong `RatioProfile` nếu cần:
- `stackSectionGap`
- `denseSectionGap`
- `stackTopPadding`

Nhưng ưu tiên tái dùng `sectionGap` + `compactSectionGap` trước để tránh phình API nội bộ.

### 4) Chuẩn hóa cards về vertical/compact khi canvas chật
Hiện cards chỉ ép `vertical` khi `imageWidth <= imageHeight`.

Cần thay bằng behavior rõ hơn:
- nếu `forceCompact` hoặc `cardsShouldStack`:
  - `horizontal` → `vertical`
  - `grid-2x2` trên `1:1` và `9:16` → `vertical` hoặc grid 1 cột
- giảm:
  - `cardGap`
  - `cardPaddingX`
  - `cardPaddingY`
- fit text theo card width thực tế sau khi stack

Mục tiêu:
- square không còn grid/card ngang quá rộng
- 9:16 không bị card bành ngang rồi ép text xuống dòng quá nhiều

### 5) Chuẩn hóa split hero và các cụm ngang sang dạng dọc khi cần
Ngoài split layout tổng thể, trong renderer còn có các cụm ngang như:
- split hero (`number + label`)
- row-based footer mode
- card nội bộ với icon + text

Cần thêm điều kiện compact:
- `split hero` ở `1:1` và `9:16` nếu width quá chật thì:
  - circle ở trên
  - label xuống dưới
  - canh giữa hoặc canh trái theo profile
- margin/gap lấy từ `spacingTokens.inlineGap` / `compactSectionGap`

Mục tiêu:
- không còn hero ngang chiếm bề rộng quá lớn ở canvas hẹp
- number block / side label không chạm mép hoặc tạo cảm giác mất cân đối

### 6) Refactor split wrapper để khi stack dùng chung hệ spacing
Trong block final layout của `buildStructuredElement(...)`, refactor phần:
- `splitRow`
- `leftChildren`
- `rightChildren`

thành wrapper thích ứng:

#### Mode A — split row
Dùng cho:
- `16:9`
- một số `4:5` chưa crowded

Behavior:
- `flexDirection: 'row'`
- `gap: spacingTokens.splitGap`
- left/right width theo ratio profile

#### Mode B — forced stack
Dùng cho:
- toàn bộ `1:1`
- toàn bộ `9:16`
- `4:5` crowded

Behavior:
- `flexDirection: 'column'`
- left/right width = `100%`
- gap = `resolvedSectionGap`
- padding ngang theo `splitPaddingX` nhưng clamp chặt hơn nếu tall
- `alignItems: 'stretch'`

Điểm quan trọng:
- mode stack này không chỉ “không split”, mà phải là một bố cục dọc thật sự có nhịp riêng.

### 7) Giữ tương thích ngược với contract hiện tại
Không đổi payload từ client nếu không cần.

Giữ nguyên:
- `layout`
- `elements`
- `footerMode`
- `colors`
- `imageWidth/imageHeight`

Chỉ đổi logic nội bộ trong renderer:
- helper quyết định split/stack
- resolved section gap
- compact cards/hero behavior
- adaptive split wrapper

`src/hooks/useAutoImageGeneration.ts` và `SimpleImageGenerator.tsx` nhiều khả năng chưa cần sửa, vì renderer đã có đủ `layout + imageWidth/imageHeight`.

## Files cần sửa
- `supabase/functions/overlay-text-canvas/index.ts`
  - chính: thêm layout behavior helper, chuẩn hóa split-to-stack, compact section gap, cards/hero stacking logic

## QA bắt buộc

### 1:1
- template `infographic`, `comparison_card`, `problem_solution`
- luôn render theo dạng dọc
- cards không còn nằm 2 cột nếu text dài
- headline / CTA / footer có gap gọn nhưng không dính nhau

### 9:16
- mọi layout split hoặc horizontal đều chuyển dọc/compact
- hero split không bị quá ngang
- cards xếp 1 cột rõ ràng
- CTA + footer không ép phần trên bị nghẹt

### 4:5
- case ít nội dung có thể vẫn thoáng
- case nhiều nội dung phải compact hơn
- không bị nhảy spacing thất thường giữa các section

### 16:9
- split ngang vẫn hoạt động
- gap đủ thoáng
- regression không làm layout landscape bị “nén” quá mức

### Regression
- `banner_cards`, `hero_text`, `stack`, `simple` không xấu đi
- footer adaptive hiện tại vẫn giữ đúng safe-area với logo
- các layout mới như `testimonial_card`, `timeline_steps`, `contact_card` vẫn sạch

## Kết quả mong muốn
Sau khi cập nhật:

- `1:1` và `9:16` luôn ưu tiên bố cục dọc/compact khi canvas chật
- split layout không còn cố giữ 2 cột sai ngữ cảnh
- section gap được chuẩn hóa theo mật độ nội dung thay vì dùng 1 nhịp cố định
- các layout mới ổn định hơn rõ rệt, giảm tràn chữ và lệch nhịp trên canvas hẹp
