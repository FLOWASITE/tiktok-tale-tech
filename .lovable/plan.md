
# Nâng cấp layout instruction theo hướng AI-first, sâu hơn cho template + auto-select

## Mục tiêu
Nâng cấp hệ thống `layout instruction` để AI render ra bố cục ổn định hơn, đặc biệt ở 3 hướng bạn ưu tiên:

- rule sâu hơn cho từng template
- text fitting / hierarchy / anti-overflow tốt hơn
- logo / CTA / footer / brand consistency chặt hơn

Phạm vi sẽ bao gồm:
- tất cả template hiện có
- logic `auto-select / suggestedLayout`
- prompt composer + strategist + fallback metadata + regression tests

## Hiện trạng đã xác nhận
Hệ thống đã có nền tốt nhưng instruction còn khá “mỏng” ở lớp cuối:

- `decompose-image-request/index.ts`
  - đã chọn `suggestedLayout`
  - đã có ví dụ cho một số layout mới
  - đã trả `renderSpec` + `layoutBehavior`
- `generate-brand-image/index.ts`
  - vẫn đang dùng `structuredElementsToPromptText(...)`
  - `layoutInstructions` hiện mới có vài template cơ bản (`poster`, `infographic`, `quote_card`, `feature_list`, `contact_card`)
  - phần rule vẫn thiên về mô tả block, chưa phải instruction framework đầy đủ cho mọi template
- `image-render-spec.ts`
  - đã có `renderSpec`, `densityMode`, `cta/footer strategy`, `confidence/fallback`
  - nhưng chưa encode template-specific instruction depth
- `overlayTemplates.ts`
  - đã có metadata `aiRender`
  - nhưng mới là contract tĩnh, chưa được đẩy mạnh vào prompt builder
- `channelImageConfig.ts`
  - đã có channel renderSpec
  - nhưng chưa được dùng để sinh instruction giàu ngữ cảnh theo channel

## Những gì sẽ được build

### 1) Chuẩn hóa instruction framework cho mọi template
Tạo một framework instruction thống nhất thay vì chỉ map `templateId -> 1 câu LAYOUT`.

Mỗi template sẽ có bộ rule riêng gồm:
- semantic purpose
- visual priority
- section order
- ratio adaptation
- max card count
- hero/headline coexist rule
- CTA style rule
- footer behavior
- text reduction order khi canvas chật
- logo avoidance rule

Áp dụng cho toàn bộ nhóm:
- `poster`
- `infographic`
- `quote_card`
- `feature_list`
- `contact_card`
- `education_infographic`
- `comparison_card`
- `timeline_steps`
- `stat_spotlight`
- `testimonial_card`
- `product_spotlight`
- `editorial_cover`
- `problem_solution`
- `checklist_card`

### 2) Nâng `generate-brand-image` từ prompt expander thành layout instruction composer
Refactor `structuredElementsToPromptText(...)` để không còn chỉ là:
- list text blocks
- vài câu layout instruction rời rạc

Thay bằng prompt builder nhiều lớp:

#### Block A — Channel brief
- channel + ratio + safe-zones
- density budget
- logo safe-zone
- social UI keep-clear

#### Block B — Template instruction
- luật riêng cho template đang chọn
- wide / square / tall adaptation
- card arrangement
- stack vs split bias

#### Block C — Hierarchy instruction
- element nào là primary / secondary / tertiary
- cấm các tổ hợp xung đột như hero + headline quá dài + footer dày ở ratio hẹp

#### Block D — Text fitting protocol
- copy exactly cho tiếng Việt
- ưu tiên giữ `banner / hero / headline / CTA`
- giảm `description -> footer -> card count` theo thứ tự
- không ép giữ full text nếu làm vỡ layout

#### Block E — Brand & footer safety
- logo clear zone
- CTA spacing to footer
- footer mode (`none / compact / contact_bar`)
- bottom-center logo protection

### 3) Đưa metadata từ `overlayTemplates.ts` vào instruction thật sự
Hiện `aiRender` mới chủ yếu là config thụ động. Sẽ nâng thành nguồn cho prompt builder:

- `preferredRatios`
- `narrowAdaptation`
- `maxCards`
- `heroPolicy`
- `ctaPolicy`
- `footerPolicy`

Kết quả:
- template instruction không còn hard-code riêng lẻ trong function
- template contract và prompt behavior đồng bộ

### 4) Nâng auto-select trong `decompose-image-request`
`decompose-image-request` sẽ được nâng từ “chọn layout hợp nội dung” thành “layout strategist” sâu hơn.

Bổ sung:
- rule chọn template theo content intent + channel + ratio
- cùng một nội dung nhưng ra layout variant khác nhau:
  - `comparison_card`
    - `16:9` → split/editorial
    - `1:1` → stacked comparison
    - `9:16` → compact vertical comparison
  - `timeline_steps`
    - tall → giảm card count trước
    - wide → cho step spacing thoáng hơn
  - `testimonial_card`
    - ưu tiên quote + trust signal
    - CTA nhẹ hơn conversion layout
  - `contact_card`
    - footer/contact bar là primary block, không chỉ là phần phụ

