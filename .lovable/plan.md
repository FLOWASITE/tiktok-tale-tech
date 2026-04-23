
# Phát triển AI render theo hướng AI-first nhưng vẫn giữ guardrail brand và anti-overflow

## Mục tiêu
Nâng cấp hệ thống tạo ảnh để AI render thông minh hơn trên tất cả kênh, với 4 ưu tiên chính:

- bố cục thông minh hơn theo từng social
- text tiếng Việt chính xác hơn
- logo / footer / brand giữ ổn định hơn
- template phong phú hơn nhưng vẫn nhất quán

Hướng triển khai sẽ là:
- AI-first cho việc dựng bố cục và text
- renderer tiếp tục đóng vai trò guardrail/fallback cho safe-area, logo, footer, overflow và regression

## Hiện trạng đã xác nhận
Pipeline hiện tại đã có nền tảng tốt:

- `useAutoImagePipeline.ts` đang mặc định `overlayMode: 'ai_render'`
- `useAutoImageGeneration.ts`:
  - tự map ratio theo channel
  - tự chọn vị trí logo theo channel
  - truyền `structuredElements`, `structuredTemplate`, `logoSafeZone` sang `generate-brand-image`
  - chỉ dùng `overlay-text-canvas` khi chạy mode Satori / footer overlay / fallback
- `generate-brand-image/index.ts`:
  - đã có `structuredElementsToPromptText(...)`
  - đã có một số layout instruction cho AI render
  - đã truyền color scheme, text checklist, logo safe-zone vào prompt
- `decompose-image-request/index.ts`:
  - đã có logic AI chọn `suggestedLayout`
  - đã hiểu các layout mới: `comparison_card`, `timeline_steps`, `checklist_card`, `product_spotlight`, `problem_solution`, `testimonial_card`, `stat_spotlight`, `contact_card`
- `overlay-text-canvas`:
  - đã có ratio profile, spacing token, layout behavior, footer safe-area logic
  - phù hợp làm lớp kiểm soát ổn định chứ không nên bỏ đi hoàn toàn

Vấn đề hiện tại là AI render mới ở mức “nhận instruction”, chưa thành một hệ thống channel-aware hoàn chỉnh:
- layout instruction cho AI còn ít
- chưa có prompt contract riêng theo từng ratio/channel
- chưa có text-fit / hierarchy budget rõ cho AI
- logo / footer / CTA an toàn chủ yếu đang mạnh ở renderer fallback hơn là trong AI-first flow
- chưa có QA AI-render regression riêng theo channel × template × ratio

## Hướng kiến trúc đề xuất
Xây 3 lớp rõ ràng:

### 1) Layer A — Social Render Spec
Một lớp spec thống nhất cho từng channel/ration để AI biết:
- tỷ lệ ưu tiên
- vùng UI cần tránh
- logo safe-zone
- footer safe-zone
- text density budget
- layout bias: split / stack / compact / editorial / CTA-heavy

Lớp này là “ngôn ngữ chung” giữa:
- frontend generator
- `decompose-image-request`
- `generate-brand-image`
- renderer fallback

### 2) Layer B — AI Layout Composer
Thay vì chỉ đẩy raw `structuredElements`, bổ sung bước chuẩn hóa trước khi prompt:
- resolve template theo intent + channel
- resolve hierarchy:
  - banner
  - hero
  - headline
  - cards
  - ribbon
  - CTA
  - footer
- resolve density:
  - minimal / balanced / dense
- resolve AI layout mode:
  - hero-led
  - stacked-cards
  - split-editorial
  - footer-contact
  - stat-focus

AI sẽ được prompt bằng một layout brief chặt hơn, không chỉ là danh sách text.

### 3) Layer C — Verification + Guardrails
Sau AI render:
- nếu output thuộc mode AI-first nhưng có risk cao:
  - footer dài
  - logo bottom-center
  - 9:16 text-heavy
  - comparison/timeline nhiều text
