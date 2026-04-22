

# Telegram tạo ảnh = copy y nguyên pipeline thủ công

## Nguyên tắc bất di bất dịch

**Composer KHÔNG được tự đẻ ra logic riêng nào.** Mọi thứ phải dùng đúng các block đã có trong manual flow `useAutoImageGeneration` + `SimpleImageGenerator` (file `src/hooks/useAutoImageGeneration.ts` + `src/components/multichannel/SimpleImageGenerator.tsx`).

Manual flow làm 3 bước, theo thứ tự cố định:

1. **Decompose**: gọi edge function `decompose-image-request` → trả về `backgroundPrompt` + `overlayConfig` (chứa banner/heroText/cards/headline/cta/footer/colors).
2. **Apply template**: chọn template (auto theo content) → ra payload `structuredElements + structuredColors + structuredTemplate + layout` chuẩn.
3. **Generate**: gọi `generate-brand-image` với:
   - `overlayMode='ai_render'`
   - `imageContentType='with_text'`
   - `structuredElements`, `structuredColors`, `structuredTemplate`
   - `logoSafeZone`
   - rồi `overlay-logo-canvas` để dán logo.

→ Footer hiện trên ảnh là do **AI bake-in** vì `structuredElements.footer.items` được gửi sang generate-brand-image. Không có bước Satori footer riêng.

## Cái sai của composer hiện tại

`branded-image-composer.ts` đang:
- Gửi `imageContentType='with_text'` chỉ khi text ≤120 ký tự, ngược lại `background_only` → mất chữ.
- Không gọi `decompose-image-request`, không build `structuredElements/structuredColors/structuredTemplate` → AI không có dữ liệu footer/headline/cta để render → mất footer + headline.
- Có comment "footer DEFERRED" → tự đẻ logic riêng, không khớp manual.
- Không gửi `overlayMode='ai_render'` → ngay cả khi có structuredElements cũng bị bỏ qua.

## Cách fix duy nhất: rewrite `branded-image-composer.ts` mirror y hệt manual

### File `supabase/functions/_shared/branded-image-composer.ts`

Viết lại theo đúng 3 step của manual:

**Step A — Decompose (mới)**
- Gọi `${supabaseUrl}/functions/v1/decompose-image-request` với:
  - `description = channelText` (full, không cắt 120)
  - `primaryColor = brand.primary_color || '#DC2626'`
  - `secondaryColor = brand.secondary_color || '#FFFFFF'`
  - `context = { contentRole: 'sprout', topic: channelTitle, textToInclude: channelText }`
  - `imageStyle = brand.image_style_preset`
- Nhận `{ backgroundPrompt, overlayConfig, suggestedLayout }`.
- Fallback nếu decompose fail: build `overlayConfig` tối thiểu từ `brand.footer_info` + headline = câu đầu của `channelText` (≤80 chars), giống nhánh catch của manual.

**Step B — Apply template (mới)**
- Gọi đúng helper `applyTemplate` đã có trong `src/lib/hybridImageGenerator.ts`. Vì composer chạy ở Deno edge và file kia là client, ta **port nguyên helper sang `_shared/hybrid-image-utils.ts`** (copy 1:1, không sửa logic) hoặc import qua URL nếu phù hợp. Lý do port: bảo đảm cùng output với manual.
- Template chọn:
  - `overlayTemplate = autoSelectTemplate(channelText, overlayConfig)` y hệt manual.
- Output:
  ```
  { backgroundPrompt, overlayConfig, layout }
  ```
- **Inject brand footer**: nếu `overlayConfig.footer` rỗng mà `brand.footer_info` có dữ liệu → đổ `brand.footer_info` (phone/website/address/email) vào `overlayConfig.footer.items` đúng shape mà `generate-brand-image` đợi (đây là điểm manual flow đã làm gián tiếp qua decompose/template; khi text ngắn không có footer, composer cần đảm bảo footer brand luôn được gửi).

