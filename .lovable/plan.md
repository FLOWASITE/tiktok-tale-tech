## Mục tiêu
Khi user mở **SEO Hub → Discover → AI Research Lab** với một brand active, ô **Seed keywords** sẽ tự động được điền từ `content_pillars` của brand đó, để workflow "brand mới → research" mượt hơn — không phải nhập tay.

## Nguồn dữ liệu
- `useCurrentBrand()` (BrandContext) → `currentBrand.content_pillars: ContentPillar[]`
- Mỗi pillar có shape: `{ name: string; weight: number; keywords: string[]; color?: string }`

## Logic pre-fill
Trong `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`:

1. Import `useCurrentBrand` từ `@/contexts/BrandContext`.
2. Tính `suggestedSeeds` từ `currentBrand?.content_pillars`:
   - Sort pillars theo `weight` desc.
   - Với mỗi pillar lấy `keywords[0]` (keyword đại diện); nếu pillar không có keywords → dùng `name`.
   - Dedupe (case-insensitive, trim) và cắt còn **tối đa 5 dòng** (đúng giới hạn seed).
3. **Auto-fill chỉ khi `seedsText` còn rỗng** và brand đổi:
   - `useEffect` deps `[currentBrand?.id]`: nếu `seedsText.trim() === ""` và có suggestions → `setSeedsText(suggestions.join("\n"))`.
   - Không ghi đè nếu user đã gõ.
4. Thêm UI hint nhỏ:
   - Nếu có suggestions và user đã xoá hết → hiện 1 hàng chip "Gợi ý từ brand <tên>" với nút **"Dùng gợi ý"** để re-fill thủ công.
   - Nếu brand chưa có content_pillars → không show gì (giữ placeholder cũ).
5. Cập nhật `placeholder` của Textarea thành `"Auto-fill từ content pillars của brand, hoặc gõ tay..."` khi có brand active.

## Files thay đổi
- **Edit**: `src/components/admin/seo-keywords/KeywordResearchLabTab.tsx`
  - Import `useCurrentBrand`
  - Thêm `useMemo` tính `suggestedSeeds`
  - Thêm `useEffect` auto-fill khi brand đổi và seeds trống
  - Thêm hint chip + nút "Dùng gợi ý"

## Không thay đổi
- Edge function `keyword-research-v2`: không cần đổi (vẫn nhận `seeds` array).
- Không gắn keyword vào brand ở DB layer — keyword vẫn scope theo `organization_id` như cũ. Brand chỉ dùng làm gợi ý input.
- Không động tới `KeywordPreviewTable`, `IntentFunnelMatrix`, history jobs.

## Edge cases
- **Không có brand active** → không pre-fill, giữ behavior hiện tại.
- **Brand không có content_pillars** → không show suggestions.
- **User đổi brand giữa session** → chỉ auto-fill nếu textarea còn rỗng; nếu đã gõ thì show chip "Dùng gợi ý từ <brand mới>" để user chủ động chọn.
- **Pillar keywords trùng nhau** → dedupe.

## QA
1. Tạo brand mới có 3 pillars với keywords → vào Research Lab → seed text auto-fill 3 dòng.
2. Gõ tay rồi đổi brand → text giữ nguyên, hint chip xuất hiện.
3. Brand không có pillars → placeholder mặc định, không có chip.
