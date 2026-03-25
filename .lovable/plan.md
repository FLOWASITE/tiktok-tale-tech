

# Phase 4: UI Form Mục tiêu AI cho Campaign Create

## Tổng quan

Form tạo Campaign hiện tại (`CampaignCreate.tsx`) có 4 bước: Thông tin cơ bản → KPIs & Ngân sách → Kênh → Milestones. Tuy nhiên **thiếu hoàn toàn** các trường "Mục tiêu nội dung" dành cho AI Agent — cụ thể là Key Messages, CTA chính, và Phân bổ Content Pillars mà GoalWizard đã hỗ trợ.

Mục tiêu: Thêm một bước mới **"Mục tiêu nội dung"** vào form Campaign Create để khi tạo campaign, user có thể cung cấp brief cho AI Agent ngay từ đầu — thay vì phải tạo Goal riêng sau đó.

## Thay đổi cần thiết

### 1. Migration: Thêm cột `content_brief` vào bảng `campaigns`

Thêm cột JSONB `content_brief` để lưu key messages, primary CTA, pillar allocation:

```sql
ALTER TABLE public.campaigns 
  ADD COLUMN content_brief jsonb DEFAULT null;

COMMENT ON COLUMN public.campaigns.content_brief IS 
  'AI content brief: key_messages, primary_cta, pillar_allocation';
```

### 2. Cập nhật types (`src/types/campaign.ts`)

- Thêm interface `CampaignContentBrief` với `key_messages: string[]`, `primary_cta: string`, `pillar_allocation: Record<string, number>`
- Thêm `content_brief?: CampaignContentBrief` vào `Campaign` và `CampaignFormData`

### 3. Stepper 5 bước (`src/components/campaign/CampaignFormStepper.tsx`)

Thêm bước 2 mới **"Mục tiêu"** (icon: `MessageSquare`) giữa "Thông tin cơ bản" và "KPIs & Ngân sách":

1. Thông tin cơ bản
2. **Mục tiêu nội dung** ← MỚI
3. KPIs & Ngân sách
4. Kênh phân phối
5. Milestones

### 4. Form Step "Mục tiêu nội dung" (`src/pages/CampaignCreate.tsx`)

Thêm step mới với các fields (tái sử dụng pattern từ GoalWizard):

- **Key Messages** (tối đa 5): Input + badge list, enter để thêm
- **CTA chính**: Input text đơn giản
- **Phân bổ Content Pillars (%)**: Hiển thị sliders cho từng pillar từ brand đã chọn (nếu có). Tự động cân bằng tổng = 100%.
- Info box giải thích: "Thông tin này sẽ được Strategy Agent sử dụng để lên kế hoạch nội dung phù hợp"
- Bước này **tùy chọn** (canProceed luôn return true)

### 5. Cập nhật hook `useCampaigns` (`src/hooks/useCampaigns.ts`)

- Trong `createMutation` và `updateMutation`: thêm `content_brief` vào payload insert/update

### 6. Cập nhật Preview Panel (`src/components/campaign/CampaignCreatePreviewPanel.tsx`)

- Hiển thị key messages, CTA, pillar allocation trong preview bên phải
- Thêm vào completeness check (bonus points)

### 7. Cập nhật Template logic (`src/data/campaignTemplates.ts`)

- Thêm `content_brief` vào `CampaignTemplate` interface
- Templates có thể pre-fill key messages và CTA mẫu

## Files thay đổi

| File | Thay đổi |
|------|----------|
| Migration SQL | MỚI — thêm cột `content_brief` jsonb |
| `src/types/campaign.ts` | SỬA — thêm `CampaignContentBrief`, update interfaces |
| `src/components/campaign/CampaignFormStepper.tsx` | SỬA — 5 bước thay vì 4 |
| `src/pages/CampaignCreate.tsx` | SỬA — thêm step "Mục tiêu nội dung", update step indices |
| `src/hooks/useCampaigns.ts` | SỬA — persist `content_brief` |
| `src/components/campaign/CampaignCreatePreviewPanel.tsx` | SỬA — hiển thị brief info |

