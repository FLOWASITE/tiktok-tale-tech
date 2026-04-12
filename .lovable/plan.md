

# Hoàn thiện AI Agent Flow — Nâng cấp UI & Nội dung

## Phân tích hiện tại
Agent flow đã có nội dung đầy đủ 5 bước nhưng UI còn đơn giản so với Quick Create flow (có hình ảnh, content types grid). Cần nâng cấp visual để tương xứng.

## Thay đổi

### 1. Step 4 — Tách 8 tiêu chí thành grid visual
Hiện tại 8 criteria bị gộp 2 dòng. Sẽ tách thành **grid 2x4** với icon + label cho mỗi tiêu chí, kèm **thanh progress bar** hiển thị score 85/100.

### 2. Step 5 — Dùng Channel Icons thực tế
Thay text badges bằng **ChannelIcon component** (đã có sẵn) để hiển thị logo thật của Facebook, TikTok, Instagram... với màu sắc đặc trưng.

### 3. Step 1 — Nâng cấp examples thành chat bubbles
Thay khung quote đơn giản bằng **chat bubble style** (bo tròn góc, có avatar bot nhỏ) giống giao diện chat thật, nhấn mạnh "gõ tự nhiên".

### 4. Step 2 & 3 — Thêm icon cho mỗi bullet
Mỗi bullet point sẽ có **Lucide icon** phù hợp thay vì chấm tròn đơn giản (TrendingUp cho xu hướng, Users cho đối thủ, Brain cho recall...).

### 5. i18n — Tách 8 tiêu chí Step 4 thành mảng riêng
Thêm key `criteria` array cho step 4 với 8 items riêng biệt (thay vì gộp trong bullets).

## Technical details

**WorkflowSection.tsx**:
- Thêm `hasCriteria` flag cho step 4 config
- Render `CriteriaGrid` component: grid 2x4 với icon + label + optional score bar
- Import `ChannelIcon` component cho step 5, render icon thật thay text badge
- Update example cards với chat bubble styling (rounded-2xl, bg-primary/5, small avatar)
- Map bullet icons cho step 2 & 3 (TrendingUp, Eye, Brain, Route, BookOpen, Timer, Award)

**i18n (vi/en/th)**:
- Thêm `criteria` array cho step4 (8 items riêng)
- Giữ nguyên `bullets` step 4 cho `note` về logic scoring

## Files thay đổi
- `src/landing/components/WorkflowSection.tsx`
- `src/i18n/locales/vi.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/th.json`

