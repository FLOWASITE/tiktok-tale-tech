## Mục tiêu

Mở rộng `SocialFormatPicker` từ 6 → 9 platform (thêm Pinterest, Threads, X), reorganize layout theo 2 nhóm: **Short-form Video** vs **Standard / Long-form**.

---

## 1. Mở rộng preset matrix (`src/types/socialFormat.ts`)

### Thêm 3 platform mới vào `SocialPlatform` type
```typescript
export type SocialPlatform =
  | 'tiktok' | 'reels' | 'shorts'
  | 'pinterest' | 'threads' | 'x'   // NEW
  | 'facebook' | 'linkedin' | 'youtube';
```

### Preset matrix mới (9 platform × 3 format = 27 preset)

| Platform | Short | Standard | Long | Aspect | channelKey | Group |
|---|---|---|---|---|---|---|
| TikTok | 15s | 30s | 60s | 9:16 | tiktok | Short-form |
| Reels | 15s | 30s | 60s | 9:16 | reels | Short-form |
| Shorts | 15s | 30s | 60s | 9:16 | shorts | Short-form |
| **Pinterest** | 15s | 30s | 60s | 9:16 | generic | Short-form |
| **Threads** | 15s | 30s | 60s | 9:16 | generic | Short-form |
| Facebook | 30s | 60s | 90s | 1:1 | facebook | Long-form |
| LinkedIn | 30s | 60s | 90s | 1:1 | generic | Long-form |
| **X / Twitter** | 30s | 60s | 140s | 1:1 | generic | Long-form |
| YouTube | 60s | 180s | 600s | 16:9 | youtube | Long-form |

### Mở rộng `Duration` type (`src/types/script.ts`)
- Thêm `140` vào union: `15 | 30 | 60 | 90 | 120 | 140 | 180 | 600`

### Thêm metadata group
```typescript
export type SocialGroup = 'short-form' | 'long-form';

export const SOCIAL_PLATFORM_GROUP: Record<SocialPlatform, SocialGroup> = {
  tiktok: 'short-form', reels: 'short-form', shorts: 'short-form',
  pinterest: 'short-form', threads: 'short-form',
  facebook: 'long-form', linkedin: 'long-form',
  x: 'long-form', youtube: 'long-form',
};

export const SOCIAL_GROUP_LABELS: Record<SocialGroup, { label: string; description: string }> = {
  'short-form': { label: 'Short-form Video', description: 'Vertical 9:16 · Hook nhanh · ≤ 60s' },
  'long-form':  { label: 'Standard / Long-form', description: 'Square 1:1 hoặc 16:9 · Storytelling' },
};
```

### Cập nhật `SOCIAL_PLATFORM_LABELS` cho 3 platform mới
- `pinterest`: "Pinterest" / "9:16 · Visual discovery, beauty fit"
- `threads`: "Threads" / "9:16 · Conversation-first"
- `x`: "X (Twitter)" / "1:1 · Punchy, text-overlay"

---

## 2. Cập nhật `SocialFormatPicker.tsx`

### Layout mới: 2 nhóm với header
```text
┌─ Short-form Video ────────── 9:16 · Hook nhanh ─┐
│  [TikTok] [Reels] [Shorts] [Pinterest] [Threads] │   ← grid-cols-5 (desktop) / cols-3 (mobile)
└──────────────────────────────────────────────────┘

┌─ Standard / Long-form ───── 1:1 hoặc 16:9 ─────┐
│  [Facebook] [LinkedIn] [X] [YouTube]            │   ← grid-cols-4 (desktop) / cols-2 (mobile)
└──────────────────────────────────────────────────┘

Độ dài · {tagline platform đang chọn}
[ Ngắn 15s ] [ Vừa 30s ] [ Dài 60s ]
```

### Thay đổi cụ thể
- Thay `PLATFORMS: SocialPlatform[]` bằng group split: `groupBy(PLATFORMS, SOCIAL_PLATFORM_GROUP)`
- Render 2 sections, mỗi section header dùng `SOCIAL_GROUP_LABELS`
- Responsive: `grid-cols-3 md:grid-cols-5` cho short-form, `grid-cols-2 md:grid-cols-4` cho long-form
- Bỏ chữ "Platform" header hiện tại (thay bằng group label)
- `PLATFORM_ICON_KEY`: thêm `pinterest: 'pinterest'`, `threads: 'threads'`, `x: 'x'`

---

## 3. Verify ChannelIcon hỗ trợ icons mới

Cần check `src/components/multichannel/streaming/ChannelIcon.tsx` đã có SVG cho `pinterest`, `threads`, `x`. Nếu thiếu → fallback sang generic hoặc bổ sung (codebase đã có integration cho cả 3 → khả năng cao đã có, sẽ verify lúc implement).

---

## 4. Update memory

Cập nhật `.lovable/memory/features/video/social-format-presets-vn.md`:
- Bảng matrix mới (9 platform)
- Note layout group split short-form / long-form
- Mở rộng Duration type include `140`

---

## Files thay đổi

- **Edit**: `src/types/socialFormat.ts` (thêm 3 platform, group metadata, 9 preset mới)
- **Edit**: `src/types/script.ts` (Duration type +140)
- **Edit**: `src/components/script/SocialFormatPicker.tsx` (layout 2 nhóm)
- **Verify/Edit**: `src/components/multichannel/streaming/ChannelIcon.tsx` (nếu thiếu icon)
- **Edit**: `.lovable/memory/features/video/social-format-presets-vn.md`

## Không đụng
- `ScriptFormStepper.tsx` — picker được mount nguyên không cần đổi prop
- `useScripts.ts` / `generate-script` edge — đã spread `aspect_ratio` + `social_format_id`
- `DurationSelector.tsx` — chỉ thêm `140` vào allowed durations nếu đang hardcode (sẽ check)
