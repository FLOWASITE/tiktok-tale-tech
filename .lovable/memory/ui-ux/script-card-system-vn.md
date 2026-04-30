---
name: Script Card System
description: 3 loại card video script (ScriptCard list, SceneCard tab Video, VersionCard gallery) — Soft Luxury specs với LazyVideo và brand color strip
type: design
---

# Script Card System

## 3 loại card

### 1. ScriptCard (`src/components/ScriptCard.tsx`)
Dùng trong grid `/scripts`.
- **Brand color strip** 3px ở mép trái (`absolute left-0 top-3 bottom-3 w-[3px]`), màu theo `brand.primary_color`, fallback `border`
- **Status badge** absolute top-right, không nằm trong flex row
- **Hero block** (title 14-15px + 1 dòng content preview)
- **Meta chips** neutral `bg-muted/50 text-[10px] px-1.5 py-1 rounded` cho duration/video_type/dialogue_style (bỏ voice region — đẩy vào tooltip brand)
- **Footer 1 hàng**: CreatorCell + relative time + 3 icon actions (Eye/Schedule/Trash) căn phải, KHÔNG border-top
- **Hover**: `hover:bg-card hover:ring-1 hover:ring-border hover:shadow-sm` (không lift translate)
- **Density**: `pl-4 pr-3.5 py-3.5` + `space-y-2.5` + `min-h-[170px]`

### 2. SceneCard (`src/components/script/ScriptSceneGrid.tsx`)
Card mỗi scene trong tab Video.
- **LazyVideo** thay `<video>` direct (preload="none", click-to-play)
- **Scene number** badge top-left preview (background/85 backdrop-blur)
- **Status indicator** = dot 1.5px + label inline ở body, KHÔNG đè lên preview
  - emerald-500 = completed, amber-500 animate-pulse = processing, destructive = failed, muted = chưa render
- **Meta inline 1 hàng**: `● Hoàn thành · 8s · 9:16`
- **Actions**: nút Render/Re-render full-width + DropdownMenu (•••) cho Open Studio / Mở video / Tải về
- **Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

### 3. VersionCard (`src/components/script/ScriptVideoGalleryGrouped.tsx`)
Card từng version clip trong accordion gallery.
- **LazyVideo** thay direct video
- **Latest version**: `ring-1 ring-emerald-500/40` + badge "Mới nhất"; non-latest `ring-1 ring-border/30`
- **Aspect badge** top-right preview (`9:16` / `1:1` / `16:9`)
- **Footer responsive**: stack vertical mobile, horizontal sm+; actions căn phải
- **Grid**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## LazyVideo (`src/components/ui/lazy-video.tsx`)

Component dùng chung tránh auto-load video metadata cho nhiều card cùng lúc.

```tsx
<LazyVideo src={url} aspectRatio="9:16" poster={thumb} />
```

- Default state: poster image (nếu có) HOẶC gradient `from-muted/50 to-muted/20` + center play button (40px circle, bg-background/85, ring-border/40)
- Click → swap sang `<video controls autoPlay preload="metadata">`
- aspectRatio: `'16:9' | '9:16' | '1:1'` map sang `aspect-video / aspect-[9/16] / aspect-square`

## Index.tsx grid

`grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` — thêm 2xl 5 cột cho màn rộng.

## Nguyên tắc Soft Luxury áp dụng

- KHÔNG dùng badge to + màu rực; ưu tiên dot+label hoặc ring nhẹ
- KHÔNG hover lift (translate-y); dùng ring + bg shift
- Meta = chips neutral muted/50, không emoji
- Border `border-border/40` chứ không `/60`+
- Brand color chỉ xuất hiện như accent strip, không tô fill
