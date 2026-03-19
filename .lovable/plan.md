

# Thay icon emoji bằng Lucide React cho PROMPT_STEPS

## Thay đổi

**File: `src/components/carousel/CarouselGenerationTracker.tsx`**

Thay các emoji icon (`🔍`, `🏗️`, `✍️`, `✨`) trong `PROMPT_STEPS` bằng Lucide React components cho giao diện hiện đại, nhất quán với design system.

### Icon mapping:
| Step | Emoji cũ | Lucide mới |
|------|----------|------------|
| Phân tích chủ đề | 🔍 | `Search` |
| Thiết kế cấu trúc | 🏗️ | `LayoutGrid` |
| Viết nội dung | ✍️ | `PenLine` |
| Hoàn thiện prompt | ✨ | `Sparkles` |

### Cụ thể:
1. Thay `icon: string` thành `icon: LucideIcon` trong type của `PROMPT_STEPS`
2. Import thêm `Search`, `LayoutGrid`, `PenLine` từ `lucide-react`
3. Render `<step.icon />` thay vì text emoji, với styling phù hợp trạng thái (done = `text-primary`, active = `animate-pulse text-primary`, pending = `text-muted-foreground`)
4. Bỏ emoji `✅` cho trạng thái done, dùng `<Check />` icon đã có sẵn — nhất quán với Phase 2

