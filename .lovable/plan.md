# Chèn link nội bộ trực tiếp vào editor

## Mục tiêu
Thay vì chỉ "Copy MD", người dùng bấm 1 nút **Chèn vào nội dung** trên mỗi gợi ý internal link → markdown `[anchor](url)` được paste tự động vào cuối `website_content` / `blogger_content` / `wordpress_content` của bài long-form đang mở, lưu DB ngay, refetch viewer.

## Thay đổi

### 1. `src/components/seo/InternalLinksPanel.tsx`
- Thêm 2 props mới (optional):
  - `onInsertLink?: (markdown: string) => Promise<void> | void`
  - `insertTargetLabel?: string` (vd "Website", "Blogger" — show trên tooltip)
- Mỗi card gợi ý: thêm nút **Chèn** (icon `Plus` hoặc `ArrowDownToLine`) bên cạnh "Copy MD". Hiển thị khi `onInsertLink` được truyền.
  - Click → gọi `onInsertLink('[anchor](url)\n')` rồi `toast.success("Đã chèn link vào nội dung")`.
  - Disable nhẹ + spinner trong lúc await.
- Card "Đã duyệt" (saved): cũng thêm nút **Chèn lại** với cùng handler.

### 2. `src/components/seo/SeoInsightsSheet.tsx`
- Thêm props pass-through: `onInsertLink?`, `channelLabel?` (đã có).
- Truyền xuống `<InternalLinksPanel onInsertLink={onInsertLink} insertTargetLabel={channelLabel} />`.

### 3. `src/components/MultiChannelViewer.tsx`
- Tại chỗ render `<SeoInsightsSheet ... />` (line ~1251), bổ sung handler:
  ```ts
  const handleInsertSeoLink = async (markdown: string) => {
    if (!onUpdateContent || !content) return;
    const current = getContentForChannel(content, selectedChannel) 
                  || (content as any).website_content || '';
    const next = current.trimEnd() + '\n\n' + markdown;
    await onUpdateContent(content.id, selectedChannel, next);
  };
  ```
- Pass `onInsertLink={handleInsertSeoLink}` vào `SeoInsightsSheet`.
- Chỉ kích hoạt khi `isLongForm === true` (channel website/blogger/wordpress) — với short-form, `onInsertLink` không truyền → nút ẩn.

## Edge cases
- Nếu user đang trong chế độ edit chưa save: vẫn ghi đè bằng giá trị DB hiện tại (consistent với regenerate flow line 482-504). Toast cảnh báo nhẹ "Đã chèn vào bản đã lưu — hãy reload editor".
- Đã chèn rồi vẫn cho chèn lại (không dedupe) — user có thể đặt link ở nhiều vị trí khác nhau.
- Với bài chưa có nội dung kênh đó (vd mở tab Blogger nhưng chỉ có website_content): chèn vào string rỗng → tạo nội dung mới chứa duy nhất link. Không nên — sẽ thêm guard: nếu `current.trim() === ''` → toast warning "Kênh này chưa có nội dung, không thể chèn link" và return.

## Không thay đổi
- Edge function `suggest-internal-links` (đã đúng).
- Bảng `internal_links` (vẫn lưu approval khi user bấm "Lưu N liên kết đã chọn").
- Short-form channels (FB/IG/...) vẫn dùng flow ExternalLinkPicker riêng.
