
# Hoàn thiện UI Video đã tạo

## Các cải tiến

### 1. Video Gallery Tab (Thư viện chính)
- Thêm `ModelUsedBadge` hiển thị model đã dùng (Seedance 2, Veo 3.1 Fast, v.v.) trên mỗi card
- Aspect-ratio-aware video preview: card 9:16 hiện đúng tỉ lệ dọc thay vì ép `aspect-video` (16:9) cho tất cả
- Dùng `LazyVideo` thay vì `<video>` trực tiếp (tiết kiệm bandwidth, UX tốt hơn)
- Thêm generation time badge (VD: "Render trong 45s") khi có `generation_time_ms`
- Thêm cost estimate badge khi có `cost_estimate`

### 2. Quick Clip Tab - Active Job Result
- Thêm `ModelUsedBadge` vào kết quả video hoàn thành
- Thêm `PublishVideoMenu` ngay dưới video hoàn thành để publish nhanh
- Thêm nút Download trực tiếp bên cạnh publish

### 3. VideoJobStatusPanel (Trạng thái realtime)
- Thêm `ModelUsedBadge` thay vì text thô `model_used`
- Video preview dùng `LazyVideo` thay vì auto-load `<video>`
- Aspect-ratio-aware preview thay vì cố định `aspect-video`

### 4. ScriptSceneGrid (Lưới scene kịch bản)
- Thêm `ModelUsedBadge` khi clip đã hoàn thành
- Thêm `PublishVideoMenu` trong dropdown menu cho scene đã render

### 5. ScriptMovieGallery (Phim đã ghép)
- Thêm `ModelUsedBadge` cho model đã dùng
- Dùng `LazyVideo` cho phim đã ghép

### 6. ScriptVideoGalleryGrouped - VersionCard
- Thêm `ModelUsedBadge` cho mỗi version
- Hiển thị duration + generation time

## Technical Details

**Files cần sửa:**
- `src/components/video/VideoGalleryTab.tsx` - import ModelUsedBadge, LazyVideo, PublishVideoMenu; cập nhật card layout
- `src/components/video/QuickClipTab.tsx` - thêm actions row cho active job completed
- `src/components/script/VideoJobStatusPanel.tsx` - dùng ModelUsedBadge + LazyVideo
- `src/components/script/ScriptSceneGrid.tsx` - thêm ModelUsedBadge + PublishVideoMenu
- `src/components/script/ScriptMovieGallery.tsx` - dùng LazyVideo
- `src/components/script/ScriptVideoGalleryGrouped.tsx` - thêm ModelUsedBadge + duration info

**Không cần migration hay edge function changes** - chỉ là cải thiện frontend UI.
