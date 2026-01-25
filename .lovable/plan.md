

## Kế hoạch: Redesign UX "Đối tượng mục tiêu" - Multi-mode Smart Audience Selector

### Tổng quan thiết kế mới

Thay thế logic hiện tại (PersonaSelector OR Textarea) bằng một **Unified Audience Control** kết hợp cả 4 hướng:

```
┌─────────────────────────────────────────────────────────────┐
│ Đối tượng mục tiêu                              [AI Gợi ý] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────┐ ┌─────────────┐ ┌───────────┐ ┌─────────────┐       │
│ │👤 A │ │👩‍💼 Chủ DN   │ │ 🎯 Gen Z  │ │  + Tùy chỉnh │       │
│ └─────┘ └─────────────┘ └───────────┘ └─────────────────────┤
│                                                             │
│ ┌─ Preview Card (khi chọn persona) ─────────────────────┐   │
│ │ 👩‍💼 Chủ doanh nghiệp SME                    [★ Primary]│   │
│ │ 30-45 tuổi · Quản lý · Thu nhập cao                   │   │
│ │ Pain points: Thiếu thời gian, ROI không rõ...         │   │
│ │ ┌──────────────────────────────────────────────────┐  │   │
│ │ │ + Bổ sung chi tiết: Quan tâm đến AI...           │  │   │
│ │ └──────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Thay đổi 1: Tạo component mới `AudienceSmartSelector.tsx`

**File mới:** `src/components/multichannel/AudienceSmartSelector.tsx`

**Tính năng chính:**
1. **Quick Chips Row** - Horizontal scrollable chips hiển thị tất cả personas của brand
2. **AI Suggest Button** - Gợi ý audience dựa trên topic đã nhập
3. **Card-based Preview** - Khi chọn persona, hiển thị preview card với thông tin chi tiết
4. **Hybrid Input** - Textarea bổ sung cho custom details

**Props interface:**
```typescript
interface AudienceSmartSelectorProps {
  brandTemplateId?: string;
  topic?: string;           // Để AI suggest
  contentGoal?: string;     // Để AI suggest phù hợp
  selectedPersonaId?: string;
  customAudience?: string;  // Hybrid text
  onPersonaChange: (id: string | undefined) => void;
  onCustomAudienceChange: (text: string) => void;
  disabled?: boolean;
}
```

**UI States:**
- **Idle (no brand):** Chỉ hiển thị Textarea
- **Brand selected, no personas:** Empty state + Quick Create chip
- **Brand selected, has personas:** Chips + Optional AI Suggest
- **Persona selected:** Chips + Preview Card + Optional Hybrid Input

---

### Thay đổi 2: PersonaPreviewCard component

**File mới:** `src/components/multichannel/PersonaPreviewCard.tsx`

**Hiển thị thông tin persona đã chọn:**
```typescript
interface PersonaPreviewCardProps {
  persona: CustomerPersona;
  onClear: () => void;
  hybridInput?: string;
  onHybridInputChange?: (text: string) => void;
  showHybridInput?: boolean;
}
```

**Layout:**
- Avatar emoji + Name + Primary badge
- Demographics: Age range, Gender, Location, Occupation
- Key insights (collapsed by default):
  - Pain points (top 3)
  - Desires (top 3)
  - Values (top 2)
- Optional: Hybrid input textarea ở dưới cùng với placeholder "Bổ sung chi tiết cụ thể..."

---

### Thay đổi 3: AI Audience Suggestion

**Tích hợp với `topic-ai` edge function hoặc tạo action mới:**

Khi user click "AI Gợi ý":
1. Gửi `topic`, `contentGoal`, `brandContext` đến AI
2. AI trả về:
   - Matched persona ID (nếu có persona phù hợp trong brand)
   - Suggested audience description (nếu không match)
3. Auto-select persona hoặc fill Textarea

**Flow:**
```
Topic: "5 sai lầm khi khởi nghiệp"
Goal: Education
AI Response: {
  matchedPersonaId: "xxx-xxx", // hoặc null
  suggestedAudience: "Người mới khởi nghiệp, 25-35 tuổi, đang tìm kiếm mentor và nguồn vốn",
  reasoning: "Topic phù hợp với Chủ doanh nghiệp SME vì..."
}
```

---

### Thay đổi 4: Update MultiChannelFormWizard.tsx

**File:** `src/components/multichannel/MultiChannelFormWizard.tsx`

Thay thế block hiện tại (lines 1067-1111):

```typescript
// TỪ:
{brandTemplateId ? (
  brandPersonasCount === 0 ? (
    <Textarea ... />
  ) : (
    <PersonaSelector ... />
  )
) : (
  <Textarea ... />
)}

// THÀNH:
<AudienceSmartSelector
  brandTemplateId={brandTemplateId}
  topic={topic}
  contentGoal={contentGoal}
  selectedPersonaId={coreContentPersonaId}
  customAudience={coreContentAudience}
  onPersonaChange={setCoreContentPersonaId}
  onCustomAudienceChange={setCoreContentAudience}
  disabled={isGeneratingCoreContent}
/>
```

---

### Thay đổi 5: Update generate-core-content để xử lý Hybrid Input

**File:** `supabase/functions/generate-core-content/index.ts` và `core-content-pipeline.ts`

Khi cả `personaId` và `customAudience` đều có giá trị:
- Fetch full persona data
- Append customAudience vào prompt block

```typescript
${buildPersonaContextBlock(config.personas)}
${config.customAudienceDetails ? `\n### BỔ SUNG TỪ USER\n${config.customAudienceDetails}` : ''}
```

---

### Files cần tạo/sửa

| File | Thay đổi |
|------|----------|
| `src/components/multichannel/AudienceSmartSelector.tsx` | **Mới** - Component chính |
| `src/components/multichannel/PersonaPreviewCard.tsx` | **Mới** - Preview card |
| `src/components/multichannel/MultiChannelFormWizard.tsx` | Thay PersonaSelector bằng AudienceSmartSelector |
| `supabase/functions/generate-core-content/index.ts` | Xử lý hybrid input |
| `supabase/functions/_shared/core-content-pipeline.ts` | Append custom audience details |

---

### UX Flow mới

| Bước | User Action | System Response |
|------|-------------|-----------------|
| 1 | Nhập topic "5 sai lầm khởi nghiệp" | UI hiện Chips + [AI Gợi ý] button |
| 2 | Click "AI Gợi ý" | AI analyze topic → Auto-select matching persona |
| 3 | Persona được chọn | Preview Card xuất hiện với pain points |
| 4 | User muốn bổ sung | Click "Bổ sung chi tiết" → Textarea mở |
| 5 | Nhập thêm "Tập trung vào người Việt Nam" | Hybrid input saved cùng persona |
| 6 | Generate | AI nhận cả persona data + custom text |

---

### Kết quả mong đợi

| Trước | Sau |
|-------|-----|
| Dropdown ẩn chi tiết persona | Preview Card hiển thị rõ AI context |
| Phải navigate đến brand settings để tạo persona | Quick Create chip inline |
| User không biết AI dùng thông tin gì | Card hiển thị pain points, demographics |
| Chỉ chọn HOẶC nhập | Hybrid: Chọn persona + Bổ sung chi tiết |
| User phải tự quyết định audience | AI gợi ý dựa trên topic |