thì hệ thống có thể:
- hạ fallback sang hybrid / renderer overlay cho footer hoặc toàn bộ text
- hoặc re-prompt bằng compact variant trước khi trả kết quả

## Cách triển khai chi tiết

### 1) Tạo social render spec dùng chung cho toàn hệ thống
Tạo một module spec mới cho AI render, ví dụ:
- `channelRenderSpec`
- `templateRenderSpec`
- `ratioRenderSpec`

Nội dung mỗi spec nên có:

- `preferredAspectRatio`
- `safeZones`
  - top
  - bottom
  - left/right
  - UI keep-clear vùng TikTok / feed crop / thumbnail crop
- `maxTextDensity`
- `headlineBudget`
- `ctaBudget`
- `footerBudget`
- `preferredLogoPositions`
- `layoutBias`
- `fallbackThresholds`

Ví dụ định hướng:
- TikTok `9:16`
  - ưu tiên vertical compact
  - bottom clear mạnh
  - CTA ngắn
  - footer cực gọn hoặc tránh dùng
- Instagram `4:5`
  - headline trung bình
  - card stack hợp lý
  - footer chỉ khi contact thật sự cần
- Facebook / LinkedIn `16:9`
  - cho phép split/editorial nhiều hơn
  - footer row/two-row an toàn hơn
- Threads / Telegram `1:1`
  - ưu tiên compact vertical
  - text density thấp-trung bình

Mục tiêu:
- AI render không còn “một prompt cho mọi social”

### 2) Nâng `decompose-image-request` thành layout strategist cho AI-first
Hiện function này đã biết chọn template. Cần nâng thêm 4 phần:

#### a. Chọn `suggestedLayout` theo channel + ratio + content intent
Không chỉ theo nội dung, mà thêm channel sensitivity:
- cùng `comparison_card` nhưng:
  - 16:9 → split/editorial
  - 1:1 → stacked comparison
  - 9:16 → compact vertical comparison

#### b. Trả thêm `layoutBehavior`
Bổ sung output như:
- `densityMode: minimal | balanced | dense`
- `textStrategy: hero_first | headline_first | card_first`
- `footerStrategy: none | compact | contact_bar`
- `ctaStrategy: hidden | inline | primary_button`
- `logoProtection: low | medium | high`

#### c. Rút gọn text thông minh cho AI render
Bổ sung rule để:
- banner luôn cực ngắn
- hero chỉ là stat / keyword
- headline một ý
- card label ngắn hơn cho ratio hẹp
- footer contact được ưu tiên rút gọn trước

#### d. Sinh variant prompt theo ratio
Ví dụ cùng một content decomposition nhưng có:
- `wideVariant`
- `squareVariant`
- `tallVariant`

Mục tiêu:
- AI nhận instruction tương ứng canvas thực tế, không phải chỉ layout ID chung chung

### 3) Mở rộng `generate-brand-image` thành AI render composer thật sự
Hiện `structuredElementsToPromptText(...)` mới là prompt expander. Cần refactor thành composer có cấu trúc hơn.

#### a. Thay `structuredElementsToPromptText` bằng prompt builder đa tầng
Nên build prompt theo block:

- Channel brief
- Ratio brief
- Template brief
- Hierarchy brief
- Typography brief
- Brand brief
- Logo safe-zone brief
- Footer safe-zone brief
- Text verification checklist
- Failure rule:
  - nếu không render chính xác thì bỏ bớt text phụ, không phá hero/headline

#### b. Mở rộng layout instruction cho toàn bộ template mới
Hiện mới có vài template instruction cơ bản. Cần thêm rules riêng cho:
- `comparison_card`
- `timeline_steps`
- `checklist_card`
- `product_spotlight`
- `problem_solution`
- `testimonial_card`
- `stat_spotlight`
- `contact_card`
- `editorial_cover`
- `education_infographic`

Mỗi template cần mô tả:
- hierarchy
- số khối tối đa
- hướng stack theo ratio
- cách đặt CTA
- cách xử lý footer
- khi nào giảm card count

