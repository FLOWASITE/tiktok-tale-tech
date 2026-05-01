
# Tính năng Đồng nhất Nhân vật (Character Consistency)

## Vấn đề hiện tại
Khi tạo video nhiều scene (Storyboard hoặc batch từ Script), mỗi prompt được gửi độc lập tới AI video models (Veo, Seedance). Các model này **không có memory giữa các scene**, dẫn tới nhân vật thay đổi ngoại hình, trang phục, kiểu tóc giữa các clip.

Hiện tại chỉ có `continuityRules` text ("Wardrobe + background NHAT QUAN") trong prompt generate-script, nhưng không có structured character profile để inject vào video prompt.

## Giải pháp

### 1. Database: Bảng `character_profiles`

Tạo bảng lưu hồ sơ nhân vật tái sử dụng:

```sql
create table public.character_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,                    -- "Bác sĩ Minh", "Cô gái Gen Z"
  description text not null,            -- Mô tả chi tiết ngoại hình
  appearance jsonb default '{}',        -- {gender, age_range, hair, skin_tone, body_type, distinctive_features}
  wardrobe text,                        -- Trang phục mặc định
  reference_image_url text,             -- Ảnh tham chiếu (upload)
  brand_template_id uuid references public.brand_templates(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.character_profiles enable row level security;
-- RLS: org members can CRUD
```

### 2. UI: Character Profile Manager

Thêm component `CharacterProfileManager` trong Video Studio:
- Form tạo/sửa nhân vật: tên, mô tả ngoại hình, trang phục, tuổi, giới tính, đặc điểm nhận dạng
- Upload ảnh tham chiếu (dùng Supabase Storage bucket `character-references`)
- Danh sách nhân vật đã tạo (card grid, filter theo brand)

### 3. UI: Character Picker trên Quick Clip và Storyboard

- Thêm dropdown/selector "Chọn nhân vật" trước khi generate video
- Khi chọn nhân vật, tự động prepend character description vào prompt
- Hiển thị avatar/tên nhân vật đang active

### 4. Prompt Injection Logic

**Edge function `generate-video`**: Khi request có `character_profile_id`:
- Fetch character profile từ DB
- Build character block: `"[CHARACTER] {name}: {gender}, {age}, {hair}, {skin}, wearing {wardrobe}. {distinctive_features}. Maintain this exact appearance throughout."`
- Prepend vào prompt trước khi gửi provider

**Edge function `generate-script`**: Khi script có linked character:
- Inject character description vào mỗi PROMPT block của ai_video output
- Thêm vào continuityRules: `"Character {name} MUST maintain: {appearance summary}"`

**Edge function `generate-video-prompt`**: Thêm character block vào cinematic prompt generation.

### 5. Reference Image (starting_frame_url)

PoYo API đã hỗ trợ `startingFrameUrl` (first frame). Khi nhân vật có reference image:
- Scene đầu tiên: gửi reference image làm `starting_frame_url`
- Các scene tiếp: extract last frame từ video trước (nếu có) hoặc dùng cùng reference image

### 6. Script-to-Video Integration

Khi tạo script mới (ScriptNew page), cho phép chọn character profile. Character sẽ:
- Được lưu vào `scripts.metadata` field
- Tự động truyền qua ScriptToVideoContext sang Video Studio
- Inject vào mọi scene prompt khi batch generate

## Các file cần tạo/sửa

| File | Thay đổi |
|------|----------|
| **Migration** | Tạo bảng `character_profiles` + RLS + storage bucket |
| `src/hooks/useCharacterProfiles.ts` | CRUD hook cho character profiles |
| `src/components/video/CharacterProfileManager.tsx` | UI quản lý nhân vật |
| `src/components/video/CharacterPicker.tsx` | Dropdown chọn nhân vật |
| `src/components/video/QuickClipTab.tsx` | Thêm CharacterPicker |
| `src/components/video/StoryboardVideoTab.tsx` | Thêm CharacterPicker |
| `src/pages/VideoStudioPage.tsx` | Thêm tab hoặc section cho Character |
| `supabase/functions/generate-video/index.ts` | Fetch + inject character vào prompt |
| `supabase/functions/generate-video-prompt/index.ts` | Inject character vào cinematic prompt |
| `supabase/functions/generate-script/index.ts` | Inject character vào script output |
| `src/contexts/ScriptToVideoContext.tsx` | Thêm character profile state |

## Phạm vi Phase 1 (đề xuất triển khai)

1. DB table + RLS
2. Character Profile Manager UI (CRUD + upload ảnh)
3. Character Picker trên Quick Clip
4. Prompt injection trong `generate-video`
5. Prompt injection trong `generate-video-prompt`

Phase 2 (sau): Script integration, Storyboard batch, last-frame extraction.
