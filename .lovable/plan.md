

# Fix: Carousel AI Agent ra khác Carousel thủ công

## Root cause

Cả hai luồng đều gọi `generate-carousel` để soạn slides. Khác biệt nằm ở **Phase 2 — sinh ảnh**:

| | Thủ công (Carousel page) | Agent (`agent-creator-v2`) |
|---|---|---|
| Edge function | `generate-carousel-images-batch` | `generate-carousel-image` (gọi từng slide) |
| Chain seamless V2 | Có: `previousSceneDescription` + `previousImageUrl` cuốn theo từng slide thực tế | Có 1 phần (`seamlessContext` = scene mô tả) nhưng **không có previousImageUrl**, không có rolling window 2 slide |
| Series Bible | `buildSeriesBible(slides)` từ slide 1 → đảm bảo 1 thế giới hình ảnh | Không build, không truyền |
| Brand colors | `extractBrandColorsWithFallback` (parse `brand_guideline` JSON → fallback `brand_templates.primary_color/secondary_colors`) | Không truyền `brandColors` xuống image function |
| Siblings summary | Truyền `siblingsSummary` (Slide N: objective …) | Không có |
| Auto-validation | Chạy `validate-seamless-consistency` cuối batch + `seamless_consistency_score` | Không chạy |
| Tracking | `generation_tasks` row + UI `CarouselGenerationTracker` | Chỉ log trong `agent_execution_logs` |

→ Agent ra ảnh **rời rạc, lệch màu brand, không seamless**, dù slides text giống thủ công.

Phụ thêm: agent cũng hard-code `aiTool: "ideogram"`, không tôn trọng default user, và fallback `visualPreset/carouselStyle` theo `content_role` thay vì lấy của brand.

## Cách sửa

### 1. Agent dùng cùng pipeline batch như thủ công
Trong `agent-creator-v2/routeCarousel`, **bỏ vòng for `generate-carousel-image`** ở `generateCarouselImages`, thay bằng:
- Gọi helper chung `launchCarouselImageBatch` (dịch sang Deno-side trong `_shared/carousel-image-batch.ts`) hoặc `fetch` thẳng `generate-carousel-images-batch` với cùng payload thủ công đang dùng.
- Chờ `generation_tasks.status = completed` (poll mỗi 3s, max 5 phút) trước khi return → giữ nguyên contract của agent (sync result).

### 2. Tách helper share giữa frontend & edge
Tạo `supabase/functions/_shared/carousel-image-batch-payload.ts` chứa:
- `extractBrandColorsFromTemplate(supabase, brandTemplateId, brandGuideline)`
- `buildSeriesBibleFromSlides(slides)`
- `buildSiblingsSummary(slides)`

Frontend `src/lib/carouselImageBatch.ts` **giữ nguyên** (chỉ dùng cho thủ công). Edge clone logic vào `_shared` để agent gọi cùng output.

### 3. Tôn trọng brand defaults
Trong `routeCarousel`:
- Lấy `brand_templates.default_ai_tool / visual_preset / carousel_style` (nếu có cột) → dùng trước khi rơi về `content_role` heuristic.
- `brandPrimaryColor`, `brandSecondaryColors` đã có trong brief → đảm bảo truyền xuống batch payload.

### 4. Đồng bộ tracking
Cho agent insert `generation_tasks` row (task_type=`carousel_image`, status=`pending`, gắn `pipeline_id` vào `input_params`) trước khi gọi batch → `CarouselGenerationTracker` và `useBackgroundGeneration` tự nhặt được.

### 5. Validation cuối
Sau khi batch xong, agent gọi `validate-seamless-consistency` (đã có) và lưu `seamless_consistency_score` vào carousel — cùng metric với thủ công.

## File thay đổi

| File | Thay đổi |
|---|---|
| `supabase/functions/_shared/carousel-image-batch-payload.ts` (mới) | helpers `buildSeriesBible`, `buildSiblingsSummary`, `extractBrandColors` |
| `supabase/functions/agent-creator-v2/index.ts` | rewrite `generateCarouselImages` → gọi `generate-carousel-images-batch`; bỏ hardcode preset/style/tool; tạo `generation_tasks` row; poll completion; gọi validate cuối |
| `src/lib/carouselImageBatch.ts` | refactor nhỏ để dùng chung payload helpers (giữ behavior) |

## Test

1. Tạo carousel thủ công topic X, brand A → ghi nhận: số ảnh, màu chủ đạo, `seamless_consistency_score`
2. Tạo lại đúng topic X qua AI Agent (Goal Wizard / Telegram), cùng brand A
3. So sánh:
   - Cùng visual preset & carousel style (theo brand, không tùy `content_role`)
   - Ảnh slides cùng tone màu brand
   - `seamless_consistency_score` chênh lệch < 10
   - `generation_tasks` có row `carousel_image` cho cả 2
4. Edge case: agent với brand chưa set primary_color → fallback đúng từ `brand_guideline`
5. Pipeline log: agent stage `creator` chỉ done khi batch xong (không done sớm khi ảnh chưa xong)

## Ước tính
**45–60 phút** — 1 file mới, 1 refactor lớn agent-creator-v2, 1 chỉnh nhỏ frontend lib.

