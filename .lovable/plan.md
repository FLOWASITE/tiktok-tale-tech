

## Kế hoạch: Đồng bộ luồng Chat với quy trình "Tạo nội dung đa kênh" chuẩn

### Vấn đề hiện tại

Quy trình chuẩn (wizard UI tại `/multichannel/new`) có 4 bước:
1. Chọn Chủ đề
2. Tạo Core Content (gọi `generate-core-content`)
3. Chọn Vai trò nội dung (seed/sprout/harvest)
4. Tạo nội dung đa kênh (gọi `generate-multichannel` với `coreContentId`)

Luồng chat qua tool executor **đã có Step 1 + Step 2** (gọi `generate-core-content` rồi `generate-multichannel`), **nhưng `generate-core-content` không nhận được `userId` từ body** khi gọi nội bộ bằng service role key. Kết quả:
- Core Content được tạo với `user_id = null` 
- Nhưng insert vẫn thành công vì dùng service role (bypass RLS)
- Khi user mở `/core-content`, bản ghi vẫn hiển thị (vì RLS check `organization_id`, không phải `user_id`)
- **Vấn đề chính**: `generate-core-content` **không đọc `userId` từ body request** như `generate-multichannel` đã làm

### Nguyên nhân gốc

1. **`generate-core-content/index.ts`** chỉ lấy userId từ JWT header (dòng 403-410), không fallback đọc từ body khi JWT không hợp lệ
2. **`tool-executor.ts`** gọi `generate-core-content` không truyền `userAccessToken` (luôn dùng service role key)
3. Không truyền `userId` trong body request đến `generate-core-content`

### Kế hoạch sửa (2 file)

#### File 1: `supabase/functions/generate-core-content/index.ts`
- Thêm fallback đọc `userId` từ body khi JWT validation fail (giống logic đã có trong `generate-multichannel`)
- Thêm kiểm tra organization membership khi dùng body userId
- Giữ ưu tiên: JWT user > body userId

#### File 2: `supabase/functions/_shared/tool-executor.ts`  
- Trong `executeGenerateMultichannel` Step 1 (gọi `generate-core-content`):
  - Forward `userAccessToken` nếu có
  - Truyền `userId` và `organizationId` trong body request
  - Đảm bảo core content được tạo với đúng `user_id`

### Chi tiết kỹ thuật

**`generate-core-content/index.ts` (dòng 396-415)**:

```text
// Hiện tại:
let userId: string | null = null;
if (authHeader) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  userId = user?.id || null;
}

// Sẽ sửa thành:
let userId: string | null = null;
let isServiceRoleCall = false;
const bodyUserId = body.userId || (body as any).user_id || null;

if (authHeader) {
  const token = authHeader.replace('Bearer ', '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (token === serviceRoleKey || token === anonKey) {
    // Internal trusted call
    isServiceRoleCall = true;
    userId = bodyUserId;
  } else {
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user?.id) {
      userId = user.id;
    } else {
      userId = bodyUserId;
      if (userId) isServiceRoleCall = true;
    }
  }
}

// Verify org membership if using body userId
if (isServiceRoleCall && userId && organizationId) {
  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle();
  if (!member) {
    userId = null; // Reset if not a member
  }
}
```

**`tool-executor.ts` (dòng 387-405, Step 1 call)**:

```text
// Hiện tại:
"Authorization": `Bearer ${supabaseKey}`,
body: { topic, contentGoal, contentAngle, ... }

// Sẽ sửa thành:
"Authorization": `Bearer ${context.userAccessToken || supabaseKey}`,
body: { topic, contentGoal, contentAngle, ..., userId: context.userId, user_id: context.userId }
```

### Kết quả sau khi sửa

- Core Content được tạo với đúng `user_id` (không còn null)
- Pipeline 2 bước hoàn chỉnh: Core Content → Multichannel
- Cả 2 bản ghi đều liên kết đúng user và organization
- Dữ liệu hiển thị nhất quán trên `/core-content` và `/multichannel`

### Kiểm thử

1. Gửi "tạo nội dung đa kênh cho hôm nay" trong chat
2. Kiểm tra DB: `core_contents` có `user_id` khác null
3. Kiểm tra DB: `multi_channel_contents` có `core_content_id` trỏ đúng
4. Mở `/core-content` và `/multichannel` — nội dung hiển thị đúng
