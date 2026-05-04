# Kênh thường xuyên chọn — Multi-Channel Create

## Mục tiêu
Khi người dùng tạo nội dung đa kênh, hệ thống ghi nhớ các kênh họ thường chọn và hiển thị nhóm "Kênh thường xuyên" ở đầu, đồng thời dùng làm preset mặc định cho lần tạo sau — thay cho mặc định cứng `['facebook','instagram']`.

## UX
1. Trong `CompactChannelGrid`, thêm một section **"Kênh thường xuyên"** ở trên cùng (trước Long-form / Social), gồm tối đa 6 kênh được chọn nhiều nhất (≥2 lần).
2. Mỗi chip hiển thị: icon + label + badge số lần đã chọn. Click = toggle như checkbox bình thường.
3. Nút phụ: **"Chọn nhanh kênh thường xuyên"** — 1 click chọn toàn bộ frequent set.
4. Khi mở wizard lần đầu (không có `initialData`), mặc định pre-select = top frequent channels (fallback `['facebook','instagram']` nếu chưa có data).
5. Section frequent ẩn nếu chưa có lịch sử (lần đầu dùng).

## Lưu trữ (frontend-only, không cần migration)
- Key: `flowa.frequentChannels.v1.<organizationId>.<brandTemplateId|'global'>`
- Value: `Record<Channel, { count: number; lastUsedAt: string }>`
- Cập nhật khi: bấm submit wizard (Step "Generate") thành công → tăng count cho từng channel trong `formData.channels`.
- Decay nhẹ: khi đọc, bỏ qua entry `lastUsedAt > 90 ngày`.
- Sort: `count desc, lastUsedAt desc`.

## File thay đổi

### Mới
- `src/hooks/useFrequentChannels.ts`
  - Export: `useFrequentChannels(orgId, brandId)` → `{ frequent: Channel[], counts: Record<Channel, number>, recordUsage: (channels: Channel[]) => void }`.
  - Internal: read/write localStorage, decay 90 ngày, top 6 với count ≥ 2.

### Sửa
- `src/components/multichannel/CompactChannelGrid.tsx`
  - Nhận thêm prop `frequentChannels: Channel[]` và `frequentCounts: Record<Channel, number>`.
  - Render section "⭐ Kênh thường xuyên" trên đầu (collapsible, default mở), chip layout giống category nhưng hiển thị badge count.
  - Thêm nút "Chọn nhanh kênh thường xuyên" trong header actions.
- `src/components/multichannel/MultiChannelFormWizard.tsx`
  - Import `useFrequentChannels`.
  - Đổi default `channels: initialData?.channels || frequent.length ? frequent : ['facebook','instagram']`.
  - Truyền `frequentChannels` + `frequentCounts` vào `<CompactChannelGrid>`.
  - Gọi `recordUsage(formData.channels)` khi submit generate (sau khi `handleGenerate` chạy thành công, hoặc trong `onStartImagePipeline` callback site đã có channels).

## Edge cases
- `initialData?.channels` (regenerate / edit) — không ghi đè bằng frequent.
- Brand mới chưa có brandTemplateId → key fallback `'global'`.
- localStorage disabled → hook trả về mảng rỗng, fallback hoạt động bình thường.
- SSR/hydration không vấn đề (Vite SPA).

## Không thuộc phạm vi
- Không tạo bảng DB / sync cross-device (sẽ làm sau nếu cần phân tích).
- Không thay đổi danh sách CHANNELS hay logic generate.