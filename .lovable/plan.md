
# Cải Thiện Tạo Ảnh AI Liên Quan Đến Social & Nội Dung

## Phân Tích Hiện Trạng

### Điểm yếu của hệ thống hiện tại:

| Vấn đề | Mô tả |
|--------|-------|
| **Content Summary quá ngắn** | Chỉ lấy 300 ký tự đầu từ bài viết, mất đi context quan trọng |
| **Không sử dụng Hook** | `selectedHooks` và `globalHook` có trong content nhưng không được truyền vào prompt builder |
| **Thiếu Content Goal** | `content_goal` đã được fetch nhưng chỉ dùng để map `journeyStage`, không tận dụng hết |
| **Không có Content Angle** | Góc tiếp cận (educational, storytelling, promotional...) không được sử dụng trong prompt ảnh |
| **Không có Content Role** | `content_role` (seed/sprout/harvest) không ảnh hưởng đến visual |
| **Thiếu AI Summary** | Backend không tạo tóm tắt thông minh từ nội dung dài |

### Dữ liệu có sẵn nhưng chưa tận dụng:
- `content_goal`: education, awareness, engagement, expertise, conversion
- `content_role`: seed (awareness), sprout (trust), harvest (conversion)
- `selectedHooks` / `globalHook`: Hook đã được chọn cho từng kênh
- `hook_evaluations`: Đánh giá chất lượng hook
- Full channel content (facebook_content, instagram_content, ...)

---

## Giải Pháp Đề Xuất

### 1. Trích xuất thông minh từ nội dung (Content Intelligence)

**Vấn đề:** `contentSummary` chỉ là 300 ký tự đầu của bài viết, không nắm bắt được ý chính.

**Giải pháp:** Sử dụng AI để tóm tắt nội dung trước khi tạo ảnh.

```
flowchart LR
    A[Channel Content] --> B[AI Summary]
    B --> C[Key Message]
    B --> D[Emotional Tone]
    B --> E[Visual Keywords]
    C & D & E --> F[Enhanced Image Prompt]
```

**Thay đổi backend:**
- Thêm bước gọi AI summarize content trước khi tạo ảnh
- Trích xuất: key message, emotional tone, visual keywords

---

### 2. Tích hợp Hook vào Visual Prompt

**Vấn đề:** Hook là phần thu hút nhất của bài viết nhưng không được dùng để tạo ảnh.

**Giải pháp:** Truyền hook vào prompt để ảnh phản ánh message của hook.

```
contentSummary hiện tại:
"Topic: Chăm sóc da mùa hè. Da khô là vấn đề phổ biến..."

contentSummary mới:
"HOOK: 80% người Việt không biết sai lầm này khi dưỡng da!
Topic: Chăm sóc da mùa hè
Key visual: Surprised face, skincare products, summer sun"
```

**Thay đổi:**
- Frontend: Truyền `selectedHooks[channel].opening_line` hoặc `globalHook.opening_line` vào API
- Backend: Thêm section HOOK vào prompt builder

---

### 3. Content Role → Visual Style Mapping

**Vấn đề:** Content role (seed/sprout/harvest) quyết định mục đích bài viết nhưng không ảnh hưởng visual.

**Giải pháp:** Map role sang visual style phù hợp.

| Role | Mục đích | Visual Style |
|------|----------|--------------|
| **Seed** | Awareness | Eye-catching, curiosity-inducing, broad appeal |
| **Sprout** | Trust building | Educational, informative, credible |
| **Harvest** | Conversion | Product-focused, CTA-friendly, urgency |

**Thay đổi backend:**
```typescript
const CONTENT_ROLE_VISUALS = {
  seed: {
    style: 'attention-grabbing, curiosity-inducing',
    elements: ['bold visuals', 'relatable scenarios', 'emotional hooks'],
    avoid: ['hard selling', 'product close-ups', 'pricing'],
  },
  sprout: {
    style: 'educational, trustworthy, informative',
    elements: ['data visualization', 'step-by-step imagery', 'expert feel'],
    avoid: ['overly promotional', 'urgency cues'],
  },
  harvest: {
    style: 'action-oriented, product-focused, premium',
    elements: ['product showcase', 'CTA space', 'social proof'],
    avoid: ['vague imagery', 'educational tone'],
  },
};
```

---

### 4. Content Angle → Visual Approach

**Vấn đề:** Content angle (storytelling, educational, promotional...) không ảnh hưởng đến cách thể hiện visual.

