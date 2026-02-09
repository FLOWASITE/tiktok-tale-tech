
# Kế hoạch: Căn chỉnh UX nhập Chủ đề trong Kịch bản Video theo mô hình Nội dung Đa kênh

## Tổng quan

Hiện tại, luồng nhập **Chủ đề** trong wizard "Tạo Kịch bản Video" (`ScriptFormStepper`) có UX đơn giản hơn so với "Nội dung Đa kênh" (`MultiChannelFormWizard`). Kế hoạch này sẽ đồng bộ hóa trải nghiệm người dùng bằng cách áp dụng mô hình **Progressive Smart Input** từ Đa kênh sang Kịch bản.

---

## So sánh hiện tại

| Tính năng | Kịch bản Video (ScriptFormStepper) | Nội dung Đa kênh (MultiChannelFormWizard) |
|-----------|-----------------------------------|-------------------------------------------|
| Dynamic Zone | Không | Có (empty vs substantial state) |
| Brainstorm AI Sheet | Không | Có (TopicBrainstormSheet) |
| Inline Quick Suggestions | Không | Có (InlineTopicSuggestions) |
| Hero Brainstorm Card | Không | Có (khi chưa nhập topic) |
| Compliance Warning | Không | Có (ComplianceWarningBadge) |
| Topic Refinement | Có | Có |
| Content Goal selector | Không (có ở Step 1: Purpose) | Có (ở cùng step) |

---

## Các thay đổi cần thực hiện

### 1. Thêm Dynamic Zone vào Step 2 (Chủ đề)

Áp dụng mô hình Progressive Smart Input:

- **Khi topic rỗng/ngắn** (< 10 ký tự):
  - Hiển thị Hero Brainstorm Card với CTA mở Sheet
  - Hiển thị InlineTopicSuggestions dạng compact chips
  - Di chuyển ScriptTopicDiscoveryPanel xuống dưới

- **Khi topic đủ dài** (≥ 10 ký tự):
  - Hiển thị TopicRefinementSuggestions (đã có)
  - Thêm ComplianceWarningBadge
  - Hiển thị TopicAngleSelector (đã có)
  - Ẩn Hero Card và InlineTopicSuggestions

### 2. Tích hợp TopicBrainstormSheet

- Thêm state `showBrainstormSheet`
- Thêm button "Brainstorm AI" bên cạnh label Topic
- Import và render `TopicBrainstormSheet` component
- Truyền `brandTemplateId` và `contentGoal` (có thể map từ `script_purpose`)

### 3. Thêm InlineTopicSuggestions

- Import component từ `@/components/multichannel/InlineTopicSuggestions`
- Render dạng compact khi topic ngắn
- Map `contentGoal` từ context (có thể dùng 'education' làm default cho Script)

### 4. Thêm ComplianceWarningBadge

- Import `useCompliancePrecheck` hook
- Import `ComplianceWarningBadge` component
- Hiển thị khi topic ≥ 10 ký tự và có violations

### 5. Cập nhật Layout Topic Input

- Thêm Brainstorm AI button bên cạnh character count
- Bọc dynamic content trong `AnimatePresence` + `motion.div` cho transition mượt

---

## Chi tiết kỹ thuật

### Files cần chỉnh sửa

```text
src/components/script/ScriptFormStepper.tsx
```

### Imports cần thêm

```typescript
import { AnimatePresence, motion } from 'framer-motion';
import { TopicBrainstormSheet } from '@/components/multichannel/TopicBrainstormSheet';
import { InlineTopicSuggestions } from '@/components/multichannel/InlineTopicSuggestions';
import { ComplianceWarningBadge } from '@/components/multichannel/ComplianceWarningBadge';
import { useCompliancePrecheck } from '@/hooks/useCompliancePrecheck';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
```

### State mới

```typescript
const [showBrainstormSheet, setShowBrainstormSheet] = useState(false);
const TOPIC_MIN_LENGTH_FOR_REFINEMENT = 10;

// Compliance check
const complianceOptions = useMemo(() => ({
  industryForbiddenTerms: [],
  brandForbiddenWords: [],
}), []);

const { fullCheck, suggestCompliantTopic, isChecking: isCheckingCompliance } = useCompliancePrecheck(complianceOptions);
const [complianceCheckResult, setComplianceCheckResult] = useState<ReturnType<typeof fullCheck> | null>(null);
```

### Content Goal mapping cho Script

```typescript
// Map script purpose to content goal for AI suggestions
const scriptContentGoal = useMemo(() => {
  switch (formData.script_purpose) {
    case 'ai_video_veo3':
    case 'ai_video_minimax':
      return 'engagement'; // Video AI thường hướng engagement
    case 'teleprompter':
    case 'voiceover':
      return 'education'; // Educational content
    case 'production':
      return 'expertise'; // Professional production
    default:
      return 'education';
  }
}, [formData.script_purpose]);
```

### Cấu trúc UI mới cho Step 2

```text
Step 2: Chủ đề
├── Brand Template Selector (giữ nguyên)
├── Topic Input Area
│   ├── Label + Brainstorm AI Button + Character Count
│   └── Textarea
├── Dynamic Zone (AnimatePresence)
│   ├── [Khi topic ngắn]
│   │   ├── Hero Brainstorm Card
│   │   ├── Separator "Hoặc chọn gợi ý nhanh"
│   │   └── InlineTopicSuggestions (compact)
│   └── [Khi topic dài]
│       ├── ComplianceWarningBadge (nếu có violations)
│       ├── TopicRefinementSuggestions
│       ├── TopicAngleSelector
│       ├── TopicAnglePreview (nếu đã chọn angle)
│       └── Secondary Brainstorm Button
├── ScriptTopicDiscoveryPanel (luôn hiển thị ở cuối)
└── TopicBrainstormSheet (Sheet component)
```

---

## Lợi ích

1. **Nhất quán UX**: Người dùng có trải nghiệm tương tự khi tạo Kịch bản và Nội dung Đa kênh
2. **Khám phá dễ hơn**: Hero Card và Quick Suggestions giúp người dùng mới dễ bắt đầu
3. **AI-first experience**: Tích hợp sâu hơn với AI Brainstorm
4. **Compliance check**: Cảnh báo sớm về nội dung có vấn đề
5. **Transition mượt**: AnimatePresence tạo trải nghiệm chuyển đổi state tốt hơn

---

## Ước tính

- **Độ phức tạp**: Trung bình
- **Files thay đổi**: 1 file chính
- **Components tái sử dụng**: 4 components từ multichannel
