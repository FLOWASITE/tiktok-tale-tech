

# Tối ưu Step 1 trong luồng 2 bước

## Vấn đề hiện tại

Step 1 vẫn nặng vì **"Mục đích kịch bản" chiếm nguyên 1 card section** (Section 01) với header gradient, icon, description — chỉ để chọn 1 trong 5 pill. Điều này đẩy Topic textarea (phần quan trọng nhất) xuống thấp và tạo cảm giác form dài.

## Giải pháp: Gộp Purpose vào Topic card

```text
TRƯỚC Step 1:
┌─ Card 01: Mục đích ────────────────┐
│  [VEO 3] [MiniMax] [Teleprompter]  │
│  [Voiceover] [Production]          │
└────────────────────────────────────┘
┌─ Card 02: Chủ đề ─────────────────┐
│  [textarea]                        │
│  [TopicIdeaHub] [TopicAngle]       │
└────────────────────────────────────┘
┌─ Card 03: Hook (collapsible) ─────┐

SAU Step 1:
┌─ Card: Chủ đề video ──────────────┐
│  Định dạng: [VEO 3] [MiniMax] ... │ ← Purpose pills inline, compact
│  ─────────────────────────────────  │
│  [textarea]                        │
│  [TopicIdeaHub] [TopicAngle]       │
└────────────────────────────────────┘
┌─ Hook (collapsible) ──────────────┐
```

### Thay đổi chi tiết

#### `ScriptFormStepper.tsx`

1. **Xóa Section 01 card riêng** cho Purpose — gộp `ScriptPurposeSelector` vào đầu Section 02 (Topic card), hiển thị dạng inline pills nhỏ gọn với label "Định dạng:" phía trước
2. **Xóa gradient divider** giữa Section 01 và 02
3. **Đổi số thứ tự**: Card chủ đề thành 01, Hook thành 02
4. Purpose pills row nằm ngay trên textarea, cách bằng 1 border nhẹ

Kết quả: Step 1 giảm ~30% chiều cao, topic textarea hiện ngay trên cùng, user focus vào việc quan trọng nhất — nhập chủ đề.

## File thay đổi

| File | Thay đổi |
|------|----------|
| `ScriptFormStepper.tsx` | Gộp Purpose vào Topic card, xóa Section 01 riêng |

