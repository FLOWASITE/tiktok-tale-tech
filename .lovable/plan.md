## Mục tiêu
Trên tab **Kịch bản** (`/videos`), mỗi kịch bản phải hiển thị rõ:
1. **Đã có scene clip** (từ `video_generations`) — bao nhiêu, đang quay hay xong
2. **Đã ghép phim hoàn chỉnh** (từ `video_render_jobs`) — đã có movie chưa

→ User nhìn list là biết ngay kịch bản nào còn dang dở vs. đã xong full pipeline (clip → merge).

## Trạng thái hiển thị (hierarchy)

```
Có movie completed?  →  Badge "🎞 Đã ghép phim"  (emerald, ưu tiên cao nhất)
Có movie processing? →  Badge "🎞 Đang ghép…"   (amber + dot pulse)
Có clip completed?   →  Badge "🎬 N/Total scene" (neutral / emerald nếu đủ)
Có clip processing?  →  Badge "🎬 Đang quay N…" (amber + dot pulse)
Không có gì          →  (không badge)
```

Tooltip gộp đầy đủ thông tin: `"3/5 scene đã quay · 1 phim đã ghép xong · 1 đang xử lý"`.

## Các thay đổi

### 1. Hook mới: `src/hooks/useScriptsMediaStatus.ts`
Input: `scriptIds: string[]`
Hai query song song (Promise.all), scoped theo RLS user/org:
- `video_generations`: `select('script_id,status').in('script_id', ids)`
- `video_render_jobs`: `select('script_id,status').in('script_id', ids)`

Group thành map:
```ts
Map<scriptId, {
  clips:  { total, completed, processing };
  movies: { total, completed, processing };
}>
```

Realtime: 2 channel subscribe theo `user_id=eq.${user.id}` (clips) và filter `script_id IN ...` cho movies (hoặc subscribe broad rồi lọc client-side như `useScriptMovies` đang làm). Khi có thay đổi → refetch debounced (200ms).

### 2. `src/components/video/ScriptsTab.tsx`
- Memo `scriptIds`
- Gọi `useScriptsMediaStatus(scriptIds)` → `mediaMap`
- Truyền `mediaStatus={mediaMap.get(script.id)}` xuống `ScriptCard` và `ScriptListView`

### 3. `src/components/ScriptCard.tsx`
Thêm prop `mediaStatus?: { clips, movies }`.

Render 1 hàng "media status" ngay dưới meta-chips (chỉ khi có dữ liệu):
- **Movie completed** → Badge `Film` icon, `bg-emerald-500/10 text-emerald-700 border-emerald-500/20`, text `"Đã ghép phim"` (nếu >1: `"N phim"`)
- **Movie processing/pending** → Badge amber + `Loader2` spin, text `"Đang ghép phim…"`
- **Clips only**:
  - `completed === total > 0` → emerald soft `"🎬 N scene"` 
  - `processing > 0` → amber + dot pulse `"🎬 Đang quay N/Total"`
  - mix → neutral `"🎬 N/Total scene"`

Có thể hiện cả 2 badge (movie + clips) cạnh nhau nếu cùng tồn tại — movie ưu tiên bên trái.

Tooltip tổng hợp khi hover.

### 4. `src/components/ScriptListView.tsx`
Cùng prop, render mini badge trong cột phụ (hoặc cuối cột title).

## Acceptance
- Script có ≥1 clip completed → thấy badge clip xanh trên card
- Script có movie `completed` → thấy badge "Đã ghép phim" emerald (ưu tiên)
- Đang quay/đang ghép → badge amber có dot pulse, tự update realtime khi xong
- Script chưa có gì → không hiện badge, layout giữ nguyên
- Không tạo N+1 query (2 query batch cho toàn bộ scripts trong page)

## Ghi chú kỹ thuật
- Tận dụng RLS hiện có; không thay schema
- Re-use icon `Film` (movie) vs `Clapperboard` (clips) cho phân biệt trực quan
- Style theo Soft Luxury: tránh màu rực, ưu tiên emerald/amber soft với border 20% opacity
