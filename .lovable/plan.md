## Mục tiêu
Tăng độ đồng nhất (màu sắc, ánh sáng, phong cách, bố cục) giữa các slide trong cùng một carousel. Tập trung vào pipeline `generate-carousel-images-batch` + `generate-carousel-image` + `validate-seamless-consistency`. Không đụng UI logic, chỉ siết phần generation/orchestration.

## Phân tích hiện trạng

Trong `generate-carousel-images-batch/index.ts`:
- `seamlessContext.colorPalette` LUÔN bằng `null` → không có color lock thực sự giữa các slide.
- `previousSceneDescription` cho slide N chỉ là scene của slide N‑1 → mất "anchor" của slide 1, drift dồn dần.
- `recentScenes` rolling window = 2 → slide 5+ không còn thấy slide 1.
- Slide 1 không có `previousImageUrl` → AI tự chọn tông màu/ánh sáng ngẫu nhiên, các slide sau đuổi theo "ngẫu nhiên" đó.
- `previousImageUrl` chỉ trỏ tới slide N‑1, không có anchor là slide 1 → providers single‑slot (PoYo/KIE/GeminiGen) drift nhanh.
- Validate seamless chạy sau cùng, set `needs_regeneration=true` nhưng không có hành động tự động.
- Aspect ratio hard‑code `9:16`/`1:1` (bỏ sót `4:5` Instagram, `16:9` LinkedIn).

## Thay đổi đề xuất

### 1. Anchor Image (slide 1 = visual reference cho cả series)
- Trong batch loop, lưu `anchorImageUrl = successUrls[0]` sau khi slide 1 xong.
- Truyền thêm `anchorImageUrl` xuống `generate-carousel-image` cho slide 2..N.
- Trong `generate-carousel-image`:
  - Lovable Gateway (multi‑image): attach `[logo, anchorImage, previousImage]` (max 3) thay vì chỉ `[logo, previousImage]`.
  - Single‑slot providers: ưu tiên `anchorImageUrl` ở slide 2 và 3, sau đó alternate `previous`/`anchor` mỗi slide để tránh drift kép.

### 2. Color Palette Lock (extract từ slide 1)
- Trong batch loop, sau khi slide 1 thành công: gọi nhanh AI vision (Gemini Flash Lite, ~2s) extract top 5 hex màu từ `anchorImageUrl` → lưu `lockedPalette: string[]`.
- Lưu `lockedPalette` vào cột mới `carousels.locked_palette` (jsonb) để regenerate single slide cũng dùng được.
- Truyền `seamlessContext.colorPalette = lockedPalette` cho slide 2..N → kích hoạt nhánh "EXACT COLOR PALETTE" đã có sẵn ở `buildBackgroundPrompt`.

### 3. Series Bible bền hơn
- Trong `generate-carousel-images-batch`: build `previousSceneDescription` = `seriesBible + " | Slide 1 anchor: " + slide1SceneDescription + " | Slide N-1: " + lastSceneDescription`.
- Tăng `recentScenes` window từ 2 → `min(4, totalSlides)` để giữ context xuyên suốt carousel 5–10 slide.
- Trong `buildSeriesBible` (`src/lib/carouselImageBatch.ts`): tăng slide‑1 reference từ 200 → 400 ký tự, và thêm dòng "lighting: <slide1.colorLayout>" để có anchor ánh sáng rõ.

### 4. Stable seed per carousel (best‑effort)
- Trong `generate-carousel-image`, derive `seed = hash(carouselId)` (đơn giản: parseInt 8 hex đầu của carouselId).
- Truyền seed vào PoYo/KIE/GeminiGen khi provider hỗ trợ (PoYo có `seed` param). Dùng cùng seed cho mọi slide trong cùng carousel → tăng nhất quán style.

### 5. Aspect ratio đầy đủ
- Trong batch, đọc `carousel.aspect_ratio` (đã có ở slide.aspectRatio) → map đúng cho tất cả 4 nền tảng (`1:1`, `4:5`, `9:16`, `16:9`) thay vì if/else `tiktok ? 9:16 : 1:1`. Bảo đảm mọi slide cùng tỉ lệ.

### 6. Auto re‑generate slide tệ nhất (nhẹ nhàng)
- Sau `validate-seamless-consistency`, nếu `overallScore < 60` và `validation.slides[]` có 1–2 slide outlier rõ rệt (brightness lệch >25 hoặc temperature khác cluster):
  - Đánh dấu `needs_regeneration_slides: number[]` thay vì chỉ boolean.
  - Hiển thị nút "Tự sửa N slide lệch tông" trong UI tracker (đã sẵn). Không tự chạy để tránh đốt credit.

### 7. Đồng nhất overlay config
- Trong `generate-carousel-image` `getOverlayConfig`: cache result theo `carouselId` lần đầu, các slide sau dùng lại config y hệt (font, text position, contrast) thay vì tính lại theo `slideRole` (gây variance giữa hook/body/cta).

## Kỹ thuật

**Files thay đổi:**
- `supabase/functions/generate-carousel-images-batch/index.ts` — anchor image, palette extract, series bible mở rộng, recentScenes window, aspect ratio map, mark outlier slides.
- `supabase/functions/generate-carousel-image/index.ts` — nhận `anchorImageUrl`, multi‑image attach, stable seed, overlay cache theo carouselId.
- `supabase/functions/validate-seamless-consistency/index.ts` — return outlier slide indices.
- `src/lib/carouselImageBatch.ts` — `buildSeriesBible` mở rộng, truyền `aspectRatio` xuống batch payload.
- `src/types/carousel.ts` — thêm `locked_palette?: string[]`, `needs_regeneration_slides?: number[]` (optional).

**Migration:**
- `ALTER TABLE carousels ADD COLUMN locked_palette jsonb, ADD COLUMN needs_regeneration_slides jsonb;`

**Không đụng:**
- UI tracker logic (chỉ đọc field mới nếu có).
- Auth, rate limit, cancel flow.
- Caption regeneration.

## Rủi ro & mitigation
- Extra Gemini Flash Lite call cho palette extract: ~2s + ~$0.0001/carousel → chấp nhận, đã có `DESCRIBE_DISABLED_UNTIL` time‑boxed cooldown.
- Multi‑image (3 images) trên Lovable Gateway: tăng token cost ~15%. Mitigation: cap anchor + previous, không gửi cả series.
- Stable seed có thể làm mọi slide trông quá giống nhau → vẫn giữ `topicDirective` "DIFFERENT camera angle" để buộc variation.

## Validation
- Sau khi triển khai: chạy 3 carousel test (educational/seamless/listicle) 5 slide, kiểm tra `seamless_score` trung bình tăng từ baseline (cần đo trước).
- Check `ai_metrics` `models_used` để confirm anchor không phá routing.
