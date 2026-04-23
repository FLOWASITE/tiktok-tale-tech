
Mục tiêu: sửa đúng chỗ để ảnh vừa tạo luôn có đủ dữ liệu fallback cần thiết, đồng thời làm Render Debug Timeline phản ánh chính xác vì sao ảnh vẫn ra “trần” không có footer/logo/text.

1. Kết luận nguyên nhân hiện tại
- Có 2 nguyên nhân gốc đang chồng lên nhau:

- Nguyên nhân A: auto pipeline không truyền đủ dữ liệu overlay
  - File: `src/hooks/useAutoImagePipeline.ts`
  - Hiện chỉ truyền:
    - `imageContentType`
    - `overlayMode: 'ai_render'`
    - `fallbackStrategy: 'full'`
  - Nhưng lại không truyền:
    - `textToInclude` / `textsPerChannel`
    - `useCanvasFallback`
    - `structuredOverlay`
    - `fullStructuredOverlay`
    - `footerOverlay`
    - `structuredTemplate`
  - Kết quả:
    - nhánh auto-create ở `MultiChannelCreate` thực tế không có nguyên liệu để Step 3/4 fallback chạy
    - nên dù `fallbackStrategy='full'`, ảnh vẫn có thể ra chỉ là output AI thuần

- Nguyên nhân B: manual hybrid decomposition đang không sinh footer/headline đủ mạnh
  - Console hiện báo:
    - `hasOverlayBanner: false`
    - `hasHeroText: false`
    - `hasFooter: false`
  - Nghĩa là `decompose-image-request` vừa trả về overlay rất nghèo
  - Trong `SimpleImageGenerator.tsx`, `fullStructuredOverlay` phụ thuộc `hybridOverlay`
  - Nếu `hybridOverlay` không có footer thì Step 4 không có gì đáng kể để vẽ, trừ khi `footerOverlay` được fallback đúng lúc

2. Điểm nghẽn logic khiến fallback không chạy dù user kỳ vọng có footer
- File: `src/hooks/useAutoImageGeneration.ts`
- Đoạn hiện tại:
```ts
const backendRequestedFallback =
  imageData.fallbackRecommended === true ||
  (isAiRenderMode && imageData.recommendedOverlayMode && imageData.recommendedOverlayMode !== 'ai_render');

const shouldFallbackStructured =
  fallbackStrategy !== 'none' &&
  !!(fullStructuredOverlay || structuredOverlay || footerOverlay) &&
  (backendRequestedFallback || !isAiRenderMode);
```
- Vấn đề:
  - nếu backend trả `recommendedOverlayMode='ai_render'`
  - thì frontend coi như “AI render accepted”
  - dù AI thực tế không vẽ footer/text như mong muốn
- Với response hiện tại của `generate-brand-image`, backend chỉ nhìn “có structuredElements hay không”, không xác minh output thực sự có footer/text.

3. Việc cần sửa ở auto pipeline để ảnh vừa tạo có thể fallback thật
- File: `src/hooks/useAutoImagePipeline.ts`
- Bổ sung xây dựng payload fallback từ dữ liệu sẵn có:
  - map `channelTexts` thành `textsPerChannel`
  - nếu `imageContentType === 'with_text'`, truyền:
    - `textsPerChannel`
    - `useCanvasFallback: true`
  - tạo `footerOverlay` tối thiểu từ brand hiện tại nếu có footer info
  - nếu chưa có `structuredOverlay` giàu dữ liệu, ít nhất phải truyền `footerOverlay`
- Mục tiêu:
  - auto pipeline không còn là nhánh “ai_render nhưng tay trắng”
  - khi AI không vẽ text/footer, Step 3/4 có dữ liệu để cứu

4. Việc cần sửa ở manual generator để footer luôn có fallback cứng
- File: `src/components/multichannel/SimpleImageGenerator.tsx`
- Giữ:
  - `aiStructuredOverlay` cho prompt AI-first
  - `fullStructuredOverlay` cho canvas fallback
- Sửa thêm:
  - nếu `hybridOverlay.elements.footer` trống nhưng brand có `footer_info`, merge `footerOverlay` vào `fullStructuredOverlay`
  - không để `fullStructuredOverlay` bị “thiếu footer” chỉ vì decompose không sinh ra
- Kết quả:
  - AI vẫn được thử render native
  - nhưng canvas luôn có footer data tối thiểu để render khi cần

5. Nới điều kiện fallback ở frontend để không phụ thuộc hoàn toàn vào backend hint
- File: `src/hooks/useAutoImageGeneration.ts`
- Hiện tại fallback structured chỉ bật khi:
  - backend yêu cầu fallback
  - hoặc đang ở `satori`