**Giải pháp:** Map angle sang visual approach.

| Angle | Visual Approach |
|-------|-----------------|
| `educational` | Infographic style, step-by-step, clean diagrams |
| `storytelling` | Narrative imagery, emotional scenes, journey feel |
| `promotional` | Product hero shot, offer badges, CTA-ready |
| `social_proof` | Testimonial style, real people, before/after |
| `behind_the_scenes` | Candid, authentic, workspace/process shots |
| `qa_faq` | Question bubbles, conversational, friendly |

---

### 5. Fetch thêm dữ liệu context cho ảnh

**Thay đổi backend `generate-brand-image`:**

Hiện tại chỉ fetch:
- `brandTemplate`: colors, logo, industry

Cần thêm:
- `content_role`: để map visual style
- `selected_hooks` / `global_hook`: để lấy hook message
- `hook_evaluations`: để biết hook type và psychology

---

## Technical Implementation

### Files cần thay đổi:

| File | Thay đổi |
|------|----------|
| `supabase/functions/_shared/image-prompt-builder.ts` | Thêm sections cho Hook, ContentRole, ContentAngle |
| `supabase/functions/generate-brand-image/index.ts` | Fetch thêm hooks, content_role từ DB; truyền vào builder |
| `src/components/multichannel/UnifiedImageGenerator.tsx` | Truyền hooks, contentRole khi gọi API |
| `src/hooks/useSocialImageGeneration.ts` | Thêm params mới vào interface |

### Thay đổi chi tiết:

**1. image-prompt-builder.ts**
```typescript
// Thêm types mới
interface ImagePromptParams {
  // ... existing
  contentRole?: 'seed' | 'sprout' | 'harvest';
  contentAngle?: ContentAngle;
  hookMessage?: string;
  hookType?: string;
}

// Thêm sections mới
function buildContentRoleSection(role?: string): string { ... }
function buildContentAngleSection(angle?: string): string { ... }
function buildHookSection(hookMessage?: string, hookType?: string): string { ... }
```

**2. generate-brand-image/index.ts**
```typescript
// Fetch thêm data
const { data: contentData } = await supabase
  .from("multi_channel_contents")
  .select("content_goal, content_role, selected_hooks, global_hook")
  .eq("id", contentId)
  .single();

// Extract hook for channel
const channelHook = contentData.selected_hooks?.find(h => h.channel === channel);
const hookMessage = channelHook?.opening_line || contentData.global_hook?.opening_line;
const hookType = channelHook?.hook_type || contentData.global_hook?.hook_type;

// Pass to builder
const enhancedPrompt = buildImagePrompt({
  ...existingParams,
  contentRole: contentData.content_role,
  hookMessage,
  hookType,
});
```

**3. UnifiedImageGenerator.tsx**
```typescript
// Trong generateAutoPrompt, thêm hook context
function generateAutoPrompt(..., hook?: string): string {
  if (hook) {
    prompt += `Main message (HOOK): "${hook}". `;
  }
  // ...
}
```

---

## Kết quả mong đợi

**Trước:**
```
Prompt: "Create a 1:1 aspect ratio image for instagram. 
Content theme: Topic: Chăm sóc da mùa hè. Da khô là vấn đề phổ biến trong mùa hè... 
Brand: GlowSkin. High quality, professional."
```

**Sau:**
```
Prompt: "Create a professional, brand-aligned image for GlowSkin.

## HOOK MESSAGE (CRITICAL - Image must convey this):
"80% người Việt không biết sai lầm này khi dưỡng da!"
Hook Type: statistic - Use surprised/curious expression, bold visual

## CONTENT CONTEXT:
Topic: Chăm sóc da mùa hè
Key message: Tránh 5 sai lầm phổ biến khi dưỡng da mùa hè
Visual keywords: skincare, summer, protection, glow

## CONTENT ROLE (SEED - Awareness):
- Visual Style: attention-grabbing, curiosity-inducing
- Include: relatable scenarios, emotional hooks
- Avoid: hard selling, product close-ups

## CONTENT ANGLE (Educational):
- Approach: Informative but engaging, step visual hints
- Feel: Trustworthy, helpful, knowledge-sharing

## CHANNEL: INSTAGRAM
..."
```

---

## Ước tính thời gian
- Backend changes: ~15 phút
- Frontend changes: ~10 phút
- Testing: ~5 phút
