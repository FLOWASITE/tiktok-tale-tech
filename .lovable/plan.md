
# Refactor font scaling theo `min(width,height)` + ratio profile cho headline / CTA / footer

## Mục tiêu
Chuẩn hóa toàn bộ logic scale + clamp để các block chữ quan trọng:

- `headline`
- `CTA`
- `footer`

giữ kích thước đúng và ổn định trên 4 tỉ lệ chính:

- `1:1`
- `4:5`
- `16:9`
- `9:16`

đồng thời:
- không bị quá to ở portrait/tall
- không bị quá bé ở landscape
- không chạm mép / không đè logo
- nhất quán giữa các layout mới và cũ

## Hiện trạng đã xác nhận
Trong `supabase/functions/overlay-text-canvas/index.ts` hiện đã có nền tảng tốt nhưng còn chưa đồng bộ:

- `footer` đã bắt đầu scale theo `Math.min(imageWidth, imageHeight)` thông qua `getFooterLayoutProfile(...)`
- nhưng nhiều block khác vẫn scale theo `imageWidth`, ví dụ:
  - banner text
  - hero text
  - headline
  - CTA
  - card description
  - summary ribbon
- hiện đang có nhiều công thức rời rạc như:
  - `Math.round(imageWidth * 0.035)` cho headline
  - `Math.round(imageWidth * 0.025)` cho CTA
  - `Math.round(imageWidth * 0.03)` cho banner
- điều này làm:
  - `9:16` dễ bị chữ to/chật bất thường
  - `16:9` có block bị nhỏ hơn mong muốn
  - các block không cùng “hệ scale” nên nhìn thiếu cân đối

## Hướng triển khai

### 1) Tạo ratio profile dùng chung cho structured overlay
Trong `supabase/functions/overlay-text-canvas/index.ts`, thêm helper kiểu:

- `getRatioProfile(imageWidth, imageHeight)`

Profile nên trả về các flag + token dùng chung:
- `kind`: `'landscape' | 'square' | 'portrait' | 'tall'`
- `sizeBasis`: `Math.min(imageWidth, imageHeight)`
- `contentMaxWidth`
- `headlineMaxWidth`
- `ctaMaxWidth`
- `footerMaxWidth`
- `sectionGap`
- `outerPadding`
- `safeBottomMultiplier`
- `fontScale`
- `compactness`

Rule gợi ý:
- `16:9` → fontScale hơi tăng, spacing thoáng
- `1:1` → trung tính, ưu tiên cân bằng
- `4:5` → giảm nhẹ chiều ngang, tăng compactness
- `9:16` → siết font + width mạnh nhất

### 2) Tạo bộ utility scale/clamp thống nhất
Thay vì nhiều `Math.round(imageWidth * x)` rải rác, thêm các helper chung:

- `scaleFromMin(sizeBasis, ratio, minPx, maxPx)`
- `fitTextWithRatio(text, maxWidth, baseSize, minPx, maxPx)`
- `getTextScaleTokens(ratioProfile, theme, elementCount)`

Ví dụ tokens:
- `bannerFont`
- `heroFont`
- `headlineFont`
- `ctaFont`
- `footerFont`
- `cardTitleFont`
- `cardDescFont`
- `ribbonFont`

Mục tiêu:
- mọi block text đi qua cùng một lớp scale/clamp
- dễ tune theo ratio mà không sửa từng đoạn rời rạc

### 3) Refactor riêng cho headline
Hiện `headline` đang dùng:
- `fontSize: Math.round(imageWidth * 0.035)`
- `maxWidth: '85%'`

Cần đổi sang:
- base theo `sizeBasis = min(width,height)`
- clamp theo ratio profile
- fit theo `headlineMaxWidth`
- padding container cũng scale theo `sizeBasis`

Kết quả mong muốn:
- `16:9`: headline đủ lớn, không bị lọt thỏm
- `1:1`, `4:5`: headline cân đối, không đụng mép
- `9:16`: headline không bị phình ngang hoặc quá đậm so với canvas

### 4) Refactor riêng cho CTA
Hiện CTA đang dùng:
- `fontSize: Math.round(imageWidth * 0.025)`
- `padding: '12px 32px'`

