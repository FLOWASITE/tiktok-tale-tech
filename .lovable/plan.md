
# Khôi phục đúng pipeline ảnh thủ công theo ý bạn

## Pipeline mục tiêu đã chốt
Flow manual multi-channel cần chạy đúng thứ tự này:

```text
1) generate-brand-image
   - AI quyết định layout phù hợp: infographic / poster / contact-card / ...
   - AI render phần text chính ngay trong prompt / ảnh
2) overlay-logo-canvas
   - thêm logo sau khi ảnh base đã xong
   - hoặc cho AI chừa safe-zone / tự chọn vị trí logo phù hợp
3) overlay-text-canvas
   - chỉ dùng cho footer
   - không dùng để render toàn bộ text chính nữa
```

## Vấn đề hiện tại trong code
Code hiện đang bị lệch so với flow bạn muốn ở 3 điểm:

1. `MultiChannelViewer.tsx` đang mở `SimpleImageGenerator`
   - component này tự bật hybrid theo logic riêng
   - dễ làm behavior manual flow bị đổi ngoài ý muốn

2. `src/hooks/useAutoImageGeneration.ts`
   - mặc định đang ép `overlayMode = 'ai_render'`
   - nhưng khi không có `structuredOverlay` thì footer bằng `overlay-text-canvas` không còn là bước tách riêng rõ ràng
   - Step 3/4 hiện đang lẫn giữa text chính và structured overlay

3. `SimpleImageGenerator.tsx`
   - đang auto bật `useHybridMode` khi `promptMode === 'full'` hoặc content bị coi là complex
   - tức là AI layout bị kích hoạt theo heuristic, không phải đúng contract rõ ràng của manual flow

## Mục tiêu implement
Chuẩn hóa manual multi-channel image generation thành một contract cố định:

- text chính: AI render trong `generate-brand-image`
- layout chính: AI tự chọn từ decomposition/template
- logo: đi qua `overlay-logo-canvas` sau cùng của base image
- footer: luôn đi qua `overlay-text-canvas` dạng structured footer-only
- không dùng canvas để vẽ lại headline/body chính nữa

## Cách sửa

### 1) Khóa manual viewer vào một “AI layout + logo canvas + footer canvas” flow rõ ràng
Trong `src/components/MultiChannelViewer.tsx` và generator component đang được gọi:

- giữ generator hiện tại nếu muốn sửa ít nhất, hoặc đổi lại generator wrapper nếu cần
- nhưng behavior phải được khóa như sau cho manual flow:
  - `promptMode = 'full'`
  - `imageContentType = 'with_text'`
  - `overlayMode = 'ai_render'`
  - luôn cho phép AI chọn layout phù hợp
  - footer không bị bake chung với phần text chính

Mục tiêu:
- user bấm tạo ảnh thủ công là vào đúng flow bạn vừa mô tả
- không còn ambiguity giữa classic / simple / unified

### 2) Tách “structured content cho AI” và “footer cho canvas”
Trong `src/components/multichannel/SimpleImageGenerator.tsx`:

- vẫn dùng decomposition + `applyTemplate(...)` để AI quyết định layout
- nhưng khi build payload:
  - phần headline / heroText / banner / cards / CTA được gửi vào `generate-brand-image`
  - phần `footer` tách ra khỏi payload AI render
- tạo 2 payload:
  - `aiStructuredOverlay` = layout chính cho AI bake
  - `footerOverlay` = footer-only cho `overlay-text-canvas`

Kết quả:
- AI vẫn tự quyết định poster/infographic/contact-card
- footer luôn ổn định bằng overlay canvas, không bị AI render sai

### 3) Sửa `useAutoImageGeneration.ts` để pipeline chạy đúng 4 bước cố định
Refactor `generateWithRetry()` thành flow này:

```text
STEP 1: generate-brand-image
  - overlayMode = ai_render
  - structuredElements = banner / heroText / cards / headline / cta
  - KHÔNG gửi footer vào đây
  - có logoSafeZone nếu cần

STEP 2: overlay-logo-canvas
  - thêm logo sau khi có base image
  - nếu logoPosition = auto thì resolve theo channel
  - vẫn cho AI safe-zone để tránh đè text

STEP 3: bỏ simple text overlay mặc định
  - không dùng overlay-text-canvas cho text chính nữa

STEP 4: overlay-text-canvas cho footer-only
  - structured request chỉ chứa footer
  - layout đơn giản/stack hoặc footer-only block
```

Cần sửa rõ các nhánh:
- bỏ nhánh default dùng canvas cho full text chính trong manual flow
- giữ `overlay-text-canvas` chỉ cho footer structured overlay
- nếu không có footer thì Step 4 skip

### 4) Chuẩn hóa logic “AI quyết định layout”
Trong `SimpleImageGenerator.tsx`:

