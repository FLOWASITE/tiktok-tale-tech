
# Hoàn thiện Merge Video Scripts & Video Studio

## Vấn de hiện tại

1. **Dead imports**: `Index.tsx` (page `/scripts` cũ) và `ScriptNew.tsx` vẫn được import trong `routes.tsx` nhưng không dùng (chỉ redirect)
2. **Stale link**: `TopicQuickPreview.tsx` line 105 vẫn trỏ `/scripts?view=...` thay vì `/videos?tab=scripts&view=...`
3. **Thiếu deep-link**: `ScriptsTab` chưa hỗ trợ URL param `?view=scriptId` để auto-open ScriptViewer khi navigate từ nơi khác
4. **ScriptsTab UX**: Khi đã merge vào Video Studio, nút "Chuyển sang Video" trong ScriptViewer nên switch tab trong cùng page thay vì navigate lại `/videos`

## Thay doi

### 1. Cleanup dead imports trong `routes.tsx`
- Xoa import `Index` va `ScriptNew` (2 pages khong con dung truc tiep)

### 2. Fix stale link trong `TopicQuickPreview.tsx`
- Line 105: doi `'/scripts?view=...'` thanh `'/videos?tab=scripts&view=...'`

### 3. Deep-link support trong `ScriptsTab`
- Doc URL param `view` tu `location.search`
- Neu co `view=scriptId`, tim script tuong ung va auto-open `ScriptViewer`

### 4. VideoStudioPage: truyen URL search params xuong ScriptsTab
- Doc `?view=` param va truyen vao `ScriptsTab` de auto-open script

### 5. ScriptsTab: "Chuyen sang Video" tab switch
- Nhan prop `onSwitchTab` tu `VideoStudioPage`
- Khi user click "Quay voi Video Studio" trong ScriptViewer, goi `onSwitchTab('quick')` thay vi navigate

## Files thay doi
- `src/app/routes.tsx` — xoa 2 dead imports
- `src/components/topic/TopicQuickPreview.tsx` — fix link
- `src/components/video/ScriptsTab.tsx` — them deep-link + onSwitchTab prop
- `src/pages/VideoStudioPage.tsx` — truyen view param + onSwitchTab callback
