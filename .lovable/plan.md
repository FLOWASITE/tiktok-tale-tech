

## Plan: Regenerate sử dụng Core Content làm nguồn ngữ cảnh

### Vấn đề
Regenerate chỉ dùng `topic` (vài từ) để viết lại → nội dung bị generic, mất key messages, mất góc nhìn chiến lược. Core Content (800-2000 từ) đã có sẵn nhưng không được sử dụng.

### Giải pháp

**File duy nhất cần sửa:** `supabase/functions/generate-multichannel/index.ts`

#### 1. Fetch Core Content khi regenerate (sau line ~1700)

```typescript
// Fetch Core Content if linked
let coreContentText = '';
let coreKeyMessages: string[] = [];
if (existingContent.core_content_id) {
  const { data: coreContent } = await supabase
    .from('core_contents')
    .select('content, key_messages, content_role, content_angle')
    .eq('id', existingContent.core_content_id)
    .single();
  if (coreContent) {
    coreContentText = coreContent.content?.substring(0, 3000) || '';
    coreKeyMessages = coreContent.key_messages || [];
    // Also pass content_role for strategic context
    formData.contentRole = coreContent.content_role;
  }
}
```

#### 2. Inject Core Content vào prompt (line ~2073-2114)

Thêm vào **system prompt** (sau "MỤC TIÊU NỘI DUNG"):
```
## NỘI DUNG GỐC (CORE CONTENT)
Đây là bài viết gốc đầy đủ. Hãy dựa vào đây để viết lại, KHÔNG bịa thêm thông tin ngoài.

{coreContentText}

## THÔNG ĐIỆP CHÍNH (bắt buộc giữ lại)
{keyMessages joined by \n}
```

Cập nhật **user prompt** từ:
> "Viết lại nội dung cho kênh X với chủ đề Y"

Thành:
> "Dựa trên NỘI DUNG GỐC ở trên, viết lại cho kênh X. Giữ nguyên thông điệp chính, thay đổi cách diễn đạt và cấu trúc."

#### 3. Fallback khi không có Core Content

Nếu `core_content_id` null hoặc fetch thất bại → giữ nguyên behavior hiện tại (chỉ dùng topic). Không breaking change.

### Tác động
- **1 file sửa**: `supabase/functions/generate-multichannel/index.ts`
- **~25 dòng thêm/sửa**: fetch core content + inject vào prompt
- **Không breaking**: fallback về logic cũ khi không có core content
- **Kết quả**: Regenerate sẽ tạo nội dung bám sát bài gốc, giữ key messages, không bịa thông tin

