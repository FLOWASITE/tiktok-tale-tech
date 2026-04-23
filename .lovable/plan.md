
Mục tiêu: giữ `ai_render` là mặc định, nhưng biến canvas thành fallback có điều kiện và có kiểm tra rõ ràng khi AI không render đủ logo/text/footer.

1. Chuẩn hóa lại chiến lược render thành “AI-first, deterministic fallback”
- Giữ mặc định:
  - `src/components/multichannel/SimpleImageGenerator.tsx:257` vẫn để `overlayMode = 'ai_render'`
  - `src/hooks/useAutoImagePipeline.ts:173-174` vẫn để `overlayMode: 'ai_render'`
- Thay đổi tư duy pipeline:
  - AI luôn được thử render đầy đủ text/layout trước
  - Logo vẫn đi qua canvas riêng vì hiện đã là deterministic và không phụ thuộc model
  - Text/footer chỉ chuyển sang canvas khi phát hiện nhánh AI render không đáng tin hoặc không có output overlay đủ dữ liệu

2. Sửa nguồn dữ liệu overlay để fallback có đủ nguyên liệu
- File: `src/components/multichannel/SimpleImageGenerator.tsx`
- Hiện trạng:
  - `aiStructuredOverlay` đang bỏ `footer` khỏi `hybridOverlay` tại `541-548`
  - `footerOverlay` tách riêng từ `brandTemplate.footer_info` tại `550-566`
- Cách chỉnh:
  - giữ `aiStructuredOverlay` cho nhánh AI-first, nhưng thêm một `fullStructuredOverlay` riêng chứa toàn bộ `hybridOverlay` gồm cả `footer`
  - `footerOverlay` vẫn giữ làm fallback tối thiểu nếu AI decomposition không sinh footer
  - `batchOptions` truyền đồng thời:
    - overlay dùng cho AI (`aiStructuredOverlay`)
    - overlay đầy đủ cho fallback canvas (`fullStructuredOverlay`)
    - footer-only fallback (`footerOverlay`)
- Kết quả:
  - nhánh AI vẫn gọn, ít bị quá tải prompt
  - khi rớt fallback thì canvas có full banner/headline/cards/cta/footer để vẽ lại

3. Bổ sung chế độ fallback rõ ràng trong hook thay vì nhị phân `ai_render` / `satori`
- File: `src/hooks/useAutoImageGeneration.ts`
- Hiện trạng:
  - `overlayMode?: 'satori' | 'ai_render'`
  - logic đang hiểu `ai_render` là skip Step 3 và chỉ giữ `footerOverlay` ở Step 4
- Cách chỉnh:
  - mở rộng semantic của hook thành:
    - `overlayMode = 'ai_render'` nghĩa là AI-first + fallback allowed
    - `overlayMode = 'satori'` nghĩa là canvas-first cưỡng bức
  - thêm option nội bộ kiểu:
    - `fullStructuredOverlay`
    - `fallbackStrategy?: 'none' | 'text_only' | 'structured' | 'full'`
    - mặc định cho `ai_render` là `full`
- Kết quả:
  - không đổi default UX
  - nhưng code phân biệt được “AI-first có fallback” với “Satori-only”

4. Giữ Step 1 là AI render đầy đủ, không ép background_only ở default mode
- File: `src/hooks/useAutoImageGeneration.ts:183-188, 210-232`
- Cách giữ:
  - với `ai_render`, vẫn để `effectiveContentType = imageContentType || 'with_text'`
  - vẫn gửi:
    - `structuredElements`
    - `structuredColors`
    - `structuredTemplate`
    - `textToInclude`
  - vẫn gửi `logoSafeZone` để AI né vùng logo
- Mục tiêu:
  - AI tiếp tục là nguồn render chính cho ảnh “đẹp tự nhiên”
  - không phá nhánh hiện tại mà user muốn giữ

5. Thêm cơ chế quyết định fallback sau Step 1 thay vì skip cứng
- File: `src/hooks/useAutoImageGeneration.ts`
- Hiện trạng:
  - Step 3 bị skip hoàn toàn nếu `isAiRenderMode`
  - Step 4 trong `ai_render` chỉ dùng `footerOverlay`
- Cách chỉnh:
  - sau Step 1, tính `shouldFallbackToCanvas`
  - các tín hiệu fallback:
    - có `structuredOverlay/fullStructuredOverlay` và đang ở `ai_render`
    - có `channelText` hoặc footer data bắt buộc
    - model/provider trả lỗi mềm, timeout, hoặc metadata thiếu
    - có cờ từ backend như `recommendedOverlayMode !== 'ai_render'` hoặc `fallbackRecommended === true` nếu backend có trả về
  - nếu `shouldFallbackToCanvas = true`:
    - Step 3 chạy cho text đơn nếu không có structured overlay
    - Step 4 chạy với `fullStructuredOverlay` thay vì chỉ `footerOverlay`
- Kết quả:
  - mặc định vẫn AI render
  - chỉ khi “thiếu” mới chuyển canvas đúng như yêu cầu

