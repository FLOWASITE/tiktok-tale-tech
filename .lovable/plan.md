## Mục tiêu

Step "Xác nhận" hiện tại (ảnh chụp) chỉ hiển thị summary tối thiểu (4 hero metrics + mục tiêu + brand + thông điệp + CTA + kênh). Nhiều dữ liệu user/AI đã chọn ở 3 step trước đang **bị ẩn** vào collapsible hoặc không hiện ra → user khó verify trước khi "Khởi chạy Campaign".

Phát triển UI để hiển thị **đầy đủ** mọi quyết định của campaign, vẫn giữ design "Soft Luxury" gọn gàng.

## Phạm vi

Chỉ sửa block render Step "Xác nhận" trong `src/components/agents/GoalWizard.tsx` (dòng ~1613-1779). Không đổi logic backend, không đổi state, không đổi 3 step trước.

## Thông tin mới sẽ bổ sung

### 1. Hero strip — thêm cards

- Giữ 4 card hiện tại (Bài viết / Kênh / Ngày / Carousel)
- Thêm card **"Posts/tuần"** (tính từ `estimatedPosts / (effectiveDuration/7)`) — giúp user cảm nhận cadence
- Nếu `totalBudget > 0`: thêm card **Ngân sách** (format VNĐ rút gọn: "12tr", "1.5M")

### 2. Timeline mini-bar (mới)

Thay dòng "📅 date → date" bằng 1 thanh ngang nhỏ:

- Hiển thị start → end với marker tuần (W1, W2…)
- Badge nhỏ "X tuần Y ngày" bên cạnh

### 3. Section "Chiến lược nội dung" (mới — collapsible mở mặc định)

Hiện tại pillar allocation & budget breakdown bị giấu hoàn toàn. Show ra:

**Budget breakdown** (nếu `totalBudget > 0` hoặc allocation ≠ default):

```
Content  ████████ 50%    6,000,000 đ
Ads      █████    30%    3,600,000 đ
KOL      ███      20%    2,400,000 đ
```

Bar chart ngang dùng `bg-primary/20` + `bg-primary` fill.

**Content Pillars** (nếu `pillarAllocation` có data):

```
[Educate]  40%   ~14 bài
[Inspire]  35%   ~12 bài
[Sell]     25%   ~9 bài
```

Tính số bài = `Math.round(estimatedPosts * pct/100)`.

### 4. Section "Kênh & Tần suất" (nâng cấp)

Thay vì chỉ chip kênh, render bảng nhỏ 1 dòng/kênh:

```
[IG icon] Instagram      3/week    ~6 bài
[FB icon] Facebook       Daily     ~14 bài
[X  icon] X (Twitter)    Daily     ~14 bài
```

Frequency badge + estimated posts per channel (dùng `freqPerWeek` map có sẵn × `effectiveDuration/7`).

### 5. Section "KPI Targets" (mới, nếu có)

Hiện `kpiTargets` đang bị ẩn. Render khi `Object.keys(kpiTargets).length > 0`:

```
Reach: 50,000   |   Engagement: 5%   |   Conversions: 200
```

Grid 2-3 cột, badge style.

### 6. AI Reasoning panel (mới, conditional)

Nếu `autoMode || autoChannelMode || autoStrategyMode`:

- Show 1 card nhỏ "🪄 AI đã đề xuất" với accordion chứa 3 reasoning text: `aiReasoning` (objectives), `aiChannelReasoning`, `aiStrategyReasoning`
- Mỗi dòng kèm icon ✓ check nhỏ

### 7. Clarification understanding (nâng cấp)

Nếu `clarificationUnderstanding` có giá trị, show 1 callout xanh "AI hiểu mục tiêu của bạn là: …" **luôn hiển thị** (không chỉ trong showClarification flow).

### 8. Campaign name + description (mới)

Hiện `name` + `description` không hiển thị ở Step xác nhận. Show header nhỏ trên cùng:

```
"Tháng 4 - Niềm vui mỗi ngày"
14 ngày · 5 kênh · Awareness + Engagement
```

Nếu `description` có giá trị → 1 dòng truncate 2 lines.

### 9. Cài đặt nâng cao (giữ collapsible)

Vẫn giữ collapsible cho:

- Chế độ AI (approve_each / full_auto / hybrid)
- Linked Campaign
- Smart Auto-Approve thresholds
Nhưng **mặc định mở** nếu `autoApproveEnabled = true` để user thấy ngưỡng.

