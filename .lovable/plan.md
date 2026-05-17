## Bối cảnh

Kế hoạch campaign (`generate-campaign-strategy`) hiện tạo title trong 1 lượt LLM chung — title hay bị chung chung, không sát brand/industry vì model phải làm quá nhiều việc cùng lúc (angle + role + channel + schedule + title). User muốn: với mỗi piece, có thể **xem 3–5 gợi ý chủ đề** sát brand và **chọn 1** để thay title.

## Mục tiêu

Trong `CampaignPlanReview`, mỗi piece có nút **"Gợi ý chủ đề khác"** → mở popover hiển thị 3–5 suggestion (title + 1 dòng angle/hook) do AI tạo riêng cho piece đó dựa trên: brand voice + industry + pillar + angle + role + key_message + dedup với titles đã có trong plan. Click 1 gợi ý → cập nhật `title` (và optional `key_message`) của piece, lưu vào `campaign_content_plans.plan_data`.

Không đụng pipeline thực thi, không sửa schema.

## Phạm vi

**Mới**
- `supabase/functions/suggest-piece-topics/index.ts` — edge function nhận `{ piece, brand_template_id, organization_id, existing_titles[], campaign_title, clarification_context }` → return `{ suggestions: [{ title, hook, key_message }] }` (3–5 items). Dùng `callAIWithMetrics`, model nhỏ (gemini-3-flash-preview), prompt tập trung 1 piece duy nhất, inject brand voice + industry + pillar.
- `src/hooks/agents/useSuggestPieceTopics.ts` — TanStack mutation wrapper.
- `src/components/agents/PieceTopicSuggestPopover.tsx` — popover UI: loading skeleton, 3–5 card chọn được, nút "Tạo lại". Click apply → callback `onPick(suggestion)`.

**Sửa**
- `src/components/agents/CampaignPlanReview.tsx` — mỗi piece card (3 layout: card/list/timeline) thêm nút icon `Sparkles` cạnh title. Mở popover → khi pick → cập nhật `localPieces[i].title` (+ optional `key_message`) → `updatePlan.mutate`.

## Chi tiết kỹ thuật

### Edge function `suggest-piece-topics`
- Auth: JWT bắt buộc (Lovable Cloud default).
- Input validate: piece object (angle, content_role, target_channel, content_type, pillar?, key_message?), `brand_template_id` optional.
- Fetch `brand_templates` → `brand_name`, `industry`, `tone_of_voice`, `brand_positioning`, `target_audience`.
- Prompt structure (English instruction → Vietnamese output, theo pattern Prompt Localization):
  - Role: SEA content strategist.
  - Context: brand, industry, pillar, campaign title, angle, role, channel, key_message.
  - Constraint: 3–5 titles, KHÁC `existing_titles`, mỗi title kèm `hook` (1 câu) và `key_message` ngắn. Bám brand voice. Không click-bait.
  - Output: structured tool-calling `return_topic_suggestions({ suggestions: [{title, hook, key_message}] })`.
- Error: 429/402 trả về codes chuẩn để FE hiển thị toast.

### Popover UI
- Trigger: button ghost size `xs` icon Sparkles, tooltip "Gợi ý chủ đề khác".
- Content: width 360, header "Gợi ý cho góc: {angle}", list 3–5 card click-to-pick (title bold + hook muted), footer "Tạo lại" + "Đóng".
- Loading: 4 skeleton row.
- Theo Soft Luxury: neutral gray ring, không gradient màu.

### Apply logic trong `CampaignPlanReview`
```ts
const handleApplySuggestion = (pieceNumber, s) => {
  const updated = pieces.map(p => p.piece_number === pieceNumber
    ? { ...p, title: s.title, key_message: s.key_message || p.key_message }
    : p);
  setLocalPieces(updated);
  updatePlan.mutate({ id: plan.id, plan_data: updated as any });
};
```

## Ngoài phạm vi

- Không sửa `generate-campaign-strategy` (giữ flow tạo plan ban đầu).
- Không thêm bulk "Regenerate all titles" (có thể làm sau nếu user muốn).
- Không động vào `agent_pipelines` đã chạy — chỉ edit khi plan ở trạng thái `planned`/chưa approve.
- Không thay đổi schema DB.

## Bước triển khai

1. Tạo `supabase/functions/suggest-piece-topics/index.ts` + verify_jwt mặc định.
2. Tạo hook `useSuggestPieceTopics`.
3. Tạo component `PieceTopicSuggestPopover`.
4. Wire vào 3 layout (card/list/timeline) trong `CampaignPlanReview` cạnh title; chỉ hiện khi `isEditable && !isApproved`.
5. Test thủ công: tạo 1 campaign mới → mở plan review → click Sparkles → pick → title đổi và DB cập nhật.
