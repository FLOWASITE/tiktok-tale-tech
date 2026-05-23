## Mục tiêu
Trong **Cài đặt AI → Provider Manager**, mỗi card provider (vd DashScope) đã liệt kê "📋 Đang sử dụng (10)" gồm Functions (F) / Agents (A) / Channels (C) → model hiện tại. Hiện tại chỉ hiển thị text. Cần cho phép **đổi model trực tiếp từ chính dòng đó**, không phải mở tab khác.

## Thay đổi

### 1. `src/components/admin/ai/AIProviderManager.tsx`
- Lấy thêm các mutation từ hooks đã có:
  - `upsertFunctionConfig` từ `useAIConfig` (đã có sẵn cho Functions)
  - `upsertConfig` từ `useAgentModelConfig` (cho Agents)
  - `upsertConfig` từ `useChannelModelConfig` (cho Channels)
- Mở rộng `UsageItem` thêm field `id` (function name / agent id / channel id) để mutation biết target.
- Trong `renderUsageSection`, thay `<span>{item.shortName}</span>` ở cột model bằng một **InlineModelPicker** (popover compact):
  - Reuse `InlineModelPicker` đã có (chế độ `compact`), truyền `functionType` phù hợp:
    - F → lấy `type` từ `AI_FUNCTIONS.find(...).type` (text/image/video/...)
    - A → 'text'
    - C → 'text'
  - `onSelect(model)` → gọi mutation tương ứng theo `source`:
    - F: `upsertFunctionConfig({ functionName: id, modelOverride: model })`
    - A: `upsertConfig({ agentName: id, modelOverride: model })`
    - C: `upsertConfig({ channel: id, modelOverride: model })`
  - Sau khi save: TanStack Query tự invalidate → `providerUsageMap` re-tính → item có thể chuyển sang provider khác (UX hợp lý).
- Giữ nguyên badge F/A/C, tên target, dấu →; chỉ đổi cụm model bên phải thành trigger picker (style nhẹ, hover viền).

### 2. Không đụng business logic khác
- Không sửa edge functions, không sửa schema, không sửa cascade ưu tiên (Individual > Group > Default vẫn giữ).
- Không sửa các tab AIFunctionConfig / AIChannelModelConfig khác — chỉ thêm inline shortcut.

## Lưu ý kỹ thuật
- `InlineModelPicker` yêu cầu `functionType` để filter model list — với Agent/Channel mặc định 'text' là đủ cho 95% case.
- Với Functions, cần map đúng `type` để picker show đúng model (vd image function không show LLM text).
- Width của row hiện cố định (`max-w-[80px]` cho model). Khi đổi sang picker compact, cho phép trigger rộng hơn (~140-160px) và truncate label.
- Click vào picker không trigger expand/collapse của card.

## Out of scope
- Không thêm khả năng đổi model cho item "Email" connector (source `C` đặc biệt) nếu hook channel không support — giữ readonly.
- Không thay đổi UX của tab Functions/Agents/Channels riêng.