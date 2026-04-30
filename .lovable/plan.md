## Đánh giá Step 2 hiện tại

**Điểm mạnh**
- Đã có 2 group Short-form / Long-form rõ ràng
- Header step có icon, title, subtitle gọn
- Summary card + Collapsible "Tinh chỉnh thủ công"

**Điểm yếu cần xử lý**
1. **Không có preset nào được chọn mặc định** khi vào step → `currentPreset = undefined`, summary hiện "Mặc định · 60s · 9:16" (formData.duration kế thừa từ step trước, có thể không khớp aspect)
2. **`activePlatform` state không sync** khi user nhấn từ group khác → đã sync, nhưng khi `value` thay đổi từ ngoài thì state cũ vẫn giữ
3. **Không có visual preview** aspect ratio (9:16 vs 1:1 vs 16:9) — khó hình dung
4. **Format card thiếu thông tin** — chỉ hiện "Ngắn / 15s / 9:16", thiếu mô tả tone/use-case (đã có `preset.description` nhưng chưa hiển thị)
5. **Cảnh báo split scene** ở dưới cùng dễ bị bỏ qua, nên rõ ràng hơn (chia bao nhiêu scene, ước tính cost/thời gian gen)
6. **Summary card tách rời** với picker → khoảng cách thừa, có thể merge hoặc làm sticky
7. **Không có "Recommend"** badge cho preset phổ biến nhất theo platform (vd TikTok Standard 30s)
8. **Mobile**: 5 cột short-form trên mobile chỉ 3 cột → wrap thành 2 hàng (Pinterest + Threads xuống dòng) — OK nhưng có thể horizontal scroll cho clean
9. **Không có keyboard shortcut** / arrow keys để duyệt
10. **`formatsForPlatform` useMemo unused** trong `SocialFormatPicker` — dead code

---

## Plan hoàn thiện Step 2

### A. SocialFormatPicker.tsx — nâng cấp UX

#### A1. Mặc định preset khi vào step
- Trong `ScriptFormStepper`: nếu `isVideoAi && currentStep === STEP_SOCIAL_FORMAT && !formData.social_format_id` → auto-set `tiktok-standard` (default phổ biến nhất)
- Hoặc infer từ `(formData.duration, formData.aspect_ratio)` nếu user vào lại step

#### A2. Thêm visual aspect-ratio preview
- Mỗi format card: thêm mini-rectangle (div absolute scale theo ratio) bên cạnh duration
- VD 9:16 → mini box `w-3 h-5`, 1:1 → `w-4 h-4`, 16:9 → `w-5 h-3`
- Màu neutral `bg-foreground/20` với border

#### A3. Format card giàu thông tin hơn
- Hiển thị `preset.description` (1 dòng tone/use-case) bên dưới shortLabel
- Layout card mới (vertical):
```
┌─ Ngắn          ✓ ─┐
│  15s         [▮]   │   ← shortLabel + aspect mini
│  9:16              │
│  Punchy hook       │   ← description (truncate)
└────────────────────┘
```

#### A4. "Recommended" badge
- Mỗi platform có 1 preset "recommended" (mặc định = `standard`)
- Thêm field `recommended?: boolean` vào preset hoặc derive: `format === 'standard'` cho mọi platform
- Hiển thị badge `⭐ Phổ biến` góc phải card

#### A5. Cảnh báo split scene rõ hơn
- Thay text 1 dòng bằng alert card (info style) khi `duration > 60`:
```
┌─ ⓘ Video sẽ chia thành 6 scenes ──┐
│  Mỗi scene 10s do giới hạn AI       │
│  model. Ước tính: ~3 phút render.   │
└─────────────────────────────────────┘
```

#### A6. Bỏ dead code
- Xóa `formatsForPlatform` useMemo unused

#### A7. Mobile horizontal scroll cho 5+ platform
- Thay `grid-cols-3 md:grid-cols-5` bằng `flex overflow-x-auto md:grid md:grid-cols-5` cho short-form
- Add `snap-x snap-mandatory` để snap từng card
- Hidden scrollbar

### B. ScriptFormStepper.tsx — Step 2 container

#### B1. Auto-default preset khi vào step
```tsx
useEffect(() => {
  if (isVideoAi && currentStep === STEP_SOCIAL_FORMAT && !formData.social_format_id) {
    const defaultPreset = SOCIAL_FORMAT_PRESETS.find(p => p.id === 'tiktok-standard');
    if (defaultPreset) {
      setFormData(prev => ({
        ...prev,
        social_format_id: defaultPreset.id,
        duration: defaultPreset.duration,
        aspect_ratio: defaultPreset.aspectRatio,
      }));
    }
  }
}, [currentStep, isVideoAi]);
```

#### B2. Step 2 hero section gọn lại
- Bỏ icon-circle to (12x12) → thay bằng inline icon nhỏ kế title
- Subtitle ngắn hơn, bỏ nhấn "thời lượng / tỷ lệ khung hình / tone"
- Tiết kiệm vertical space cho picker

#### B3. Summary card sticky bottom
- Khi user scroll picker, summary card stick xuống dưới (`sticky bottom-0`)
- Background blur + shadow nhẹ
- Hiển thị: preset name · duration · aspect · estimated scenes

#### B4. Quick-pick chips ở top step (tùy chọn)
- 3 chip lựa chọn nhanh: "TikTok 30s" · "Reels 15s" · "YouTube 60s"
- Click → set preset luôn, không cần duyệt 2 group
- Đặt ngay dưới hero, trước picker chính

### C. socialFormat.ts — bổ sung field

- Thêm `recommended?: boolean` vào interface, set true cho preset `standard` của mỗi platform
- Thêm helper `getRecommendedPresets(): SocialFormatPreset[]` trả 3 preset cho quick-pick (TikTok Standard, Reels Short, YouTube Short)
- Thêm `getEstimatedScenes(duration: number)` và `getEstimatedRenderMinutes(scenes)` cho cảnh báo

### D. Memory update

Cập nhật `social-format-presets-vn.md`:
- Note auto-default `tiktok-standard` khi vào step rỗng
- Note quick-pick chips, recommended badge
- Note aspect-ratio mini visual
- Note sticky summary

---

## Files thay đổi

| File | Thay đổi |
|---|---|
| `src/types/socialFormat.ts` | + `recommended` field, helpers `getRecommendedPresets`, `getEstimatedScenes` |
| `src/components/script/SocialFormatPicker.tsx` | Format card mới (description + aspect mini), recommended badge, alert card, mobile scroll, bỏ dead code |
| `src/components/script/ScriptFormStepper.tsx` | Auto-default preset effect, hero gọn, sticky summary, quick-pick chips (optional) |
| `.lovable/memory/features/video/social-format-presets-vn.md` | Update specs |

## Không đụng
- `DurationSelector.tsx` (đã ổn sau lần thêm 140s)
- `useScripts.ts`, edge functions

---

## Câu hỏi chốt scope

Tôi đề xuất **làm tất cả A1–A7 + B1–B3** (nâng cấp lõi). **B4 quick-pick chips** là nice-to-have, có thể skip nếu muốn giữ step focus.

Cho mình xác nhận:
1. Có làm **B4 quick-pick chips** không?
2. Default preset khi vào step rỗng — chọn **TikTok Standard 30s** (phổ biến nhất) hay **Reels Short 15s** (beauty industry fit)?
