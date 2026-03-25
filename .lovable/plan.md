

# Phase 1: Campaign Brief + Content Pillar % Allocation

## Tổng quan

Mở rộng GoalWizard với 3 trường mới (key_messages, primary_cta, content_pillars_allocation) và cập nhật Strategy Agent để đọc pillar allocation khi phân bổ bài viết.

## Hiện trạng

- **GoalWizard** (6 bước): Mục tiêu → Kênh → Chiến dịch → Tự động → Liên kết → Xác nhận
- **`generate-campaign-strategy`**: Nhận `campaign_title`, `description`, `clarification_context`, channels, duration → AI tạo plan với role distribution cố định (Seed 40%, Sprout 35%, Harvest 25%)
- **Brand Templates** đã có `content_pillars` (mảng `{name, keywords}`) nhưng chưa có % allocation
- **`agent_goals`** table có `clarification_context` (JSONB) — có thể dùng để lưu thêm brief data mà không cần migration

## Kế hoạch thay đổi

### 1. Mở rộng GoalWizard UI — Thêm Brief Fields vào Step 0

**File: `src/components/agents/GoalWizard.tsx`**

Bổ sung vào Step 0 (Mục tiêu), sau textarea mô tả:
- **Key Messages** (`string[]`): Input chips — nhập key message, Enter để thêm, X để xóa. Max 5 items
- **CTA chính** (`string`): Input text đơn giản, placeholder "VD: Đăng ký tư vấn miễn phí"
- **Content Pillars Allocation**: Đọc `content_pillars` từ `currentBrand`, hiển thị mỗi pillar kèm slider % (tổng = 100%). Nếu brand chưa có pillars → ẩn section này

State mới:
```
keyMessages: string[]
primaryCta: string
pillarAllocation: Record<string, number>  // { "Tips": 40, "Case Study": 30, "Product": 30 }
```

Truyền qua `onSubmit` → lưu vào `clarification_context` (JSONB, không cần migration):
```json
{
  "key_messages": ["msg1", "msg2"],
  "primary_cta": "Đăng ký ngay",
  "pillar_allocation": { "Tips": 40, "Case Study": 30, "Product": 30 }
}
```

### 2. Cập nhật GoalWizard onSubmit interface

**File: `src/components/agents/GoalWizard.tsx`**

`finalSubmit` merge brief fields vào `clarification_context`:
```typescript
const briefContext = {
  ...context,
  key_messages: keyMessages.length > 0 ? keyMessages : undefined,
  primary_cta: primaryCta || undefined,
  pillar_allocation: Object.keys(pillarAllocation).length > 0 ? pillarAllocation : undefined,
};
```

### 3. Cập nhật Step