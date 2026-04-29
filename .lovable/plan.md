
# Đưa việc chọn Model AI về Admin Settings

## Vấn đề hiện tại
Hệ Admin AI Function Config (`/admin/ai` → tab **Functions**) đã đầy đủ: lưu model/provider per function trong bảng `ai_function_configs`, có group defaults, OpenRouter sync, etc. Nhưng các tính năng Video/Audio mới thêm vẫn để **user cuối tự chọn model** trong UI:

- `src/components/video/QuickClipTab.tsx` → `<ProviderModelPicker>` (6 model lựa)
- `src/components/script/VideoGeneratorPanel.tsx` → `<Select>` model GeminiGen
- Edge functions `generate-video`, `generate-voiceover`, `generate-bgm`, `generate-subtitles`, `render-video-creatomate` nhận `model` từ client thay vì đọc từ `ai_function_configs`

→ Trái với policy "Admin quyết định model AI", và trái với memory `[Model Priority Logic]` (Channel config > Agent Override > Default).

## Mục tiêu
1. **User UI**: bỏ chọn model. Chỉ hiển thị badge nhỏ read-only "Model: Veo 3.1 Fast (do Admin cấu hình)".
2. **Edge functions**: model **luôn** đọc từ `ai_function_configs` (qua `getAIConfig()`), client không gửi `model` nữa.
3. **Admin AI Management**: đảm bảo các function video/audio mới đã được seed vào `AI_FUNCTIONS` registry với type `video`/`audio` để admin thấy và cấu hình.

## Thay đổi cụ thể

### 1. Đăng ký functions vào registry (`src/hooks/useAIConfig.ts`)
Thêm vào `AI_FUNCTIONS` (nếu chưa có):
- `generate-video-clip` (type: video) — model mặc định `geminigen/veo-3.1-fast`
- `generate-voiceover` (type: audio) — model mặc định ElevenLabs hoặc OpenAI TTS
- `generate-bgm` (type: audio)
- `generate-subtitles` (type: audio) — Whisper
- `render-video-creatomate` (type: video) — provider Creatomate (no AI model)
- `generate-video-from-script` (type: video)

### 2. Frontend — bỏ Picker
**`src/components/video/QuickClipTab.tsx`**:
- Xóa state `model`, xóa `<ProviderModelPicker>`.
- Thêm hook nhỏ `useFunctionModel('generate-video-clip')` đọc từ `ai_function_configs` qua RPC/select để hiển thị badge.
- Không gửi `model` trong body khi gọi `supabase.functions.invoke('generate-video', ...)`.

**`src/components/script/VideoGeneratorPanel.tsx`**:
- Xóa state `model` + `<Select>` model.
- Thay bằng read-only badge.

**Giữ lại** `ProviderModelPicker.tsx` chỉ để Admin tham khảo metadata (`VIDEO_MODELS` array vẫn export cho admin UI dùng), nhưng không import vào user-facing components.

### 3. Backend — đọc model từ admin config
**`supabase/functions/generate-video/index.ts`**:
```ts
import { getAIConfig } from "../_shared/ai-config.ts";

// Bỏ: const selectedModel = model || GEMINIGEN_VIDEO_MODELS[0].id;
// Thay bằng:
const cfg = await getAIConfig('generate-video-clip', organizationId);
const selectedModel = cfg.model; // vd "geminigen/veo-3.1-fast"
const provider = cfg.provider;   // "geminigen" hoặc "poyo"
```
Route theo `provider` thay vì `model.startsWith('geminigen/')`.

Tương tự cho:
- `generate-voiceover/index.ts`
- `generate-bgm/index.ts`
- `generate-subtitles/index.ts`
- `render-video-creatomate/index.ts` (chỉ provider, không model AI)

Vẫn cho phép `agentOverrideModel` (theo Model Priority Logic) khi gọi từ agent pipeline.

### 4. Admin UI — không cần đổi
`AIFunctionConfigComponent` đã handle generic — chỉ cần các function mới xuất hiện trong `AI_FUNCTIONS` với đúng `type: 'video' | 'audio'` thì sẽ hiển thị trong tab Functions với filter Video/Audio.

### 5. Memory update
Cập nhật `mem://ai-system/model-selection-priority-vn` ghi rõ:
> Video & Audio functions tuân thủ Model Priority Logic. User-facing UI KHÔNG được expose model picker — chỉ Admin cấu hình tại `/admin/ai`.

## Files thay đổi

**Edited**
- `src/components/video/QuickClipTab.tsx` (bỏ picker, thêm badge)
- `src/components/script/VideoGeneratorPanel.tsx` (bỏ picker, thêm badge)
- `src/hooks/useAIConfig.ts` (seed functions video/audio mới)
- `supabase/functions/generate-video/index.ts` (đọc admin config)
- `supabase/functions/generate-voiceover/index.ts`
- `supabase/functions/generate-bgm/index.ts`
- `supabase/functions/generate-subtitles/index.ts`
- `supabase/functions/render-video-creatomate/index.ts`

**New**
- `src/hooks/useFunctionModel.ts` (hook nhỏ đọc model hiện tại để hiển thị read-only)
- `src/components/shared/AdminModelBadge.tsx` (badge "Model: X · do Admin cấu hình", có link tới `/admin/ai` cho admin)

**Memory**
- update `mem://ai-system/model-selection-priority-vn`

## Kết quả
- User không còn thấy model dropdown ở Video Studio / Script Video Generator.
- Mọi thay đổi model cho video/audio chỉ Admin làm tại `/admin/ai` → tab **Functions**.
- Agent override vẫn hoạt động (priority cascade không đổi).
