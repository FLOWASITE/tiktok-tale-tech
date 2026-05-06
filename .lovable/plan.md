# Khắc phục: Nhân vật không đồng nhất khi tạo Video Clip

## Nguyên nhân (đã trace trong `generate-video/index.ts` + provider)

1. **Provider chỉ nhận 1 ref image** (`startingFrameUrl` → `input_image` cho geminigen, `first_frame_url` cho poyo). Khi user chọn 2+ nhân vật, code chỉ gửi ảnh của **primary** (`sorted[0]`); các nhân vật còn lại chỉ tồn tại dưới dạng text → AI tự bịa mặt → không đồng nhất.
2. **Default model `poyo/seedance-2`** giữ identity yếu. Auto-upgrade sang Veo 3.1 chỉ chạy khi `!clientModel`; user chọn explicit Seedance là mất upgrade → mặt trôi giữa các clip.
3. **Không có seed cố định** giữa các clip cùng nhân vật → mỗi lần generate ra một mặt khác.
4. **Smart angle pick** chỉ áp cho primary; supporting characters dùng ảnh ngẫu nhiên (hoặc không có).
5. Prompt mô tả nhân vật chung chung ("MAIN" / "SUPPORTING 1") → AI không biết ai đứng vị trí nào trong frame.

## Thay đổi

### 1. `supabase/functions/generate-video/index.ts` — Multi-ref collage
- Khi `sorted.length >= 2` và **chưa có** `characterRefUrl` từ user:
  - Pick best ref image cho **mỗi** nhân vật (smart angle pick áp cho cả supporting, ưu tiên `front` hoặc `close-up`).
  - Gọi function mới `composeCharacterCollage(urls: string[], names: string[])` → fetch ảnh, dùng `Deno` + `npm:sharp` (hoặc `ImageScript` lib đã dùng cho overlay) ghép ngang side-by-side với label tên dưới mỗi mặt, upload lên `character-references` bucket → trả URL.
  - Set `characterRefUrl = collageUrl`.
- Inject vào prompt **positional anchor**: `[FRAME LAYOUT] Reference image is a side-by-side collage. From LEFT to RIGHT: "<name1>", "<name2>", "<name3>". Use these EXACT faces. Do NOT swap, blend, or invent new faces.`
- Cache collage theo hash `sha256(sortedIds.join('|'))` để clip 2/3/4 cùng cast tái dùng (tránh ghép lại).

### 2. Force Veo khi có characters (bỏ điều kiện `!clientModel`)
- Đổi block line 260: nếu `resolvedCharIds.length > 0 && characterRefUrl`, **luôn** upgrade sang `geminigen/veo-3.1` (Veo i2v giữ identity tốt hơn Seedance đáng kể), kèm log + trả `model_upgraded_reason: 'character_identity_lock'` về client.
- Trong UI (`QuickClipTab` + `StoryboardVideoTab`): hiển thị chip nhỏ "🔒 Đã khoá Veo 3.1 để giữ nhân vật" khi response trả `model_upgraded_reason`.

### 3. Stable seed per character group
- Trong `generate-video`, derive `seed = hashToInt(sortedIds.sort().join('|')) % 2_147_483_647`.
- Truyền `seed` vào provider params; cập nhật `geminigen-video-generator.ts` + `poyo-video-generator.ts` thêm field `seed?: number` → forward vào body request (Veo/Seedance đều hỗ trợ `seed`).
- Cùng cast → cùng seed → frame đầu nhất quán giữa các clip.

### 4. Prompt block tăng cường (line 193-220)
- Thêm dòng cuối mỗi character block: `Face ID: ${cp.id.slice(0,8)}` (anchor token cho LLM).
- Thêm câu chốt: `[CONSISTENCY LOCK] If any character cannot match the reference photo exactly, prefer keeping the photo over creative variation.`

### 5. UI — Storyboard nhắc user
- Trong `StoryboardVideoTab`, nếu nhiều scene cùng `selectedCharacters` → hiện banner: "Để giữ nhân vật giống nhau giữa các scene, giữ nguyên danh sách nhân vật. Hệ thống tự khoá Veo 3.1 + seed cố định."

## Kỹ thuật bổ sung
- Collage size: max 1280×720, mỗi nhân vật ô vuông 512×512, padding 16px, label text 28px nền trắng.
- Lib: dùng `https://deno.land/x/imagescript@1.2.17/mod.ts` (đã có trong project khác — check) để fetch + compose, không cần sharp.
- Collage upload path: `character-references/_collage/<sha8>.png`, public URL.
- Fallback: nếu compose lỗi → log + fall back về primary ref image (không block generate).

## Acceptance
- Chọn 2+ nhân vật + tạo clip → log `[generate-video] Multi-char collage built: <url>` + `model_upgraded_reason=character_identity_lock`.
- Generate 3 clip cùng cast → 3 clip có cùng seed, mặt giữ nguyên qua các clip.
- Single character: behavior giữ nguyên (không tạo collage thừa).
