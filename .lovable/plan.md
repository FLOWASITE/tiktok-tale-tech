
# Thêm bộ QA regression cho layout mới trên 4 ratio để bắt overflow sớm

## Mục tiêu
Tạo một bộ test có cấu trúc để khóa regression cho các layout mới:

- `comparison_card`
- `timeline_steps`
- `checklist_card`
- `product_spotlight`
- `problem_solution`
- `testimonial_card`
- `stat_spotlight`
- `contact_card`

trên 4 tỉ lệ phổ biến:

- `1:1`
- `4:5`
- `16:9`
- `9:16`

Mục tiêu chính là bắt sớm các lỗi:
- overflow chữ
- split giữ 2 cột sai ở canvas hẹp
- card/grid không tự stack
- CTA/headline/footer vượt content width
- footer/logo safe-area bị phá

## Hướng triển khai

### 1) Tách các quyết định layout quan trọng thành pure helpers có thể test
Trong `supabase/functions/overlay-text-canvas/index.ts`, chuẩn hóa và export nội bộ testable cho các phần đang quyết định overflow-risk:

- `getRatioProfile(...)`
- `getLayoutBehavior(...)`
- `getFooterLayoutProfile(...)`
- helper resolve width:
  - `resolveContentWidth(...)`
  - `resolveBlockWidth(...)`
- helper text tokens:
  - `getTextScaleTokens(...)`

Nếu cần, tách sang file phụ kiểu:
- `supabase/functions/overlay-text-canvas/layout-helpers.ts`

để test không phải phụ thuộc vào `Deno.serve`.

Mục tiêu:
- test được logic mà không cần render ảnh thật
- khóa trực tiếp các rule anti-overflow mới vừa refactor

### 2) Tạo fixture matrix cho từng layout mới
Thêm bộ fixture chuẩn hóa, ví dụ file:
- `supabase/functions/overlay-text-canvas/__tests__/layout-regression.fixtures.ts`

Mỗi fixture nên có:
- `templateId`
- `layout`
- `elements`
- text dài thực tế bằng tiếng Việt
- optional `logoMeta`
- expected behavior per ratio

Nhóm fixture tối thiểu:

#### comparison_card
- 2 card before/after với label dài
- có CTA

#### timeline_steps
- 3-5 bước với mô tả dài
- numbered cards

#### checklist_card
- 4 item ngắn + 1 CTA

#### product_spotlight
- headline + 3 benefit cards + CTA

#### problem_solution
- split-like content có headline + 3 cards + CTA

#### testimonial_card
- heroText + headline + CTA

#### stat_spotlight
- heroText dạng `92%` + headline + banner

#### contact_card
- headline + footer dài gồm phone/email/address/website

### 3) Viết regression tests theo ma trận layout × ratio
Thêm file test chính, ví dụ:
- `supabase/functions/overlay-text-canvas/__tests__/layout-regression.test.ts`

Cho mỗi fixture, loop qua 4 ratio:
- `1080x1080`
- `1080x1350`
- `1920x1080`
- `1080x1920`

Các assert chính:

#### A. Split-to-stack
- `1:1` và `9:16`:
  - `getLayoutBehavior(...).forceStack === true`
- `4:5` crowded:
  - stack khi dense
- `16:9`:
  - split vẫn được giữ cho case phù hợp

#### B. Section gap / compactness
- square/tall:
  - `useCompactSectionGap === true`
- landscape:
  - không compact quá mức nếu content vừa

#### C. Cards anti-overflow
- layout có `horizontal` hoặc `grid-2x2`:
  - narrow ratio phải chuyển effective behavior sang dọc/1 cột
- `cardsShouldStack === true` cho:
  - `comparison_card` ở `1:1`, `9:16`
  - `product_spotlight` ở `9:16`
  - `checklist/timeline` nếu text dài

#### D. Width guards
Với headline / CTA / ribbon / footer:
- `resolveBlockWidth(...) <= resolveContentWidth(...)`
- block width không âm / không vượt content width sau padding
- các token `maxWidth` cho tall ratio nhỏ hơn landscape

#### E. Footer behavior
- `contact_card` và các case footer dài:
  - `1:1` → `two-row` hoặc `vertical-compact`
  - `9:16` → `vertical-compact`
  - `16:9` → không bị ép vertical nếu không crowded
- logo `bottom-center`:
  - `minBottomClearance` tăng đúng
  - không giữ `single-row` khi footer quá dài

### 4) Thêm “content stress cases” để bắt overflow thật sớm
Ngoài fixture bình thường, thêm nhóm stress cases với:
- headline dài 70-100 ký tự
- CTA dài
- 4 cards có label + description dài
- footer có address dài

Mục tiêu:
- test không chỉ pass với content đẹp
- khóa đúng các case dễ vỡ ngoài production

Nên có ít nhất:
- `problem_solution` stress
- `contact_card` stress
- `comparison_card` stress
- `timeline_steps` stress

### 5) Thêm test cho auto-select + applyTemplate của layout mới
Mở rộng file hiện có:
- `src/lib/__tests__/hybridImageGenerator.test.ts`

Bổ sung integration coverage cho từng layout mới để chắc rằng input mẫu đúng loại nội dung vẫn map sang đúng template:
- comparison
- timeline
- checklist
- product spotlight
- problem solution
- testimonial
- stat
- contact

Mục tiêu:
- đầu vào đúng template
- renderer QA phía sau nhận đúng shape layout cần kiểm tra

### 6) Nếu cần, thêm snapshot nhẹ cho tree layout thay vì pixel render
Không cần QA ảnh nặng để khóa logic overflow. Ưu tiên snapshot các output quyết định:
- `ratioProfile`
- `layoutBehavior`
- `footerLayoutProfile`
- resolved widths / spacing tokens

Nếu cần thêm một lớp nữa, tách builder-level payload nhỏ để assert:
- split row vs column
- effective card layout
- section gap được resolve sang compact hay không

Mục tiêu:
- snapshot ổn định
- ít brittle hơn snapshot SVG full

## Files dự kiến sửa / thêm
- `supabase/functions/overlay-text-canvas/index.ts`
  - export hoặc tách pure helpers để test được
- `supabase/functions/overlay-text-canvas/__tests__/layout-regression.fixtures.ts`
  - fixture matrix cho layout mới
- `supabase/functions/overlay-text-canvas/__tests__/layout-regression.test.ts`
  - test matrix layout × ratio × stress case
- `src/lib/__tests__/hybridImageGenerator.test.ts`
  - thêm auto-select/applyTemplate coverage cho các layout mới nếu còn thiếu

## Tiêu chí pass
Bộ QA mới phải xác nhận được:

- `1:1` và `9:16` không giữ split sai ngữ cảnh
- layout mới không để card/grid ngang ở canvas chật
- `headline / CTA / footer` luôn fit trong width đã resolve
- footer dài tự hạ về `two-row` hoặc `vertical-compact`
- `16:9` không bị compact quá đà
- auto-select vẫn map đúng template cho input mẫu thực tế

## Kết quả mong muốn
Sau khi thêm bộ test:

- mọi layout mới đều có regression coverage rõ ràng trên 4 ratio
- mỗi lần refactor spacing / font / footer / split logic đều bị chặn sớm nếu gây overflow
- team có một “safety net” đúng với các template social hiện tại, thay vì chỉ test logic chọn template
