# Cải thiện độ đồng nhất ảnh nhân vật

## Vấn đề hiện tại
Khi bấm "Tạo N góc còn lại bằng AI", các ảnh sinh ra **không giống** nhau và không giống ảnh đại diện chính:
- Backend mặc định dùng `google/gemini-2.5-flash-image` (Nano Banana 1) — model **text-to-image**, giữ identity yếu khi nhận ảnh ref.
- UI chỉ tự động dùng `refMainUrl` làm ref, không cho người dùng:
  - Attach ảnh avatar khác làm ref cho riêng từng góc
  - Chọn model edit chuyên dụng cho character consistency

## Giải pháp

### A. Backend: Auto upgrade model edit khi có ref
File: `supabase/functions/generate-character-image/index.ts`

Khi `hasRef === true`, thay vì dùng `aiConfig.model` (text-to-image), tự động ưu tiên 1 trong các model edit có character lock mạnh:
1. `poyo/seedream-5.0-lite-edit` (multi-ref tới 10 ảnh, character consistency mạnh nhất)
2. `poyo/nano-banana-pro` (Gemini 3 Pro, identity tốt hơn 2.5)
3. `poyo/flux-kontext-max` (Flux Kontext Max — instruction-following edit)
4. Fallback: `google/gemini-3-pro-image-preview` (Nano Banana Pro qua Lovable Gateway)

Logic: nếu admin đã set override model → tôn trọng admin choice; nếu admin để default → upgrade theo priority trên (chọn model đầu tiên có API key configured).

Thêm param `preferred_edit_model` để client override.

### B. Frontend: Tab "Ảnh tham chiếu" — thêm chức năng attach + per-shot
File: `src/components/characters/CharacterDetailSheet.tsx` + `useCharacterImageActions.ts`

Trên mỗi label chưa có (front/side/full-body/close-up/outfit), hiển thị một **mini-card** với 3 actions:
- 📎 **Attach ảnh** — upload file riêng cho góc này (lưu tạm vào storage, dùng làm ref thay cho `refMainUrl`)
- ✨ **Tạo bằng AI** — tạo dùng ref đã chọn (mặc định `refMainUrl`, hoặc ảnh attach nếu có)
- ❌ **Xoá** ảnh đã attach

Đồng thời:
- Thêm dropdown "Model AI" gọn (chỉ hiện trong card group): chọn 1 trong 4 model edit khuyến nghị, mặc định = `auto` (để backend tự pick).
- Nút "Tạo N góc còn lại" giữ nguyên nhưng thêm nhãn nhỏ: "(dùng ảnh chính làm ref + model edit)"

### C. Hook: mở rộng signature
File: `src/hooks/useCharacterImageActions.ts`

`generateImage(label, referenceImageUrl?, options?)` — thêm `options.editModel?: string` truyền xuống edge function.

## Files thay đổi
1. `supabase/functions/generate-character-image/index.ts` — thêm logic upgrade-edit-model + nhận `preferred_edit_model`
2. `src/hooks/useCharacterImageActions.ts` — thêm tham số `editModel`
3. `src/components/characters/CharacterDetailSheet.tsx` — UI mini-card per-label với attach + AI button + model selector
4. `src/lib/characterSchema.ts` — không thay đổi (label list giữ nguyên)

## Ngoài phạm vi (không làm)
- Không tạo bảng DB mới (ảnh attach tạm thời chỉ giữ trong state, không persist riêng — sau khi generate sẽ flush vào `reference_images` chuẩn).
- Không động đến `CharacterFormSheet` (form tạo mới).
- Không thay đổi auto-pick logic của video generation (`generate-video`, character consistency memory).

## Rủi ro
- **API key**: nếu workspace chưa có `POYO_API_KEY` thì auto upgrade fallback sang Lovable Gateway (`google/gemini-3-pro-image-preview`) — vẫn cải thiện so với 2.5-flash-image.
- **Cost**: Nano Banana Pro / Seedream Edit đắt hơn flash. Sẽ log model thực dùng để admin theo dõi qua `ai_metrics`.
