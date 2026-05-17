# Tối ưu bước Xác nhận — AI Campaign Wizard

## Vấn đề hiện tại

1. **Clarify hỏi thừa**: `clarify-campaign-intent` chỉ nhận `title + description + industry + channels + brand_name` → bỏ qua hoàn toàn `objective`, `pillar_allocation`, `key_messages`, `primaryCta`, `kpi_targets`, `audience` đã có ở Step 1-2. AI luôn hỏi "chủ đề cụ thể", "đối tượng" dù user đã chọn rồi.
2. **Layout dài**: 4 block dọc (Preview metrics → Brand → Campaign link → Summary) phải scroll >1 màn hình mobile mới thấy nút **Khởi chạy** → user nghĩ bị kẹt.
3. **Mất context**: Khi clarification mở, toàn bộ summary biến mất → user không còn thấy cài đặt đã nhập.

## Giải pháp

### A. Smart Clarification — gửi đủ context

**File**: `src/components/agents/GoalWizard.tsx` (`handleConfirmStep`)

Bổ sung payload gửi `clarify-campaign-intent`:
```ts
{
  title, description, industry, channels, brand_name,
  // NEW context
  objective: selectedObj?.label,
  key_messages: keyMessages,
  primary_cta: primaryCta,
  pillars: Object.keys(pillarAllocation),
  kpi_targets: kpiTargets,
  total_posts_target: totalPostsTarget,
  duration_days: effectiveDuration,
}
```

**File**: `supabase/functions/clarify-campaign-intent/index.ts`

- Đọc thêm fields trên, đưa vào prompt dưới mục "Strategic context already provided".
- Cập nhật rule: nếu đã có objective + (key_messages || primary_cta || pillars) → **default `ready: true`**, chỉ hỏi khi title <15 char và description rỗng.
- Hạ max questions xuống **2** (thay vì 3) để giảm friction.
- Tăng `completenessScore` từ 4 lên 7 criteria (thêm objective, pillars, key_messages); ready khi score ≥5.

Frontend client-side guard: nếu `completenessScore >= 5` (tính ngay trong `handleConfirmStep`) → **skip gọi edge function**, đi thẳng `finalSubmit(null)`. Tiết kiệm 1 round-trip cho 70% trường hợp.

### B. Compact Layout — 1 màn hình, sticky CTA

**File**: `src/components/agents/GoalWizard.tsx` (block `step === confirmStep`)

Cấu trúc mới (top → bottom):

```text
┌─ Hero strip (3 metric pills horizontal) ─────────┐
│  📝 12 bài   📡 5 kênh   📅 14 ngày   📅 20/5→3/6│
└──────────────────────────────────────────────────┘
┌─ Card 2 cột ─────────────────────────────────────┐
│ ✦ Mục tiêu: Awareness    │ 🎨 Brand: Aesop       │
│ 💬 3 thông điệp chính    │ 🎯 CTA: Mua ngay      │
│ 🏷 Kênh: [chips compact] │ 🔗 Campaign: Q2-2026  │
└──────────────────────────────────────────────────┘
┌─ Collapsible "Cài đặt nâng cao" (default closed)─┐
│  • Chế độ AI: Approve each [đổi]                 │
│  • Smart Auto-Approve thresholds                 │
│  • Ngân sách, pillar split                       │
└──────────────────────────────────────────────────┘
```

- **Hero metric pills**: thay grid-cols-3 lớn bằng 1 hàng ngang `flex gap-2`, mỗi pill `h-8` chứa icon + số + label nhỏ.
- **Card 2 cột** (`grid-cols-2 gap-3`): gộp objective + key_messages + channels (cột trái) với brand + CTA + campaign link (cột phải). Bỏ label "Brand Template" rời rạc.
- **Collapsible nâng cao**: dùng shadcn `<Collapsible>` cho "Chế độ AI / Auto-Approve / Ngân sách" → ẩn theo default, mở khi cần đổi.
- **Sticky footer** (đã có) giữ nguyên — nhưng vì content gọn còn ~1 viewport nên nút **Khởi chạy** luôn nhìn thấy không cần scroll.

### C. Clarification inline — không nuốt toàn bộ panel

Khi `showClarification = true`:
- Giữ Hero metric pills + Card 2 cột **hiển thị bên trên** (read-only).
- `ClarificationStep` render trong 1 alert card phía dưới với heading "AI cần xác nhận 1-2 điểm" + nút "Bỏ qua, dùng mặc định" rõ ràng.
- Không còn cảnh user thấy mỗi block clarification trống trải.

## Out of scope

- Không đổi state shape `selectedChannels` / `briefContext`.
- Không đổi `agent-pipeline` / `agent-creator-v2` backend.
- Không đổi Step 1-3 (Mục tiêu / Chiến lược / Kênh).
- Không đổi flow `isGenerating` (saving → generating → done/error).

## Files thay đổi

1. `src/components/agents/GoalWizard.tsx` — payload clarify + layout xác nhận + client-side smart skip
2. `supabase/functions/clarify-campaign-intent/index.ts` — đọc thêm fields + prompt mới + threshold ready
3. `src/components/agents/ClarificationStep.tsx` — bỏ icon banner lớn, tinh gọn cho inline mode

## Kết quả kỳ vọng

- **~70% trường hợp** vào thẳng generate, không phải trả lời clarification.
- Bước Xác nhận **fit trong 1 viewport 707×662** (kích thước user đang dùng) — không scroll thấy CTA.
- Khi AI hỏi, user vẫn thấy mọi cài đặt đã nhập → dễ tự tin bấm "Bỏ qua".
