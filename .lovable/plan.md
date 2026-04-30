## Mục tiêu

Đồng bộ 3 loại card sang ngôn ngữ **Soft Luxury** (neutral gray accents, minimal spacing, brand color làm điểm nhấn duy nhất), tăng density trên desktop và responsive tốt hơn trên mobile. **Không** load video metadata làm thumbnail — giữ text-based + visual cue gradient/icon.

---

## A. ScriptCard.tsx (grid `/scripts`)

**Vấn đề hiện tại**
- 5 dòng dọc xếp đều nhau → không có hierarchy, mọi thứ cùng cân nặng
- Brand chỉ là 1 dot 2px + icon nhỏ, dễ bỏ qua
- Meta line `15s · short · Bắc · Độc thoại` chiếm 1 dòng riêng nhưng nhàm
- Action bar có border-top tạo cảm giác thừa
- Mobile: padding `p-4` + nhiều dòng làm card cao 240px+ → 1 cột mobile thấy lèo tèo

**Thay đổi**

1. **Brand color accent strip** (4px) ở mép trái card thay cho dot nhỏ
   - `before:absolute before:left-0 before:top-4 before:bottom-4 before:w-[3px] before:rounded-full` style theo `brand.primary_color`
   - Fallback `bg-border` nếu không có brand
2. **Hero block** (title + content preview) chiếm trọng tâm, font-size title nâng `text-[15px]` desktop, giữ `text-sm` mobile
3. **Meta chips** thay "·" separator: dùng 3 small chips neutral `bg-muted/40 text-[10px] px-1.5 py-0.5 rounded` cho duration / video_type / dialogue (bỏ voice region — ít giá trị quét nhanh, đẩy vào tooltip brand chip)
4. **Footer 1 hàng**: avatar creator (size 5x5) + relative time + actions (Eye / Schedule / Trash) căn phải. Bỏ border-top, dùng `mt-auto` + `pt-2`
5. **Hover**: thay `hover:-translate-y-0.5` bằng `hover:bg-card` + `hover:ring-1 hover:ring-border` (Soft Luxury, không lift)
6. **Density**: padding `p-3.5` thay `p-4`, gap-y giảm `space-y-2.5`. Mục tiêu card cao ~180px desktop
7. **Responsive grid** (giữ trong Index.tsx): `grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5` — thêm 2xl 5 cột cho màn rộng
8. **Status badge**: di chuyển vào góc trên phải absolute (size mini), tách khỏi flex row 1 → row 1 chỉ còn purpose label + brand strip giải phóng không gian

```text
┌─────────────────────────────────┐
│▌WAND2 AI Video           ●done │  ← strip màu brand bên trái, status absolute
│                                 │
│ Title 2 dòng quan trọng nhất    │
│ preview content line 1 dòng     │
│                                 │
│ [15s] [short] [độc thoại]       │  ← chips meta
│                                 │
│ ◉ Quân  · 2h trước    👁 📅 🗑 │  ← footer 1 hàng
└─────────────────────────────────┘
```

---

## B. SceneCard trong `ScriptSceneGrid.tsx` (tab Video)

**Vấn đề**
- Preview area `aspect-video` luôn render `<video>` element cho clip completed → mỗi card load metadata, 6 scenes = 6 requests
- Status badge chồng lên video ở top-left + scene number top-right → rối
- Body có duration line riêng, action row chiếm 2 row

**Thay đổi**

1. **Preview lazy**: chỉ render `<video preload="none" poster={...}>` khi card vào viewport (IntersectionObserver) HOẶC khi user click "Play preview" overlay. Mặc định show `<img>` từ `clip.thumbnail_url` nếu BE có, fallback gradient + icon. → giữ nguyên principle "không load video metadata"
2. **Status indicator** chuyển sang **dot + label inline ở body**, không đè lên preview area:
   - Dot 6px (`bg-emerald-500` / `bg-amber-500 animate-pulse` / `bg-destructive` / `bg-muted`)
   - Label `text-[10px] text-muted-foreground`
3. **Scene number** badge giữ ở top-left preview (vai trò nhận diện chính), bỏ status badge ở góc
4. **Meta inline với status**: `● Hoàn thành · 8s · 9:16` 1 hàng duy nhất, bỏ duration row riêng
5. **Action row** giữ Render + ExternalLink, thêm dropdown menu (•••) cho Re-render / Download / Open Studio / Delete khi đã completed → tiết kiệm chiều ngang
6. **Density**: padding body `p-2.5`, gap `gap-1.5`. Card tổng ~220px (preview 16:9 + body 80px)
7. **Grid**: `grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` — thêm xl 4 cột (hiện max lg 3)

---

## C. VersionCard trong `ScriptVideoGalleryGrouped.tsx` (gallery)

**Vấn đề**
- Cùng vấn đề auto-load video metadata khi scene mở accordion
- "Mới nhất" badge + time + 2 action icons squeeze vào 1 row chật, mobile overflow
- Card không phân biệt rõ version cũ vs mới ngoài badge xanh nhỏ

**Thay đổi**

1. **Lazy video** giống SceneCard — `preload="none"`, click-to-play overlay với play icon center
2. **"Mới nhất" version**: thêm subtle `ring-1 ring-emerald-500/30` quanh card thay vì chỉ badge text → quét nhanh hơn
3. **Footer 2 hàng compact** trên mobile:
   - Hàng 1: badge "Mới nhất" (nếu có) + time
   - Hàng 2: actions căn phải full-width
4. **Bỏ border riêng** quanh từng version card, dùng `bg-muted/30` + rounded `rounded-md` (nested trong accordion đã có border) → giảm visual noise
5. **Grid versions**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (hiện max sm 2)
6. **Aspect badge** nhỏ góc trên phải preview: `9:16` / `1:1` / `16:9` — giúp phân biệt nhanh khi 1 scene có nhiều version aspect khác

---

## D. Shared utility — `src/components/ui/lazy-video.tsx` (mới)

Component dùng chung cho B + C:
```tsx
<LazyVideo src={url} aspectRatio="9:16" poster={thumb} className="..." />
```
- Default state: gradient `from-muted/40 to-muted/20` + center play icon
- Click → swap sang `<video controls preload="metadata" autoPlay>`
- Props: `src`, `poster?`, `aspectRatio?: '16:9' | '9:16' | '1:1'`, `className?`

---

## E. Memory update

Tạo mới `mem://ui-ux/script-card-system-vn.md`:
- 3 loại card: ScriptCard / SceneCard / VersionCard
- Brand color strip 3px left edge cho ScriptCard
- LazyVideo component pattern (poster + click-to-play, không auto preload metadata)
- Dot+label status thay vì badge to
- Meta chips neutral muted/40 thay separator dấu chấm

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/ScriptCard.tsx` | Brand strip, meta chips, footer compact, status absolute, hover ring |
| `src/components/script/ScriptSceneGrid.tsx` | Dùng LazyVideo, status dot+label inline, dropdown actions, xl 4 cột |
| `src/components/script/ScriptVideoGalleryGrouped.tsx` | LazyVideo, ring xanh cho latest, aspect badge, lg 3 cột |
| `src/components/ui/lazy-video.tsx` | **Mới** — wrapper poster + click-to-play |
| `src/pages/Index.tsx` | Grid breakpoint `2xl:grid-cols-5` |
| `.lovable/memory/ui-ux/script-card-system-vn.md` | **Mới** — design specs |

## Không đụng
- Logic data (`useScripts`, `useScriptVideoGenerations`)
- Filters, pagination, ScriptListView (list mode dùng table riêng)
- Edge functions / DB schema
