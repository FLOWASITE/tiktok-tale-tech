

## Phân tích: Tại sao Layout ảnh chỉ có 1 kiểu duy nhất (infographic)

### Bằng chứng từ Console Logs

```text
[AutoTemplate] Selected: infographic suggestedLayout: undefined from overlayTemplate: auto
[HybridImageGen] contentRole: undefined, contentGoal: "engagement"
[HybridImageGen] contentRole: undefined, contentGoal: "education"
```

Mọi ảnh đều chọn `infographic` — không phân biệt goal hay nội dung.

### 2 nguyên nhân gốc rễ

**Bug 1: `contentRole` luôn là `undefined`**

Database xác nhận `content_role = NULL` cho tất cả bản ghi `multi_channel_contents`. Edge Function `generate-multichannel` không lưu `content_role` khi tạo bài viết. Kết quả: Edge Function `decompose-image-request` không nhận được context chiến lược → AI không có cơ sở để chọn layout khác nhau.

**Bug 2: System prompt ép AI "LUÔN tạo đúng 4 thẻ"**

File `decompose-image-request/index.ts` line 151:
> `cards: LUÔN tạo đúng 4 thẻ tóm tắt các điểm chính`

AI luôn trả về 4 cards → fallback `autoSelectTemplate` luôn match rule `4+ cards → infographic`. Ngay cả khi `suggestedLayout` trả về đúng (ví dụ `quote_card`), AI vẫn tạo 4 cards → `applyTemplate('quote_card')` nhận cards không cần thiết.

### Kế hoạch sửa

#### 1. Lưu `content_role` khi tạo bài viết
**File:** `supabase/functions/generate-multichannel/index.ts`

Khi tạo/lưu multi_channel_contents, thêm `content_role` từ form data vào record.

#### 2. Sửa system prompt — không ép 4 cards
**File:** `supabase/functions/decompose-image-request/index.ts`

Thay:
> `cards: LUÔN tạo đúng 4 thẻ...`

Thành:
> `cards: Tạo 3-4 thẻ CHỈ KHI nội dung có nhiều điểm chính (giáo dục, liệt kê). KHÔNG tạo cards cho nội dung cảm xúc/storytelling/quote.`

#### 3. Thêm `content_role` vào TypeScript interface
**File:** `src/types/multichannel.ts`

Thêm 2 field missing: `content_role: string | null` và `content_angle: string | null` (DB đã có `content_role`, không có `content_angle` nhưng cần cho tương lai).

#### 4. Fetch `content_role` từ Core Content nếu bản ghi chính thiếu
**File:** `src/components/multichannel/SimpleImageGenerator.tsx`

Khi `content.content_role` là null và `content.core_content_id` tồn tại → fetch `content_role` từ `core_contents` table.

### Tác động
- 4 files sửa
- Sau fix: AI sẽ chọn layout đa dạng dựa trên content_role + content_goal thực tế
- Không breaking change — fallback vẫn hoạt động

