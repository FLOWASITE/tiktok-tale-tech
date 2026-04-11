

# Hoàn thiện InlineModelPicker & Function Config UI

## Vấn đề hiện tại (từ screenshot)

1. **Mặc định option quá to** — chiếm cả chiều rộng với nền đỏ/hồng, gây rối mắt
2. **Provider dots đồng màu** — tất cả model hiển thị cùng một chấm tròn xanh đậm, không phân biệt được provider
3. **Thiếu speed/cost indicators** trên mỗi model row — chỉ thấy tên + description cắt ngắn
4. **Selected state dùng màu đỏ/hồng** thay vì primary color nhẹ nhàng
5. **Popover hẹp** — description bị cắt, không đủ chỗ hiển thị thông tin
6. **Provider badges ở Presets tab** chỉ là link sang tab "Tất cả", không có tác dụng lọc
7. **Edit Dialog vẫn có tab Model** với InlineModelPicker — thừa vì đã có picker trên card

## Thay đổi chi tiết

### 1. `InlineModelPicker.tsx` — Nâng cấp toàn diện

**UI/UX improvements:**
- Tăng width từ 340px lên **380px** để description không bị cắt
- **ModelRow**: thêm speed indicator (icon Zap/Turtle), cost badge ($/$$/$$$), và provider-colored dot
- **Selected state**: dùng `bg-primary/10 border-primary/30` nhẹ nhàng thay vì nền đỏ
- **Default option**: thu gọn, chỉ là 1 row bình thường, không highlight cả khối
- **Provider badges ở Presets tab**: click vào sẽ chuyển sang tab "Tất cả" VÀ filter theo provider đó
- Thêm **provider filter chips** ở tab "Tất cả" (ngang trên đầu) để lọc nhanh
- Thêm **keyboard navigation**: ArrowUp/ArrowDown để duyệt, Enter để chọn
- **Search**: khi đang search, ẩn tabs, hiện kết quả trực tiếp

**Data improvements:**
- ModelRow hiển thị: `[ProviderDot] Model Name    [SpeedIcon] [$Cost]  [✓]`
- Thêm prop `quality`/`speed`/`cost` từ `ModelInfo` vào hiển thị

### 2. `FunctionCard.tsx` — Cải thiện card layout

**Compact mode:**
- Model info row: thay vì chỉ hiện provider + tên model, hiện thêm **cost badge** nhỏ
- InlineModelPicker button: hiện rõ hơn, không cần hover mới thấy
- Bỏ tooltip wrapper cho model info — thông tin đã đủ trên card

**Expanded mode:**
- Model section: gộp model display + picker vào 1 dòng gọn hơn
- Thêm quick action: "Reset to default" button nhỏ bên cạnh picker khi có override

### 3. `AIFunctionConfig.tsx` — Đơn giản hóa Edit Dialog

- **Tab "Model"**: bỏ InlineModelPicker ra khỏi dialog (đã có trên card). Chỉ giữ:
  - Current model display (read-only info)
  - Reset button
  - Force OpenRouter toggle
- Hoặc gộp tab Model vào header dialog (1 dòng compact) để giảm tab

### 4. `ModelCard.tsx` — Cập nhật ProviderIndicator

- Đảm bảo `ProviderIndicator` render đúng màu cho từng provider (lovable=blue, poyo=teal, kie=violet, geminigen=emerald, dashscope=orange, openrouter=purple)

## Files thay đổi

| File | Hành động |
|------|-----------|
| `src/components/admin/ai/InlineModelPicker.tsx` | Nâng cấp UI: wider, provider filter, speed/cost badges, keyboard nav |
| `src/components/admin/ai/FunctionCard.tsx` | Cải thiện layout compact/expanded, thêm reset button |
| `src/components/admin/ai/AIFunctionConfig.tsx` | Đơn giản hóa tab Model trong dialog |

## Kết quả mong đợi
- Picker rõ ràng hơn: thấy ngay provider, speed, cost của mỗi model
- Lọc theo provider ngay trong picker (không cần mở dialog khác)
- Edit Dialog tập trung vào parameters/cache — model chọn trực tiếp trên card