6. Nâng Step 4 từ footer-only thành structured fallback thực sự
- File: `src/hooks/useAutoImageGeneration.ts:359-360`
- Hiện trạng:
  - `const finalStructuredOverlay = isAiRenderMode ? footerOverlay : structuredOverlay;`
- Cách chỉnh:
  - đổi thành logic phân cấp:
```text
nếu satori mode:
  dùng fullStructuredOverlay || structuredOverlay || footerOverlay
nếu ai_render mode:
  nếu shouldFallbackToCanvas:
    dùng fullStructuredOverlay || structuredOverlay || footerOverlay
  nếu không:
    chỉ bỏ qua, hoặc cùng lắm footerOverlay nếu muốn footer deterministic
```
- Khuyến nghị:
  - với logo đã deterministic ở Step 2, Step 4 nên là fallback cho text/footer/cards/cta
  - không nên luôn phủ canvas lên output AI nếu chưa cần, để giữ chất “native AI render”

7. Giữ logo deterministic 100% nhưng không đổi triết lý AI-first cho text
- File: `src/hooks/useAutoImageGeneration.ts:269-309`
- Quyết định:
  - logo tiếp tục overlay bằng `overlay-logo-canvas` ngay sau Step 1
  - đây không mâu thuẫn với AI-first vì logo hiện không nên phụ thuộc model
- Kết quả:
  - AI render lo phần visual + typography chính
  - logo luôn chắc chắn xuất hiện nếu có `logoUrl`

8. Mở rộng response từ backend để frontend biết khi nào nên fallback
- File: `supabase/functions/generate-brand-image/index.ts`
- Hiện trạng:
  - backend build được `aiRenderPlan`, `renderSpec`, `structuredTemplate`, `logoSafeZone`
  - nhưng frontend chưa có tín hiệu rõ “ảnh này nên fallback canvas”
- Cách chỉnh:
  - trả thêm metadata JSON trong response, ví dụ:
    - `recommendedOverlayMode: 'ai_render' | 'hybrid_footer' | 'satori'`
    - `aiRenderPlanSummary`
    - `usedStructuredElements: boolean`
    - `hasTextInstruction: boolean`
    - `hasFooterInstruction: boolean`
  - không thay provider generation chính
- Mục tiêu:
  - frontend không phải đoán hoàn toàn
  - fallback được quyết định có cơ sở hơn

9. Đồng bộ auto pipeline để không còn khác behavior với dialog manual
- File: `src/hooks/useAutoImagePipeline.ts`
- Hiện trạng:
  - auto pipeline hardcode `overlayMode: 'ai_render'`, nhưng chưa có overlay payload fallback đầy đủ
- Cách chỉnh:
  - tiếp tục giữ `overlayMode: 'ai_render'`
  - bổ sung truyền đủ metadata/options mà `useAutoImageGeneration` cần để fallback được
  - đảm bảo auto-save flow của bài viết mới nhất cũng đi đúng nhánh AI-first + fallback
- Kết quả:
  - ảnh tạo tự động và ảnh tạo tay cùng chuẩn hành vi

10. Logging/telemetry cần thêm để debug đúng “thiếu mới fallback”
- File: `src/hooks/useAutoImageGeneration.ts`
- Thêm log rõ:
  - `STEP 1 OK — ai_render primary`
  - `FALLBACK CHECK — reason: ...`
  - `STEP 3 EXECUTED — text fallback`
  - `STEP 4 EXECUTED — structured fallback`
  - hoặc `NO FALLBACK — AI render accepted`
- Mục tiêu:
  - khi user hỏi “ảnh này đi nhánh nào” sẽ trả lời chính xác theo log
  - tránh tranh cãi giữa “AI render” và “canvas render”

11. Tiêu chí nghiệm thu
- Với ảnh bài viết mới:
  - mặc định vẫn thử `ai_render`
  - logo luôn có nếu brand có logo
  - nếu AI đã render đủ đẹp: không bị canvas phủ đè text/layout không cần thiết
  - nếu AI thiếu text/footer/CTA/headline: canvas fallback tự chạy
- Log mong đợi:
```text
STEP 1 — AI render primary
STEP 2 — Logo overlay
FALLBACK CHECK — accepted / fallback_required
STEP 3/4 — only runs when fallback_required
```

12. File sẽ sửa
- `src/components/multichannel/SimpleImageGenerator.tsx`
- `src/hooks/useAutoImageGeneration.ts`
- `src/hooks/useAutoImagePipeline.ts`
- `supabase/functions/generate-brand-image/index.ts`

Chi tiết kỹ thuật
- Không đổi schema database
- Không sửa file auto-generated
- Không đổi prompt builder shared facade trừ khi thật sự cần metadata phụ
- Không chuyển mặc định toàn hệ thống sang Satori
- Kiến trúc cuối cùng:
```text
Default:
AI render ảnh chính -> logo canvas -> kiểm tra fallback -> nếu thiếu thì text/footer/structured canvas

Forced mode (nếu cần sau này):
background_only -> logo canvas -> structured canvas
```