- Cần đổi thành heuristic mạnh hơn trong `ai_render`:
  - nếu có `footerOverlay` hoặc `fullStructuredOverlay`
  - và `imageContentType === 'with_text'` hoặc có footer brand bắt buộc
  - thì Step 4 được phép chạy ngay cả khi backend vẫn nói `ai_render`
- Đề xuất phân lớp:
```text
shouldFallbackStructured =
  hasAnyStructuredFallback &&
  (
    !isAiRenderMode
    || backendRequestedFallback
    || hasRequiredFooter
    || hasRequiredStructuredBranding
  )
```
- `hasRequiredFooter`:
  - `footerOverlay?.elements.footer.items.length > 0`
- `hasRequiredStructuredBranding`:
  - có headline / banner / heroText / CTA bắt buộc từ input frontend
- Mục tiêu:
  - frontend tự bảo vệ được case “AI accepted nhưng render thiếu”

6. Sửa logic “accepted” để debug timeline nói đúng sự thật
- File: `src/hooks/useAutoImageGeneration.ts`
- Hiện log đang có thể ra:
  - `NO FALLBACK — AI render accepted`
- nhưng user vẫn thấy ảnh không có footer/logo/text
- Cần thay thành reason phân biệt:
  - `AI accepted by backend hint`
  - `Frontend forced structured fallback due to required footer`
  - `Frontend forced text fallback due to required channel text`
- Đồng thời lưu thêm flags trong `renderDebug`:
  - `requiredLogo: boolean`
  - `requiredFooter: boolean`
  - `requiredText: boolean`
  - `hasStructuredInput: boolean`
- Kết quả:
  - timeline không còn gây hiểu lầm “accepted” khi ảnh thực tế thiếu thành phần bắt buộc

7. Sửa hiển thị debug để thấy ngay tại sao thiếu logo/footer
- File: `src/components/ui/RenderDebugTimeline.tsx`
- Bổ sung section “Required branding”:
  - Logo required: yes/no
  - Footer required: yes/no
  - Text required: yes/no
- Bổ sung section “Input overlay payload”:
  - `structuredOverlay`: yes/no
  - `fullStructuredOverlay`: yes/no
  - `footerOverlay`: yes/no
- Bổ sung hiển thị riêng Step 2 outcome nổi bật:
  - `logo overlay success / failed / skipped`
- Mục tiêu:
  - chỉ cần mở debug là biết:
    - không có footer vì payload không được truyền
    - hay có truyền nhưng Step 4 bị skip
    - hay logo overlay bị fail

8. Đồng bộ auto flow với manual flow
- File: `src/pages/MultiChannelCreate.tsx`
- `onStartImagePipeline` hiện chỉ gọi `startPipeline(...)`
- Cần mở rộng `contentMeta` hoặc hook signature để auto flow nhận đủ input render:
  - text per channel
  - brand footer info nếu cần
  - structured template/layout nếu có
- Nếu không muốn tăng coupling quá mạnh:
  - tạo shared helper build overlay payload dùng chung cho:
    - `SimpleImageGenerator`
    - `useAutoImagePipeline`
- Kết quả:
  - ảnh tạo tự động và ảnh tạo tay không còn lệch behavior nghiêm trọng

9. Điểm cần giữ nguyên
- Vẫn giữ `ai_render` là mặc định
- Vẫn giữ Step 2 logo overlay bằng canvas
- Không đổi database schema
- Không sửa file auto-generated
- Không chuyển toàn bộ hệ thống sang Satori-only

10. File cần sửa
- `src/hooks/useAutoImagePipeline.ts`
- `src/hooks/useAutoImageGeneration.ts`
- `src/components/multichannel/SimpleImageGenerator.tsx`
- `src/components/ui/RenderDebugTimeline.tsx`
- Có thể thêm shared helper mới nếu muốn tái sử dụng build overlay payload giữa auto/manual flow

11. Tiêu chí nghiệm thu
- Với ảnh vừa tạo từ auto pipeline:
  - nếu brand có logo -> Step 2 chạy và debug hiển thị rõ success/failed
  - nếu brand có footer info -> Step 4 không còn bị skip vì thiếu payload
  - nếu AI không vẽ text/footer -> canvas fallback tự chạy
- Debug timeline phải trả lời được 3 câu:
  - có truyền footer/logo/text requirement vào pipeline không?
  - backend có khuyên fallback không?
  - frontend có tự ép fallback vì branding bắt buộc không?
- Trường hợp user đang thấy hiện tại phải chuyển thành dạng debug như:
```text
STEP 1 — AI render primary
STEP 2 — Logo overlay: success / failed / skipped
FALLBACK CHECK — backend accepted, frontend forced fallback due to required footer
STEP 4 — Structured fallback: success
```
