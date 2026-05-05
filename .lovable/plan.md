# Product Consistency System (Full Phase 1 + 2)

Song hành với Character Consistency. Cho phép upload ảnh tham chiếu sản phẩm (chai serum, hộp kem, máy laser…) và inject vào mọi pipeline AI (video, carousel, multichannel, script) để giữ packaging/label/màu sắc nhất quán.

## Phase 1 — Core (Video focus)

### 1. Database
Migration mới — mở rộng `brand_products`:
- `reference_images jsonb DEFAULT '[]'` — mảng `{url, label}`, label ∈ `front|back|side|in-use|packaging` (tối đa 5)
- `appearance jsonb DEFAULT '{}'` — `{color, material, size, distinctive_features}` (cho prompt block)
- Storage bucket mới `product-references` (public, RLS theo org_members)

### 2. Edge function `generate-product-image` (mới)
Clone `generate-character-image`:
- Input: `product_id`, `label`, `preferred_edit_model?`, `attached_ref_url?`
- Auto-upgrade edit model khi có ref: `poyo/seedream-5.0-lite-edit` → `poyo/nano-banana-pro` → `poyo/flux-kontext-max` → `google/gemini-3-pro-image-preview`
- Build product prompt block từ name + description + appearance + USP
- Lưu vào `reference_images` (giống character flow)

### 3. Inject vào video pipeline
- `_shared/product-block-builder.ts` (mới) — hàm `buildProductBlock(productIds[])` tạo `[MAIN PRODUCT]` / `[SUPPORTING PRODUCT N]` block (English labels cho video, Vietnamese cho script — y hệt character convention)
- `generate-video/index.ts`: nhận `product_profile_ids: string[]`, build block + smart pick `starting_frame_url` theo scene context (cảnh "demo cách dùng" → label `in-use`, cảnh "giới thiệu" → `front`)
- `generate-video-prompt/index.ts`: inject product block tương tự
- Auto-upgrade model i2v khi có product ref (giống character logic)

### 4. UI Phase 1
- `ProductDetailSheet.tsx` (mới, clone `CharacterDetailSheet`):
  - Tab "Thông tin" (form sẵn có) + Tab "Ảnh tham chiếu" mới
  - Mini-card per-label với 📎 Attach / ✨ AI generate / ❌ Xoá
  - Model picker dropdown (Auto / Seedream 5 / Nano Banana Pro / Flux Kontext / Gemini 3 Pro)
- `MultiProductPicker.tsx` (mới, clone `MultiCharacterPicker`) — select tối đa 3 sản phẩm
- Wire vào `QuickClipTab`, `StoryboardVideoTab`, `ScriptFormStepper`
- `useProductImageActions.ts` (mới) hook tương tự `useCharacterImageActions`

## Phase 2 — Full pipeline coverage

### 5. Inject sang Script + Multichannel + Carousel
- `generate-script/index.ts`: nhận `product_profile_ids`, build Vietnamese block `[SẢN PHẨM CHÍNH]` để LLM viết kịch bản đúng tên/USP
- `generate-multichannel/index.ts`: inject product context vào prompt mỗi channel
- `generate-carousel-images-batch/index.ts` + `generate-carousel/index.ts`:
  - Nhận `product_profile_ids` 
  - Smart pick reference image theo slide content (slide 1 hero → `front`, slide demo → `in-use`)
  - Pass `referenceImageUrl` vào PoYo edit pipeline (đã có sẵn cho character)
- `ScriptToVideoContext`: thêm `productProfileIds: string[]` propagate xuống video

### 6. Smart Label Picking
`_shared/product-image-selector.ts` — logic chọn ref image phù hợp dựa trên:
- Scene/slide description keywords (demo, hero, packaging, lifestyle, close-up)
- Channel type (Instagram → `front` đẹp; TikTok → `in-use`; Pinterest → `packaging`)
- Fallback: ảnh đầu tiên trong `reference_images`

### 7. AI Auto-fill (Gemini Vision)
Edge function `analyze-product-image` (clone `analyze-character-image`):
- Input: ảnh sản phẩm
- Output: `{name_suggestion, category, color, material, distinctive_features, suggested_usp}`
- Button "🪄 Phân tích ảnh AI" trong `ProductDetailSheet` Tab "Thông tin"

### 8. Frontend wire-up đầy đủ
- `MultiProductPicker` thêm vào: multichannel form, carousel form, script form
- `ProductCard` (list view) hiển thị badge số ảnh tham chiếu (`{N}/5 góc`)
- `useProductProfiles` hook (CRUD + buildProductBlock + types)

### 9. Memory mới
`mem://features/product/product-consistency-vn.md` — ghi rõ:
- Bảng `brand_products` mở rộng + bucket `product-references`
- Single source of truth: frontend chỉ gửi `product_profile_ids`, edge build block
- Label convention English (video) / Vietnamese (script)
- Smart label picking + auto-upgrade edit model
- Multi-product max 3 (1 chính + 2 phụ)

## Files thay đổi

**New (10):**
- `supabase/migrations/<ts>_product_reference_images.sql`
- `supabase/functions/generate-product-image/index.ts`
- `supabase/functions/analyze-product-image/index.ts`
- `supabase/functions/_shared/product-block-builder.ts`
- `supabase/functions/_shared/product-image-selector.ts`
- `src/components/products/ProductDetailSheet.tsx`
- `src/components/products/MultiProductPicker.tsx`
- `src/hooks/useProductProfiles.ts`
- `src/hooks/useProductImageActions.ts`
- `.lovable/memory/features/product/product-consistency-vn.md`

**Modified (~10):**
- `src/types/product.ts` (thêm reference_images + appearance)
- `supabase/functions/generate-video/index.ts`
- `supabase/functions/generate-video-prompt/index.ts`
- `supabase/functions/generate-script/index.ts`
- `supabase/functions/generate-multichannel/index.ts`
- `supabase/functions/generate-carousel/index.ts`
- `supabase/functions/generate-carousel-images-batch/index.ts`
- `src/components/video/QuickClipTab.tsx`, `StoryboardVideoTab.tsx`
- `src/components/scripts/ScriptFormStepper.tsx`
- `src/contexts/ScriptToVideoContext.tsx`
- `src/types/videoGeneration.ts` + multichannel/carousel types

## Ngoài phạm vi
- Không động đến RLS pattern hiện tại của `brand_products` (đã có org isolation)
- Không thay đổi pricing/quota (dùng chung quota Image hiện có)
- Không tạo bảng riêng — dùng `brand_products` extend (giảm complexity)

## Rủi ro
- **Token budget**: thêm product block + character block có thể đẩy prompt dài. Mitigation: cap mỗi block ~300 tokens, ưu tiên fields quan trọng (name + color + distinctive_features)
- **Cost**: edit model đắt hơn 3-5×. Log qua `ai_metrics` để admin theo dõi
- **Multi-ref conflict**: nếu user chọn cả character + product ref, smart selector phải prioritize đúng (close-up nhân vật → character ref; close-up sản phẩm → product ref). Sẽ dùng heuristic keyword scoring trong scene description
