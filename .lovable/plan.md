## Trả lời nhanh: Không nhầm function

Multichannel dùng đúng `generate-brand-image` (có hỗ trợ `channel` param cho FB/IG/LI/...). Không có function riêng tên `generate-multichannel-image`. `agent-creator-v2`, `useSocialImageGeneration`, `useAutoImageGeneration`, `tool-executor` — tất cả đều gọi đúng function này.

## Vấn đề thực sự

Edge function logs `generate-brand-image` **hoàn toàn trống** trong vài giờ qua. Request từ frontend không tới được function. Hai điểm chặn ở frontend:

### A. Nút "Tạo ảnh AI" bị disable âm thầm khi `isDecomposing=true`

`AIReadyCard.tsx` (full mode) và nút trong `SimpleImageGenerator.tsx` (brand_only/raw mode) đều có:
```
disabled={isGenerating || selectedChannels.length === 0 || isDecomposing}
```

`isDecomposing` chỉ false sau khi `decomposeRequestWithAI` (~10s) xong. Nếu user click khi state này còn true (do `useEffect` re-run khi đổi channel/style/template), nút không trigger handler. `handleGenerate` thậm chí có guard `if (isDecomposing) return` → click bị nuốt.

### B. Auto-trigger Step 5 đánh dấu contentId "đã chạy" trước khi thật sự chạy

`MultiChannelFormWizard.tsx` (line 956): `AUTO_IMAGE_TRIGGERED_CONTENT_IDS.add(generatedContentIdProp)` được gọi **trước** khi đợi DB pre-check. Nếu DB pre-check vô tình thấy `channel_images` đã có URL (kể cả URL cũ/lỗi), effect return mà không gọi pipeline → contentId bị khoá vĩnh viễn cho session đó.

## Kế hoạch sửa

### 1. Bỏ chặn "Tạo ảnh" khi đang decompose
- `AIReadyCard.tsx`: bỏ `isDecomposing` khỏi `disabled`. Khi đang decompose, vẫn cho click — handler sẽ dùng `contentSummaries` gốc thay vì `hybridBackgroundPrompt`.
- `SimpleImageGenerator.tsx` line 1054: tương tự, bỏ `isDecomposing` khỏi `disabled`.
- `handleGenerate` (line 648): bỏ guard `if (isDecomposing) return`. Nếu chưa có `hybridBackgroundPrompt`, dùng `contentSummaries` (đã có sẵn từ `useMemo` line 405).
- Đổi label nút khi đang decompose: "Tạo ngay (AI gợi ý layout đang chạy nền)".

### 2. Sửa auto-trigger Step 5 không khoá contentId khi skip
- Chuyển `AUTO_IMAGE_TRIGGERED_CONTENT_IDS.add(...)` xuống **ngay trước** dòng `onStartImagePipeline(...)` (sau khi DB pre-check pass).
- Nếu pre-check thấy đủ ảnh → return mà không add (cho phép user trigger lại từ nút thủ công nếu cần).
- Bổ sung dependency thiếu cho effect: `formData.channels`, `formData.selectedHooks`, `formData.globalHook`, `promptMode`, `brandTemplate?.country_code`, `getChannelText`, `onStartImagePipeline`.

### 3. Thêm log + nút thủ công ở Step 5
- Log rõ `[AutoImageTrigger] starting pipeline` ngay trước khi gọi.
- Hiện sẵn nút "Tạo ảnh AI cho X kênh" trong Step 5 ngay cả khi `imagePhase='generating_images'` đã chạy 1 lần nhưng không có kết quả → nút này force re-trigger (xoá `AUTO_IMAGE_TRIGGERED_CONTENT_IDS` cho contentId đó).

### 4. Xác minh sau khi sửa
Sau deploy:
1. Mở dialog "Tạo ảnh AI" trên 1 bài multichannel hiện có.
2. Chọn ≥1 kênh, click "Tạo ảnh AI".
3. Xem console: phải có `[SimpleImageGenerator] handleGenerate triggered` → `[Pipeline:facebook] 🚀 START` → `[Pipeline:facebook] ✓ Task created` → network POST `generate-brand-image`.
4. Xem edge function logs `generate-brand-image`: phải có `build marker` → `Routing to PoYo.ai` hoặc `Routing to GeminiGen.ai` → `Image uploaded`.
5. Lúc đó provider mới thật sự bị trừ tiền.

## File sẽ chỉnh

- `src/components/multichannel/AIReadyCard.tsx` — bỏ `isDecomposing` khỏi disabled
- `src/components/multichannel/SimpleImageGenerator.tsx` — bỏ guard `isDecomposing`, fallback prompt khi decompose chưa xong
- `src/components/multichannel/MultiChannelFormWizard.tsx` — sửa thứ tự add `AUTO_IMAGE_TRIGGERED_CONTENT_IDS`, thêm dependency, thêm nút retry

## Không sửa

- `generate-brand-image` edge function (nó OK, không có log nghĩa là không bị gọi)
- Provider config Geminigen / PoYo (chưa được gọi nên chưa biết có lỗi không — sẽ verify sau khi request thật sự đi tới function)
- `decompose-image-request` (chạy bình thường)