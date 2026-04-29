## Mục tiêu

Khép kín vòng liên kết hai chiều **Kịch bản ↔ Video Studio**. Hiện tại luồng đi (Script → Studio) đã chạy mượt, nhưng luồng về (Studio → Script) và điều hướng per-scene còn thiếu, khiến user không thấy được "scene này đã quay chưa, clip ra sao".

---

## 3 phần bổ sung

### 1. Reverse-link strip trong `ScriptViewer.tsx`

Dưới mỗi scene card (khi `script_purpose === 'ai_video'`), hiển thị một strip nhỏ:

```text
┌─────────────────────────────────────────────────┐
│ [thumb 48×64]  ✓ Đã quay · 5s · 9:16            │
│                "Cận cảnh sản phẩm xoay 360°…"   │
│                                  [▶ Xem] [↻ Quay lại] │
└─────────────────────────────────────────────────┘
```

Trạng thái:
- **Chưa quay** → strip mờ, nút duy nhất `[🎬 Quay scene này]`.
- **Đang xử lý** (`status='processing'`) → spinner + `Đang render…`.
- **Đã quay** (`status='completed'`) → thumbnail + nút `[▶ Xem]` (mở dialog preview) + `[↻ Quay lại]` (re-generate scene).
- **Lỗi** (`status='failed'`) → badge đỏ nhạt + `[↻ Thử lại]`.

**Data**: query `video_generations` lọc theo `script_id = script.id`, group theo `scene_number`. Dùng TanStack Query với realtime channel để auto-update khi clip xong.

### 2. CTA per-scene "Quay scene này"

Trong nút strip trên (state "chưa quay"), click `[🎬 Quay scene này]` sẽ:

```typescript
navigate('/videos', {
  state: {
    fromScript: {
      script: { id, title, scenes: parsedPrompts.map(...) },
      activeSceneIndex: N - 1   // jump thẳng tới scene N
    }
  }
});
```

`VideoStudioPage` đã hỗ trợ `activeSceneIndex` — chỉ cần truyền đúng index.

### 3. Filter theo script trong `VideoGalleryTab.tsx`

Thêm dropdown phía trên grid:

```text
[Tất cả ▾] [Script: Review serum X ▾] [Aspect: 9:16 ▾]
```

- Query distinct `script_id` từ `video_generations` của user, join `scripts.title`.
- Khi chọn 1 script → filter clips, đồng thời sort theo `scene_number ASC`.
- Mỗi clip card đã có badge "Scene N" (đã làm) — thêm mini-link `→ Mở kịch bản` mở `/scripts` với scrollTo script đó.

---

## Files

**Mới**:
- `src/components/scripts/SceneVideoStrip.tsx` — strip hiển thị status + actions cho 1 scene.
- `src/hooks/useScriptVideoGenerations.ts` — fetch + realtime cho `video_generations` theo `script_id`.

**Sửa**:
- `src/components/ScriptViewer.tsx` — render `<SceneVideoStrip>` dưới mỗi scene card khi purpose là `ai_video`.
- `src/components/video/VideoGalleryTab.tsx` — thêm script filter dropdown.

---

## Phạm vi & rủi ro

- Không đụng schema, edge function, AI provider.
- `useScriptVideoGenerations` có RLS sẵn (`organization_id`) nên an toàn.
- Realtime channel cleanup đúng khi unmount tránh leak.
- Backward compatible: script không phải `ai_video` không thấy strip.

---

## UX kết quả

User mở kịch bản 5 scene → mỗi scene có strip riêng:
- Scene 1, 2, 3 đã quay → thumbnail + nút Xem.
- Scene 4 đang render → spinner.
- Scene 5 chưa quay → nút "Quay scene này".

Click "Quay scene 5" → vào Studio, banner hiện `0/5`, QuickClip auto-fill scene 5. Quay xong → quay lại ScriptViewer thấy thumbnail Scene 5 ngay (realtime).

Trong Gallery, lọc theo script "Review serum X" → thấy đúng 5 clip của kịch bản đó, sắp xếp theo scene.
