

## Plan: AI hiểu sâu nội dung bài viết để chọn Layout & Text phù hợp hơn

### Vấn đề hiện tại

1. **Nội dung truyền vào AI quá ngắn và chung chung**: `getContentSummary` cắt content còn ~600 ký tự, gộp topic + goal + keywords — mất ngữ cảnh sâu
2. **AI decompose không biết content_role/goal/angle**: Prompt hiện tại chỉ nhận "mô tả" thuần, không biết mục đích bài viết (giáo dục? bán hàng? nhận diện?)
3. **autoSelectTemplate chỉ dùng heuristic đơn giản**: Đếm card count, hasContactInfo — không hiểu bản chất nội dung
4. **Kết quả**: Layout luôn rơi vào vài kiểu cố định, text overlay generic không phản ánh nội dung thực

### Giải pháp: Nâng cấp 2 tầng

#### Tầng 1: Truyền nội dung đầy đủ hơn vào AI decompose

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**

Thay đổi input gửi vào `decomposeRequestWithAI`:
- Hiện tại: `Object.values(contentSummaries).join(' ') + textToInclude` (~600 chars)  
- Mới: Gửi **nội dung bài viết gốc** (full channel content, tối đa 2000 ký tự) + metadata riêng biệt

```typescript
// Trước:
const summaryText = Object.values(contentSummaries).join(' ') + ' ' + textToInclude;
decomposeRequestWithAI(summaryText, brandPrimaryColor)

// Sau:
const firstChannel = selectedChannels[0] || 'instagram';
const fullContent = getFullChannelContent(content, firstChannel); // ~2000 chars
decomposeRequestWithAI(fullContent, brandPrimaryColor, '#FFFFFF', {
  contentRole, contentGoal, contentAngle,
  topic: content.topic,
  textToInclude,
});
```

Thêm helper `getFullChannelContent` lấy nội dung channel dài hơn (2000 ký tự thay vì 400).

#### Tầng 2: AI decompose hiểu strategic context → chọn layout thông minh

**File: `supabase/functions/decompose-image-request/index.ts`**

Nâng cấp prompt để AI:
1. Nhận thêm `contentRole`, `contentGoal`, `contentAngle` 
2. Dựa vào đó chọn layout tối ưu:
   - **Conversion/Harvest** → `poster` (CTA nổi bật) hoặc `contact_card`
   - **Education/Sprout** → `infographic` (split) hoặc `feature_list` (cards)
   - **Awareness/Seed** → `quote_card` (hero text cảm xúc) hoặc `poster`
3. Trả thêm field `suggestedLayout` trong response

Thêm vào system prompt:
```
CHIẾN LƯỢC CHỌN LAYOUT:
- Nội dung giáo dục/kiến thức có nhiều điểm → infographic (split) hoặc feature_list
- Nội dung cảm xúc/nhận diện thương hiệu → quote_card (hero text lớn)
- Nội dung bán hàng/chuyển đổi → poster (CTA rõ ràng) hoặc contact_card
- Nội dung có số liệu nổi bật → quote_card với heroText là số liệu
- Nội dung liệt kê tính năng/lợi ích → feature_list hoặc infographic
```

Thêm output field:
```json
{
  "suggestedLayout": {
    "type": "string",
    "enum": ["poster", "infographic", "quote_card", "feature_list", "contact_card"],
    "description": "Best layout based on content analysis"
  }
}
```

#### Tầng 3: Frontend dùng AI-suggested layout

**File: `src/lib/hybridImageGenerator.ts`**

Cập nhật `decomposeRequestWithAI` để nhận thêm metadata context và trả về `suggestedLayout` từ AI:

```typescript
export async function decomposeRequestWithAI(
  description: string,
  primaryColor?: string,
  secondaryColor?: string,
  context?: {
    contentRole?: string;
    contentGoal?: string;
    contentAngle?: string;
    topic?: string;
    textToInclude?: string;
  }
): Promise<DecomposedRequest>
```

**File: `src/components/multichannel/SimpleImageGenerator.tsx`**

Khi `overlayTemplate === 'auto'`, ưu tiên dùng `suggestedLayout` từ AI thay vì `autoSelectTemplate` heuristic:

```typescript
const selectedTemplate = overlayTemplate !== 'auto'
  ? overlayTemplate
  : decomposed.suggestedLayout || autoSelectTemplate(summaryText, decomposed.overlayConfig);
```

### Files cần sửa
1. **`supabase/functions/decompose-image-request/index.ts`** — Nâng prompt + thêm context params + output suggestedLayout (~30 dòng)
2. **`src/lib/hybridImageGenerator.ts`** — Mở rộng params `decomposeRequestWithAI`, trả suggestedLayout (~15 dòng)
3. **`src/components/multichannel/SimpleImageGenerator.tsx`** — Truyền full content + context, dùng suggestedLayout (~20 dòng)

### Kết quả mong đợi
- Bài viết giáo dục "5 bước..." → AI chọn `infographic` + 4 cards tóm tắt có ý nghĩa
- Bài viết cảm xúc/story → AI chọn `quote_card` + hero text cảm xúc
- Bài viết bán hàng → AI chọn `poster` + CTA rõ ràng
- Text overlay lấy từ nội dung thực, không còn generic

