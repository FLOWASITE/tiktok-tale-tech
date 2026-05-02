# Bổ sung UI cho SEO Linking (Keyword ↔ Content + Internal Links)

## Vấn đề
Lần trước đã build backend (`target_keyword_ids` column, RPC `find_related_content`, edge `suggest-internal-links`, `embed-content`) nhưng **chưa có UI** để dùng. Người dùng không thấy chỗ link keyword vào content, cũng không thấy gợi ý internal link.

## Phạm vi bổ sung

### 1. SEO Hub → Tab "Coverage" (mới)
Tab thứ 8 trong `AdminSeoHub.tsx`, đặt cạnh tab Ranks.

**Mục đích**: Bird-eye view xem keyword nào đã có content phủ, keyword nào còn "orphan".

**Layout**:
- **KPI cards**: Tổng keyword | Đã có content | Chưa phủ (orphan) | Avg content/keyword
- **Bảng Orphan Keywords** (priority cao chưa có content): cột Keyword, Volume, Priority, Cluster, nút "Tạo content" → mở `MultiChannelFormWizard` với keyword pre-fill vào topic.
- **Bảng Coverage** (keyword đã link): Keyword, số content liên kết, danh sách title content (popover), nút unlink.

Query: `seo_keywords` JOIN `multi_channel_contents` qua `target_keyword_ids @> ARRAY[keyword.id]`.

### 2. Keyword Picker khi tạo/sửa Multichannel Content
Component mới `KeywordTargetPicker.tsx` đặt vào `MultiChannelFormWizard` (bước Topic) và một nút "Edit keywords" trong viewer content.

**UX**:
- Multi-select combobox (search keyword theo `ilike`), chip hiển thị, max 5
- Hiển thị badge `volume`, `KD`, `intent` để user chọn đúng
- Lưu vào cột `target_keyword_ids` (uuid[]) khi submit/save

### 3. Internal Links Panel trong Content Viewer
Trong page xem chi tiết multichannel content (tìm component view, vd `ChannelGroupView` hoặc viewer page), thêm panel **"Gợi ý liên kết nội bộ"**:

- Nút "Quét gợi ý" → gọi edge `suggest-internal-links` với `content_id`
- Hiển thị list 5 content liên quan: title, similarity score, anchor đề xuất, nút "Copy link markdown" (`[anchor](/blog/<id>)`)
- Cache kết quả vào local state, có nút refresh

### 4. Auto-embed hook
Khi content multichannel được tạo/cập nhật `website_content`, tự động fire-and-forget gọi edge `embed-content` để cập nhật `content_embedding`. Đặt vào `useMultiChannelContent` save handler (tìm hook tương ứng).

## Technical details

### Files mới
- `src/components/admin/seo-keywords/CoverageTab.tsx`
- `src/components/admin/seo-keywords/OrphanKeywordsTable.tsx`
- `src/components/seo/KeywordTargetPicker.tsx` (reusable)
- `src/components/seo/InternalLinksPanel.tsx`
- `src/hooks/useKeywordCoverage.ts`
- `src/hooks/useInternalLinkSuggestions.ts`

### Files sửa
- `src/pages/AdminSeoHub.tsx` — thêm tab "Coverage" (icon `Link2`), grid-cols-7 → grid-cols-8
- `src/components/multichannel/MultiChannelFormWizard.tsx` — chèn `<KeywordTargetPicker>` ở step Topic
- Viewer content (xác định khi build: `ChannelGroupView` hoặc page chi tiết) — chèn `<InternalLinksPanel>` sidebar
- Hook lưu multichannel — thêm fire-and-forget `embed-content` invoke sau khi save thành công

### Không cần migration
Schema đã có sẵn từ batch trước (`target_keyword_ids`, `content_embedding`, RPC, edge functions).

### RLS
Mọi query đều filter `organization_id = currentOrganization.id` (multi-tenancy core rule).

## Out of scope
- Không thay đổi rank tracker hay embedding model
- Không tự động chèn link vào content (chỉ gợi ý + copy markdown — user quyết định chèn)
