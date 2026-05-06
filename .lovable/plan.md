## Vấn đề hiện tại

Hai tab **"Kịch bản"** và **"Quick Clip"** đang chồng lấn về mục đích:

| | Kịch bản (ScriptsTab) | Quick Clip (QuickClipTab) |
|---|---|---|
| Entry | List + Create | Gating picker (chọn script) |
| Render | Batch "render missing scenes" trong ScriptViewer → ScriptVideoTab | Render từng scene bằng Smart Prompt + Character + Product |
| Context | Có script context | Bắt buộc script context |
| Audio/Voice | CharacterVoicePreview riêng | CharacterVoicePreview |
| Sản phẩm | Không | CharacterProductMap (rich) |

→ User phải nhảy qua lại: tạo kịch bản ở tab 1 → mở viewer → bấm "Quay với Video Studio" → chuyển sang tab Quick Clip → render. Quick Clip lại không thể đứng một mình (bị gate). ScriptVideoTab và QuickClipTab có 2 đường render khác nhau, dễ lệch tham số (model, character, product).

## Phương án merge: 1 tab duy nhất "Kịch bản & Quay"

Gộp 2 tab thành **một workflow tuyến tính 3 trạng thái** trong cùng tab `scripts`:

```text
[A] Danh sách kịch bản  ──►  [B] Chi tiết + Storyboard  ──►  [C] Quay scene (Quick Clip nhúng)
        ▲                          │                              │
        └── Quay lại ──────────────┴──────────────────────────────┘
```

- **Bỏ tab "Quick Clip"** ở `TabsList`. Quick Clip không còn là một tab độc lập — nó trở thành **panel "Quay scene N"** bên trong workspace của một kịch bản.
- Tab `scripts` đổi label thành **"Kịch bản & Quay"** (icon `Clapperboard`).
- `QuickClipContextPicker` xoá — vì user **luôn** vào qua kịch bản, không còn cảnh "vào Quick Clip không có script".

### Trạng thái A — Danh sách (giữ nguyên ScriptsTab list)
- Hero + filter + grid card kịch bản như hiện tại.
- Click card → vào trạng thái B (workspace) thay vì mở dialog ScriptViewer.
- Nút "Tạo mới" → form (giữ nguyên ScriptForm), submit xong → auto vào B.

### Trạng thái B — Workspace của 1 kịch bản (mới: `ScriptWorkspace`)
Layout 2 cột trên desktop, stacked trên mobile:

- **Cột trái (Storyboard rail)**: tái dùng `ScriptSceneGrid` đã có trong `ScriptVideoTab`.
  - Hiển thị tất cả scene + status clip (pending/processing/completed/failed) qua `useScriptVideoGenerations`.
  - Click scene → set `activeSceneIndex` (qua `ScriptToVideoContext`) + cuộn cột phải.
  - Header có tiến độ `X/Y scene đã quay` + nút **"Render scene còn thiếu (batch)"** (giữ logic `useScriptVideoBatch`) + nút **"Ghép phim"** (`useScriptMovieMerge`) khi ≥ 2 scene done.
- **Cột phải (Quay scene đang chọn)**: nhúng `QuickClipTab` đã đơn giản hoá:
  - Bỏ phần header banner + scene navigator + "Đổi kịch bản" (đã có ở rail trái + workspace header).
  - Giữ: prompt textarea (auto-fill từ scene), Smart Prompt, MultiCharacterPicker, CharacterProductMap, AspectRatioPicker, duration slider, generate button, ModelUsedBadge, PublishVideoMenu.
  - Render xong → markSceneCompleted + auto-advance như hiện tại.

### Trạng thái C
Không phải state riêng — chính là **cột phải của B**, scoped theo `activeSceneIndex`.

### Workspace header
```
← Quay lại danh sách    │  [TopicChip] Tên kịch bản          [Mở viewer fullscreen] [Audio Studio] [Gallery]
                        │  X/Y scene đã quay · Aspect 9:16 · 30s
                        │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (progress bar)
```
- "Mở viewer fullscreen" → mở `ScriptViewer` dialog (đọc/edit kịch bản full markdown).
- "Audio Studio" / "Gallery" → vẫn là các tab riêng ở `TabsList` (không gộp vào workspace).

