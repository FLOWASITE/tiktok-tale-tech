
# Hoàn thiện ratio profile cho renderer để tự suy padding / max-width / spacing theo 1:1, 4:5, 16:9, 9:16

## Mục tiêu
Chuẩn hóa lớp `ratio profile` trong renderer để mọi structured overlay tự thích nghi theo tỉ lệ ảnh, giảm nguy cơ:

- tràn chữ
- block chạm mép
- CTA/headline quá rộng ở khung dọc
- spacing quá thoáng hoặc quá chật giữa các section

Phạm vi chính:
- `padding`
- `maxWidth`
- `sectionGap`
- spacing nội bộ của banner / hero / cards / CTA / footer

## Hiện trạng đã xác nhận
Trong `supabase/functions/overlay-text-canvas/index.ts` đã có nền tảng tốt:

- đã có `getRatioProfile(imageWidth, imageHeight)`
- đã có token như:
  - `contentMaxWidth`
  - `headlineMaxWidth`
  - `ctaMaxWidth`
  - `footerMaxWidth`
  - `sectionGap`
  - `outerPadding`
  - `safeBottomMultiplier`
  - `fontScale`
  - `compactness`
- đã có `getTextScaleTokens(...)`
- footer đã dùng ratio-aware profile riêng

Nhưng hiện vẫn còn thiếu đồng bộ ở phần layout spacing:
- nhiều block vẫn hard-code padding/gap (`20px`, `24px`, `12px`, `8px`, `16px`)
- `contentMaxWidth` và `outerPadding` chưa được áp dụng xuyên suốt
- một số `fitTextWithRatio(...)` vẫn dùng `imageWidth * ...` thay vì width thực tế sau khi trừ padding/safe-area
- split/stack/cards/summary ribbon vẫn chưa lấy spacing từ cùng một token system

## Cách triển khai

### 1) Mở rộng `RatioProfile` thành layout token nguồn duy nhất
Trong `supabase/functions/overlay-text-canvas/index.ts`, giữ `getRatioProfile(...)` nhưng mở rộng thêm token để mọi block cùng dùng:

- `contentMaxWidth`
- `headlineMaxWidth`
- `ctaMaxWidth`
- `footerMaxWidth`
- `outerPadding`
- `sectionGap`
- `bannerPaddingX`
- `bannerPaddingY`
- `heroPadding`
- `cardGap`
- `cardPaddingX`
- `cardPaddingY`
- `ribbonPaddingX`
- `ribbonPaddingY`
- `splitGap`
- `splitPaddingX`
- `footerTopGap`

Rule gợi ý:
- `16:9`: thoáng hơn, max-width rộng hơn, gap lớn hơn
- `1:1`: cân bằng, không để block quá rộng
- `4:5`: bắt đầu compact hơn
- `9:16`: siết chiều ngang, tăng padding an toàn, giảm gap dọc

### 2) Tạo helper dùng chung để tính available width thật
Bổ sung helper kiểu:

- `resolveContentWidth(imageWidth, ratioProfile, extraLeft = 0, extraRight = 0)`
- `resolveBlockWidth(imageWidth, ratioProfile, maxWidthPercent, extraPadding = 0)`
- `getSpacingTokens(ratioProfile, theme)`

Mục tiêu:
- mọi phép `fitTextWithRatio(...)` dựa trên width còn lại sau khi trừ:
  - outer padding
  - logo safe-area
  - block padding
- tránh tình trạng headline/CTA fit theo width canvas lý thuyết nhưng render thực tế lại hẹp hơn

### 3) Áp dụng ratio profile nhất quán cho từng block
Refactor `buildStructuredElement(...)` để các phần sau đều dùng token từ ratio profile:

#### Banner
- đổi padding cứng sang `bannerPaddingX/Y`
- width fit text phải tính theo safe-area thật
- giữ max width theo `contentMaxWidth`

#### Hero text
- padding container lấy từ `heroPadding`
- width fit text dùng `contentMaxWidth`
- split hero (`number + label`) dùng `splitGap`

#### Headline
- giữ `headlineMaxWidth` nhưng fit width theo:
  - `content width - headline padding`
- container spacing không hard-code

#### Cards
- `gap`, `padding`, `maxWidth`, `grid width` đều bám profile
- `grid-2x2`/`horizontal` trong portrait/tall dùng padding chặt hơn
- card label/description fit theo width thực của card, không chỉ theo `imageWidth * 0.35/0.6`

