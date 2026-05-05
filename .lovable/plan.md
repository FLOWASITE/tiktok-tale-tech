## Mục tiêu
Hoàn thiện khu "Quản lý nhân vật" trong Video Studio để user có thể tạo nhân vật end-to-end mà không cần vào QuickClip/Storyboard.

## Hiện trạng (đã có)
- Table `character_profiles` + bucket `character-references` + RLS
- `CharacterProfileManager`: CRUD thủ công, upload ảnh, AI auto-fill từ ảnh upload, multi-ref images, voice ID/provider
- `MultiCharacterPicker` (trong QuickClip/Storyboard) đã có AI generate nhân vật từ Brand qua `generate-character`
- Edge functions `generate-character`, `analyze-character-image` chạy ổn

## Gaps cần lấp

### 1. AI generate nhân vật + ảnh ref ngay trong Manager
- Thêm nút **"Tạo bằng AI"** ở header Manager → mở dialog tương tự `MultiCharacterPicker`:
  - Input: role hint, số lượng (1-3), video type
  - Gọi `generate-character` (edge function đã có) với `brand_template_id = currentBrand.id`
  - Hiển thị danh sách nhân vật đã sinh + checkbox chọn lưu
  - Lưu vào `character_profiles` (KHÔNG auto-add vào pickup, vì Manager không có concept "đang chọn")

- Trong form sửa/tạo nhân vật, thêm nút **"Tạo ảnh tham chiếu bằng AI"**:
  - Yêu cầu: name + appearance (gender/age/hair/skin/wardrobe) phải có
  - Tạo edge function mới `generate-character-image`:
    - Build prompt từ `buildCharacterBlock()` + style hint ("photorealistic portrait, neutral background, studio lighting, front view")
    - Cho phép param `view: 'front' | 'side' | 'full-body' | 'close-up'` để sinh từng góc
    - Gọi Lovable AI Gateway với `google/gemini-3-pro-image-preview` (image gen modal)
    - Upload base64 lên bucket `character-references` → trả `{url, label}`
  - Frontend: nút "Tạo ảnh AI" mở mini-popover chọn góc → gọi function → push vào `reference_images` (hoặc set `reference_image_url` nếu là ảnh đầu tiên)
  - Reuse error handling 402/429

### 2. Auto-bind brand + Clone + UX nhỏ
- **Auto-bind**: khi tạo nhân vật mới trong Manager, tự set `brand_template_id = currentBrand?.id` (đã làm ở MultiCharacterPicker, copy sang Manager)
- **Clone**: thêm nút Copy bên cạnh Edit/Delete → copy toàn bộ profile, đổi tên thành `<name> (bản sao)`, mở dialog edit ngay
- **Hiển thị brand owner**: nếu profile gắn brand khác brand hiện tại, show badge nhỏ "Brand: X" (fetch tên qua join hoặc dùng `useBrandTemplates`)
- **Filter theo brand**: thêm toggle "Chỉ brand hiện tại" (mặc định ON) — chỉ list profiles có `brand_template_id = currentBrand.id` hoặc null

## Files thay đổi

### Mới
- `supabase/functions/generate-character-image/index.ts` — sinh ảnh ref từ profile data, upload bucket, trả URL. Auth qua JWT, dùng service client.
- `supabase/config.toml` — KHÔNG cần (mặc định `verify_jwt = true` phù hợp).

### Sửa
- `src/components/video/CharacterProfileManager.tsx`:
  - Thêm state + handler cho AI generate dialog (port logic từ MultiCharacterPicker.generateCharacters/saveSelected)
  - Thêm handler `handleGenerateRefImage(label)` gọi `generate-character-image`
  - Thêm nút "Tạo bằng AI" header, "Tạo ảnh AI" trong form
  - Thêm nút Clone trên card
  - Auto bind `brand_template_id` khi tạo
  - Thêm filter toggle theo brand
  - Hiển thị badge brand trên card khi cross-brand
- Không sửa `useCharacterProfiles.ts` (input đã có `brand_template_id`)
- Không sửa `MultiCharacterPicker.tsx`

## Edge function spec — `generate-character-image`

```text
POST { profile_id?, name, appearance, wardrobe, description, view: 'front'|'side'|'full-body'|'close-up' }
→ Build photorealistic portrait prompt từ character data
→ Call ai.gateway.lovable.dev model=google/gemini-3-pro-image-preview, modalities=['image','text']
→ Decode base64 → upload bucket character-references/{org_id}/{uuid}.png
→ Return { url, label: view }
→ Handle 402/429 với message tiếng Việt
```

## Out of scope (lần này)
- Voice fields nâng cao (honorific/speech_style/regional_accent UI) — đã chốt KHÔNG làm lần này
- Embed `CharacterVoicePreview` vào Manager — chưa làm
- AI auto-fill cho từng multi-ref image (chỉ giữ cho ảnh chính)

## Acceptance
- Trong "Quản lý nhân vật", user có thể: (1) bấm "Tạo bằng AI" → chọn role+count → AI sinh → lưu; (2) trong form, bấm "Tạo ảnh AI" → chọn góc → ảnh xuất hiện trong reference_images; (3) bấm Clone trên card; (4) thấy badge brand khi profile thuộc brand khác.