## Ảnh hưởng các tab khác

- **Storyboard tab**: giữ — đây là flow khác (tạo storyboard rời từ ý tưởng, không bắt đầu từ script).
- **Audio Studio**: giữ — đã đọc `activeScript` từ context; user chuyển tab mà không mất context.
- **Gallery**: giữ — filter theo script như cũ.
- **Costs**: giữ.

`TabsList` còn 5 tab thay vì 6: `[Kịch bản & Quay] [Storyboard] [Audio] [Gallery] [Chi phí]`.

## Thay đổi file

| File | Việc |
|---|---|
| `src/pages/VideoStudioPage.tsx` | Bỏ entry `quick` khỏi `TABS`; giữ deep-link `?tab=quick` → redirect sang `?tab=scripts&view=<lastScriptId>` (nếu có activeScript) hoặc `?tab=scripts`. |
| `src/components/video/ScriptsTab.tsx` | Thay `viewerOpen` dialog mặc định bằng vào `ScriptWorkspace` inline. Dialog viewer vẫn dùng được khi click "Mở viewer fullscreen". |
| `src/components/video/ScriptWorkspace.tsx` *(mới)* | Layout 2 cột: rail trái (`ScriptSceneGrid` + batch/merge), cột phải (`QuickClipTab` rút gọn). Header workspace + back button. |
| `src/components/video/QuickClipTab.tsx` | Tách thành 2 mode qua prop `embedded?: boolean`: ẩn picker/banner/scene navigator/topic chip khi `embedded`. Khi không embedded → redirect sang scripts tab (không còn standalone). |
| `src/components/video/QuickClipContextPicker.tsx` | **Xoá** — không còn dùng. |
| `src/components/video/ScriptLinkBanner.tsx` | Vẫn render cho Audio/Gallery/Storyboard tab (cross-tab continuity); ẩn khi đang ở `scripts` workspace (header workspace đã chứa cùng info). |
| `src/lib/scriptToVideoNav.ts` | Giữ. `buildScriptToVideoNavState` vẫn dùng cho `ScriptFormStepper`. Nav mục tiêu đổi từ `?tab=quick` → `?tab=scripts&view=<id>`. |
| `src/components/script/ScriptFormStepper.tsx` | Step "Tạo Video" → CTA "Mở Video Studio" navigate `/videos?tab=scripts&view=<scriptId>` thay vì `?tab=quick`. |
| `.lovable/memory/features/video/script-to-studio-link-vn.md` | Cập nhật: Quick Clip không còn là tab — gộp vào workspace của kịch bản. |
| `.lovable/memory/index.md` | Cập nhật mô tả entry "Script→Video Studio". |

## Edge cases & migration

- **Deep-link cũ** `/videos?tab=quick` (đã share) → redirect sang `?tab=scripts`. Nếu sessionStorage có `activeScript` → mở thẳng workspace của script đó.
- **Quay scene không thuộc kịch bản nào** (tự gõ prompt rời) → không còn hỗ trợ. Đây là **chủ đích**: ép user phải có context kịch bản để giữ brand voice + character lock như memory `multi-character-identity-lock-vn` yêu cầu.
- **Stepper auto-jump**: vẫn auto chuyển sang step "Tạo Video" sau khi sinh kịch bản, CTA mở workspace mới.
- **State persistence**: `ScriptToVideoContext` (sessionStorage) tiếp tục giữ activeScript xuyên tab Audio/Gallery/Storyboard.

## Ngoài phạm vi

- Không đổi schema DB, edge function, hoặc payload `generate-video`.
- Không đổi `StoryboardVideoTab` (flow tạo storyboard rời).
- Không đổi `ScriptVideoTab` bên trong `ScriptViewer` dialog — vẫn render được khi user mở viewer fullscreen từ workspace, chỉ là entry chính chuyển sang workspace.