- giữ `decomposeRequestWithAI(...)`
- giữ `applyTemplate(...)`
- giữ `overlayTemplate = 'auto'` làm mặc định
- nhưng phải đổi semantics:
  - `auto` nghĩa là AI chọn layout phù hợp
  - không phải UI heuristic tự ép mode một cách mơ hồ

Nếu user không chọn template cụ thể:
- AI được chọn giữa `poster`, `infographic`, `quote_card`, `feature_list`, `contact_card`, `education_infographic`
- output của `applyTemplate` là nguồn layout chính cho `generate-brand-image`

### 5) Footer luôn lấy từ brand/footer info và render bằng canvas
Trong `SimpleImageGenerator.tsx` + `useAutoImageGeneration.ts`:

- khi brand có `footer_info`, build `footerOverlay`
- nếu AI decomposition không có footer thì inject footer từ brand
- nhưng footer chỉ đưa cho `overlay-text-canvas`, không gửi cho AI render

Mục tiêu:
- footer ổn định, đúng phone / website / email / address
- không bị sai dấu, méo layout, hay mất hẳn như khi bake bằng model ảnh

### 6) Logo: hỗ trợ 2 cách như bạn muốn
Giữ cả hai cơ chế:

- `overlay-logo-canvas` là bước chèn logo thật sau khi ảnh base hoàn tất
- `logoSafeZone` gửi vào `generate-brand-image` để AI chừa vùng sạch

Logic:
- nếu brand chọn `logo_position = auto`:
  - frontend/hook resolve vị trí tối ưu theo channel
  - vẫn truyền safe-zone tương ứng cho AI
- sau đó `overlay-logo-canvas` đặt logo đúng vị trí đó

Kết quả:
- AI không đè text vào vùng logo
- logo thật vẫn sắc nét, ổn định, không phụ thuộc model ảnh

### 7) Không để “simple text overlay” phá flow manual nữa
Trong `useAutoImageGeneration.ts`:

- nhánh Step 3 hiện tại:
  - `if (!isAiRenderMode && useCanvasFallback && imageContentType === 'with_text' && channelText && !structuredOverlay)`
- sẽ không còn là đường mặc định cho manual multichannel
- chỉ giữ nó như fallback phụ / legacy path, không phải default path của viewer manual

Mục tiêu:
- text chính không còn bị canvas render lại ngoài ý muốn
- manual flow bám đúng AI-render text chính + canvas-footer

## Files cần sửa
- `src/components/MultiChannelViewer.tsx`
- `src/components/multichannel/SimpleImageGenerator.tsx`
- `src/hooks/useAutoImageGeneration.ts`

## Có thể cần sửa thêm
- `src/hooks/useAutoImagePipeline.ts`
  - nếu auto image sau khi generate multichannel cũng cần đồng bộ cùng contract này
- `supabase/functions/_shared/branded-image-composer.ts`
  - để Telegram / server-side parity khớp với manual flow mới
  - đặc biệt tách footer ra khỏi phần AI bake nếu muốn parity tuyệt đối

## Không cần sửa
- database schema
- `generate-multichannel`
- title generation
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

## QA bắt buộc sau khi implement

### Case 1 — Manual default
Tạo ảnh thủ công cho Facebook / Instagram / LinkedIn.

Kỳ vọng:
- AI tự chọn layout phù hợp
- text chính nằm trong ảnh do AI render
- logo được chèn sau bằng `overlay-logo-canvas`
- footer xuất hiện bằng `overlay-text-canvas`

### Case 2 — Contact-heavy content
Nội dung có phone / website / email / address.

Kỳ vọng:
- AI lo poster/contact-card phần chính
- footer dưới cùng vẫn là canvas overlay rõ nét, đúng dữ liệu brand

### Case 3 — Infographic-like content
Nội dung dạng giáo dục/listicle.

Kỳ vọng:
- AI có thể chọn infographic / feature_list / education layout
- footer vẫn không bị bake sai

### Case 4 — Logo auto
Brand để `logo_position = auto`.

Kỳ vọng:
- AI chừa vùng logo qua safe-zone
- logo thật được overlay đúng vị trí tối ưu theo channel

### Case 5 — Regression
Mở lại content cũ đã từng tạo ảnh thủ công.

Kỳ vọng:
- ra behavior đúng contract mới đã chốt
- không còn cảnh text/logo/footer bị chạy lẫn mode

## Kết quả mong muốn
Sau khi sửa, ảnh đa kênh thủ công sẽ đúng ý bạn:

- `generate-brand-image` lo background + text chính + layout
- `overlay-logo-canvas` lo logo thật
- `overlay-text-canvas` chỉ lo footer
- AI được quyền chọn infographic/poster/contact-card/layout phù hợp
- footer vẫn ổn định, chính xác, không bị AI phá
