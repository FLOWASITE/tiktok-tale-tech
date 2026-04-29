## Mục tiêu

Trang `/admin/ai` hiện đã có chip filter "Video" và registry model (Veo 2/3/3.1, Sora 2, PoYo Veo, Minimax). Backend `generate-video` đã đọc đúng `ai_function_configs.model_override` + `force_provider`. Nhưng cài đặt admin còn 5 lỗ hổng — plan này lấp đủ.

## Hiện trạng (đã verify)

```text
ai_function_categories: chỉ có 9 row, KHÔNG có 'video'/'audio'
                       → generate-video / generate-music rớt vào "Other"
ai_function_group_configs: có row video (rỗng model), KHÔNG có audio
ai_function_configs.generate-video: model=geminigen/veo-3.1-fast ✓ (OK)
MODELS_BY_TYPE.video: 9 model registry đầy đủ ✓
Admin AI page tab "Video" exists nhưng grouping không gom được
```

## Các thay đổi

### 1. Seed system categories `video` + `audio` (migration)

Insert 2 row vào `ai_function_categories` với `organization_id = NULL`, `is_system = true`:
- `video` — label "Video", icon `video`, color hồng (#ec4899), sort_order 9
- `audio` — label "Audio", icon `music`, color cam (#f97316), sort_order 10

Sau seed: `generate-video` và `generate-music` tự gom đúng nhóm trên UI mà không cần đụng React.

### 2. Lock provider–model coherence (frontend)

Trong `InlineModelPicker` / `ModelSelector` cho function type `video`: khi user chọn model có prefix `geminigen/...`, `poyo/...`, `minimax/...`, tự động set `force_provider` tương ứng và disable trường `force_provider` (read-only badge). Tránh trạng thái không nhất quán model=`poyo/veo-3` nhưng force_provider=`geminigen`.

### 3. Group Defaults Panel cho video & audio

`GroupDefaultsPanel` đã render UI cho group `video`/`audio` nhưng group config `audio` thiếu row. Thêm helper "Tạo group config" khi row chưa tồn tại — insert mặc định `function_type='audio'`, `model_override=null`, `is_enabled=true`. Cùng đó: hiển thị tooltip "Group default ghi đè default model nhưng KHÔNG ghi đè per-function override" khớp memory `model-selection-priority-vn`.

### 4. Per-function panel cho generate-video — thêm field

Trong `FunctionCard` khi `function_name === 'generate-video'`: hiện thêm 2 dropdown chỉ-cấu-hình (lưu vào `parameters` jsonb của `ai_function_configs`):
- `default_duration` — 5s | 10s
- `default_resolution` — 480p | 1080p
- `default_aspect_ratio` — danh sách aspect theo provider của model đang chọn

Edge function `generate-video` đã nhận `duration/aspect_ratio/resolution` từ client; bổ sung fallback đọc từ `cfg.parameters` nếu client không truyền (cho agent pipelines).

### 5. AdminModelBadge — surface caps

`AdminModelBadge` trong `VideoGeneratorPanel` hiện chỉ hiển thị tên model. Bổ sung tooltip:
- Provider được chọn (geminigen/poyo/minimax)
- Aspect ratios khả dụng
- Max duration
- Note "Admin có thể đổi tại /admin/ai → Video"

## Kỹ thuật

| Thay đổi | File / nguồn |
|---|---|
| Seed 2 categories | migration mới — INSERT vào `ai_function_categories` |
| Lock provider-model | `src/components/admin/ai/InlineModelPicker.tsx`, `ModelSelector.tsx` |
| Audio group config + tooltips | `src/components/admin/ai/GroupDefaultsPanel.tsx` |
| Video function defaults | `src/components/admin/ai/FunctionCard.tsx` (extend) |
| Edge fallback duration/aspect | `supabase/functions/generate-video/index.ts` (đọc `cfg.parameters`) |
| Tooltip badge | `src/components/shared/AdminModelBadge.tsx` |

Không đụng `_shared/`, không đổi RLS, không thêm bảng mới — chỉ seed data + UI/UX.

## Out of scope

- Không thêm model mới vào `MODELS_BY_TYPE.video` (đã đủ 9 model).
- Không thay đổi cascade priority (Industry > Brand > Channel > Defaults).
- Không thêm audio providers ngoài `elevenlabs/music-v1` đã có.
