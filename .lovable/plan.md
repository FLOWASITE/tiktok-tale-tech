

# Làm lại chức năng Overlay Logo — cải thiện thẩm mỹ

## Vấn đề hiện tại

Xem code `overlay-logo-canvas/index.ts`, có 3 nguyên nhân gây mất thẩm mỹ:

| Vấn đề | Code hiện tại | Hậu quả |
|--------|--------------|---------|
| **Backdrop đen xấu** | `backdrop.fill(0x00000066)` — hình chữ nhật đen 40% opacity, góc vuông | Logo bị đóng khung đen thô, trông như "dán sticker" |
| **Logo styles không hoạt động** | `shadow`, `glass`, `pill`, `outline` đều fall-through về `clean` (không xử lý gì) | Chọn style nào cũng giống nhau |
| **Output JPEG 80%** | `encodeJPEG(80)` | Giảm chất lượng ảnh, artifacts quanh logo |

## Giải pháp

### 1. Bỏ backdrop đen — thay bằng kỹ thuật tinh tế hơn
- **Mặc định (clean)**: Không backdrop, logo đặt trực tiếp lên ảnh
- **Shadow**: Tạo bản sao logo dịch 2-3px, fill đen 30% opacity → đặt trước logo gốc (drop shadow giả)
- **Glass**: Backdrop bo góc với opacity 15% trắng (frosted effect)
- **Subtle**: Giảm opacity logo xuống 40% (watermark nhẹ)

### 2. Tăng chất lượng output
- Chuyển từ JPEG 80% → PNG cho chất lượng cao hơn (trừ Zalo OA giữ JPEG vì giới hạn 1MB)
- Giữ alpha channel cho logo PNG trong suốt

### 3. Tăng padding mặc định
- Từ 20px → 30px để logo không bị sát mép

### 4. Bo góc backdrop (cho style glass/pill)
- Dùng pixel-level masking để tạo rounded rectangle thay vì hình chữ nhật vuông

## Files cần sửa

| File | Thay đổi |
|------|----------|
| `supabase/functions/overlay-logo-canvas/index.ts` | Rewrite `drawLogoBackdrop`, implement real logo styles, tăng quality output |