Cần đổi sang:
- font theo `sizeBasis` + ratio clamp
- padding ngang/dọc theo profile
- width tối đa hoặc horizontal padding phù hợp từng ratio
- vẫn giữ safe-area với `bottom-center logo`

Rule gợi ý:
- `16:9`: CTA rộng hơn, text hơi lớn hơn
- `1:1`, `4:5`: compact vừa phải
- `9:16`: CTA không quá rộng, font nhỏ hơn 1 nấc, padding dọc gọn hơn

### 5) Chuẩn hóa footer vào cùng hệ scale
`footer` hiện đã có `getFooterLayoutProfile(...)`, nhưng vẫn cần đồng bộ thêm:

- font footer phải dựa trên cùng `sizeBasis`
- ngưỡng clamp nên bám ratio profile, không đứng riêng
- icon size trong footer đi theo `footerFont`
- paddingX / paddingY / bottomClearance cũng bám ratio profile

Mục tiêu:
- footer không bị “một hệ scale riêng” lệch so với headline/CTA
- khi xuống `two-row` hoặc `vertical-compact`, nhìn vẫn đồng bộ toàn layout

### 6) Áp dụng hệ scale mới cho các block liên quan để tránh lệch tổng thể
Dù mục tiêu chính là `headline / CTA / footer`, để output không bị lệch nhịp cần refactor thêm các block sát cạnh:

- `banner`
- `heroText`
- `summaryRibbon`
- `cardDescFontSize`
- số trong numbered cards / hero circle label

Ít nhất các block này cần chuyển từ `imageWidth * x` sang:
- `sizeBasis`
- clamp theo ratio profile

Nếu không, headline/CTA/footer đúng nhưng các block còn lại vẫn có thể mất cân đối.

### 7) Giữ tương thích ngược
Không đổi contract API hiện tại nếu không cần.

Giữ nguyên:
- `footerMode`
- `layout`
- `elements`
- `colors`
- `imageWidth/imageHeight`

Chỉ refactor nội bộ renderer:
- thay công thức scale
- gom logic vào helper/profile
- không làm vỡ pipeline hiện tại:
  - AI render phần chính
  - logo overlay
  - footer/text canvas

### 8) QA bắt buộc theo từng ratio
Sau khi implement cần test ít nhất các case sau:

#### 16:9
- infographic có banner + headline + CTA + footer
- CTA không bị nhỏ
- headline không quá mỏng so với canvas

#### 1:1
- testimonial / stat / checklist
- headline và CTA cân giữa
- footer 2 hàng vẫn readable

#### 4:5
- timeline / product spotlight / problem-solution
- headline không đụng mép
- CTA không chiếm quá nhiều chiều ngang
- footer không kéo layout quá cao

#### 9:16
- contact-heavy / testimonial / stat spotlight
- headline không quá to
- CTA vẫn rõ nhưng compact
- footer vertical compact vẫn đồng bộ font scale

#### Regression
- brand không có footer
- footer chỉ 1 item
- simple/manual overlay cũ không bị ảnh hưởng xấu
- layout mới như `comparison_card`, `timeline_steps`, `testimonial_card`, `contact_card` vẫn sạch

## Files cần sửa
- `supabase/functions/overlay-text-canvas/index.ts`
  - chính: ratio profile + scale utilities + refactor font sizing/clamp cho headline/CTA/footer và các block liên quan
- `src/hooks/useAutoImageGeneration.ts`
  - chỉ sửa nếu cần bổ sung metadata/logging cho ratio profile; ưu tiên không đổi contract
- `src/components/multichannel/SimpleImageGenerator.tsx`
  - chỉ sửa nếu cần truyền thêm hint; nhiều khả năng không bắt buộc

## Kết quả mong muốn
Sau khi refactor:

- mọi text block quan trọng đều scale theo `min(width,height)` thay vì lệ thuộc `imageWidth`
- `headline / CTA / footer` có clamp đúng theo từng ratio
- `1:1`, `4:5`, `16:9`, `9:16` đều giữ nhịp chữ nhất quán
- layout mới không còn cảm giác block này quá to nhưng block kia quá nhỏ
- logo safe-area và footer adaptive hiện tại vẫn tiếp tục hoạt động ổn định