#### c. Bổ sung text accuracy protocol cho tiếng Việt
Tăng độ chính xác text bằng các lớp rule:
- normalize Unicode trước khi gửi prompt
- checklist theo block:
  - banner
  - hero
  - headline
  - cards
  - CTA
  - footer
- yêu cầu “copy exactly”
- thêm priority rule:
  - ưu tiên đúng banner/headline/CTA trước text phụ
- nếu quá dài:
  - bỏ description card trước
  - sau đó rút footer
  - không phá hero/headline

#### d. Bổ sung brand-lock rules
AI render phải giữ:
- màu primary / secondary đúng vai trò
- style tone theo template
- logo area tuyệt đối trống
- footer style nhất quán với brand

### 4) Nâng cấp logic logo / footer / CTA trong AI-first flow
Hiện safe-area mạnh ở renderer hơn AI path. Cần đưa guardrail đó sang AI-first rõ ràng hơn.

#### Logo
Chuẩn hóa `logoSafeZone` thành spec chi tiết hơn:
- position
- safe width/height
- keep-clear margin
- no-text / no-card / no-CTA zone

#### CTA
Thêm CTA placement rule theo ratio:
- 9:16: CTA compact, không dính footer
- 1:1: CTA centered compact
- 16:9: CTA có thể inline hoặc button-style
- nếu footer dài → CTA phải rút ngắn hoặc đẩy lên trên

#### Footer
Tạo AI footer rules tương thích với renderer:
- `single-row`
- `two-row`
- `vertical-compact`

Với AI-first:
- footer không phải lúc nào cũng render đầy đủ
- nếu channel/ration hẹp thì chọn footer strategy tự động:
  - none
  - compact
  - stacked
- `contact_card` và content có info liên hệ mới ưu tiên footer rõ

### 5) Thêm cơ chế “AI render confidence” và auto fallback
Cần thêm quyết định runtime:
- khi nào tin AI render hoàn toàn
- khi nào dùng hybrid
- khi nào fallback renderer-first

Ví dụ fallback trigger:
- `9:16` + footer dài
- `comparison_card` nhiều description
- `education_infographic` nhiều hơn 4 cards
- `bottom-center logo` + CTA + footer đồng thời
- text tiếng Việt dài / nhiều dấu / nhiều số liệu

Kết quả:
- hệ thống vẫn AI-first, nhưng không mạo hiểm ở case khó

### 6) Chuẩn hóa template system cho AI render
Hiện template đã xuất hiện ở decomposition và UI, nhưng cần đồng bộ thành contract thật sự.

Mỗi template nên có:
- semantic purpose
- allowed elements
- preferred ratios
- narrow-ratio adaptation
- max cards
- hero policy
- cta policy
- footer policy
- AI prompt snippet
- fallback renderer mapping

Ví dụ:
- `stat_spotlight`
  - hero number là trung tâm
  - headline tối đa 1 dòng
  - CTA optional
  - footer thường compact
- `comparison_card`
  - 16:9 có thể split
  - 1:1, 9:16 luôn stacked
  - card description bị cắt trước nếu chật
- `testimonial_card`
  - quote/review là chính
  - CTA nhẹ
  - footer rất tiết chế

### 7) QA regression riêng cho AI render
Bổ sung một lớp regression ngoài renderer logic hiện có.

#### Coverage chính
- channel × ratio × template
- text accuracy tiếng Việt
- safe-area cho logo / CTA / footer
- density / stacking đúng ngữ cảnh
- brand color consistency

#### Matrix tối thiểu
4 ratio:
- `1:1`
- `4:5`
- `16:9`
- `9:16`

Template:
- `comparison_card`
- `timeline_steps`
- `checklist_card`
- `product_spotlight`
- `problem_solution`
- `testimonial_card`
- `stat_spotlight`
- `contact_card`

#### Assert cần có
- template-to-layout mapping đúng
- narrow ratio không giữ split sai
- footer strategy đúng với tall/square
- CTA không chạm logo/footer
- text block budget không vượt ngưỡng
- brand colors / logo zone được preserve