#### Summary ribbon
- bỏ padding cứng hiện tại, dùng `ribbonPaddingX/Y`
- width bám `contentMaxWidth`

#### CTA
- fit width theo `ctaMaxWidth` + available width thật
- padding ngang/dọc bám token
- margin top / bottom không hard-code, dùng `sectionGap` + safe area

#### Footer
- giữ `getFooterLayoutProfile(...)`
- đồng bộ `footerTopGap`, `footerMaxWidth`, padding ngoài với ratio profile chung
- đảm bảo footer không thành “một hệ spacing riêng”

### 4) Chuẩn hóa vertical rhythm toàn layout
Hiện các section đang xen kẽ giữa `marginTop: 8/10`, `padding: 12/20`, `gap: 8/12/16`.

Cần đưa về một nhịp chung:
- `sectionGap`
- `compactSectionGap`
- `cardGap`
- `inlineGap`

Áp dụng cho:
- hero → cards
- cards → ribbon
- ribbon → CTA
- CTA → footer
- split left/right column

Mục tiêu:
- 16:9 không bị quá rời rạc
- 9:16 không bị dồn nghẹt
- 1:1, 4:5 giữ nhịp cân bằng

### 5) Làm ratio-aware cả split và stack behavior
Ở `buildStructuredElement(...)` hiện split chỉ chuyển sang stack khi portrait/square, nhưng spacing nội bộ chưa ratio-aware đủ.

Cần bổ sung:
- `splitGap`, `splitPaddingX`, `leftColumnWidth`, `rightColumnWidth` theo ratio
- `stack` mode dùng `outerPadding` + `sectionGap` thật
- tall ratio giới hạn chiều ngang cho nội dung text trước card/footer để giảm overflow

Ví dụ:
- `16:9`: split giữ ngang, gap thoáng
- `1:1`: stack với padding cân
- `4:5`: stack + compact spacing
- `9:16`: stack + nội dung hẹp hơn + safe area lớn hơn

### 6) Giữ tương thích ngược
Không đổi contract API hiện tại nếu không cần.

Giữ nguyên:
- `layout`
- `elements`
- `colors`
- `footerMode`
- `imageWidth/imageHeight`

Chỉ refactor nội bộ renderer:
- mở rộng `RatioProfile`
- thay các số cứng bằng token
- chuẩn hóa width fitting và spacing resolution

`src/hooks/useAutoImageGeneration.ts` và `SimpleImageGenerator.tsx` nhiều khả năng không cần đổi nếu renderer tự suy hoàn toàn từ `imageWidth/imageHeight`.

## Files cần sửa
- `supabase/functions/overlay-text-canvas/index.ts`
  - chính: mở rộng ratio profile, thêm width/spacing helpers, thay thế hard-coded padding/gap/max-width trong renderer
- `src/hooks/useAutoImageGeneration.ts`
  - chỉ sửa nếu cần bổ sung metadata debug/logging cho ratio handling; ưu tiên không đổi
- `src/components/multichannel/SimpleImageGenerator.tsx`
  - không bắt buộc, trừ khi cần surface ratio debug trong UI nội bộ

## QA bắt buộc
Test tối thiểu với text tiếng Việt dài trên 4 ratio:

### 16:9
- banner + headline + cards + CTA + footer
- headline không bị lọt thỏm
- spacing đủ thoáng, không chạm mép

### 1:1
- testimonial / checklist / stat card
- headline + CTA nằm gọn trong content width
- footer không ép các section phía trên

### 4:5
- timeline / product spotlight / problem-solution
- cards không quá rộng
- ribbon/CTA không chạm mép

### 9:16
- contact-heavy / testimonial / quote
- text block hẹp vừa đủ, không phình ngang
- spacing dọc chặt nhưng vẫn readable
- footer + logo safe-area vẫn đúng

### Regression
- simple/manual overlay cũ không xấu đi
- layout mới như `comparison_card`, `timeline_steps`, `testimonial_card`, `contact_card` vẫn sạch
- case không có footer vẫn cân bố cục

## Kết quả mong muốn
Sau khi hoàn thiện:

- renderer có một lớp `ratio profile` đúng nghĩa cho `1:1`, `4:5`, `16:9`, `9:16`
- padding, max-width và spacing đều suy từ cùng một hệ token
- text fit theo available width thực tế thay vì canvas width chung
- các layout mới giảm rõ rệt tình trạng tràn chữ, chạm mép hoặc lệch nhịp giữa các block
