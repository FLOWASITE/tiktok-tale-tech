
# Tao Image Generation Agent

## Tong quan

Them mot Agent chuyen biet vao he thong Multi-Agent de xu ly viec tao anh AI truc tiep trong chatbot. Hien tai, viec tao anh chi co the lam qua UI rieng (SimpleImageGenerator, generate-brand-image edge function). Agent moi se cho phep user yeu cau tao anh ngay trong chat, su dung toan bo infrastructure da co (PoYo, KIE, Gemini).

---

## Thiet ke

### Luong hoat dong

```text
User: "Tao anh cho bai viet ve skincare mua he, style cinematic"
     |
     v
Intent Classifier --> phat hien "tao anh" --> image_generate intent
     |
     v
State Machine --> trang thai "image_generating" --> Image Agent
     |
     v
Image Agent goi tool "generate_image" --> edge function generate-brand-image
     |
     v
Tra ve URL anh --> hien thi trong chat (ToolResultCard)
```

### Tool moi: `generate_image` va `edit_image`

- `generate_image`: Tao anh moi tu prompt, ho tro style, aspect ratio, channel
- `edit_image`: Chinh sua anh da tao (thay nen, them text overlay)

---

## Chi tiet ky thuat

### 1. Dang ky Agent trong Registry

**File**: `supabase/functions/_shared/supervisor/agent-registry.ts`

Them agent config moi:
```text
name: 'image-agent'
description: 'Generates and edits images for content using AI models'
tools: ['generate_image', 'edit_image']
defaultModel: 'google/gemini-2.5-flash'  (cho reasoning, khong phai tao anh)
systemPromptKey: 'image-agent'
maxTurns: 3   (1 turn reasoning + 1 turn generate + 1 turn edit neu can)
timeoutMs: 120000  (anh mat nhieu thoi gian hon text)
maxRetries: 2
priority: 3
tokenBudget: 2000
```

### 2. Them tool definitions

**File**: `supabase/functions/_shared/tool-definitions.ts`

**Tool `generate_image`**:
- Parameters:
  - `prompt` (required): Mo ta anh can tao
  - `style` (optional): enum ['photorealistic', 'illustration', 'minimalist', '3d_render', 'flat_design', 'cinematic', 'watercolor', 'pop_art', 'product_only', 'infographic', 'abstract', 'collage']
  - `aspect_ratio` (optional): enum ['1:1', '16:9', '9:16', '4:5']
  - `channel` (optional): enum ['facebook', 'instagram', 'tiktok', 'linkedin', 'youtube']
  - `text_overlay` (optional): Van ban can hien thi tren anh
  - `content_id` (optional): Lien ket voi content da tao

**Tool `edit_image`**:
- Parameters:
  - `image_url` (required): URL anh goc
  - `edit_type` (required): enum ['remove_background', 'change_background', 'add_text', 'change_style']
  - `edit_prompt` (optional): Mo ta chinh sua cu the

### 3. Them tool executor handlers

**File**: `supabase/functions/_shared/tool-executor.ts`

**`executeGenerateImage`**:
- Doc ai_provider_configs tu DB de biet dung model nao (PoYo/KIE/Gemini)
- Goi edge function `generate-brand-image` (da co) qua internal fetch
- Tra ve image URL va model used
- Luu ket qua vao `channel_image_history` neu co content_id

**`executeEditImage`**:
- Goi edge function `edit-image-background` (da co) cho cac edit_type tuong ung
- Tra ve edited image URL

### 4. Tao Image Agent system prompt

**File**: `supabase/functions/_shared/agents/image-agent.ts` (tao moi)

System prompt huong dan:
- Phan tich yeu cau user de chon style, aspect_ratio phu hop
- Tu dong chon channel aspect ratio neu user chi dinh kenh
- Goi `generate_image` tool voi prompt chi tiet
- Neu user muon chinh sua, goi `edit_image`
- Bao gom brand context (mau sac, font, tone) khi build prompt

### 5. Cap nhat State Machine

**File**: `supabase/functions/_shared/supervisor/state-machine.ts`

- Them WorkflowState: `image_generating`
- Them WorkflowEvent: `classified_image_generate`, `image_complete`
- Them transitions:
  - `classifying` + `classified_image_generate` --> `image_generating`
  - `image_generating` + `image_complete` --> `completed`
  - `image_generating` + `error` --> `error_recovery`
  - Cho phep chuyen tu `generating` sang `image_generating` (khi content-agent tao xong text, user muon them anh)

### 6. Cap nhat Intent Classifier

**File**: `supabase/functions/_shared/supervisor/intent-classifier.ts`

- Them IntentType: `image_generate`
- Them INTENT_PATTERNS cho image:
  ```text
  image_generate: [
    /tạo ảnh|tạo hình|generate image|make image/i,
    /thiết kế ảnh|design image|tạo visual/i,
    /ảnh cho bài|image for post|thumbnail/i,
    /ảnh minh họa|illustration|banner|cover/i,
  ]
  ```
- Map `image_generate` --> workflowEvent `classified_image_generate`
- Map suggestedAgents: `['image-agent']`

### 7. Cap nhat Supervisor Loop

**File**: `supabase/functions/_shared/supervisor/supervisor-loop.ts`

- Them vao AGENT_DISPLAY_NAMES: `'image-agent': 'Image Agent'`
- Them vao AGENT_PHASES: `'image-agent': 'Dang tao hinh anh...'`
- Them vao `getNextAgent()`: `image_generating: 'image-agent'`
- Them vao `buildAgentTask()`: case `'image-agent'` goi `createImageTask()`
- Them vao `getBlackboardKey()`: `'image-agent': 'generated_image'`
- Them vao `getTransitionEvent()`: `'image-agent': 'image_complete'`
- Them vao multi-step `stepToAgent`: `image: 'image-agent'`

### 8. Hien thi anh trong Chat UI

**File**: `src/components/topic/chatbot/ToolResultCard.tsx` (cap nhat)

- Them case xu ly tool result `generate_image`:
  - Hien thi anh preview (img tag voi URL)
  - Hien thi model used badge
  - Hien thi style va aspect ratio
  - Nut "Tai ve" va "Chinh sua"
- Them case xu ly tool result `edit_image`:
  - Hien thi before/after so sanh

---

## Tong file thay doi

| File | Thay doi |
|------|----------|
| `agent-registry.ts` | Dang ky image-agent |
| `tool-definitions.ts` | Them 2 tool: generate_image, edit_image |
| `tool-executor.ts` | Them 2 handler goi edge functions |
| `image-agent.ts` | Tao moi - system prompt va task builder |
| `state-machine.ts` | Them state image_generating va transitions |
| `intent-classifier.ts` | Them intent image_generate |
| `supervisor-loop.ts` | Tich hop image-agent vao routing |
| `ToolResultCard.tsx` | Hien thi anh trong chat |
