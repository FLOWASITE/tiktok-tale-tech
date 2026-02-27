

## Thêm progress thực sự trong lúc Core Content & Transform đang chạy

### Vấn đề
Hiện tại, các progress event (`core_content_generating`, `role_assigned`, `transforming_channels`) đều được emit **trước** khi `executeToolCall` chạy. Trong suốt thời gian thực sự gọi API tạo Core Content (10-20s) và Transform (15-30s), UI không nhận được bất kỳ update nào -- tạo cảm giác "đứng im".

### Giải pháp
Truyền callback `onProgress` từ Content Node xuống `executeToolCall` → `executeGenerateMultichannel`, để emit progress **đúng thời điểm** mỗi bước thực sự bắt đầu và kết thúc.

### Thay đổi chi tiết

#### 1. Mở rộng `ExecutionContext` (tool-executor.ts)
Thêm field `onProgress` vào interface `ExecutionContext`:
```typescript
interface ExecutionContext {
  supabase: any;
  userId?: string;
  organizationId?: string;
  brandTemplateId?: string;
  userAccessToken?: string;
  onProgress?: (subStep: string, label: string, progress: number) => void;
}
```

#### 2. Emit progress bên trong `executeGenerateMultichannel` (tool-executor.ts)
Thêm các lệnh gọi `context.onProgress` tại đúng thời điểm:
- Trước khi gọi `generate-core-content`: emit `core_content_generating` (25%)
- Sau khi Core Content hoàn tất: emit `core_content_done` (50%)
- Trước khi gọi `generate-multichannel`: emit `transforming_channels` (55%)
- Sau khi Transform hoàn tất: emit `transform_done` (85%)

```text
Timeline thực tế:
  25% ── "Đang tạo Core Content..."  (bắt đầu gọi API)
  50% ── "Core Content hoàn tất"     (API trả về)
  55% ── "Đang chuyển đổi sang N kênh..." (bắt đầu gọi API)
  85% ── "Đã chuyển đổi xong"       (API trả về)
  90% ── "Đang hoàn thiện..."        (content-node.ts)
```

#### 3. Cập nhật Content Node truyền callback (content-node.ts)
- Truyền `ctx.onProgress` vào `executeToolCall` qua context
- Loại bỏ các progress event giả (fire trước khi tool chạy) ở cả Fast Path và Fallback Path
- Giữ lại `preparing` (10%) và `finalizing` (90%) ở content-node level

**Fast Path (trước):**
```typescript
ctx.onProgress?.('core_content_generating', '...', 25);  // giả
ctx.onProgress?.('role_assigned', '...', 35);             // giả
ctx.onProgress?.('transforming_channels', '...', 45);     // giả
const toolResult = await executeToolCall(...);             // silent 30-50s
```

**Fast Path (sau):**
```typescript
ctx.onProgress?.('preparing', 'Chuẩn bị nội dung...', 10);
const toolResult = await executeToolCall('generate_multichannel', toolArgs, {
  ...context,
  onProgress: ctx.onProgress,  // callback truyền xuống
});
// Progress 25→50→55→85 được emit BÊN TRONG executeGenerateMultichannel
ctx.onProgress?.('finalizing', 'Đang hoàn thiện...', 90);
```

### Files cần sửa
- `supabase/functions/_shared/tool-executor.ts` -- Thêm `onProgress` vào ExecutionContext, emit progress trong `executeGenerateMultichannel`
- `supabase/functions/_shared/graph/nodes/content-node.ts` -- Truyền callback, loại bỏ progress giả

### Không thay đổi
- Schema database
- Frontend components (ContentPipelineSteps, ToolResultCard)
- Các tool executor khác (generate_script, generate_carousel...)
