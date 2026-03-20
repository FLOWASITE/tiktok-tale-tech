

# Redesign ScriptCard — Sang trọng & Gọn gàng

## Vấn đề hiện tại

Card hiện tại quá **rối** với 6 dòng thông tin riêng biệt:
1. Purpose badge + Status badge
2. Title
3. Topic + Brand
4. Content preview (italic quote)
5. Badge row 1: Duration, Video Type, Character (3 pills)
6. Badge row 2: Voice Region, Dialogue Style, Industry (3 pills)
7. Creator + timestamps
8. Action buttons

Tổng cộng **~8 dòng nội dung** với quá nhiều màu sắc (hồng, xanh, cam, vàng, cyan, tím) — thiếu hierarchy, mắt không biết focus vào đâu.

## Giải pháp: Minimal Luxury Card

```text
┌─────────────────────────────────────┐
│  VEO 3              ● Đã duyệt     │  ← Purpose text nhỏ + Status dot
│                                     │
│  Case Study 2026: Agency X tăng...  │  ← Title — focus chính
│  "PROMPT 1 [00:00–00:09]..."        │  ← Preview mờ, 1 dòng
│                                     │
│  60s · Hỏi đáp · Bắc · Độc thoại   │  ← 1 dòng metadata duy nhất
│                                     │
│  👤 Võ Duy · 35 phút trước          │  ← Creator + time gộp 1 dòng
│  ─────────────────────────────────  │
│  [👁 Xem]                    [🗑]   │  ← Actions compact
└─────────────────────────────────────┘
```

### Thay đổi chi tiết

1. **Purpose**: Bỏ badge nặng → text nhỏ `text-[10px] uppercase tracking-wide text-muted-foreground` ở góc trái
2. **Status**: Giữ Badge nhưng style nhẹ hơn, nhỏ hơn
3. **Xóa Badge rows 1 & 2** (6 pills colorful) → Gộp thành **1 dòng text** phân cách bằng `·`: `60s · Hỏi đáp nhanh · Bắc · Độc thoại`
4. **Xóa Topic row** riêng — title đã đủ context
5. **Content preview**: Giữ nhưng đơn giản hóa — bỏ border-left, bỏ italic nặng → `text-muted-foreground/60 line-clamp-1`
6. **Creator + Timestamp**: Gộp 1 dòng, bỏ icon update riêng
7. **Actions**: Bỏ hover show/hide animation phức tạp, luôn hiển thị nhẹ nhàng
8. **Card style**: `rounded-2xl border-border/30 bg-card/80 backdrop-blur-sm` — đồng bộ Soft Luxury
9. **Bỏ gradient overlay on hover** và status glow ring — thay bằng subtle `hover:shadow-lg hover:border-border/60`
10. **Brand template**: Nếu có, hiển thị dot color nhỏ cạnh purpose text

## File thay đổi

| File | Thay đổi |
|------|----------|
| `src/components/ScriptCard.tsx` | Redesign toàn bộ layout: gộp metadata thành 1 dòng text, bỏ colorful pills, minimal luxury style |

