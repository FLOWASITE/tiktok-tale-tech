## Mục tiêu
Trong mode "Cần cho SEO", nút **Gợi ý topic** chỉ hoạt động khi user đã chọn cả Pillar **và** ít nhất 1 Keyword target — tránh case AI gợi ý chung chung không bám context.

## Vấn đề hiện tại
`SuggestedTopicsFromKeyword.tsx`:
- Khi `!clusterId` → hiển thị hint, không có nút.
- Khi có `clusterId` nhưng `selectedKeywordIds = []` → nút "Gợi ý topic" vẫn enable, edge function vẫn chạy với toàn bộ uncovered keywords (không bias).

→ Gợi ý topic không thực sự gắn Pillar/Keyword như tên mode hứa hẹn.

## Giải pháp

### 1. `src/components/seo/SuggestedTopicsFromKeyword.tsx`
- Thêm prop `requireKeywords?: boolean` (default `false`, mode SEO truyền `true`).
- Khi `requireKeywords && selectedKeywordIds.length === 0`:
  - Disable nút "Gợi ý topic".
  - Thay caption thành: *"Chọn ít nhất 1 keyword target để AI gợi ý topic bám Pillar."*
  - Tooltip trên nút giải thích lý do disable.
- Giữ nguyên hành vi cũ cho idea-mode (không bắt buộc).

### 2. `src/components/multichannel/SeoFirstEntry.tsx`
- Truyền `requireKeywords={true}` cho `SuggestedTopicsFromKeyword`.
- Bỏ block hint `needKeywordHint` cũ (đã merge vào component con).
- Title section "3. Topic gợi ý từ keyword" → đổi thành **"3. Topic gợi ý từ Pillar + Keyword"** cho rõ ràng.

### 3. (Nhỏ) `supabase/functions/suggest-cluster-topics/index.ts`
- Khi nhận request mà `selectedKeywordIds.length === 0` từ SEO-mode (sau frontend gating, không nên xảy ra) → vẫn giữ logic cũ cho safety, không đổi.
- Thêm log `console.log('[suggest-cluster-topics] target keywords:', selectedKeywordIds.length)` để observability.

## Files sửa
- `src/components/seo/SuggestedTopicsFromKeyword.tsx` — thêm `requireKeywords` gating + UX message.
- `src/components/multichannel/SeoFirstEntry.tsx` — pass prop + đổi tiêu đề + bỏ hint trùng.
- `supabase/functions/suggest-cluster-topics/index.ts` — log nhỏ (optional, không đổi behavior).

## Không đụng
- Idea mode flow.
- Schema, RLS, edge function contract.
- `MultiChannelFormWizard`, `PillarKeywordSection`.

## Kết quả
- Mode "Cần cho SEO": nút Gợi ý topic chỉ active khi đủ Pillar + ≥1 Keyword → AI luôn bias đúng intent user chọn.
- Hint inline rõ ràng, không cần message rời rạc bên dưới.