**Step C — Generate base image**
Gọi `generate-brand-image` với payload **đồng nhất manual**:
```
{
  contentId,
  channel,
  brandTemplateId,
  contentSummary: backgroundPrompt.description,   // KHÔNG phải channelText thô
  aspectRatio: <kênh chuẩn>,
  imageStylePreset: brand.image_style_preset,
  contentRole: 'sprout',
  contentAngle: 'educational',
  hookMessage: <câu đầu channelText, ≤80 chars>,
  imageContentType: 'with_text',
  textToInclude: <hookMessage>,        // không gửi cả 500 chars
  textPosition: 'center',
  typographyStyle: 'modern',
  promptMode: 'full',
  structuredElements: overlayConfig (banner/heroText/cards/headline/cta/footer/summaryRibbon),
  structuredColors: overlayConfig.colors,
  structuredTemplate: overlayTemplate,
  logoSafeZone: { position, sizePercent } nếu có logo,
}
```
→ Đây là payload **bit-for-bit** giống `useAutoImageGeneration` line 199-227 (với `overlayMode='ai_render'` mặc định ở generate-brand-image).

**Step D — Overlay logo**
Giữ nguyên call `overlay-logo-canvas` hiện có (đã đúng manual).

**Bỏ hoàn toàn** "STEP 3 footer overlay TBD" và mọi nhánh `background_only`. Nếu decompose fail và fallback overlayConfig vẫn rỗng → vẫn gửi `imageContentType='with_text'` + headline + footer brand (không bao giờ rơi về `background_only`).

### File mới `supabase/functions/_shared/hybrid-image-utils.ts`

- Port 1:1 từ `src/lib/hybridImageGenerator.ts` các hàm: `applyTemplate`, `autoSelectTemplate`, `decomposeRequest` (fallback local), types `StructuredOverlayConfig`, `DecomposedRequest`.
- Không thay đổi logic, chỉ chuyển sang Deno-compatible (bỏ React imports nếu có, dùng `export` ESM).
- Một file shared duy nhất, dùng được cả cho composer Telegram và bất cứ edge function nào sau này muốn dùng pipeline thủ công.

### File `supabase/functions/decompose-image-request/index.ts`

Không sửa. Manual đã gọi qua `decomposeRequestWithAI` từ frontend; ta chỉ cần edge function này tồn tại và nhận POST. Nếu nó hiện chỉ accept JWT, đảm bảo composer gọi với `serviceKey` (Bearer + apikey) là OK vì server-to-server.

→ Cần verify trong implement step: file này có `verify_jwt = false` hoặc accept service key.

## Files sẽ sửa

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/branded-image-composer.ts` | Rewrite: thêm Step A decompose + Step B apply template + bỏ ngưỡng 120 chars + bỏ comment "footer DEFERRED" + payload generate-brand-image copy 1:1 manual. |
| `supabase/functions/_shared/hybrid-image-utils.ts` | (Mới) Port `applyTemplate`, `autoSelectTemplate`, `decomposeRequest` fallback từ `src/lib/hybridImageGenerator.ts`. |
| `supabase/functions/_shared/__tests__/branded-image-composer.test.ts` | (Mới) 3 test: (a) payload gửi generate-brand-image phải có `structuredElements.footer.items` khi brand có footer_info; (b) `imageContentType` luôn = `'with_text'`; (c) `textToInclude` ≤80 chars dù channelText 500 chars. |

KHÔNG động:
- `telegram-webhook/index.ts` (composer là source of truth)
- `generate-brand-image/index.ts` (đã hỗ trợ structuredElements sẵn cho manual)
- `overlay-logo-canvas/index.ts`
- `decompose-image-request/index.ts` (chỉ verify auth)

## QA sau implement

1. Test bot Telegram: `/post facebook <topic>` → xem ảnh trả về.
2. Compare 1-1 với ảnh tạo cùng brand+topic từ App `/multichannel`:
   - ✅ Headline baked-in (AI render)
   - ✅ Logo đúng vị trí
   - ✅ Footer bar (phone/website/address/email) hiện trong ảnh
   - ✅ Style preset = brand setting
3. Brand không có `footer_info` → ảnh có headline + logo, không có footer bar (giống App).
4. Caption 1000+ chars → AI chỉ render headline 80 chars, không bị chen.

## Rủi ro

- **Thấp**: Chỉ port helper sẵn có sang shared, không viết logic mới.
- **Trung bình**: `decompose-image-request` có thể yêu cầu auth khác → cần verify trong lúc implement, nếu fail thì dùng nhánh fallback `decomposeRequest` local (đã port).