Nếu có thể, thêm snapshot payload AI brief thay vì snapshot ảnh thuần để test bền hơn.

## File/phần hệ thống cần chỉnh
### Backend / Edge functions
- `supabase/functions/decompose-image-request/index.ts`
  - nâng role từ content decomposition thành layout strategist theo channel/ratio
- `supabase/functions/generate-brand-image/index.ts`
  - refactor prompt builder cho AI render
  - thêm channel-aware / template-aware / safe-area-aware prompt composer

### Shared frontend logic
- `src/config/channelImageConfig.ts`
  - bổ sung render-spec metadata, không chỉ aspect ratio và style
- `src/lib/hybridImageGenerator.ts`
  - đồng bộ contract template / layout behavior / footer strategy
- `src/hooks/useAutoImageGeneration.ts`
  - truyền thêm render behavior / confidence / fallback hints
- `src/hooks/useAutoImagePipeline.ts`
  - giữ default AI-first nhưng thêm fallback policy rõ ràng
- `src/components/multichannel/SimpleImageGenerator.tsx`
  - nếu cần, expose thêm control cho AI render level / template behavior preview

### Renderer guardrail
- `supabase/functions/overlay-text-canvas/index.ts`
- `supabase/functions/overlay-text-canvas/layout-helpers.ts`

Phần này không cần trở thành primary renderer, nhưng phải là lớp backup/QA contract cho:
- spacing
- footer modes
- logo safe-area
- overflow prevention

### Tests
- regression test cho prompt composer / layout strategist
- mở rộng bộ test template × ratio hiện có
- thêm safe-area checks cho AI-first decision layer

## Thứ tự triển khai đề xuất
### Phase 1 — Chuẩn hóa spec và contract
- tạo social render spec
- tạo template render contract
- thêm density/footer/logo strategy object
- đồng bộ input/output giữa decomposition và generation

### Phase 2 — Nâng AI layout composer
- refactor prompt builder trong `generate-brand-image`
- thêm channel-aware + ratio-aware instructions
- thêm Vietnamese text accuracy protocol
- thêm logo/footer safe-area prompt rules

### Phase 3 — AI fallback intelligence
- thêm confidence/fallback rules
- route case khó sang hybrid / renderer-backed mode
- giữ trải nghiệm AI-first nhưng ổn định hơn

### Phase 4 — QA regression
- thêm test matrix cho AI render spec
- test template behavior cho 4 ratio
- test CTA/footer/logo safe-area
- test brand consistency và text budget

## Kết quả mong muốn
Sau khi triển khai:

- AI render sẽ thật sự khác nhau theo từng social, không còn generic
- layout tự thích nghi tốt hơn theo `1:1`, `4:5`, `16:9`, `9:16`
- text tiếng Việt chính xác và có thứ tự ưu tiên khi canvas chật
- logo / CTA / footer không phá nhau kể cả AI-first
- template mới có luật rõ ràng cho cả prompt lẫn fallback
- toàn hệ thống vẫn giữ được độ ổn định nhờ renderer guardrail và regression suite

## Chi tiết kỹ thuật
```text
User content
  -> decompose-image-request
       -> suggestedTemplate
       -> layoutBehavior
       -> density/footer/logo strategy
  -> generate-brand-image
       -> social render spec
       -> template render contract
       -> AI render prompt composer
       -> AI-first image output
  -> verification layer
       -> accept if safe
       -> retry compact variant if risky
       -> fallback hybrid/renderer when needed
```

```text
Ưu tiên channel-aware AI render:
TikTok 9:16        -> compact vertical, bottom UI clear, short CTA, minimal footer
Instagram 4:5     -> strong headline/cards, balanced density, compact footer
Facebook 16:9     -> split/editorial allowed, richer footer, wider CTA
LinkedIn 16:9     -> professional editorial, restrained colors, info-first
Threads/Telegram 1:1 -> stacked compact, low-medium density, footer very concise
```