Bổ sung output consistency:
- `suggestedLayout`
- `layoutBehavior`
- text budget đã truncate hợp ratio
- fallback hints đúng ngữ cảnh

### 5) Tăng chiều sâu text fitting instruction
Nâng luật fit text cho AI render để chống overflow sớm hơn:

- headline budget theo ratio/template
- hero text budget riêng cho `stat_spotlight`, `quote_card`, `testimonial_card`
- card label/description budget riêng theo template
- footer item budget theo footer mode
- CTA ngắn hơn khi:
  - tall canvas
  - bottom-center logo
  - dense layout
- explicit line-break preference:
  - headline không quá nhiều nhịp
  - card label ưu tiên ngắn, scan nhanh
  - footer không biến thành đoạn văn

### 6) Nâng brand/logo/footer instruction
Thêm rule cụ thể cho AI render để tránh xung đột branding:

#### Logo
- safe zone không chỉ “clear area”
- cấm text, card, CTA, ribbon chạm vào vùng logo
- tăng mức nghiêm ngặt cho `bottom-center`

#### CTA
- `primary_button` chỉ dùng khi ratio đủ rộng hoặc conversion rõ
- tall ratio ưu tiên CTA inline/compact
- CTA không được nằm trong footer band

#### Footer
- mapping rõ giữa `footerStrategy` và instruction:
  - `none`
  - `compact`
  - `contact_bar`
- contact footer chỉ giữ dữ liệu cốt lõi
- footer dài sẽ ưu tiên giảm item / shorten item trước khi ảnh hưởng headline hoặc CTA

### 7) Chuẩn hóa instruction cho mode auto
Với `structuredTemplate = auto`, hệ thống sẽ không chỉ “để AI tự đoán”.

Sẽ thêm:
- auto prompt contract dựa trên `suggestedLayout + renderSpec + layoutBehavior`
- luật buộc AI chọn một visual hierarchy rõ
- explicit fallback when uncertainty high:
  - dense content
  - too many cards
  - long footer
  - bottom-center logo + CTA
  - narrow ratio

## File sẽ cần chỉnh

### Backend
- `supabase/functions/generate-brand-image/index.ts`
  - refactor prompt builder
  - thay `layoutInstructions` mỏng bằng template instruction framework
- `supabase/functions/decompose-image-request/index.ts`
  - nâng logic chọn layout + ratio/channel-aware strategist
- `supabase/functions/image-render-spec.ts`
  - mở rộng spec cho template behavior, text-fit priority, fallback thresholds

### Shared frontend config
- `src/config/overlayTemplates.ts`
  - bổ sung contract cho instruction framework
- `src/config/channelImageConfig.ts`
  - tận dụng renderSpec mạnh hơn cho prompt composition
- `src/lib/hybridImageGenerator.ts`
  - đồng bộ type cho metadata instruction / layout behavior
- `src/hooks/useAutoImageGeneration.ts`
  - nhận và truyền đủ metadata để AI-first flow nhất quán hơn

### Tests
- test strategist cho `suggestedLayout`
- test prompt/instruction snapshot theo template × ratio
- test text budget / footer mode / logo safe-area
- test auto mode mapping đúng template trong input thực tế

## Regression coverage sẽ thêm
Ít nhất cho 4 ratio:
- `1:1`
- `4:5`
- `16:9`
- `9:16`

Và nhóm layout:
- `comparison_card`
- `timeline_steps`
- `checklist_card`
- `product_spotlight`
- `problem_solution`
- `testimonial_card`
- `stat_spotlight`
- `contact_card`
- cộng thêm nhóm cũ để tránh regression chéo

Các assert chính:
- split không bị giữ sai ở canvas hẹp
- text reduction order đúng
- CTA/footer không xâm phạm logo safe-area
- footer mode map đúng theo ratio
- auto-select vẫn chọn template hợp ngữ cảnh
- prompt instruction đủ sâu cho từng template

## Thứ tự triển khai
### Phase 1 — Template instruction framework
- tạo instruction contract thống nhất cho mọi template
- đồng bộ từ `overlayTemplates.ts` sang prompt builder

### Phase 2 — Composer refactor
- thay `structuredElementsToPromptText` bằng builder đa tầng
- thêm channel brief + template brief + hierarchy brief + text-fit protocol

### Phase 3 — Strategist upgrade
- nâng `decompose-image-request` để auto-select theo content + ratio + channel
- gắn chặt với `layoutBehavior`

### Phase 4 — Guardrail + regression
- thêm test snapshot/payload cho instruction
- thêm regression cho safe-area, CTA, footer, overflow risk

## Kết quả mong muốn
Sau khi nâng cấp:

- mỗi template có instruction riêng, không còn generic
- mode `auto` chọn layout ổn định hơn và có lý do rõ hơn
- AI render hiểu tốt hơn khi nào split, khi nào stack, khi nào compact
- text tiếng Việt fit tốt hơn trên ratio hẹp
- logo / CTA / footer giữ brand consistency tốt hơn
- mọi refactor tiếp theo sẽ khó làm vỡ layout vì đã có regression suite bám vào instruction + behavior