## Layout mới (mobile-first vì user xem trên 707px)

```text
┌─────────────────────────────────┐
│ ✨ Tạo AI Campaign         [X]  │
│ Stepper: ✓ ✓ ✓ ● Xác nhận       │
├─────────────────────────────────┤
│ [Campaign name]                 │ ← mới
│ [description 2 lines]           │ ← mới
│                                 │
│ [34][5][14][18][2/w][6tr]       │ ← +2 card
│ ──●────────●────────●──         │ ← timeline bar mới
│ 2 tuần · 17/5 → 31/5            │
│                                 │
│ ┌─ Mục tiêu & Brand ─────────┐  │
│ │ ♥ Tăng tương tác           │  │
│ │ +1 phụ: Tăng nhận biết     │  │
│ │ 🅵 Flowa Brand             │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ Chiến lược nội dung ──────┐  │ ← mới
│ │ THÔNG ĐIỆP (4)             │  │
│ │ [chip][chip][chip][+1]     │  │
│ │ ⚡ CTA: Chia sẻ khoảnh khắc│  │
│ │ ─────────────              │  │
│ │ NGÂN SÁCH                  │  │
│ │ Content ███████ 50%        │  │
│ │ Ads     ████    30%        │  │
│ │ KOL     ██      20%        │  │
│ │ ─────────────              │  │
│ │ CONTENT PILLARS            │  │
│ │ Educate 40% · 14 bài       │  │
│ │ Inspire 35% · 12 bài       │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ Kênh & Tần suất ──────────┐  │ ← nâng cấp
│ │ 📷 Instagram  3/w  ~6 bài  │  │
│ │ 📘 Facebook   Daily ~14 bài│  │
│ │ 🧵 Threads    2/w  ~4 bài  │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ KPI Targets ──────────────┐  │ ← mới (conditional)
│ │ Reach 50k · Eng 5% · …     │  │
│ └────────────────────────────┘  │
│                                 │
│ ┌─ 🪄 AI đã đề xuất ─────────┐  │ ← mới (conditional)
│ │ ✓ Objectives: …            │  │
│ │ ✓ Channels: …              │  │
│ │ ✓ Strategy: …              │  │
│ └────────────────────────────┘  │
│                                 │
│ [⚙ Cài đặt nâng cao ▾]         │
├─────────────────────────────────┤
│ < Quay lại   [⚡ Khởi chạy]     │
└─────────────────────────────────┘
```

## Technical details

- File: `src/components/agents/GoalWizard.tsx`, block `step === confirmStep` (~165 dòng JSX hiện tại sẽ tăng lên ~280 dòng)
- Reuse helpers có sẵn: `freqPerWeek`, `visualChannelIds`, `estimatedPosts`, `effectiveDuration`, `selectedObj`, `currentBrand`
- Thêm helper inline:
  - `formatBudgetShort(n)` → "6tr", "1.2M"
  - `getChannelPosts(ch)` → `Math.max(1, Math.round((freqPerWeek[freq]/7) * effectiveDuration))`
  - `getPillarPosts(pct)` → `Math.round(estimatedPosts * pct/100)`
- Dùng semantic tokens: `bg-primary/10`, `bg-muted`, `border-border`, `text-muted-foreground` (không hard-code màu)
- Bar chart: `<div className="h-1.5 rounded-full bg-muted overflow-hidden"><div style={{width: pct+'%'}} className="h-full bg-primary" /></div>`
- Timeline bar: flex row với 3-4 dots biểu thị tuần
- Tất cả section mới wrap trong `rounded-lg border bg-card p-2.5` (consistent với existing)
- Text size giữ nguyên `text-[11px]` / `text-[9px]` để không phá layout compact hiện tại
- Conditional rendering: chỉ show section nếu có data tương ứng (tránh empty state lộn xộn)

## Không thay đổi

- 3 step trước (Mục tiêu / Chiến lược / Kênh)
- Logic auto-pilot, suggest-* hooks
- Backend edge functions
- Footer buttons (Quay lại / Khởi chạy Campaign)
- ClarificationStep flow

## Risk

- JSX block dài hơn (~280 dòng) → có thể tách thành sub-component `ConfirmStepSummary` nếu cần. Plan này giữ inline để diff sạch, refactor sau nếu user muốn.
- Trên viewport 707px (user đang xem) — bar chart và timeline phải responsive: dùng `flex-wrap` và `min-w-0` cẩn thận.